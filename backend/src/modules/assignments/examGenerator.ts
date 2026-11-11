import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import {
  active,
  categoryIdsByCode,
  embedSharedContext,
  err,
  isNullOrWhiteSpace,

  newEnvelope,
  normalizeOptional,
  notDeleted,
  parseMetadata,
  prisma,
  resolveCategoryId,
  serializeMetadata,
  type ActionError,
} from './common.js';
import {
  dec,
  DotnetRandom,

  formatNow,
  pickDistinct,
  roundAway2,
  shuffle,
  stableSortBy,
  tickCount,
  toJsonValue,
  jsonColumnText,
  type Decimal,
} from './dotnetTypes.js';
import type { ExamGenerateRequest, ExamGenerateSection, GeneratedExamBatchRequest, SourcePoolSection, SourcePoolUpsertRequest } from './dtos.js';
import { EMPTY_GUID } from './binder.js';

// Cau truc nguon (cautrucde), luu de da boc san o trinh duyet, va SINH DE TU DONG tu ngan hang de.

const INT_MAX = 2147483647;

/** AdminAssignmentSourcePoolSectionDto -> JSON camelCase */
const sourcePoolSectionJson = (s: SourcePoolSection | null) =>
  s && {
    rowId: s.RowId,
    skill: s.Skill,
    questionFormat: s.QuestionFormat,
    sourceBankIds: s.SourceBankIds,
    requiredCount: s.RequiredCount,
    scoreWeight: s.ScoreWeight,
    sectionOrder: s.SectionOrder,
  };

export async function saveSourcePool(userId: string, bankId: string, request: SourcePoolUpsertRequest): Promise<ActionError | { body: unknown }> {
  if (request.Sections.length === 0) return err(400, 'Cau truc nguon phai co it nhat 1 phan.', 'ADMIN_SOURCE_POOL_EMPTY');

  const courseExists =
    request.CourseId !== null && (await prisma.khoahoc.count({ where: { AND: [{ MaKhoaHoc: request.CourseId }, active] } })) > 0;
  if (request.CourseId !== null && !courseExists) {
    return err(404, 'Khong tim thay khoa hoc de luu cau truc nguon.', 'ADMIN_SOURCE_POOL_COURSE_NOT_FOUND');
  }

  const now = new Date();
  const id = randomUUID();
  await prisma.cautrucde.create({
    data: {
      MaCauTruc: id,
      TenCauTruc: isNullOrWhiteSpace(request.Name) ? 'Cau truc de' : request.Name.trim(),
      MoTa: toJsonValue({
        bankId,
        courseId: request.CourseId,
        level: request.Level,
        difficulty: request.Difficulty,
        skill: request.Skill,
        durationMinutes: request.DurationMinutes,
        totalScore: request.TotalScore,
        note: request.Note,
        shuffleExercises: request.ShuffleExercises,
        shuffleSections: request.ShuffleSections,
        shuffleAnswers: request.ShuffleAnswers,
        examCount: request.ExamCount,
        sections: request.Sections.map(sourcePoolSectionJson),
      }),
      NguoiTao: userId,
      ThoiGianTao: now,
      NguoiSua: userId,
      ThoiGianSua: now,
      TrangThai: true,
      DaXoa: false,
    },
  });
  return { body: ok({ templateId: id }, 'Da luu cau truc nguon thanh cong.') };
}

interface Child {
  SoCau: string | null;
  ThuTu: number | null;
  DiemCuaCau: Decimal | null;
  NoiDung: unknown;
}

async function loadChildren(ids: string[]): Promise<Map<string, Child[]>> {
  const rows = ids.length
    ? await prisma.baitapcauhoi.findMany({
        where: { MaBaiTap: { in: ids } },
        select: { MaBaiTap: true, SoCau: true, ThuTu: true, DiemCuaCau: true, NoiDung: true },
      })
    : [];
  const map = new Map<string, Child[]>();
  for (const r of rows) {
    const key = r.MaBaiTap.toLowerCase();
    const list = map.get(key) ?? [];
    list.push({ SoCau: r.SoCau, ThuTu: r.ThuTu, DiemCuaCau: r.DiemCuaCau, NoiDung: r.NoiDung });
    map.set(key, list);
  }
  for (const [k, list] of map) map.set(k, stableSortBy(list, (a, b) => (a.ThuTu ?? INT_MAX) - (b.ThuTu ?? INT_MAX)));
  return map;
}

/** `string.IsNullOrWhiteSpace(child.NoiDung)` voi cot json (EF doc ra chuoi). */
const blankNoiDung = (v: unknown) => isNullOrWhiteSpace(jsonColumnText(v));

const generatedSectionJson = (s: GeneratedExamBatchRequest['Exams'][number]['Sections'][number]) =>
  s && {
    rowId: s.RowId,
    skill: s.Skill,
    questionFormat: s.QuestionFormat,
    sourceBankIds: s.SourceBankIds,
    sourceBankNames: s.SourceBankNames,
    requiredCount: s.RequiredCount,
    scoreWeight: s.ScoreWeight,
    sectionOrder: s.SectionOrder,
    items: s.Items.map((i) => i && { id: i.Id, bankId: i.BankId, bankName: i.BankName, title: i.Title, content: i.Content }),
  };

/** POST question-bank/{bankId}/generate-exams: luu cac de da duoc boc san o trinh duyet. */
export async function generateExams(userId: string, request: GeneratedExamBatchRequest): Promise<ActionError | { body: unknown }> {
  if (request.Exams.length === 0) return err(400, 'Khong co de nao duoc sinh.', 'ADMIN_GENERATE_EXAMS_EMPTY');

  const allItems = request.Exams.flatMap((x) => x.Sections).flatMap((x) => x!.Items).map((x) => x!.Id);
  let courseId = request.CourseId;
  if (courseId === null) {
    const firstQuestionId = allItems[0] ?? EMPTY_GUID;
    if (firstQuestionId !== EMPTY_GUID) {
      const q = await prisma.nganhangcauhoi.findFirst({
        where: { AND: [{ MaCauHoi: firstQuestionId }, active] },
        select: { MaKhoaHoc: true },
      });
      courseId = q?.MaKhoaHoc ?? null;
    }
  }
  if (courseId === null) return err(400, 'Khong xac dinh duoc khoa hoc cho de sinh.', 'ADMIN_GENERATE_EXAMS_COURSE_REQUIRED');

  const examTypeId = await resolveCategoryId(prisma, 'LOAI_BAI_TAP', 'EXAM');
  if (examTypeId === null) return err(400, 'Khong tim thay danh muc loai bai tap EXAM.', 'ADMIN_GENERATE_EXAMS_TYPE_INVALID');

  const requestedIds = [...new Set(allItems.filter((x) => x !== EMPTY_GUID))];
  // Moi item duoc chon la MOT BAI TAP trong ngan hang (LaMauNganHang), keo theo toan bo cau con.
  const sources = requestedIds.length
    ? await prisma.baitap.findMany({
        where: { MaBaiTap: { in: requestedIds }, LaMauNganHang: true, ...notDeleted },
        select: { MaBaiTap: true, TenBaiTap: true, HuongDanChung: true, NoiDungNguCanhChung: true, MoTa: true },
      })
    : [];
  const childrenBySource = await loadChildren(sources.map((x) => x.MaBaiTap));
  const sourceById = new Map(sources.map((x) => [x.MaBaiTap.toLowerCase(), x]));

  const now = new Date();
  const createdExamIds: string[] = [];
  const pendingChildren: object[] = [];

  for (const exam of request.Exams) {
    const id = randomUUID();
    await prisma.baitap.create({
      data: {
        MaBaiTap: id,
        MaKhoaHoc: exam.CourseId ?? courseId,
        TenBaiTap: exam.Title.trim(),
        MoTa: toJsonValue({
          templateName: request.TemplateName,
          primaryBankId: request.PrimaryBankId,
          batchId: exam.BatchId,
          variantIndex: exam.VariantIndex,
          variantCount: exam.VariantCount,
          sourceBankIds: exam.SourceBankIds,
          level: exam.Level,
          difficulty: exam.Difficulty,
          skillSummary: exam.SkillSummary,
          skills: exam.Skills,
          totalScore: exam.TotalScore,
          durationMinutes: exam.DurationMinutes,
          shuffleAnswers: exam.ShuffleAnswers,
          note: exam.Note,
          sections: exam.Sections.map(generatedSectionJson),
        }),
        LoaiBaiTap: examTypeId,
        ThoiGianLamBai: exam.DurationMinutes,
        DiemToiDa: exam.TotalScore,
        NguoiTao: userId,
        ThoiGianTao: now,
        NguoiSua: userId,
        ThoiGianSua: now,
        TrangThai: true,
        DaXoa: false,
      },
    });

    let order = 1;
    for (const section of exam.Sections) {
      for (const item of section!.Items) {
        const source = sourceById.get(item!.Id);
        if (!source) continue;
        const danhSachTuNguon = parseMetadata(source.MoTa).DanhSachTu;
        for (const child of childrenBySource.get(source.MaBaiTap.toLowerCase()) ?? []) {
          if (blankNoiDung(child.NoiDung)) continue;
          pendingChildren.push({
            MaCauHoiDe: randomUUID(),
            MaBaiTap: id,
            MaCauHoi: null,
            DiemCuaCau: section!.ScoreWeight.gt(0) ? section!.ScoreWeight : (child.DiemCuaCau ?? dec(1)),
            ThuTu: order,
            SoCau: normalizeOptional(child.SoCau) ?? `Câu ${order}`,
            // Nhung bai doc + huong dan + word bank cua bai goc vao ban chup.
            NoiDung: toJsonValue(
              embedSharedContext(child.NoiDung, source.HuongDanChung, source.NoiDungNguCanhChung, danhSachTuNguon, source.MaBaiTap, source.TenBaiTap),
            ),
            NguoiTao: userId,
            ThoiGianTao: now,
          });
          order++;
        }
      }
    }
    createdExamIds.push(id);
  }

  if (pendingChildren.length) await prisma.baitapcauhoi.createMany({ data: pendingChildren as never });

  return { body: ok({ createdCount: createdExamIds.length, examIds: createdExamIds }, 'Da sinh va luu de thanh cong.') };
}

// =====================================================================================
// SINH DE TU DONG: backend nhan CAU TRUC de va tu boc bai tu ngan hang (co seed tai lap duoc).
// =====================================================================================

/** Cap phat truoc N ma de lien tiep chua bi dung, dang PREFIX-yyMMdd-001. */
async function reserveExamCodes(prefix: string, count: number): Promise<string[]> {
  const stamp = `${prefix}-${formatNow('yyMMdd')}-`;
  const like = `${stamp}%`;
  const used = await prisma.$queryRaw<{ Value: string | null }[]>`
SELECT JSON_UNQUOTE(JSON_EXTRACT(\`MoTa\`, '$.code')) AS \`Value\`
FROM \`baitap\`
WHERE JSON_UNQUOTE(JSON_EXTRACT(\`MoTa\`, '$.code')) LIKE ${like}`;
  const taken = new Set(used.map((x) => x.Value).filter((x): x is string => !isNullOrWhiteSpace(x)).map((x) => x.toLowerCase()));
  const codes: string[] = [];
  let next = 1;
  while (codes.length < count) {
    const candidate = `${stamp}${String(next).padStart(3, '0')}`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      codes.push(candidate);
    }
    next++;
  }
  return codes;
}

interface Candidate {
  MaBaiTap: string;
  TenBaiTap: string;
  MoTa: unknown;
  HuongDanChung: string | null;
  NoiDungNguCanhChung: string | null;
  LoaiCauHoiCode: string | null;
  CauHoiCon: Child[];
}

export async function generateExamsFromBank(userId: string, bankId: string, request: ExamGenerateRequest): Promise<ActionError | { body: unknown }> {
  const bank = await prisma.nganhangde.findFirst({ where: { MaNganHang: bankId, DaXoa: false } });
  if (!bank) return err(404, 'Khong tim thay ngan hang de.', 'ADMIN_BANK_GROUP_NOT_FOUND');

  if (request.ExamCount < 1 || request.ExamCount > 50) return err(400, 'So de can sinh phai tu 1 den 50.', 'ADMIN_GENERATE_COUNT_INVALID');

  const sections = stableSortBy(
    request.Sections.filter((x) => x!.RequiredCount > 0) as ExamGenerateSection[],
    (a, b) => a.SectionOrder - b.SectionOrder,
  );
  if (sections.length === 0) {
    return err(400, 'Cau truc de phai co it nhat mot phan voi so bai lon hon 0.', 'ADMIN_GENERATE_SECTIONS_EMPTY');
  }

  const courseId = request.CourseId ?? bank.MaKhoaHoc;
  if (courseId === null) {
    return err(400, 'Ngan hang chua gan khoa hoc va request cung khong gui khoa hoc.', 'ADMIN_GENERATE_COURSE_REQUIRED');
  }

  const examTypeId = await resolveCategoryId(prisma, 'LOAI_BAI_TAP', 'EXAM');
  if (examTypeId === null) return err(400, 'Khong tim thay danh muc loai bai tap EXAM.', 'ADMIN_GENERATE_EXAM_TYPE_INVALID');

  // ---- Gan kho ung vien cho tung phan ----
  const warnings: string[] = [];
  const poolBySection = new Map<string, Candidate[]>();

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const label = isNullOrWhiteSpace(section.RowId) ? `Phan ${i + 1}` : `Phan ${i + 1} (${section.RowId})`;
    const bankIds = section.SourceBankIds.length > 0 ? section.SourceBankIds : [bankId];

    const and: object[] = [{ LaMauNganHang: true, NOT: { MaNganHang: null } }, active, { MaNganHang: { in: bankIds } }];
    if (section.CandidateExerciseIds.length > 0) and.push({ MaBaiTap: { in: section.CandidateExerciseIds } });
    if (!isNullOrWhiteSpace(section.LoaiCauHoiCode)) {
      and.push({ LoaiCauHoi: { in: await categoryIdsByCode(prisma, section.LoaiCauHoiCode!.trim()) } });
    }
    if (!isNullOrWhiteSpace(section.KyNangCode)) {
      and.push({ KyNang: { in: await categoryIdsByCode(prisma, section.KyNangCode!.trim()) } });
    }
    const rows = await prisma.baitap.findMany({
      where: { AND: and },
      orderBy: { TenBaiTap: 'asc' },
      select: { MaBaiTap: true, TenBaiTap: true, MoTa: true, HuongDanChung: true, NoiDungNguCanhChung: true, LoaiCauHoi: true },
    });
    const loaiIds = [...new Set(rows.map((r) => r.LoaiCauHoi).filter((x): x is number => x !== null))];
    const loaiRows = loaiIds.length
      ? await prisma.chitietdanhmuc.findMany({ where: { MaChiTiet: { in: loaiIds } }, select: { MaChiTiet: true, MaCode: true } })
      : [];
    const loaiCode = new Map(loaiRows.map((r) => [r.MaChiTiet, r.MaCode]));
    const children = await loadChildren(rows.map((r) => r.MaBaiTap));

    let candidates: Candidate[] = rows.map((r) => ({
      MaBaiTap: r.MaBaiTap.toLowerCase(),
      TenBaiTap: r.TenBaiTap,
      MoTa: r.MoTa,
      HuongDanChung: r.HuongDanChung,
      NoiDungNguCanhChung: r.NoiDungNguCanhChung,
      LoaiCauHoiCode: r.LoaiCauHoi !== null ? (loaiCode.get(r.LoaiCauHoi) ?? null) : null,
      CauHoiCon: children.get(r.MaBaiTap.toLowerCase()) ?? [],
    }));

    // Chi lay bai da duyet: de that khong duoc chua bai con nhap.
    candidates = candidates
      .filter((x) => (normalizeOptional(parseMetadata(x.MoTa).Status) ?? 'APPROVED') === 'APPROVED')
      .filter((x) => x.CauHoiCon.length > 0);

    if (candidates.length < section.RequiredCount) {
      return err(
        400,
        `${label}: kho chi co ${candidates.length} bai da duyet nhung can ${section.RequiredCount}. ` +
          'Hay them bai vao ngan hang nguon hoac giam so bai cua phan nay.',
        'ADMIN_GENERATE_POOL_TOO_SMALL',
      );
    }
    if (candidates.length === section.RequiredCount && request.ExamCount > 1) {
      warnings.push(
        `${label}: kho co dung ${candidates.length} bai cho ${section.RequiredCount} cho, ` + 'moi de se dung cung mot bo bai, chi khac thu tu.',
      );
    }
    poolBySection.set(section.RowId ?? `row-${i}`, candidates);
  }

  // ---- Boc ngau nhien ----
  const trinhDoId = isNullOrWhiteSpace(request.TrinhDoCode) ? null : await resolveCategoryId(prisma, 'TRINH_DO', request.TrinhDoCode!.trim());
  const mucDoId = isNullOrWhiteSpace(request.MucDoCode) ? null : await resolveCategoryId(prisma, 'MUC_DO', request.MucDoCode!.trim());

  const seed = request.Seed ?? tickCount();
  const random = new DotnetRandom(seed);
  const batchId = randomUUID();
  const now = new Date();
  const prefix = isNullOrWhiteSpace(request.MaDePrefix) ? 'DE' : request.MaDePrefix!.trim().toUpperCase();
  const codes = await reserveExamCodes(prefix, request.ExamCount);

  const exams: object[] = [];
  const allChildren: object[] = [];
  const resultExams: object[] = [];

  for (let variant = 0; variant < request.ExamCount; variant++) {
    const orderedSections = [...sections];
    if (request.ShuffleSections) shuffle(orderedSections, random);

    const examCode = codes[variant];
    const examId = randomUUID();
    const tenBaiTap = `${isNullOrWhiteSpace(request.TemplateName) ? bank.TenNganHang : request.TemplateName!.trim()} - Ma de ${examCode}`;

    // Gom cau truoc roi moi chot diem.
    const pending: { row: Record<string, unknown> & { DiemCuaCau: Decimal }; coTrongSoRieng: boolean }[] = [];
    const sectionDtos: object[] = [];
    let order = 1;

    for (const section of orderedSections) {
      const pool = poolBySection.get(section.RowId ?? '');
      // .NET: Dictionary indexer nem KeyNotFoundException -> 500.
      if (!pool) throw new Error(`The given key '${section.RowId ?? ''}' was not present in the dictionary.`);
      const picked = pickDistinct(pool, section.RequiredCount, random);

      const items: object[] = [];
      for (const source of picked) {
        const metaNguon = parseMetadata(source.MoTa);
        items.push({
          maBaiTapNguon: source.MaBaiTap,
          code: metaNguon.Code ?? '',
          tenBaiTap: source.TenBaiTap,
          loaiCauHoiCode: source.LoaiCauHoiCode,
          soCauCon: source.CauHoiCon.length,
        });
        for (const child of source.CauHoiCon) {
          if (blankNoiDung(child.NoiDung)) continue;
          pending.push({
            row: {
              MaCauHoiDe: randomUUID(),
              MaBaiTap: examId,
              MaCauHoi: null,
              SoCau: normalizeOptional(child.SoCau) ?? `Câu ${order}`,
              ThuTu: order,
              DiemCuaCau: section.ScoreWeight.gt(0) ? section.ScoreWeight : (child.DiemCuaCau ?? dec(1)),
              // Chup lai bai doc + huong dan + word bank cua bai goc vao tung cau.
              NoiDung: toJsonValue(
                embedSharedContext(child.NoiDung, source.HuongDanChung, source.NoiDungNguCanhChung, metaNguon.DanhSachTu, source.MaBaiTap, source.TenBaiTap),
              ),
              NguoiTao: userId,
              ThoiGianTao: now,
            },
            coTrongSoRieng: section.ScoreWeight.gt(0),
          });
          order++;
        }
      }
      sectionDtos.push({
        rowId: section.RowId,
        skill: section.Skill,
        loaiCauHoiCode: section.LoaiCauHoiCode,
        scoreWeight: section.ScoreWeight,
        sectionOrder: section.SectionOrder,
        items,
      });
    }

    if (pending.length === 0) {
      return err(400, 'Cac bai duoc chon khong co cau hoi con nao, khong sinh duoc de.', 'ADMIN_GENERATE_NO_QUESTIONS');
    }

    // Khong phan nao dat trong so rieng -> chia deu diem toi da cua de.
    if (request.TotalScore.gt(0) && pending.every((x) => !x.coTrongSoRieng)) {
      const perQuestion = roundAway2(request.TotalScore.div(pending.length));
      for (const p of pending) p.row.DiemCuaCau = perQuestion;
      // Don sai so lam tron vao cau cuoi de tong dung bang TotalScore.
      const lech = request.TotalScore.minus(perQuestion.times(pending.length));
      if (!lech.isZero()) {
        const last = pending[pending.length - 1].row;
        last.DiemCuaCau = last.DiemCuaCau.plus(lech);
      }
    }

    const tongDiem = pending.reduce((s, x) => s.plus(x.row.DiemCuaCau), dec(0));
    allChildren.push(...pending.map((x) => x.row));

    exams.push({
      MaBaiTap: examId,
      MaKhoaHoc: courseId,
      TenBaiTap: tenBaiTap,
      LaMauNganHang: false,
      LoaiBaiTap: examTypeId,
      ThoiGianLamBai: request.DurationMinutes > 0 ? request.DurationMinutes : null,
      DiemToiDa: tongDiem,
      TrinhDo: trinhDoId ?? bank.TrinhDo,
      MucDo: mucDoId ?? bank.MucDo,
      // KHONG gan ky nang cho de: mot de co the ghep nhieu ky nang.
      KyNang: null,
      MoTa: toJsonValue(
        serializeMetadata(
          newEnvelope({
            Code: examCode,
            Description: normalizeOptional(request.Note),
            Status: 'DRAFT',
            PublishMode: 'DRAFT',
            ShuffleAnswers: request.ShuffleAnswers,
            ShuffleQuestions: request.ShuffleExercises,
          }),
        ),
      ),
      NguoiTao: userId,
      ThoiGianTao: now,
      NguoiSua: userId,
      ThoiGianSua: now,
      TrangThai: true,
      DaXoa: false,
    });

    resultExams.push({
      maBaiTap: examId,
      code: examCode,
      tenBaiTap,
      variantIndex: variant + 1,
      tongSoCau: pending.length,
      tongDiem,
      sections: sectionDtos,
    });
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.baitap.createMany({ data: exams as never });
      await tx.baitapcauhoi.createMany({ data: allChildren as never });
    },
    { maxWait: 10000, timeout: 120000 },
  );

  return {
    body: ok({ batchId, seed, createdCount: resultExams.length, exams: resultExams, warnings }, 'Sinh de thanh cong.'),
  };
}

