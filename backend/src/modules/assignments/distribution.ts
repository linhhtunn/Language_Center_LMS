import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import { active, err, normalizeOptional, parseMetadata, prisma, resolveCategoryId, serializeMetadata, type ActionError, type Db } from './common.js';
import { EMPTY_GUID } from './binder.js';
import { cultureCompare, DotnetRandom, shuffle, stableSortBy, tickCount, toDbDate, todayDateOnly, toJsonValue } from './dotnetTypes.js';
import type { DistributeRequest } from './dtos.js';

// GIAO BAI TAP / DE THI CHO LOP - HOC SINH: ghi that vao sukienlophoc + nguoinhansukien.

const lc = (s: string) => s.toLowerCase();

/** Hoc sinh dang hoc (loc theo ngay tham gia / roi lop) - dieu kien dung chung. */
export const enrolledToday = () => {
  const today = todayDateOnly();
  return {
    AND: [
      active,
      { OR: [{ NgayThamGia: null }, { NgayThamGia: { lte: today } }] },
      { OR: [{ NgayRoiLop: null }, { NgayRoiLop: { gte: today } }] },
    ],
  };
};

export async function getDistributionTargets(courseId: string | null) {
  const classCourseRows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: { AND: [active, ...(courseId ? [{ MaKhoaHoc: courseId }] : [])] },
    select: { MaLopHoc: true, MaKhoaHoc: true },
  });
  const courseIdsByClass = new Map<string, string[]>();
  for (const r of classCourseRows) {
    const list = courseIdsByClass.get(lc(r.MaLopHoc)) ?? [];
    if (!list.includes(lc(r.MaKhoaHoc))) list.push(lc(r.MaKhoaHoc));
    courseIdsByClass.set(lc(r.MaLopHoc), list);
  }
  const classIds = [...courseIdsByClass.keys()];

  const classRows = await prisma.lophoc.findMany({
    where: { AND: [{ MaLopHoc: { in: classIds } }, active] },
    orderBy: { TenLop: 'asc' },
    select: { MaLopHoc: true, TenLop: true, _count: { select: { hocsinhlophoc: { where: enrolledToday() } } } },
  });
  const studentRows = await prisma.hocsinhlophoc.findMany({
    where: { AND: [{ MaLopHoc: { in: classIds } }, enrolledToday()] },
    select: {
      MaHocSinh: true,
      MaLopHoc: true,
      lophoc: { select: { TenLop: true } },
      hocsinh: { select: { nguoidung: { select: { HoTen: true } } } },
    },
  });

  const classes = classRows.map((x) => ({
    maLopHoc: lc(x.MaLopHoc),
    tenLop: x.TenLop,
    tenGiangVien: null,
    soHocSinh: x._count.hocsinhlophoc,
    maKhoaHocs: courseIdsByClass.get(lc(x.MaLopHoc)) ?? [],
  }));
  const students = stableSortBy(
    studentRows.map((x) => ({
      maHocSinh: lc(x.MaHocSinh),
      hoTen: x.hocsinh.nguoidung.HoTen,
      maLopHoc: lc(x.MaLopHoc),
      tenLop: x.lophoc.TenLop,
      maKhoaHocs: courseIdsByClass.get(lc(x.MaLopHoc)) ?? [],
    })),
    (a, b) => cultureCompare(a.tenLop, b.tenLop) || cultureCompare(a.hoTen, b.hoTen),
  );
  return ok({ classes, students }, 'Lay danh sach lop/hoc sinh thanh cong.');
}

type EventWithReceivers = {
  MaSuKien: string;
  MaLopHoc: string;
  nguoinhansukien: { MaSuKien: string; MaHocSinh: string }[];
};

/** Go giao mot su kien cung toan bo nguoi nhan (xoa mem). */
export async function softDeleteEvent(db: Db, ev: EventWithReceivers, userId: string, now: Date) {
  await db.sukienlophoc.update({
    where: { MaSuKien: ev.MaSuKien },
    data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
  });
  if (ev.nguoinhansukien.length) {
    await db.nguoinhansukien.updateMany({
      where: { MaSuKien: ev.MaSuKien },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    });
  }
}

/** SyncEventReceivers: nguoi nhan khong con trong danh sach -> xoa mem; co -> bat lai; moi -> them. */
export async function syncEventReceivers(
  db: Db,
  maSuKien: string,
  existing: { MaHocSinh: string }[],
  studentIds: string[],
  userId: string,
  now: Date,
) {
  const set = new Set(studentIds.map(lc));
  const existingIds = existing.map((x) => lc(x.MaHocSinh));
  const removed = existingIds.filter((x) => !set.has(x));
  const kept = existingIds.filter((x) => set.has(x));
  if (removed.length) {
    await db.nguoinhansukien.updateMany({
      where: { MaSuKien: maSuKien, MaHocSinh: { in: removed } },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    });
  }
  if (kept.length) {
    await db.nguoinhansukien.updateMany({
      where: { MaSuKien: maSuKien, MaHocSinh: { in: kept } },
      data: { DaXoa: false, TrangThai: true, NguoiSua: userId, ThoiGianSua: now },
    });
  }
  const existingSet = new Set(existingIds);
  const added = [...set].filter((x) => !existingSet.has(x));
  if (added.length) {
    await db.nguoinhansukien.createMany({
      data: added.map((MaHocSinh) => ({ MaSuKien: maSuKien, MaHocSinh, NguoiTao: userId, ThoiGianTao: now, TrangThai: true, DaXoa: false })),
    });
  }
}

/** Dictionary<Guid, Sukienlophoc>: trung lop -> ArgumentException (500) nhu .NET. */
export function eventsByClass<T extends { MaLopHoc: string }>(events: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const e of events) {
    const key = lc(e.MaLopHoc);
    if (map.has(key)) throw new Error(`An item with the same key has already been added. Key: ${key}`);
    map.set(key, e);
  }
  return map;
}

export async function distributeAssignments(userId: string, request: DistributeRequest): Promise<ActionError | { body: unknown }> {
  const examIds = [...new Set(request.ExamIds.filter((x) => x !== EMPTY_GUID))];
  if (examIds.length === 0) return err(400, 'Chua chon bai tap / de thi nao de giao.', 'ADMIN_DISTRIBUTE_EXAM_REQUIRED');

  const exams = await prisma.baitap.findMany({
    where: { AND: [{ MaBaiTap: { in: examIds } }, active] },
    orderBy: { MaBaiTap: 'asc' },
    include: { sukienlophoc: { orderBy: { MaSuKien: 'asc' }, include: { nguoinhansukien: true } } },
  });
  if (exams.length !== examIds.length) {
    return err(404, 'Co bai tap / de thi khong ton tai hoac da bi xoa.', 'ADMIN_DISTRIBUTE_EXAM_NOT_FOUND');
  }
  if (exams.some((x) => x.LaMauNganHang)) {
    return err(400, 'Bai mau trong ngan hang de khong duoc giao truc tiep. Hay sinh de truoc.', 'ADMIN_DISTRIBUTE_BANK_TEMPLATE');
  }

  // Thoi luong admin dat luc giao (> 0) ghi de thoi luong cua de.
  const overrideDuration = request.ThoiGianLamBai !== null && request.ThoiGianLamBai > 0 ? request.ThoiGianLamBai : null;

  const classIds = [...new Set(request.ClassIds.filter((x) => x !== EMPTY_GUID))];
  const studentIds = [...new Set(request.StudentIds.filter((x) => x !== EMPTY_GUID))];
  if (classIds.length === 0 && studentIds.length === 0) {
    return err(400, 'Chua chon lop hoac hoc sinh nao.', 'ADMIN_DISTRIBUTE_TARGET_REQUIRED');
  }

  // Lop phai thuoc dung khoa hoc cua de.
  if (classIds.length > 0) {
    const courseIds = [...new Set(exams.map((x) => lc(x.MaKhoaHoc)))];
    const hopLeRows = await prisma.chitietkhoahoc_lophoc.findMany({
      where: { AND: [{ MaLopHoc: { in: classIds }, MaKhoaHoc: { in: courseIds } }, active] },
      select: { MaLopHoc: true },
    });
    const hopLe = new Set(hopLeRows.map((x) => lc(x.MaLopHoc)));
    const sai = classIds.filter((x) => !hopLe.has(x));
    if (sai.length > 0) {
      const tenLopSai = await prisma.lophoc.findMany({ where: { MaLopHoc: { in: sai } }, select: { TenLop: true } });
      return err(
        400,
        `Lop ${tenLopSai.map((x) => x.TenLop).join(', ')} khong thuoc khoa hoc cua bai tap nay.`,
        'ADMIN_DISTRIBUTE_CLASS_WRONG_COURSE',
      );
    }
  }

  const rosterRows = await prisma.hocsinhlophoc.findMany({
    where: {
      AND: [enrolledToday(), classIds.length > 0 ? { MaLopHoc: { in: classIds } } : { MaHocSinh: { in: studentIds } }],
    },
    select: { MaHocSinh: true, MaLopHoc: true, hocsinh: { select: { nguoidung: { select: { HoTen: true } } } } },
  });
  // Mot hoc sinh co the hoc nhieu lop; chi giu mot ban ghi de khong giao trung.
  const seen = new Set<string>();
  let roster = rosterRows
    .map((x) => ({ MaHocSinh: lc(x.MaHocSinh), MaLopHoc: lc(x.MaLopHoc), HoTen: x.hocsinh.nguoidung.HoTen }))
    .filter((x) => (seen.has(x.MaHocSinh) ? false : (seen.add(x.MaHocSinh), true)));
  roster = stableSortBy(roster, (a, b) => cultureCompare(a.HoTen, b.HoTen));

  if (roster.length === 0) {
    return err(400, 'Khong tim thay hoc sinh nao dang hoc trong pham vi da chon.', 'ADMIN_DISTRIBUTE_NO_STUDENT');
  }

  // ---- Chia de cho hoc sinh ----
  const warnings: string[] = [];
  const seed = request.Seed ?? tickCount();
  const random = new DotnetRandom(seed);
  const recipientsByExam = new Map<string, typeof roster>(exams.map((x) => [lc(x.MaBaiTap), []]));

  if (exams.length > 1 && request.RandomTheoHocSinh) {
    if (roster.length < exams.length) {
      warnings.push(`Chi co ${roster.length} hoc sinh cho ${exams.length} ma de nen se co ma de khong ai nhan.`);
    }
    // Chia deu roi xao: moi ma de nhan xap xi so hoc sinh bang nhau.
    const shuffled = [...roster];
    shuffle(shuffled, random);
    for (let i = 0; i < shuffled.length; i++) recipientsByExam.get(lc(exams[i % exams.length].MaBaiTap))!.push(shuffled[i]);
  } else {
    for (const exam of exams) recipientsByExam.get(lc(exam.MaBaiTap))!.push(...roster);
  }

  // Ma "BAI_TAP" khong co trong nhom DANG_SU_KIEN (chi co GIAO_BAI...) -> null, giu nguyen nhu ban .NET.
  const eventTypeId = await resolveCategoryId(prisma, 'DANG_SU_KIEN', 'BAI_TAP');
  const publishModeId = await resolveCategoryId(prisma, 'TRANG_THAI_SU_KIEN', 'ACTIVE');
  const now = new Date();
  const resultExams: { maBaiTap: string; code: string; tenBaiTap: string; soLop: number; soHocSinh: number; tenHocSinh: string[] }[] = [];

  await prisma.$transaction(
    async (tx) => {
      for (const exam of exams) {
        const recipients = recipientsByExam.get(lc(exam.MaBaiTap))!;
        const byClass = new Map<string, typeof roster>();
        for (const r of recipients) {
          const list = byClass.get(r.MaLopHoc) ?? [];
          list.push(r);
          byClass.set(r.MaLopHoc, list);
        }

        // Go giao cu o nhung lop khong con trong danh sach lan nay.
        for (const oldEvent of exam.sukienlophoc.filter((x) => !byClass.has(lc(x.MaLopHoc)))) {
          await softDeleteEvent(tx, oldEvent, userId, now);
        }

        const existingByClass = eventsByClass(exam.sukienlophoc);
        for (const [classId, students] of byClass) {
          const existing = existingByClass.get(classId);
          const data = {
            MaNguoiDung: userId,
            DangSuKien: eventTypeId,
            MaTrangThai: publishModeId,
            HanNop: toDbDate(request.DueAt),
            NoiDung: normalizeOptional(request.GhiChuChoHocSinh) ?? exam.TenBaiTap,
            NguoiSua: userId,
            ThoiGianSua: now,
            TrangThai: true,
            DaXoa: false,
          };
          let maSuKien: string;
          if (existing) {
            maSuKien = existing.MaSuKien;
            await tx.sukienlophoc.update({ where: { MaSuKien: maSuKien }, data });
          } else {
            maSuKien = randomUUID();
            await tx.sukienlophoc.create({
              data: { MaSuKien: maSuKien, MaLopHoc: classId, MaBaiTap: lc(exam.MaBaiTap), NguoiTao: userId, ThoiGianTao: now, ...data },
            });
          }
          await syncEventReceivers(tx, maSuKien, existing?.nguoinhansukien ?? [], students.map((x) => x.MaHocSinh), userId, now);
        }

        // Cap nhat cua so lam bai tren envelope; chi mo de khi that su co hoc sinh nhan.
        const metadata = parseMetadata(exam.MoTa);
        const examData: Record<string, unknown> = {};
        if (overrideDuration !== null) examData.ThoiGianLamBai = overrideDuration;
        if (recipients.length > 0) {
          metadata.PublishMode = 'ACTIVE';
          metadata.OpenAt = request.OpenAt;
          metadata.DueAt = request.DueAt;
          metadata.MaxAttempts = Math.min(Math.max(request.SoLanLamToiDa, 1), 10);
          metadata.ShowAnswerAfterDeadline = request.ChoXemDapAn;
          examData.MoTa = toJsonValue(serializeMetadata(metadata));
          examData.NguoiSua = userId;
          examData.ThoiGianSua = now;
        }
        if (Object.keys(examData).length) await tx.baitap.update({ where: { MaBaiTap: exam.MaBaiTap }, data: examData });

        resultExams.push({
          maBaiTap: lc(exam.MaBaiTap),
          code: metadata.Code ?? '',
          tenBaiTap: exam.TenBaiTap,
          soLop: byClass.size,
          soHocSinh: recipients.length,
          tenHocSinh: stableSortBy(
            recipients.map((x) => x.HoTen),
            cultureCompare,
          ),
        });
      }
    },
    { maxWait: 10000, timeout: 120000 },
  );

  const khongAiNhan = resultExams.filter((x) => x.soHocSinh === 0).map((x) => x.code);
  if (khongAiNhan.length > 0) warnings.push(`Cac ma de chua ai nhan, van o trang thai nhap: ${khongAiNhan.join(', ')}.`);

  return {
    body: ok(
      {
        seed,
        tongHocSinh: roster.length,
        tongLop: new Set(roster.map((x) => x.MaLopHoc)).size,
        exams: resultExams,
        warnings,
      },
      'Giao bai thanh cong.',
    ),
  };
}
