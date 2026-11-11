import type { DtoSchema, FieldType } from './binder.js';
import type { Decimal, DotnetDateTime } from './dotnetTypes.js';
import { dec } from './dotnetTypes.js';

// Schema request DTO (DTOs/AdminAssignmentDtos.cs) cho binder: ten thuoc tinh C#, kieu, gia tri khoi tao.
// Thu tu thuoc tinh = thu tu khai bao (quyet dinh thu tu loi validate).

const list = (of: FieldType, nullable = false): FieldType => ({ list: of, nullable });
const obj = (schema: DtoSchema): FieldType => ({ obj: schema });
const empty = () => '';
const newList = () => [];

export const QuestionBankGroupUpsertSchema: DtoSchema = {
  typeName: 'AdminQuestionBankGroupUpsertRequestDto',
  fields: [
    ['MaCode', 'string?'],
    ['TenNganHang', 'string', empty],
    ['MaKhoaHoc', 'guid?'],
    ['TrinhDoCode', 'string?'],
    ['MucDoCode', 'string?'],
    ['KyNangCode', 'string?'],
    ['Unit', 'string?'],
    ['MoTa', 'string?'],
    ['TrangThai', 'string?'],
  ],
};
export interface QuestionBankGroupUpsertRequest {
  MaCode: string | null;
  TenNganHang: string;
  MaKhoaHoc: string | null;
  TrinhDoCode: string | null;
  MucDoCode: string | null;
  KyNangCode: string | null;
  Unit: string | null;
  MoTa: string | null;
  TrangThai: string | null;
}

export const StatusRequestSchema: DtoSchema = {
  typeName: 'AdminQuestionBankGroupStatusRequestDto',
  fields: [['TrangThai', 'string', empty]],
};
export interface StatusRequest {
  TrangThai: string;
}

const BankQuestionUpsertSchema: DtoSchema = {
  typeName: 'AdminBankQuestionUpsertRequestDto',
  fields: [
    ['SoCau', 'string?'],
    ['ThuTu', 'int?'],
    ['DiemCuaCau', 'decimal?'],
    ['DeBai', 'json?'],
    ['DapAn', 'json?'],
    ['GiaiThich', 'string?'],
  ],
};
export interface BankQuestionUpsertRequest {
  SoCau: string | null;
  ThuTu: number | null;
  DiemCuaCau: Decimal | null;
  DeBai: unknown;
  DapAn: unknown;
  GiaiThich: string | null;
}

export const BankExerciseUpsertSchema: DtoSchema = {
  typeName: 'AdminBankExerciseUpsertRequestDto',
  fields: [
    ['MaKhoaHoc', 'guid'],
    ['MaNganHang', 'guid?'],
    ['TrangThaiDuyet', 'string?'],
    ['Code', 'string?'],
    ['TenBaiTap', 'string', empty],
    ['HuongDanChung', 'string?'],
    ['NoiDungNguCanhChung', 'string?'],
    ['LoaiCauHoiCode', 'string', empty],
    ['MucDoCode', 'string', empty],
    ['TrinhDoCode', 'string?'],
    ['KyNangCode', 'string?'],
    ['GhiChu', 'string?'],
    ['DanhSachTu', list('string?', true)],
    ['AmThanhLink', 'string?'],
    ['HinhAnhLink', 'string?'],
    ['CauHoiCon', list(obj(BankQuestionUpsertSchema)), newList],
  ],
};
export interface BankExerciseUpsertRequest {
  MaKhoaHoc: string;
  MaNganHang: string | null;
  TrangThaiDuyet: string | null;
  Code: string | null;
  TenBaiTap: string;
  HuongDanChung: string | null;
  NoiDungNguCanhChung: string | null;
  LoaiCauHoiCode: string;
  MucDoCode: string;
  TrinhDoCode: string | null;
  KyNangCode: string | null;
  GhiChu: string | null;
  DanhSachTu: (string | null)[] | null;
  AmThanhLink: string | null;
  HinhAnhLink: string | null;
  CauHoiCon: BankQuestionUpsertRequest[];
}

const ChoiceAnswerUpsertSchema: DtoSchema = {
  typeName: 'AdminAssignmentQuestionChoiceAnswerUpsertRequestDto',
  fields: [
    ['TenDapAn', 'string?'],
    ['NoiDungDapAn', 'string', empty],
    ['LaDapAnDung', 'bool'],
    ['GiaTriDoiChieu', 'string?'],
    ['ThuTu', 'int?'],
  ],
};
export interface ChoiceAnswerUpsertRequest {
  TenDapAn: string | null;
  NoiDungDapAn: string;
  LaDapAnDung: boolean;
  GiaTriDoiChieu: string | null;
  ThuTu: number | null;
}

const TextAnswerUpsertSchema: DtoSchema = {
  typeName: 'AdminAssignmentQuestionTextAnswerUpsertRequestDto',
  fields: [
    ['DapAnChuan', 'string', empty],
    ['DapAnThayThe', 'string?'],
    ['PhanBietHoaThuong', 'bool'],
  ],
};
export interface TextAnswerUpsertRequest {
  DapAnChuan: string;
  DapAnThayThe: string | null;
  PhanBietHoaThuong: boolean;
}

const QuestionBankUpsertSchema: DtoSchema = {
  typeName: 'AdminAssignmentQuestionBankUpsertRequestDto',
  fields: [
    ['MaKhoaHoc', 'guid'],
    ['LoaiCauHoiCode', 'string', empty],
    ['MucDoCode', 'string', empty],
    ['TrinhDoCode', 'string?'],
    ['KyNangCode', 'string?'],
    ['DeBai', 'json?'],
    ['DapAn', 'json?'],
    ['GiaiThich', 'string?'],
    ['Tags', list('string?', true)],
    ['AmThanhLink', 'string?'],
    ['HinhAnhLink', 'string?'],
    ['MaCauHoiCha', 'guid?'],
    ['ThuTu', 'int?'],
    ['NoiDungChiTiet', 'string?'],
    ['NoiDungCauHoi', 'string', empty],
    ['GiaiThichDapAn', 'string?'],
    ['ChoiceAnswers', list(obj(ChoiceAnswerUpsertSchema)), newList],
    ['TextAnswers', list(obj(TextAnswerUpsertSchema)), newList],
  ],
};
export interface QuestionBankUpsertRequest {
  MaKhoaHoc: string;
  LoaiCauHoiCode: string;
  MucDoCode: string;
  TrinhDoCode: string | null;
  KyNangCode: string | null;
  DeBai: unknown;
  DapAn: unknown;
  GiaiThich: string | null;
  Tags: (string | null)[] | null;
  AmThanhLink: string | null;
  HinhAnhLink: string | null;
  MaCauHoiCha: string | null;
  ThuTu: number | null;
  NoiDungChiTiet: string | null;
  NoiDungCauHoi: string;
  GiaiThichDapAn: string | null;
  ChoiceAnswers: ChoiceAnswerUpsertRequest[];
  TextAnswers: TextAnswerUpsertRequest[];
}

export const QuestionBankImportSchema: DtoSchema = {
  typeName: 'AdminAssignmentQuestionBankImportRequestDto',
  fields: [['Questions', list(obj(QuestionBankUpsertSchema)), newList]],
};
export interface QuestionBankImportRequest {
  Questions: (QuestionBankUpsertRequest | null)[];
}

const SourcePoolSectionSchema: DtoSchema = {
  typeName: 'AdminAssignmentSourcePoolSectionDto',
  fields: [
    ['RowId', 'string', empty],
    ['Skill', 'string', empty],
    ['QuestionFormat', 'string', empty],
    ['SourceBankIds', list('guid'), newList],
    ['RequiredCount', 'int'],
    ['ScoreWeight', 'decimal'],
    ['SectionOrder', 'int'],
  ],
};
export interface SourcePoolSection {
  RowId: string;
  Skill: string;
  QuestionFormat: string;
  SourceBankIds: string[];
  RequiredCount: number;
  ScoreWeight: Decimal;
  SectionOrder: number;
}

export const SourcePoolUpsertSchema: DtoSchema = {
  typeName: 'AdminAssignmentSourcePoolUpsertRequestDto',
  fields: [
    ['CourseId', 'guid?'],
    ['Name', 'string', empty],
    ['Level', 'string', empty],
    ['Difficulty', 'string', empty],
    ['Skill', 'string?'],
    ['DurationMinutes', 'int'],
    ['TotalScore', 'decimal'],
    ['Note', 'string?'],
    ['ShuffleExercises', 'bool'],
    ['ShuffleSections', 'bool'],
    ['ShuffleAnswers', 'bool'],
    ['ExamCount', 'int'],
    ['Sections', list(obj(SourcePoolSectionSchema)), newList],
  ],
};
export interface SourcePoolUpsertRequest {
  CourseId: string | null;
  Name: string;
  Level: string;
  Difficulty: string;
  Skill: string | null;
  DurationMinutes: number;
  TotalScore: Decimal;
  Note: string | null;
  ShuffleExercises: boolean;
  ShuffleSections: boolean;
  ShuffleAnswers: boolean;
  ExamCount: number;
  Sections: (SourcePoolSection | null)[];
}

const GeneratedExamItemSchema: DtoSchema = {
  typeName: 'AdminAssignmentGeneratedExamItemDto',
  fields: [
    ['Id', 'guid'],
    ['BankId', 'guid?'],
    ['BankName', 'string?'],
    ['Title', 'string?'],
    ['Content', 'string?'],
  ],
};
export interface GeneratedExamItem {
  Id: string;
  BankId: string | null;
  BankName: string | null;
  Title: string | null;
  Content: string | null;
}

const GeneratedExamSectionSchema: DtoSchema = {
  typeName: 'AdminAssignmentGeneratedExamSectionDto',
  fields: [
    ['RowId', 'string', empty],
    ['Skill', 'string', empty],
    ['QuestionFormat', 'string', empty],
    ['SourceBankIds', list('guid'), newList],
    ['SourceBankNames', list('string?'), newList],
    ['RequiredCount', 'int'],
    ['ScoreWeight', 'decimal'],
    ['SectionOrder', 'int'],
    ['Items', list(obj(GeneratedExamItemSchema)), newList],
  ],
};
export interface GeneratedExamSection {
  RowId: string;
  Skill: string;
  QuestionFormat: string;
  SourceBankIds: string[];
  SourceBankNames: (string | null)[];
  RequiredCount: number;
  ScoreWeight: Decimal;
  SectionOrder: number;
  Items: (GeneratedExamItem | null)[];
}

const GeneratedExamSchema: DtoSchema = {
  typeName: 'AdminAssignmentGeneratedExamDto',
  fields: [
    ['Id', 'guid'],
    ['PrimaryBankId', 'guid'],
    ['CourseId', 'guid?'],
    ['BatchId', 'int'],
    ['VariantIndex', 'int'],
    ['VariantCount', 'int'],
    ['SourceBankIds', list('guid'), newList],
    ['Code', 'string', empty],
    ['Title', 'string', empty],
    ['StructureName', 'string', empty],
    ['Level', 'string', empty],
    ['Difficulty', 'string', empty],
    ['SkillSummary', 'string', empty],
    ['Skills', list('string?'), newList],
    ['TotalScore', 'decimal'],
    ['DurationMinutes', 'int'],
    ['CreatedAt', 'datetime'],
    ['ShuffleAnswers', 'bool'],
    ['Note', 'string?'],
    ['Sections', list(obj(GeneratedExamSectionSchema)), newList],
  ],
};
export interface GeneratedExam {
  Id: string;
  PrimaryBankId: string;
  CourseId: string | null;
  BatchId: number;
  VariantIndex: number;
  VariantCount: number;
  SourceBankIds: string[];
  Code: string;
  Title: string;
  StructureName: string;
  Level: string;
  Difficulty: string;
  SkillSummary: string;
  Skills: (string | null)[];
  TotalScore: Decimal;
  DurationMinutes: number;
  CreatedAt: DotnetDateTime;
  ShuffleAnswers: boolean;
  Note: string | null;
  Sections: (GeneratedExamSection | null)[];
}

export const GeneratedExamBatchSchema: DtoSchema = {
  typeName: 'AdminAssignmentGeneratedExamBatchRequestDto',
  fields: [
    ['CourseId', 'guid?'],
    ['PrimaryBankId', 'guid'],
    ['TemplateName', 'string', empty],
    ['Level', 'string', empty],
    ['Difficulty', 'string', empty],
    ['Skill', 'string?'],
    ['DurationMinutes', 'int'],
    ['TotalScore', 'decimal'],
    ['ShuffleExercises', 'bool'],
    ['ShuffleSections', 'bool'],
    ['ShuffleAnswers', 'bool'],
    ['ExamCount', 'int'],
    ['Note', 'string?'],
    ['Sections', list(obj(SourcePoolSectionSchema)), newList],
    ['Exams', list(obj(GeneratedExamSchema)), newList],
  ],
};
export interface GeneratedExamBatchRequest {
  CourseId: string | null;
  PrimaryBankId: string;
  TemplateName: string;
  Level: string;
  Difficulty: string;
  Skill: string | null;
  DurationMinutes: number;
  TotalScore: Decimal;
  ShuffleExercises: boolean;
  ShuffleSections: boolean;
  ShuffleAnswers: boolean;
  ExamCount: number;
  Note: string | null;
  Sections: (SourcePoolSection | null)[];
  Exams: GeneratedExam[];
}

const ExamGenerateSectionSchema: DtoSchema = {
  typeName: 'AdminExamGenerateSectionDto',
  fields: [
    ['RowId', 'string', empty],
    ['Skill', 'string?'],
    ['KyNangCode', 'string?'],
    ['LoaiCauHoiCode', 'string?'],
    ['SourceBankIds', list('guid'), newList],
    ['CandidateExerciseIds', list('guid'), newList],
    ['RequiredCount', 'int'],
    ['ScoreWeight', 'decimal'],
    ['SectionOrder', 'int'],
  ],
};
export interface ExamGenerateSection {
  RowId: string;
  Skill: string | null;
  KyNangCode: string | null;
  LoaiCauHoiCode: string | null;
  SourceBankIds: string[];
  CandidateExerciseIds: string[];
  RequiredCount: number;
  ScoreWeight: Decimal;
  SectionOrder: number;
}

export const ExamGenerateSchema: DtoSchema = {
  typeName: 'AdminExamGenerateRequestDto',
  fields: [
    ['CourseId', 'guid?'],
    ['TemplateName', 'string?'],
    ['Level', 'string?'],
    ['Difficulty', 'string?'],
    ['TrinhDoCode', 'string?'],
    ['MucDoCode', 'string?'],
    ['DurationMinutes', 'int'],
    ['TotalScore', 'decimal'],
    ['Note', 'string?'],
    ['ExamCount', 'int', () => 1],
    ['ShuffleExercises', 'bool', () => true],
    ['ShuffleSections', 'bool'],
    ['ShuffleAnswers', 'bool'],
    ['Seed', 'int?'],
    ['MaDePrefix', 'string?'],
    ['Sections', list(obj(ExamGenerateSectionSchema)), newList],
  ],
};
export interface ExamGenerateRequest {
  CourseId: string | null;
  TemplateName: string | null;
  Level: string | null;
  Difficulty: string | null;
  TrinhDoCode: string | null;
  MucDoCode: string | null;
  DurationMinutes: number;
  TotalScore: Decimal;
  Note: string | null;
  ExamCount: number;
  ShuffleExercises: boolean;
  ShuffleSections: boolean;
  ShuffleAnswers: boolean;
  Seed: number | null;
  MaDePrefix: string | null;
  Sections: (ExamGenerateSection | null)[];
}

export const DistributeSchema: DtoSchema = {
  typeName: 'AdminDistributeRequestDto',
  fields: [
    ['ExamIds', list('guid'), newList],
    ['ClassIds', list('guid'), newList],
    ['StudentIds', list('guid'), newList],
    ['RandomTheoHocSinh', 'bool', () => true],
    ['OpenAt', 'datetime?'],
    ['DueAt', 'datetime?'],
    ['SoLanLamToiDa', 'int', () => 1],
    ['ChoXemDapAn', 'bool'],
    ['GhiChuChoHocSinh', 'string?'],
    ['ThoiGianLamBai', 'int?'],
    ['Seed', 'int?'],
  ],
};
export interface DistributeRequest {
  ExamIds: string[];
  ClassIds: string[];
  StudentIds: string[];
  RandomTheoHocSinh: boolean;
  OpenAt: DotnetDateTime | null;
  DueAt: DotnetDateTime | null;
  SoLanLamToiDa: number;
  ChoXemDapAn: boolean;
  GhiChuChoHocSinh: string | null;
  ThoiGianLamBai: number | null;
  Seed: number | null;
}

const QuestionSelectionSchema: DtoSchema = {
  typeName: 'AdminAssignmentQuestionSelectionRequestDto',
  fields: [
    ['MaCauHoi', 'guid'],
    ['ThuTu', 'int?'],
    ['DiemCuaCau', 'decimal?'],
  ],
};
export interface QuestionSelectionRequest {
  MaCauHoi: string;
  ThuTu: number | null;
  DiemCuaCau: Decimal | null;
}

export const AssignmentUpsertSchema: DtoSchema = {
  typeName: 'AdminAssignmentUpsertRequestDto',
  fields: [
    ['Code', 'string?'],
    ['TenBaiTap', 'string', empty],
    ['MoTa', 'string?'],
    ['MaKhoaHoc', 'guid'],
    ['LoaiBaiTapCode', 'string', () => 'HOMEWORK'],
    ['PublishMode', 'string', () => 'DRAFT'],
    ['ThoiGianLamBai', 'int?'],
    ['DiemToiDa', 'decimal', () => dec(0)],
    ['MaxAttempts', 'int', () => 1],
    ['OpenAt', 'datetime?'],
    ['DueAt', 'datetime?'],
    ['AllowLateSubmission', 'bool'],
    ['ShowScoreWhenDone', 'bool'],
    ['ShowAnswerAfterDeadline', 'bool'],
    ['ShuffleQuestions', 'bool', () => true],
    ['ShuffleAnswers', 'bool', () => true],
    ['AutoGradeObjective', 'bool', () => true],
    ['RequireManualReview', 'bool', () => true],
    ['AccessCode', 'string?'],
    ['ScoreMode', 'string', () => 'AUTO_EQUAL'],
    ['TrinhDoCode', 'string?'],
    ['MucDoCode', 'string?'],
    ['KyNangCode', 'string?'],
    ['SelectedClassIds', list('guid'), newList],
    ['SelectedQuestions', list(obj(QuestionSelectionSchema), true)],
  ],
};
export interface AssignmentUpsertRequest {
  Code: string | null;
  TenBaiTap: string;
  MoTa: string | null;
  MaKhoaHoc: string;
  LoaiBaiTapCode: string;
  PublishMode: string;
  ThoiGianLamBai: number | null;
  DiemToiDa: Decimal;
  MaxAttempts: number;
  OpenAt: DotnetDateTime | null;
  DueAt: DotnetDateTime | null;
  AllowLateSubmission: boolean;
  ShowScoreWhenDone: boolean;
  ShowAnswerAfterDeadline: boolean;
  ShuffleQuestions: boolean;
  ShuffleAnswers: boolean;
  AutoGradeObjective: boolean;
  RequireManualReview: boolean;
  AccessCode: string | null;
  ScoreMode: string;
  TrinhDoCode: string | null;
  MucDoCode: string | null;
  KyNangCode: string | null;
  SelectedClassIds: string[];
  SelectedQuestions: (QuestionSelectionRequest | null)[] | null;
}
