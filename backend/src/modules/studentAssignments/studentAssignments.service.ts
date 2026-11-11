import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { enqueueAiJob } from '../../shared/aiJobQueue.js';
import { grade, hasValue } from '../../shared/autoGrader.js';
import * as repo from './studentAssignments.repository.js';
import {
  type AssignmentEnvelope,
  NetDateTime,
  netLocal,
  type StudentSubmitRequest,
  deserializeNoiDung,
  jsonElementToString,
  parseEnvelope,
  parseJsonText,
  parseQuestionContent,
  ticks,
} from './studentAssignments.json.js';

// Chuyen tu Services/StudentAssignmentService.cs.
// Moi ham tra { data, errorCode, errorMessage } giong tuple (Data, ErrorCode, ErrorMessage) ben .NET.

/** Chan tren cua so lan nop (go nham 999 khong bien thanh nop khong gioi han). */
const SO_LAN_NOP_TOI_DA_CHO_PHEP = 10;

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export type ServiceResult<T> = { data: T; errorCode: null; errorMessage: null } | { data: null; errorCode: string; errorMessage: string };
const okResult = <T>(data: T): ServiceResult<T> => ({ data, errorCode: null, errorMessage: null });
const err = <T>(errorCode: string, errorMessage: string): ServiceResult<T> => ({ data: null, errorCode, errorMessage });

const STUDENT_NOT_FOUND = ['STUDENT_PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ học sinh.'] as const;
const ASSIGNMENT_NOT_FOUND = ['ASSIGNMENT_NOT_FOUND', 'Bài tập không tồn tại hoặc bạn không được giao bài này.'] as const;

// ------------------------------------ DTO ------------------------------------------
// Thu tu khoa = thu tu khai bao thuoc tinh trong DTOs/StudentAssignmentDtos.cs.

export interface StudentQuestionDto {
  maCauHoiDe: string;
  diemCuaCau: Decimal | null;
  thuTu: number | null;
  soCau: string | null;
  noiDung: unknown;
}

export interface StudentAssignmentDetailDto {
  maBaiTap: string;
  tenBaiTap: string;
  moTa: string | null;
  thoiGianLamBai: number | null;
  diemToiDa: Decimal | null;
  huongDanChung: string | null;
  noiDungNguCanhChung: string | null;
  soLuongCauHoi: number;
  danhSachTu: (string | null)[] | null;
  amThanhLink: string | null;
  hinhAnhLink: string | null;
  loaiBaiTap: string;
  trinhDo: string;
  kyNang: string;
  mucDo: string;
  code: string | null;
  tenLop: string | null;
  ghiChuGiaoBai: string | null;
  moLuc: NetDateTime | null;
  hanNop: Date | NetDateTime | null;
  soLanLamToiDa: number;
  trangThai: string;
  coTheLamBai: boolean;
  soLanDaNop: number;
  daNop: boolean;
  diemGanNhat: Decimal | null;
  dangChoCham: boolean;
  soLanConLai: number;
  cauHoi: StudentQuestionDto[];
}

export interface StudentQuestionResultDto {
  maCauHoiDe: string;
  soCau: string | null;
  thuTu: number | null;
  diemToiDa: Decimal;
  diemDatDuoc: Decimal;
  ketQua: string;
  danhDauXemLai: boolean;
  dapAnDung: unknown;
  giaiThich: string | null;
  dapAnHocVien: unknown;
}

export interface StudentSubmitResultDto {
  maNopBai: string;
  maBaiTap: string;
  lanNop: number;
  thoiGianNop: Date | NetDateTime;
  thoiGianThucTeGiay: number;
  diemSo: Decimal;
  diemToiDa: Decimal;
  tongSoCau: number;
  soCauDung: number;
  soCauSai: number;
  soCauChuaLam: number;
  soCauChoCham: number;
  dangChoCham: boolean;
  soLanConLai: number;
  choXemDapAn: boolean;
  chiTiet: StudentQuestionResultDto[];
}

function newDetailDto(): StudentAssignmentDetailDto {
  return {
    maBaiTap: '00000000-0000-0000-0000-000000000000',
    tenBaiTap: '',
    moTa: null,
    thoiGianLamBai: null,
    diemToiDa: null,
    huongDanChung: null,
    noiDungNguCanhChung: null,
    soLuongCauHoi: 0,
    danhSachTu: null,
    amThanhLink: null,
    hinhAnhLink: null,
    loaiBaiTap: '',
    trinhDo: '',
    kyNang: '',
    mucDo: '',
    code: null,
    tenLop: null,
    ghiChuGiaoBai: null,
    moLuc: null,
    hanNop: null,
    soLanLamToiDa: 1,
    trangThai: 'OPEN',
    coTheLamBai: true,
    soLanDaNop: 0,
    daNop: false,
    diemGanNhat: null,
    dangChoCham: false,
    soLanConLai: 0,
    cauHoi: [],
  };
}

// ------------------------------------ helpers --------------------------------------

/** So lan nop cho phep, ep ve [1, 10]. */
const resolveMaxAttempts = (env: AssignmentEnvelope) => Math.min(Math.max(env.maxAttempts, 1), SO_LAN_NOP_TOI_DA_CHO_PHEP);

/** Han nop uu tien su kien lop (admin dat khi giao bai), khong co thi lui ve envelope. */
function applyWindow(dto: StudentAssignmentDetailDto, env: AssignmentEnvelope, window: repo.StudentAssignmentWindow | undefined) {
  const now = Date.now();
  dto.moLuc = env.openAt;
  dto.hanNop = window?.hanNop ?? env.dueAt;

  if (dto.moLuc && ticks(dto.moLuc) > now) {
    dto.trangThai = 'PENDING';
    dto.coTheLamBai = false;
    return;
  }
  if (dto.hanNop && ticks(dto.hanNop) < now) {
    dto.trangThai = 'CLOSED';
    dto.coTheLamBai = false;
    return;
  }
  dto.trangThai = 'OPEN';
  dto.coTheLamBai = true;
}

/** Het luot nop thi khong con lam duoc nua, du van trong han. */
function applyAttempts(dto: StudentAssignmentDetailDto) {
  dto.daNop = dto.soLanDaNop > 0;
  if (dto.soLanConLai === 0 && dto.soLanDaNop > 0) {
    dto.coTheLamBai = false;
    if (dto.trangThai === 'OPEN') dto.trangThai = 'SUBMITTED';
  }
}

const categoryName = (dict: Map<number, string>, id: number | null) => (id != null ? dict.get(id) ?? '' : '');

const orderByThuTu = <T extends { ThuTu: number | null }>(items: T[]) =>
  [...items].sort((a, b) => (a.ThuTu ?? 2147483647) - (b.ThuTu ?? 2147483647));

const isBlank = (s: string | null | undefined) => s == null || s.trim() === '';

// ------------------------------------ danh sach ------------------------------------

export async function getStudentAssignments(userId: string): Promise<ServiceResult<StudentAssignmentDetailDto[]>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const assignments = await repo.getStudentAssignments(userId);
  const categoryIds = assignments.flatMap((a) => [a.TrinhDo, a.KyNang, a.MucDo]).filter((x): x is number => x != null);
  const dict = await repo.getCategoryDictionary(categoryIds);
  const ids = assignments.map((a) => a.MaBaiTap.toLowerCase());
  const windows = await repo.getAssignmentWindows(userId, ids);
  const submissions = await repo.getSubmissionSummaries(userId, ids);

  const dtos = assignments.map((a) => {
    const envelope = parseEnvelope(a.moTaText);
    const key = a.MaBaiTap.toLowerCase();
    const window = windows.get(key);
    const submission = submissions.get(key);

    const dto = newDetailDto();
    dto.maBaiTap = key;
    dto.tenBaiTap = a.TenBaiTap;
    // Chi lay phan mo ta, khong tra ca cuc JSON cau hinh.
    dto.moTa = envelope.description;
    dto.code = envelope.code;
    dto.thoiGianLamBai = a.ThoiGianLamBai;
    dto.diemToiDa = a.DiemToiDa;
    dto.loaiBaiTap = a.chitietdanhmuc?.TenChiTiet ?? '';
    dto.trinhDo = categoryName(dict, a.TrinhDo);
    dto.kyNang = categoryName(dict, a.KyNang);
    dto.mucDo = categoryName(dict, a.MucDo);
    dto.soLuongCauHoi = a.baitapcauhoi.length;
    dto.tenLop = window?.tenLop ?? null;
    dto.ghiChuGiaoBai = window?.ghiChu ?? null;
    dto.soLanLamToiDa = resolveMaxAttempts(envelope);
    dto.soLanDaNop = submission?.soLanDaNop ?? 0;
    dto.diemGanNhat = submission?.diemGanNhat ?? null;
    dto.dangChoCham = submission?.dangChoCham ?? false;
    dto.soLanConLai = Math.max(0, dto.soLanLamToiDa - dto.soLanDaNop);

    applyWindow(dto, envelope, window);
    applyAttempts(dto);
    return dto;
  });

  return okResult(dtos);
}

// ------------------------------------ chi tiet (bat dau lam) -----------------------

export async function getAssignmentForStudent(userId: string, assignmentId: string): Promise<ServiceResult<StudentAssignmentDetailDto>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const a = await repo.getAssignmentById(assignmentId, userId);
  if (!a) return err(...ASSIGNMENT_NOT_FOUND);

  const key = a.MaBaiTap.toLowerCase();
  const dict = await repo.getCategoryDictionary([a.TrinhDo, a.KyNang, a.MucDo].filter((x): x is number => x != null));
  const window = (await repo.getAssignmentWindows(userId, [key])).get(key);
  const envelope = parseEnvelope(a.moTaText);

  const dto = newDetailDto();
  dto.maBaiTap = key;
  dto.tenBaiTap = a.TenBaiTap;
  dto.moTa = envelope.description;
  dto.code = envelope.code;
  dto.thoiGianLamBai = a.ThoiGianLamBai;
  dto.diemToiDa = a.DiemToiDa;
  dto.huongDanChung = a.HuongDanChung;
  dto.noiDungNguCanhChung = a.NoiDungNguCanhChung;
  dto.loaiBaiTap = a.chitietdanhmuc?.TenChiTiet ?? '';
  dto.trinhDo = categoryName(dict, a.TrinhDo);
  dto.kyNang = categoryName(dict, a.KyNang);
  dto.mucDo = categoryName(dict, a.MucDo);
  dto.soLuongCauHoi = a.baitapcauhoi.length;
  dto.tenLop = window?.tenLop ?? null;
  dto.ghiChuGiaoBai = window?.ghiChu ?? null;
  dto.danhSachTu = envelope.danhSachTu && envelope.danhSachTu.length > 0 ? envelope.danhSachTu : null;
  dto.amThanhLink = envelope.amThanhLink;
  dto.hinhAnhLink = envelope.hinhAnhLink;
  dto.soLanLamToiDa = resolveMaxAttempts(envelope);

  const submission = (await repo.getSubmissionSummaries(userId, [key])).get(key);
  if (submission) {
    dto.soLanDaNop = submission.soLanDaNop;
    dto.diemGanNhat = submission.diemGanNhat;
    dto.dangChoCham = submission.dangChoCham;
  }
  dto.soLanConLai = Math.max(0, dto.soLanLamToiDa - dto.soLanDaNop);

  applyWindow(dto, envelope, window);
  applyAttempts(dto);

  dto.cauHoi = orderByThuTu(a.baitapcauhoi).map((q) => {
    let safeContent: unknown = {};
    try {
      const parsed = deserializeNoiDung(q.NoiDung);
      if (parsed) {
        let loai = parsed.loai;
        if (loai == null || loai === '') {
          const debaiStr = jsonElementToString(parsed.deBai);
          if (debaiStr.includes('danhSachTrai') && debaiStr.includes('danhSachPhai')) loai = 'matching';
          else if (debaiStr.includes('doanVanTruoc') && debaiStr.includes('doanVanSau')) loai = 'fill-in-the-blanks';
          else if (debaiStr.includes('luaChon')) loai = 'multiple-choice';
          else if (debaiStr.includes('danhSach')) loai = 'sentence-arrangement';
          else loai = 'multiple-choice';
        }
        safeContent = {
          debai: parsed.deBai === undefined ? null : parsed.deBai,
          tieuchi: parsed.tieuChi,
          la_tu_luan: parsed.laTuLuan,
          loai,
        };
      }
    } catch {
      // JSON sai kieu -> tra object rong
    }
    return {
      maCauHoiDe: q.MaCauHoiDe.toLowerCase(),
      diemCuaCau: q.DiemCuaCau,
      thuTu: q.ThuTu,
      soCau: q.SoCau,
      noiDung: safeContent,
    };
  });

  return okResult(dto);
}

// ------------------------------------ nop bai --------------------------------------

export async function submitAssignment(
  userId: string,
  assignmentId: string,
  request: StudentSubmitRequest,
): Promise<ServiceResult<StudentSubmitResultDto>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const assignment = await repo.getAssignmentById(assignmentId, userId);
  if (!assignment) return err(...ASSIGNMENT_NOT_FOUND);

  const eventId = await repo.getEventIdForStudent(userId, assignmentId);
  if (eventId == null) return err('ASSIGNMENT_NOT_ASSIGNED', 'Bài tập chưa được giao cho bạn.');

  const envelope = parseEnvelope(assignment.moTaText);
  const window = (await repo.getAssignmentWindows(userId, [assignmentId])).get(assignmentId);

  // Chan nop khi ngoai cua so lam bai.
  const probe = newDetailDto();
  applyWindow(probe, envelope, window);
  if (!probe.coTheLamBai) {
    return err('ASSIGNMENT_CLOSED', probe.trangThai === 'PENDING' ? 'Bài tập chưa tới giờ làm.' : 'Bài tập đã quá hạn nộp.');
  }

  const maxAttempts = resolveMaxAttempts(envelope);
  const daNop = await repo.countSubmissions(eventId, student.MaHocSinh);
  if (daNop >= maxAttempts) {
    return err(
      'ASSIGNMENT_ATTEMPTS_EXCEEDED',
      maxAttempts === 1 ? 'Bạn đã nộp bài này rồi. Bài này chỉ được nộp một lần.' : `Bạn đã nộp đủ ${maxAttempts} lần cho bài này.`,
    );
  }

  // ---- Cham ----
  // GroupBy(MaCauHoiDe).Last(): phan tu null -> NullReferenceException ben .NET (500).
  const answers = new Map<string, NonNullable<StudentSubmitRequest['cauTraLoi'][number]>>();
  for (const a of request.cauTraLoi) {
    if (a === null) throw new TypeError('Object reference not set to an instance of an object.');
    answers.set(a.maCauHoiDe, a);
  }

  const now = new Date();
  const submissionId = randomUUID();
  const details: Prisma.chitietnopbaiCreateManyInput[] = [];
  const result: StudentSubmitResultDto = {
    maNopBai: submissionId,
    maBaiTap: assignmentId,
    lanNop: daNop + 1,
    thoiGianNop: netLocal(now),
    thoiGianThucTeGiay: Math.max(0, request.thoiGianThucTeGiay),
    diemSo: new Decimal(0),
    diemToiDa: new Decimal(0),
    tongSoCau: 0,
    soCauDung: 0,
    soCauSai: 0,
    soCauChuaLam: 0,
    soCauChoCham: 0,
    dangChoCham: false,
    soLanConLai: Math.max(0, maxAttempts - (daNop + 1)),
    choXemDapAn: envelope.showAnswerAfterDeadline,
    chiTiet: [],
  };

  const trangThaiDaLam = await repo.getCategoryId('TRANG_THAI_CAU_LAM', 'CAU_DA_LAM');
  const trangThaiChuaLam = await repo.getCategoryId('TRANG_THAI_CAU_LAM', 'CAU_CHUA_LAM');
  const trangThaiXemLai = await repo.getCategoryId('TRANG_THAI_CAU_LAM', 'CAU_XEM_LAI');
  const chamChoCham = await repo.getCategoryId('TRANG_THAI_CHAM_BAI', 'CHAM_CHO_CHAM');
  const chamDaCham = await repo.getCategoryId('TRANG_THAI_CHAM_BAI', 'CHAM_DA_CHAM');

  for (const question of orderByThuTu(assignment.baitapcauhoi)) {
    const maCauHoiDe = question.MaCauHoiDe.toLowerCase();
    const noiDung = parseQuestionContent(question.NoiDung);
    const answer = answers.get(maCauHoiDe);

    const diemToiDa = question.DiemCuaCau ?? new Decimal(1);
    const g = grade(noiDung.dapAn, answer?.dapAn ?? null, noiDung.laTuLuan);
    // Math.Round(diemToiDa * TiLe, 2, MidpointRounding.AwayFromZero)
    const diemDatDuoc = diemToiDa.times(new Decimal(g.tiLe)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    result.tongSoCau++;
    switch (g.ketQua) {
      case 'CORRECT':
      case 'PARTIAL':
        result.soCauDung++;
        break;
      case 'WRONG': result.soCauSai++; break;
      case 'BLANK': result.soCauChuaLam++; break;
      case 'PENDING': result.soCauChoCham++; break;
    }
    result.diemToiDa = result.diemToiDa.plus(diemToiDa);
    result.diemSo = result.diemSo.plus(diemDatDuoc);

    const show = envelope.showAnswerAfterDeadline;
    result.chiTiet.push({
      maCauHoiDe,
      soCau: question.SoCau,
      thuTu: question.ThuTu,
      diemToiDa,
      diemDatDuoc,
      ketQua: g.ketQua,
      danhDauXemLai: answer?.danhDauXemLai ?? false,
      // Chi lo dap an khi admin cho phep.
      dapAnDung: show ? noiDung.dapAn : null,
      giaiThich: show ? noiDung.giaiThich : null,
      dapAnHocVien: show ? (answer?.dapAn ?? null) : null,
    });

    const coDapAn = hasValue(answer?.dapAn);
    const detail: Prisma.chitietnopbaiCreateManyInput = {
      MaChiTiet: randomUUID(),
      MaNopBai: submissionId,
      MaCauHoi: maCauHoiDe,
      TrangThaiCau: answer?.danhDauXemLai === true ? trangThaiXemLai : coDapAn ? trangThaiDaLam : trangThaiChuaLam,
      TrangThaiChamTay: g.ketQua === 'PENDING' ? chamChoCham : chamDaCham,
      DanhDauXemLai: answer?.danhDauXemLai ?? false,
      NguoiTao: userId,
      ThoiGianTao: now,
      TrangThai: true,
      DaXoa: false,
    };
    if (coDapAn) detail.DapAnHocVien = answer!.dapAn as Prisma.InputJsonValue;
    // .NET gan DiemDatDuoc = null cho cau PENDING, nhung EF bo qua cot co HasDefaultValueSql
    // khi gia tri la null -> DB luu mac dinh 0.00. Bo trong cot o day de ket qua giong het.
    if (g.ketQua !== 'PENDING') detail.DiemDatDuoc = diemDatDuoc;
    details.push(detail);
  }

  result.dangChoCham = result.soCauChoCham > 0;

  await repo.saveSubmission(
    {
      MaNopBai: submissionId,
      MaSuKien: eventId,
      MaHocSinh: student.MaHocSinh,
      ThoiGianBatDau: new Date(now.getTime() - result.thoiGianThucTeGiay * 1000),
      ThoiGianNop: now,
      DiemSo: result.diemSo,
      ThoiGianThucTe: result.thoiGianThucTeGiay,
      TrangThaiChamBai: result.dangChoCham ? chamChoCham : chamDaCham,
      LanNop: result.lanNop,
      NguoiTao: userId,
      ThoiGianTao: now,
      TrangThai: true,
      DaXoa: false,
    },
    details,
  );

  // Cham nen: AI1 nhan xet + tu cham cau tu luan, roi tu day kich hoat AI2/AI3.
  enqueueAiJob({ kind: 'Ai1', maNopBai: submissionId });

  return okResult(result);
}

// ------------------------------------ ket qua --------------------------------------

export async function getLatestResult(userId: string, assignmentId: string): Promise<ServiceResult<StudentSubmitResultDto>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const eventId = await repo.getEventIdForStudent(userId, assignmentId);
  if (eventId == null) return err(...ASSIGNMENT_NOT_FOUND);

  const submission = await repo.getLatestSubmission(eventId, student.MaHocSinh);
  if (!submission) return err('SUBMISSION_NOT_FOUND', 'Bạn chưa nộp bài này.');

  const assignment = await repo.getAssignmentById(assignmentId, userId);
  const envelope = parseEnvelope(assignment?.moTaText);
  const maxAttempts = resolveMaxAttempts(envelope);
  const daNop = await repo.countSubmissions(eventId, student.MaHocSinh);

  // ToDictionary: trung khoa -> ArgumentException (500) giong ban .NET.
  const byQuestion = new Map<string, repo.SubmissionDetailRow>();
  for (const d of submission.chitiet) {
    const k = d.MaCauHoi.toLowerCase();
    if (byQuestion.has(k)) throw new Error('An item with the same key has already been added.');
    byQuestion.set(k, d);
  }

  const result: StudentSubmitResultDto = {
    maNopBai: submission.MaNopBai.toLowerCase(),
    maBaiTap: assignmentId,
    lanNop: submission.LanNop ?? 1,
    thoiGianNop: submission.ThoiGianNop ?? submission.ThoiGianTao ?? netLocal(new Date()),
    thoiGianThucTeGiay: submission.ThoiGianThucTe ?? 0,
    diemSo: submission.DiemSo ?? new Decimal(0),
    diemToiDa: new Decimal(0),
    tongSoCau: 0,
    soCauDung: 0,
    soCauSai: 0,
    soCauChuaLam: 0,
    soCauChoCham: 0,
    dangChoCham: false,
    soLanConLai: Math.max(0, maxAttempts - daNop),
    choXemDapAn: envelope.showAnswerAfterDeadline,
    chiTiet: [],
  };

  for (const question of orderByThuTu(assignment?.baitapcauhoi ?? [])) {
    const maCauHoiDe = question.MaCauHoiDe.toLowerCase();
    const noiDung = parseQuestionContent(question.NoiDung);
    const detail = byQuestion.get(maCauHoiDe);

    const diemToiDa = question.DiemCuaCau ?? new Decimal(1);
    const diemDatDuoc = detail?.DiemDatDuoc ?? new Decimal(0);
    const coTraLoi = !isBlank(detail?.DapAnHocVien);

    const ketQua =
      detail != null && detail.DiemDatDuoc == null
        ? 'PENDING'
        : !coTraLoi
          ? 'BLANK'
          : diemDatDuoc.gte(diemToiDa)
            ? 'CORRECT'
            : diemDatDuoc.gt(0)
              ? 'PARTIAL'
              : 'WRONG';

    result.tongSoCau++;
    switch (ketQua) {
      case 'CORRECT':
      case 'PARTIAL':
        result.soCauDung++;
        break;
      case 'WRONG': result.soCauSai++; break;
      case 'BLANK': result.soCauChuaLam++; break;
      case 'PENDING': result.soCauChoCham++; break;
    }
    result.diemToiDa = result.diemToiDa.plus(diemToiDa);

    const show = envelope.showAnswerAfterDeadline;
    result.chiTiet.push({
      maCauHoiDe,
      soCau: question.SoCau,
      thuTu: question.ThuTu,
      diemToiDa,
      diemDatDuoc,
      ketQua,
      danhDauXemLai: detail?.DanhDauXemLai ?? false,
      dapAnDung: show ? noiDung.dapAn : null,
      giaiThich: show ? noiDung.giaiThich : null,
      dapAnHocVien: show ? parseJsonText(detail?.DapAnHocVien) : null,
    });
  }

  result.dangChoCham = result.soCauChoCham > 0;
  return okResult(result);
}

// ------------------------------------ nhan xet AI ----------------------------------

export interface StudentAi1FeedbackDto {
  maBaiTapGoc: string | null;
  tenBaiTapGoc: string | null;
  soCauDung: number | null;
  soCauTong: number | null;
  noiDungNhanXet: string | null;
  diemTuLuanAiCham: Decimal | null;
  chiTietCauHoi: unknown;
  coChiTietCauHoi: boolean;
  trangThai: string;
}

export interface StudentAiFeedbackResultDto {
  maNopBai: string;
  dangXuLy: boolean;
  choXemChiTiet: boolean;
  nhanXetTungBai: StudentAi1FeedbackDto[];
  nhanXetTongThe: { noiDungNhanXet: string | null; xepLoai: string | null; trangThai: string } | null;
}

export async function getAiFeedback(userId: string, assignmentId: string): Promise<ServiceResult<StudentAiFeedbackResultDto>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const eventId = await repo.getEventIdForStudent(userId, assignmentId);
  if (eventId == null) return err(...ASSIGNMENT_NOT_FOUND);

  const submission = await repo.getLatestSubmission(eventId, student.MaHocSinh);
  if (!submission) return err('SUBMISSION_NOT_FOUND', 'Bạn chưa nộp bài này.');

  const nhomAi1 = await repo.getAi1Feedback(submission.MaNopBai);
  const ai2 = await repo.getAi2Feedback(submission.MaNopBai);

  // Chi tiet tung cau cua AI1 neu ro dap an dung -> cung dieu kien voi man xem dap an.
  const choXemDapAn = parseEnvelope(await repo.getAssignmentMoTa(assignmentId)).showAnswerAfterDeadline;

  return okResult({
    maNopBai: submission.MaNopBai.toLowerCase(),
    // Chua co nhom AI1 nao (job chua chay xong) hoac con nhom PENDING -> van dang xu ly.
    dangXuLy: nhomAi1.length === 0 || nhomAi1.some((x) => x.TrangThai === 'PENDING'),
    choXemChiTiet: choXemDapAn,
    nhanXetTungBai: nhomAi1.map((x) => ({
      maBaiTapGoc: x.MaBaiTapGoc?.toLowerCase() ?? null,
      tenBaiTapGoc: x.TenBaiTapGoc,
      soCauDung: x.SoCauDung,
      soCauTong: x.SoCauTong,
      noiDungNhanXet: x.NoiDungNhanXet,
      diemTuLuanAiCham: x.DiemTuLuanAiCham,
      chiTietCauHoi: choXemDapAn ? parseJsonText(x.ChiTietCauHoi) : null,
      coChiTietCauHoi: !isBlank(x.ChiTietCauHoi),
      trangThai: x.TrangThai,
    })),
    nhanXetTongThe: ai2 == null ? null : { noiDungNhanXet: ai2.NoiDungNhanXet, xepLoai: ai2.XepLoai, trangThai: ai2.TrangThai },
  });
}

export interface StudentAiProgressDto {
  maKhoaHoc: string;
  tenKhoaHoc: string;
  noiDungNhanXet: string | null;
  thoiGianTao: Date | null;
}

export async function getAiProgress(userId: string): Promise<ServiceResult<StudentAiProgressDto[]>> {
  const student = await repo.getStudentByUserId(userId);
  if (!student) return err(...STUDENT_NOT_FOUND);

  const rows = await repo.getAiProgress(student.MaHocSinh);

  // Chi lay ban ghi moi nhat cho moi khoa hoc (repository da sap xep giam dan).
  const seen = new Map<string, StudentAiProgressDto>();
  for (const x of rows) {
    const key = x.MaKhoaHoc.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      maKhoaHoc: key,
      tenKhoaHoc: x.khoahoc?.TenKhoaHoc ?? '',
      noiDungNhanXet: x.NoiDungNhanXet,
      thoiGianTao: x.ThoiGianTao,
    });
  }
  return okResult([...seen.values()]);
}
