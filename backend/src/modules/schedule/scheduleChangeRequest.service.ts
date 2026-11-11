import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { emitToUser } from '../../realtime/socket.js';
import { formatDate, today } from './dotnetBinding.js';
import { isMySqlLockConflict, type Db } from './scheduleGenerator.service.js';

// Chuyen tu Services/ScheduleChangeRequestService.cs (+ IScheduleChangeRequestService).

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

export interface ScheduleChangeRequestResponseDto {
  maYeuCau: string;
  message: string;
  success: boolean;
}

export interface CreateScheduleChangeRequestInput {
  maBuoiHoc: string;
  loaiYeuCau: number;
  ngayHocDeXuat: Date | null;
  maTietBatDauDeXuat: number | null;
  maTietKetThucDeXuat: number | null;
  maPhongHocDeXuat: string | null;
  lyDo: string | null;
}

const response = (maYeuCau: string, message = '', success = false): ScheduleChangeRequestResponseDto => ({ maYeuCau, message, success });

/** Giao vien tao yeu cau doi lich day. */
export async function createScheduleChangeRequest(
  maGiangVien: string,
  dto: CreateScheduleChangeRequestInput,
): Promise<ScheduleChangeRequestResponseDto> {
  const res = response(randomUUID());

  const buoiHoc = await prisma.buoihoc.findFirst({
    where: { MaBuoiHoc: dto.maBuoiHoc, ...notDeleted },
    include: { lophoc: true },
  });
  if (!buoiHoc) {
    res.message = 'Buổi học không tồn tại hoặc đã bị xóa';
    return res;
  }

  const giangvienLopHoc = await prisma.giangvienlophoc.findFirst({
    where: { MaLopHoc: buoiHoc.MaLopHoc, MaGiangVien: maGiangVien },
  });
  if (!giangvienLopHoc) {
    res.message = 'Bạn không phải là giáo viên của lớp này';
    return res;
  }

  const teacher = await prisma.giangvien.findFirst({
    where: { MaGiangVien: maGiangVien },
    select: { nguoidung: { select: { HoTen: true } } },
  });
  const teacherName = teacher?.nguoidung.HoTen ?? 'Giáo viên';
  const className = buoiHoc.lophoc?.TenLop ?? 'lớp học';

  if (dto.loaiYeuCau === 1) {
    if (!dto.ngayHocDeXuat || dto.maTietBatDauDeXuat === null || dto.maTietKetThucDeXuat === null) {
      res.message = 'Yêu cầu đổi thời gian phải có ngày và ca học mới';
      return res;
    }
    if (dto.ngayHocDeXuat.getTime() < today().getTime()) {
      res.message = 'Ngày học mới không được là quá khứ';
      return res;
    }
    if (dto.maTietBatDauDeXuat > dto.maTietKetThucDeXuat) {
      res.message = 'Tiết bắt đầu phải nhỏ hơn hoặc bằng tiết kết thúc';
      return res;
    }

    const conflictClass = await prisma.buoihoc.findFirst({
      where: {
        MaLopHoc: buoiHoc.MaLopHoc,
        NgayHoc: dto.ngayHocDeXuat,
        MaTietBatDau: { lte: dto.maTietKetThucDeXuat },
        MaTietKetThuc: { gte: dto.maTietBatDauDeXuat },
        MaBuoiHoc: { not: dto.maBuoiHoc },
        ...notDeleted,
      },
      select: { MaBuoiHoc: true },
    });
    if (conflictClass) {
      res.message = 'Lớp học này đã có buổi học khác trùng với thời gian đề xuất';
      return res;
    }

    const conflictTeacher = await prisma.buoihoc.findFirst({
      where: {
        NgayHoc: dto.ngayHocDeXuat,
        MaTietBatDau: { lte: dto.maTietKetThucDeXuat },
        MaTietKetThuc: { gte: dto.maTietBatDauDeXuat },
        MaBuoiHoc: { not: dto.maBuoiHoc },
        ...notDeleted,
        lophoc: { giangvienlophoc: { some: { MaGiangVien: maGiangVien } } },
      },
      select: { MaBuoiHoc: true },
    });
    if (conflictTeacher) {
      res.message = 'Bạn đã có buổi học khác trùng với thời gian đề xuất';
      return res;
    }
  } else if (dto.loaiYeuCau === 2) {
    if (!dto.maPhongHocDeXuat) {
      res.message = 'Yêu cầu đổi phòng phải có mã phòng mới';
      return res;
    }
    const phongHoc = await prisma.phonghoc.findFirst({ where: { MaPhongHoc: dto.maPhongHocDeXuat }, select: { MaPhongHoc: true } });
    if (!phongHoc) {
      res.message = 'Phòng học không tồn tại';
      return res;
    }
    const conflictRoom = await prisma.buoihoc.findFirst({
      where: {
        MaPhongHoc: dto.maPhongHocDeXuat,
        NgayHoc: buoiHoc.NgayHoc,
        MaTietBatDau: { lte: buoiHoc.MaTietKetThuc },
        MaTietKetThuc: { gte: buoiHoc.MaTietBatDau },
        MaBuoiHoc: { not: dto.maBuoiHoc },
        ...notDeleted,
      },
      select: { MaBuoiHoc: true },
    });
    if (conflictRoom) {
      res.message = 'Phòng học này đã được sử dụng trong thời gian đó';
      return res;
    }
  } else {
    res.message = 'Loại yêu cầu không hợp lệ (1: Đổi thời gian, 2: Đổi phòng)';
    return res;
  }

  const yeuCau = await prisma.yeucaulichday.create({
    data: {
      MaYeuCau: res.maYeuCau,
      MaGiangVien: maGiangVien,
      MaLopHoc: buoiHoc.MaLopHoc,
      MaBuoiHoc: dto.maBuoiHoc,
      LoaiYeuCau: dto.loaiYeuCau,
      NgayHocDeXuat: dto.ngayHocDeXuat ?? buoiHoc.NgayHoc,
      MaTietBatDauDeXuat: dto.maTietBatDauDeXuat ?? buoiHoc.MaTietBatDau,
      MaTietKetThucDeXuat: dto.maTietKetThucDeXuat ?? buoiHoc.MaTietKetThuc,
      MaPhongHocDeXuat: dto.maPhongHocDeXuat,
      LyDo: dto.lyDo,
      TrangThaiDuyet: 0,
      NguoiTao: maGiangVien,
      ThoiGianTao: new Date(),
      TrangThai: true,
      DaXoa: false,
    },
  });

  res.message = 'Yêu cầu đổi lịch đã được tạo thành công, vui lòng chờ admin xử lý';
  res.success = true;

  await notifyAdminAboutNewRequest(yeuCau, teacherName, className, buoiHoc);
  return res;
}

const detailInclude = {
  giangvien: { include: { nguoidung: true } },
  lophoc: true,
  buoihoc: { include: { phonghoc: true } },
  phonghoc: true,
} satisfies Prisma.yeucaulichdayInclude;

type YeuCauWithNav = Prisma.yeucaulichdayGetPayload<{ include: typeof detailInclude }>;

function mapDetail(y: YeuCauWithNav) {
  return {
    maYeuCau: y.MaYeuCau,
    maGiangVien: y.MaGiangVien,
    tenGiangVien: y.giangvien?.nguoidung?.HoTen ?? null,
    maLopHoc: y.MaLopHoc,
    tenLop: y.lophoc?.TenLop ?? null,
    maBuoiHoc: y.MaBuoiHoc ?? EMPTY_GUID,
    loaiYeuCau: y.LoaiYeuCau ?? 0,
    ngayHocHienTai: y.buoihoc?.NgayHoc ?? new Date(),
    maTietBatDauHienTai: y.buoihoc?.MaTietBatDau ?? 0,
    maTietKetThucHienTai: y.buoihoc?.MaTietKetThuc ?? 0,
    maPhongHocHienTai: y.buoihoc?.MaPhongHoc ?? null,
    tenPhongHocHienTai: y.buoihoc?.phonghoc?.TenPhong ?? null,
    ngayHocDeXuat: y.NgayHocDeXuat,
    maTietBatDauDeXuat: y.MaTietBatDauDeXuat,
    maTietKetThucDeXuat: y.MaTietKetThucDeXuat,
    maPhongHocDeXuat: y.MaPhongHocDeXuat ?? null,
    tenPhongHocDeXuat: y.phonghoc?.TenPhong ?? null,
    lyDo: y.LyDo ?? null,
    trangThaiDuyet: y.TrangThaiDuyet ?? null,
    ghiChuAdmin: y.GhiChuAdmin ?? null,
    thoiGianTao: y.ThoiGianTao ?? null,
    thoiGianSua: y.ThoiGianSua ?? null,
  };
}

// Query EF chi co Include tham chieu (khong co collection) -> khong ORDER BY; MySQL quet theo khoa chinh.
export async function getPendingRequests() {
  const rows = await prisma.yeucaulichday.findMany({
    where: { TrangThaiDuyet: 0, ...notDeleted },
    include: detailInclude,
    orderBy: { MaYeuCau: 'asc' },
  });
  return rows.map(mapDetail);
}

export async function getRequestsByTeacher(maGiangVien: string) {
  const rows = await prisma.yeucaulichday.findMany({
    where: { MaGiangVien: maGiangVien, ...notDeleted },
    include: detailInclude,
    orderBy: { MaYeuCau: 'asc' },
  });
  return rows.map(mapDetail);
}

export async function getRequestById(maYeuCau: string) {
  const row = await prisma.yeucaulichday.findFirst({
    where: { MaYeuCau: maYeuCau, ...notDeleted },
    include: detailInclude,
  });
  return row ? mapDetail(row) : null;
}

/** Duyet yeu cau doi lich (transaction Serializable, kiem tra xung dot truoc va sau khi ghi). */
export async function approveRequest(maYeuCau: string, ghiChuAdmin: string | null = null): Promise<ScheduleChangeRequestResponseDto> {
  let outcome: { response: ScheduleChangeRequestResponseDto; shouldNotify: boolean };
  try {
    outcome = await approveRequestInTransaction(maYeuCau, ghiChuAdmin);
  } catch (err) {
    if (isMySqlLockConflict(err)) {
      return response(maYeuCau, 'Lịch vừa được cập nhật bởi yêu cầu khác. Hãy tải lại và thử lại.');
    }
    console.error(`Failed to approve schedule-change request ${maYeuCau}`, err);
    return response(maYeuCau, `Lỗi khi xử lý yêu cầu: ${(err as Error)?.message ?? String(err)}`);
  }

  if (outcome.shouldNotify) {
    try {
      const approved = await prisma.yeucaulichday.findFirst({ where: { MaYeuCau: maYeuCau }, include: { buoihoc: true } });
      if (approved?.buoihoc) await notifyApproval(approved);
    } catch (err) {
      console.warn(`Schedule request ${maYeuCau} was approved, but notifications failed`, err);
    }
  }
  return outcome.response;
}

class Rollback extends Error {
  constructor(public result: { response: ScheduleChangeRequestResponseDto; shouldNotify: boolean }) {
    super('rollback');
  }
}

async function approveRequestInTransaction(maYeuCau: string, ghiChuAdmin: string | null) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const res = response(maYeuCau);
        const yeuCau = await tx.yeucaulichday.findFirst({ where: { MaYeuCau: maYeuCau }, include: { buoihoc: true } });
        if (!yeuCau || yeuCau.DaXoa === true) {
          res.message = 'Yêu cầu không tồn tại';
          return { response: res, shouldNotify: false };
        }

        if (yeuCau.TrangThaiDuyet !== 0) {
          const b = yeuCau.buoihoc;
          const alreadyApproved =
            yeuCau.TrangThaiDuyet === 1 &&
            b !== null &&
            (yeuCau.LoaiYeuCau === 1
              ? b.NgayHoc.getTime() === yeuCau.NgayHocDeXuat.getTime() &&
                b.MaTietBatDau === yeuCau.MaTietBatDauDeXuat &&
                b.MaTietKetThuc === yeuCau.MaTietKetThucDeXuat
              : yeuCau.LoaiYeuCau === 2 && sameGuid(b.MaPhongHoc, yeuCau.MaPhongHocDeXuat));
          res.success = alreadyApproved;
          res.message = alreadyApproved ? 'Yêu cầu này đã được duyệt trước đó' : 'Yêu cầu này đã được xử lý';
          return { response: res, shouldNotify: false };
        }

        const buoiHoc = yeuCau.buoihoc;
        if (!buoiHoc) {
          res.message = 'Buổi học không tồn tại';
          return { response: res, shouldNotify: false };
        }

        const loai = yeuCau.LoaiYeuCau;
        const targetDate = loai === 1 ? yeuCau.NgayHocDeXuat : buoiHoc.NgayHoc;
        const targetStart = loai === 1 ? yeuCau.MaTietBatDauDeXuat : buoiHoc.MaTietBatDau;
        const targetEnd = loai === 1 ? yeuCau.MaTietKetThucDeXuat : buoiHoc.MaTietKetThuc;
        const targetRoomId = loai === 2 ? yeuCau.MaPhongHocDeXuat : buoiHoc.MaPhongHoc;

        if ((loai !== 1 && loai !== 2) || targetStart > targetEnd) {
          res.message = 'Thông tin lịch đề xuất không hợp lệ';
          return { response: res, shouldNotify: false };
        }
        if (loai === 2 && !targetRoomId) {
          res.message = 'Phòng đề xuất không hợp lệ';
          return { response: res, shouldNotify: false };
        }

        if (await hasScheduleConflict(tx, buoiHoc, yeuCau.MaGiangVien, targetDate, targetStart, targetEnd, targetRoomId)) {
          res.message = 'Lịch đề xuất hiện đã xung đột với lớp, giáo viên hoặc phòng khác';
          return { response: res, shouldNotify: false };
        }

        const nowTime = new Date();
        const updated = { ...buoiHoc };
        if (loai === 1) {
          updated.NgayHoc = yeuCau.NgayHocDeXuat;
          updated.MaTietBatDau = yeuCau.MaTietBatDauDeXuat;
          updated.MaTietKetThuc = yeuCau.MaTietKetThucDeXuat;
        } else {
          updated.MaPhongHoc = yeuCau.MaPhongHocDeXuat;
        }
        await tx.buoihoc.update({
          where: { MaBuoiHoc: buoiHoc.MaBuoiHoc },
          data: {
            NgayHoc: updated.NgayHoc,
            MaTietBatDau: updated.MaTietBatDau,
            MaTietKetThuc: updated.MaTietKetThuc,
            MaPhongHoc: updated.MaPhongHoc,
            NguoiSua: EMPTY_GUID,
            ThoiGianSua: nowTime,
          },
        });
        await tx.yeucaulichday.update({
          where: { MaYeuCau: yeuCau.MaYeuCau },
          data: { TrangThaiDuyet: 1, GhiChuAdmin: ghiChuAdmin, NguoiSua: EMPTY_GUID, ThoiGianSua: nowTime },
        });

        if (
          await hasScheduleConflict(tx, updated, yeuCau.MaGiangVien, updated.NgayHoc, updated.MaTietBatDau, updated.MaTietKetThuc, updated.MaPhongHoc)
        ) {
          res.message = 'Lịch đã thay đổi đồng thời; yêu cầu chưa được duyệt';
          throw new Rollback({ response: res, shouldNotify: false });
        }

        res.message =
          loai === 1
            ? 'Yêu cầu đổi thời gian đã được duyệt. Lịch dạy đã được cập nhật'
            : 'Yêu cầu đổi phòng đã được duyệt. Phòng học đã được cập nhật';
        res.success = true;
        return { response: res, shouldNotify: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Rollback) return err.result;
    throw err;
  }
}

function sameGuid(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return a == null && b == null;
  return a.toLowerCase() === b.toLowerCase();
}

async function hasScheduleConflict(
  db: Db,
  current: { MaBuoiHoc: string; MaLopHoc: string },
  teacherId: string,
  date: Date,
  start: number,
  end: number,
  roomId: string | null,
): Promise<boolean> {
  const overlapping: Prisma.buoihocWhereInput = {
    MaBuoiHoc: { not: current.MaBuoiHoc },
    NgayHoc: date,
    MaTietBatDau: { lte: end },
    MaTietKetThuc: { gte: start },
    ...notDeleted,
  };
  const first = await db.buoihoc.count({
    where: {
      AND: [overlapping, { OR: [{ MaLopHoc: current.MaLopHoc }, ...(roomId ? [{ MaPhongHoc: roomId }] : [])] }],
    },
  });
  if (first > 0) return true;
  const viaTeacher = await db.buoihoc.count({
    where: {
      AND: [
        overlapping,
        {
          lophoc: {
            giangvienlophoc: {
              some: {
                MaGiangVien: teacherId,
                AND: [{ OR: [{ DaXoa: null }, { DaXoa: false }] }, { OR: [{ TrangThai: null }, { TrangThai: true }] }],
              },
            },
          },
        },
      ],
    },
  });
  return viaTeacher > 0;
}

/** Tu choi yeu cau doi lich. */
export async function rejectRequest(maYeuCau: string, ghiChuAdmin: string | null = null): Promise<ScheduleChangeRequestResponseDto> {
  const res = response(maYeuCau);
  const yeuCau = await prisma.yeucaulichday.findFirst({ where: { MaYeuCau: maYeuCau } });
  if (!yeuCau || yeuCau.DaXoa === true) {
    res.message = 'Yêu cầu không tồn tại';
    return res;
  }
  if (yeuCau.TrangThaiDuyet !== 0) {
    res.message = 'Yêu cầu này đã được xử lý';
    return res;
  }
  try {
    const updated = await prisma.yeucaulichday.update({
      where: { MaYeuCau: yeuCau.MaYeuCau },
      data: { TrangThaiDuyet: 2, GhiChuAdmin: ghiChuAdmin, NguoiSua: EMPTY_GUID, ThoiGianSua: new Date() },
    });
    res.message = 'Yêu cầu đã bị từ chối';
    res.success = true;
    await notifyRejection(updated);
  } catch (err) {
    res.message = `Lỗi khi xử lý yêu cầu: ${(err as Error)?.message ?? String(err)}`;
  }
  return res;
}

interface NotificationRow {
  maThongBao: string;
  tieuDe: string;
  noiDung: string;
  maNguoiDung: string;
}

/** Giong 1 lan SaveChanges cua EF: them tat ca thong bao trong 1 transaction (loi -> khong luu gi). */
async function saveNotifications(rows: NotificationRow[]) {
  if (rows.length === 0) return;
  await prisma.$transaction(async (tx) => {
    const nowTime = new Date();
    await tx.thongbao.createMany({
      data: rows.map((r) => ({
        MaThongBao: r.maThongBao,
        TieuDe: r.tieuDe,
        NoiDung: r.noiDung,
        TrangThai: true,
        DaXoa: false,
        ThoiGianTao: nowTime,
        DoiTuong: 'Tat_Ca',
      })),
    });
    await tx.nguoinhanthongbao.createMany({
      data: rows.map((r) => ({ MaThongBao: r.maThongBao, MaNguoiDung: r.maNguoiDung, DaDoc: false, DaXoa: false })),
    });
  });
}

async function notifyAdminAboutNewRequest(
  yeuCau: { MaYeuCau: string; LoaiYeuCau: number | null; NgayHocDeXuat: Date; MaTietBatDauDeXuat: number; MaTietKetThucDeXuat: number; MaPhongHocDeXuat: string | null; LyDo: string | null },
  teacherName: string,
  className: string,
  buoiHoc: { NgayHoc: Date; MaTietBatDau: number; MaTietKetThuc: number },
) {
  try {
    const roomName = yeuCau.MaPhongHocDeXuat
      ? ((await prisma.phonghoc.findFirst({ where: { MaPhongHoc: yeuCau.MaPhongHocDeXuat }, select: { TenPhong: true } }))?.TenPhong ?? null)
      : null;

    const requestedDetails =
      yeuCau.LoaiYeuCau === 1
        ? `đổi thời gian sang ${formatDate(yeuCau.NgayHocDeXuat, 'dd/MM/yyyy')}, ca ${yeuCau.MaTietBatDauDeXuat}-${yeuCau.MaTietKetThucDeXuat}`
        : `đổi phòng sang ${roomName ?? 'phòng mới'}`;
    const currentSchedule = `buổi ${formatDate(buoiHoc.NgayHoc, 'dd/MM/yyyy')} ca ${buoiHoc.MaTietBatDau}-${buoiHoc.MaTietKetThuc}`;
    const title = 'Yêu cầu đổi lịch dạy mới';
    const content = `${teacherName} yêu cầu đổi lịch lớp ${className} (${currentSchedule}), ${requestedDetails}. Lý do: ${yeuCau.LyDo ?? 'không có'}.`;

    const admins = (await prisma.nguoidung.findMany({ where: { LoaiTaiKhoan: 1 }, select: { MaNguoiDung: true } })).map((a) => a.MaNguoiDung);

    await saveNotifications(admins.map((adminId) => ({ maThongBao: randomUUID(), tieuDe: title, noiDung: content, maNguoiDung: adminId })));

    const payload = {
      maYeuCau: yeuCau.MaYeuCau,
      teacher: teacherName,
      className,
      currentSchedule,
      requestedDetails,
      reason: yeuCau.LyDo,
    };
    for (const adminId of admins) emitToUser('/chat', adminId.toLowerCase(), 'NewScheduleChangeRequest', payload);
  } catch (err) {
    console.log(`Error sending notification to admin: ${(err as Error)?.message ?? err}`);
  }
}

async function notifyApproval(yeuCau: {
  MaGiangVien: string;
  MaLopHoc: string;
  LoaiYeuCau: number | null;
  NgayHocDeXuat: Date;
  MaTietBatDauDeXuat: number;
  MaTietKetThucDeXuat: number;
}) {
  try {
    const message =
      yeuCau.LoaiYeuCau === 1
        ? `Yêu cầu đổi lịch dạy của bạn đã được duyệt. Lịch mới: ${formatDate(yeuCau.NgayHocDeXuat, 'dd/MM/yyyy')}, ca ${yeuCau.MaTietBatDauDeXuat}-${yeuCau.MaTietKetThucDeXuat}`
        : 'Yêu cầu đổi phòng dạy của bạn đã được duyệt.';

    // Ban .NET gui cho MaNguoiDung = MaGiangVien (ma ho so, khong phai ma nguoi dung) -> giu nguyen.
    const rows: NotificationRow[] = [
      { maThongBao: randomUUID(), tieuDe: 'Yêu cầu đổi lịch được phê duyệt', noiDung: message, maNguoiDung: yeuCau.MaGiangVien },
    ];

    const studentIds = [
      ...new Set((await prisma.hocsinhlophoc.findMany({ where: { MaLopHoc: yeuCau.MaLopHoc }, select: { MaHocSinh: true } })).map((h) => h.MaHocSinh)),
    ];
    const students = studentIds.length
      ? await prisma.hocsinh.findMany({ where: { MaHocSinh: { in: studentIds } }, select: { MaNguoiDung: true } })
      : [];
    for (const s of students) {
      rows.push({
        maThongBao: randomUUID(),
        tieuDe: 'Thông báo thay đổi lịch học',
        noiDung: 'Lịch học của lớp bạn đã được thay đổi.',
        maNguoiDung: s.MaNguoiDung,
      });
    }
    await saveNotifications(rows);
  } catch (err) {
    console.log(`Error sending approval notification: ${(err as Error)?.message ?? err}`);
  }
}

async function notifyRejection(yeuCau: { MaGiangVien: string; GhiChuAdmin: string | null }) {
  try {
    let message = 'Yêu cầu đổi lịch của bạn đã bị từ chối.';
    if (yeuCau.GhiChuAdmin) message += ` Lý do: ${yeuCau.GhiChuAdmin}`;
    await saveNotifications([
      { maThongBao: randomUUID(), tieuDe: 'Yêu cầu đổi lịch bị từ chối', noiDung: message, maNguoiDung: yeuCau.MaGiangVien },
    ]);
  } catch (err) {
    console.log(`Error sending rejection notification: ${(err as Error)?.message ?? err}`);
  }
}
