import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';

// Chuyen tu Repositories/StudentAssignmentRepository.cs.
// EF dich `x.DaXoa != true` thanh `DaXoa <> 1 OR DaXoa IS NULL` -> phai ghi ro nhanh NULL
// (Prisma `not: true` bo qua dong NULL).

const notTrue = (field: string) => ({ OR: [{ [field]: null }, { [field]: false }] });
const notFalse = (field: string) => ({ OR: [{ [field]: null }, { [field]: true }] });
const lower = (s: string) => s.toLowerCase();

export interface StudentAssignmentWindow {
  hanNop: Date | null;
  tenLop: string;
  ghiChu: string | null;
}

export interface StudentSubmissionSummary {
  soLanDaNop: number;
  diemGanNhat: Prisma.Decimal | null;
  dangChoCham: boolean;
}

/** Su kien dang hoat dong ma hoc sinh (theo tai khoan) nhan duoc va co gan bai tap. */
const activeEventWhere = (userId: string) => ({
  AND: [notTrue('DaXoa'), notFalse('TrangThai'), { MaBaiTap: { not: null } }],
  nguoinhansukien: {
    some: { AND: [notTrue('DaXoa'), notFalse('TrangThai')], hocsinh: { MaNguoiDung: userId } },
  },
});

/** nguoinhansukien dang hoat dong cua hoc sinh, su kien dang hoat dong. */
const activeRecipientWhere = (userId: string) => ({
  AND: [notTrue('DaXoa'), notFalse('TrangThai')],
  hocsinh: { MaNguoiDung: userId },
  sukienlophoc: { AND: [notTrue('DaXoa'), notFalse('TrangThai')] },
});

export function getStudentByUserId(userId: string) {
  return prisma.hocsinh.findFirst({
    where: { MaNguoiDung: userId, AND: [notTrue('DaXoa'), notFalse('TrangThai')] },
  });
}

/** Van ban JSON goc cua baitap.MoTa (EF doc cot json thanh chuoi). */
export async function getMoTaTexts(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ MaBaiTap: string; MoTa: string | null }[]>`
    SELECT MaBaiTap, CAST(MoTa AS CHAR) AS MoTa FROM baitap WHERE MaBaiTap IN (${Prisma.join(ids)})`;
  for (const r of rows) map.set(lower(r.MaBaiTap), r.MoTa);
  return map;
}

const assignmentInclude = {
  chitietdanhmuc: { select: { TenChiTiet: true } },
  // EF Include collection sap them theo khoa chinh cua bang con.
  baitapcauhoi: { orderBy: { MaCauHoiDe: 'asc' as const } },
};

/** Chi bai THUC SU duoc giao cho hoc sinh: hocsinh -> nguoinhansukien -> sukienlophoc -> baitap. */
export async function getStudentAssignments(userId: string) {
  const rows = await prisma.baitap.findMany({
    where: {
      sukienlophoc: { some: activeEventWhere(userId) },
      LaMauNganHang: false,
      AND: [notTrue('DaXoa'), notFalse('TrangThai')],
    },
    include: assignmentInclude,
    orderBy: [{ ThoiGianTao: 'desc' }, { MaBaiTap: 'asc' }],
  });
  const moTa = await getMoTaTexts(rows.map((r) => r.MaBaiTap));
  return rows.map((r) => ({ ...r, moTaText: moTa.get(lower(r.MaBaiTap)) ?? null }));
}

export type AssignmentRow = Awaited<ReturnType<typeof getStudentAssignments>>[number];

/** Chi tiet bai NHUNG chi khi hoc sinh do duoc giao bai nay. */
export async function getAssignmentById(assignmentId: string, userId: string): Promise<AssignmentRow | null> {
  const row = await prisma.baitap.findFirst({
    where: {
      MaBaiTap: assignmentId,
      sukienlophoc: { some: activeEventWhere(userId) },
      LaMauNganHang: false,
      AND: [notTrue('DaXoa'), notFalse('TrangThai')],
    },
    include: assignmentInclude,
  });
  if (!row) return null;
  const moTa = await getMoTaTexts([row.MaBaiTap]);
  return { ...row, moTaText: moTa.get(lower(row.MaBaiTap)) ?? null };
}

/** Cua so lam bai (han nop, lop) cua tung bai tap doi voi hoc sinh nay. */
export async function getAssignmentWindows(userId: string, assignmentIds: string[]): Promise<Map<string, StudentAssignmentWindow>> {
  const ids = [...new Set(assignmentIds)];
  const result = new Map<string, StudentAssignmentWindow>();
  if (ids.length === 0) return result;

  // Cung dang JOIN ma EF sinh ra (khong ORDER BY) de thu tu dong - va do do thu tu ten lop
  // trong TenLop - giong ban .NET.
  const rows = await prisma.$queryRaw<{ MaBaiTap: string; HanNop: Date | null; MaLopHoc: string; NoiDung: string | null; TenLop: string }[]>`
    SELECT s.MaBaiTap, s.HanNop, s.MaLopHoc, s.NoiDung, l.TenLop
    FROM nguoinhansukien AS n
    INNER JOIN hocsinh AS h ON n.MaHocSinh = h.MaHocSinh
    INNER JOIN sukienlophoc AS s ON n.MaSuKien = s.MaSuKien
    INNER JOIN lophoc AS l ON s.MaLopHoc = l.MaLopHoc
    WHERE ((n.DaXoa <> TRUE) OR n.DaXoa IS NULL) AND ((n.TrangThai <> FALSE) OR n.TrangThai IS NULL)
      AND h.MaNguoiDung = ${userId}
      AND ((s.DaXoa <> TRUE) OR s.DaXoa IS NULL) AND ((s.TrangThai <> FALSE) OR s.TrangThai IS NULL)
      AND s.MaBaiTap IS NOT NULL AND s.MaBaiTap IN (${Prisma.join(ids)})`;

  // Mot bai co the duoc giao qua nhieu lop; lay han nop muon nhat.
  const groups = new Map<string, typeof rows>();
  for (const ev of rows) {
    const key = lower(ev.MaBaiTap);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  for (const [key, items] of groups) {
    let hanNop: Date | null = null;
    for (const it of items) if (it.HanNop && (!hanNop || it.HanNop.getTime() > hanNop.getTime())) hanNop = it.HanNop;
    result.set(key, {
      hanNop,
      tenLop: [...new Set(items.map((it) => it.TenLop))].join(', '),
      ghiChu: items.map((it) => it.NoiDung).find((n) => n != null && n.trim() !== '') ?? null,
    });
  }
  return result;
}

/** Su kien lop qua do hoc sinh nhan bai tap nay. */
export async function getEventIdForStudent(userId: string, assignmentId: string): Promise<string | null> {
  const row = await prisma.nguoinhansukien.findFirst({
    where: {
      ...activeRecipientWhere(userId),
      sukienlophoc: { AND: [notTrue('DaXoa'), notFalse('TrangThai')], MaBaiTap: assignmentId },
    },
    select: { MaSuKien: true },
  });
  return row?.MaSuKien ?? null;
}

export function countSubmissions(eventId: string, studentId: string): Promise<number> {
  return prisma.nopbai.count({ where: { MaSuKien: eventId, MaHocSinh: studentId, ...notTrue('DaXoa') } });
}

const byLatest = <T extends { LanNop: number | null; ThoiGianNop: Date | null }>(a: T, b: T) => {
  const d = (b.LanNop ?? 0) - (a.LanNop ?? 0);
  if (d !== 0) return d;
  // ThenByDescending: null nho nhat -> nam cuoi.
  const ta = a.ThoiGianNop?.getTime() ?? Number.NEGATIVE_INFINITY;
  const tb = b.ThoiGianNop?.getTime() ?? Number.NEGATIVE_INFINITY;
  return tb === ta ? 0 : tb > ta ? 1 : -1;
};

export async function getSubmissionSummaries(userId: string, assignmentIds: string[]): Promise<Map<string, StudentSubmissionSummary>> {
  const ids = [...new Set(assignmentIds)];
  const result = new Map<string, StudentSubmissionSummary>();
  if (ids.length === 0) return result;

  const chamChoChamId = await getCategoryId('TRANG_THAI_CHAM_BAI', 'CHAM_CHO_CHAM');
  const rows = await prisma.nopbai.findMany({
    where: { ...notTrue('DaXoa'), hocsinh: { MaNguoiDung: userId }, sukienlophoc: { MaBaiTap: { in: ids } } },
    select: { LanNop: true, DiemSo: true, ThoiGianNop: true, TrangThaiChamBai: true, sukienlophoc: { select: { MaBaiTap: true } } },
  });

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = lower(r.sukienlophoc.MaBaiTap!);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  for (const [key, items] of groups) {
    const latest = [...items].sort(byLatest)[0];
    result.set(key, {
      soLanDaNop: items.length,
      diemGanNhat: latest.DiemSo,
      dangChoCham: chamChoChamId != null && latest.TrangThaiChamBai === chamChoChamId,
    });
  }
  return result;
}

export interface SubmissionDetailRow {
  MaCauHoi: string;
  /** Van ban JSON goc (EF doc cot json thanh chuoi). */
  DapAnHocVien: string | null;
  DiemDatDuoc: Prisma.Decimal | null;
  DanhDauXemLai: boolean | null;
}

/** Bai nop gan nhat, kem chi tiet tung cau. */
export async function getLatestSubmission(eventId: string, studentId: string) {
  const rows = await prisma.nopbai.findMany({
    where: { MaSuKien: eventId, MaHocSinh: studentId, ...notTrue('DaXoa') },
  });
  if (rows.length === 0) return null;
  const submission = [...rows].sort(byLatest)[0];
  const raw = await prisma.$queryRaw<{ MaCauHoi: string; DapAnHocVien: string | null; DiemDatDuoc: Prisma.Decimal | null; DanhDauXemLai: unknown }[]>`
    SELECT MaCauHoi, CAST(DapAnHocVien AS CHAR) AS DapAnHocVien, DiemDatDuoc, DanhDauXemLai
    FROM chitietnopbai WHERE MaNopBai = ${submission.MaNopBai}`;
  const chitiet: SubmissionDetailRow[] = raw.map((r) => ({
    MaCauHoi: r.MaCauHoi,
    DapAnHocVien: r.DapAnHocVien,
    DiemDatDuoc: r.DiemDatDuoc == null ? null : new Prisma.Decimal(r.DiemDatDuoc.toString()),
    DanhDauXemLai: r.DanhDauXemLai == null ? null : Boolean(Number(r.DanhDauXemLai)),
  }));
  return { ...submission, chitiet };
}

export async function getCategoryId(groupCode: string, detailCode: string): Promise<number | null> {
  const row = await prisma.chitietdanhmuc.findFirst({
    where: { MaCode: detailCode, nhomdanhmuc: { MaCode: groupCode }, ...notTrue('DaXoa') },
    select: { MaChiTiet: true },
  });
  return row?.MaChiTiet ?? null;
}

export function saveSubmission(
  submission: Prisma.nopbaiUncheckedCreateInput,
  details: Prisma.chitietnopbaiCreateManyInput[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.nopbai.create({ data: submission });
    if (details.length > 0) await tx.chitietnopbai.createMany({ data: details });
  });
}

/** Nhan xet AI1 tung nhom bai/dang cua 1 lan nop bai, theo thu tu tao. */
export function getAi1Feedback(maNopBai: string) {
  return prisma.nhanxetbaitapai1.findMany({ where: { MaNopBai: maNopBai }, orderBy: { ThoiGianTao: 'asc' } });
}

/** Chi lay cot MoTa (khong kiem tra quyen - noi goi da kiem tra). */
export async function getAssignmentMoTa(assignmentId: string): Promise<string | null> {
  return (await getMoTaTexts([assignmentId])).get(lower(assignmentId)) ?? null;
}

export function getAi2Feedback(maNopBai: string) {
  return prisma.nhanxetdekiemtraai2.findFirst({ where: { MaNopBai: maNopBai } });
}

export function getAiProgress(maHocSinh: string) {
  return prisma.nhanxettienboai3.findMany({
    where: { MaHocSinh: maHocSinh, TrangThai: 'DONE' },
    include: { khoahoc: { select: { TenKhoaHoc: true } } },
    orderBy: { ThoiGianTao: 'desc' },
  });
}

export async function getCategoryDictionary(categoryIds: number[]): Promise<Map<number, string>> {
  const ids = [...new Set(categoryIds)];
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const rows = await prisma.chitietdanhmuc.findMany({ where: { MaChiTiet: { in: ids } }, select: { MaChiTiet: true, TenChiTiet: true } });
  for (const r of rows) map.set(r.MaChiTiet, r.TenChiTiet);
  return map;
}
