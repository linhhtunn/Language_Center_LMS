import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft,
  Ban,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Eye,
  FileStack,
  FileText,
  Filter,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Shuffle,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import adminAssignmentService from '../../api/adminAssignmentService';
import ExamContentPreview from './ExamContentPreview';
import './AdminExerciseExamManagement.css';
import {
  ASSIGNMENT_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DIFFICULTY_OPTIONS,
  EXERCISE_STATUS_OPTIONS,
  LEVEL_OPTIONS,
  QUESTION_BANK_STATUS_OPTIONS,
  QUESTION_FORMATS_BY_SKILL_CODE,
  SKILL_CODE_BY_DEFAULT_LABEL,
  SKILL_OPTIONS,
} from './adminExerciseExamManagementMockData';
import adminExerciseExamManagementService from '../../api/adminExerciseExamManagementService';
import {
  buildBankExercisePayload,
  createCatalogLookup,
  getFormatFromCode,
  getQuestionTypeCode,
  parseSingleQuestion,
} from './adminQuestionContent';

const TAB_OPTIONS = [
  {
    id: 'DELIVERY',
    label: 'Quản lý & giao bài tập/đề thi',
    description: 'Quản lý danh sách bài tập/đề thi đã có, giao bài và theo dõi kết quả làm bài.',
  },
  {
    id: 'QUESTION_BANK',
    label: 'Quản lý ngân hàng đề',
    description: 'Quản lý ngân hàng đề, bài tập con và sinh đề tự động từ dữ liệu đã duyệt.',
  },
];

const DELIVERY_STATUS_META = {
  Nháp: { tone: 'secondary', label: 'Nháp' },
  'Đã tạo': { tone: 'warning', label: 'Đã tạo' },
  'Đã giao': { tone: 'primary', label: 'Đã giao' },
  'Đã đóng': { tone: 'dark', label: 'Đã đóng' },
};

const QUESTION_BANK_STATUS_META = {
  Nháp: { tone: 'secondary', label: 'Nháp' },
  'Đang sử dụng': { tone: 'success', label: 'Đang sử dụng' },
  'Ngừng sử dụng': { tone: 'dark', label: 'Ngừng sử dụng' },
};

const EXERCISE_STATUS_META = {
  Nháp: { tone: 'secondary', label: 'Nháp' },
  'Chờ duyệt': { tone: 'warning', label: 'Chờ duyệt' },
  'Đã duyệt': { tone: 'success', label: 'Đã duyệt' },
  'Ngừng sử dụng': { tone: 'dark', label: 'Ngừng sử dụng' },
};

const DELIVERY_FILTERS = {
  type: 'ALL',
  level: 'ALL',
  difficulty: 'ALL',
  skill: 'ALL',
  status: 'ALL',
  keyword: '',
};

const BANK_FILTERS = {
  level: 'ALL',
  difficulty: 'ALL',
  skill: 'ALL',
  unit: 'ALL',
  status: 'ALL',
  keyword: '',
};

const SOURCE_FILTERS = {
  unit: 'ALL',
  keyword: '',
};

const GENERATOR_STEPS = [
  { id: 1, title: 'Tạo cấu trúc đề', caption: 'Chọn dạng câu hỏi và khai báo số lượng A cần lấy.' },
  { id: 2, title: 'Chọn ngân hàng gốc', caption: 'Tích chọn B bài tập đã duyệt làm nguồn random.' },
  { id: 3, title: 'Sinh đề', caption: 'Random A từ B, ghép thành đề và lưu cố định.' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

// Ngân hàng đề trên UI có id dạng "QB-<maNganHang>" để phân biệt với các id
// khác trong state. Backend nhận GUID nên phải bóc tiền tố trước khi gửi đi.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_PATTERN.test(String(value || ''));

const toBankGuid = (bankId) => String(bankId || '').replace(/^QB-/, '');

const toBankGuids = (bankIds = []) => [...new Set(bankIds.map(toBankGuid).filter(Boolean))];

// Trạng thái ngân hàng: DB lưu khoá ASCII, UI hiển thị nhãn tiếng Việt.
const BANK_STATUS_CODE_BY_LABEL = {
  'Nháp': 'DRAFT',
  'Đang sử dụng': 'ACTIVE',
  'Ngừng sử dụng': 'RETIRED',
};

const BANK_STATUS_LABEL_BY_CODE = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang sử dụng',
  RETIRED: 'Ngừng sử dụng',
};

// Nhãn trên form -> mã danh mục backend (nhóm LOAI_BAI_TAP, TRANG_THAI_SU_KIEN).
const ASSIGNMENT_TYPE_CODE_BY_LABEL = {
  'Bài tập': 'HOMEWORK',
  'Kiểm tra nhanh': 'QUIZ',
  'Đề thi': 'EXAM',
};

const PUBLISH_MODE_CODE_BY_LABEL = {
  'Nháp': 'DRAFT',
  'Đã tạo': 'SCHEDULED',
  'Đã giao': 'ACTIVE',
  'Đã đóng': 'CLOSED',
};

// Trạng thái duyệt của BÀI TẬP trong ngân hàng (lưu trong envelope MoTa).
const EXERCISE_STATUS_CODE_BY_LABEL = {
  'Nháp': 'DRAFT',
  'Chờ duyệt': 'PENDING',
  'Đã duyệt': 'APPROVED',
  'Ngừng sử dụng': 'RETIRED',
};

const EXERCISE_STATUS_LABEL_BY_CODE = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  RETIRED: 'Ngừng sử dụng',
};

const createOption = (index = 0) => ({
  id: createId('OPT'),
  label: String.fromCharCode(65 + index),
  text: '',
  isCorrect: false,
});

const normalizeOptions = (options) =>
  options.map((option, index) => ({
    ...option,
    label: String.fromCharCode(65 + index),
  }));

/**
 * Dạng câu hỏi dùng được cho một kỹ năng.
 *
 * Nhận MÃ kỹ năng (KN_DOC...) là chính. Nếu chỉ có nhãn thì thử tra bảng nhãn
 * mặc định — nhưng đó chỉ là phương án dự phòng: đổi tên danh mục trong DB sẽ
 * làm cách này hụt, nên mọi chỗ gọi nên truyền mã.
 */
const getSupportedQuestionFormats = (skillCodeOrLabel) => {
  const key = skillCodeOrLabel || '';
  return (
    QUESTION_FORMATS_BY_SKILL_CODE[key] ||
    QUESTION_FORMATS_BY_SKILL_CODE[SKILL_CODE_BY_DEFAULT_LABEL[key]] ||
    []
  );
};

const getQuestionEditorMode = (questionFormat) => {
  switch (questionFormat) {
    case 'Trắc nghiệm 1 đáp án':
      return 'single_choice';
    case 'Trắc nghiệm nhiều đáp án':
      return 'multi_choice';
    case 'Trả lời ngắn':
    case 'Cho dạng đúng của từ':
    case 'Tìm một từ dùng trong nhiều câu':
    case 'Giải thích thành ngữ hoặc cụm từ':
      return 'short_text';
    case 'Điền từ vào chỗ trống/khuyết':
    case 'Hoàn thiện câu':
      return 'gap_fill';
    // Khác gap_fill: cả bài dùng chung một đoạn văn nhiều chỗ trống và một
    // word bank; mỗi câu con là MỘT chỗ trống, đáp án chọn từ word bank.
    case 'Điền từ vào chỗ trống tương ứng từ một danh sách từ cho trước':
      return 'cloze_from_list';
    case 'Nối các phần tương ứng':
    case 'Nối ghép các phần tương ứng':
      return 'matching';
    case 'Sắp xếp câu thành đoạn văn / hội thoại':
      return 'sentence_arrangement';
    case 'Phân loại':
      return 'classification';
    case 'Chèn câu vào đoạn văn':
      return 'insert_sentence';
    case 'Tìm và sửa lỗi sai':
      return 'error_correction';
    case 'Viết lại câu':
      return 'sentence_rewrite';
    case 'Viết câu':
    case 'Viết đoạn văn':
    case 'Viết bài luận':
      return 'essay';
    default:
      return 'generic';
  }
};

const getSkillFromQuestion = (question) => {
  const raw = String(question?.questionTypeLabel || question?.topic || question?.source || '').toLowerCase();
  if (raw.includes('viết')) {
    return 'Viết';
  }
  if (raw.includes('nghe')) {
    return 'Nghe';
  }
  return 'Đọc';
};

const getQuestionFormatFromQuestion = (question) => question?.questionTypeLabel || question?.questionType || 'Câu hỏi';

/**
 * Chuyển một bài tập ngân hàng (baitap có LaMauNganHang = 1) từ API sang
 * shape mà trình soạn thảo đang dùng.
 */
const buildExerciseFromBankItem = (item) => {
  const questionFormat = getFormatFromCode(item.loaiCauHoiCode) || item.loaiCauHoiLabel || 'Câu hỏi';
  const mode = getQuestionEditorMode(questionFormat);

  return {
    id: item.maBaiTap,
    code: item.code || '',
    title: item.tenBaiTap || '',
    questionFormat,
    courseId: item.maKhoaHoc,
    unit: item.tenKhoaHoc || '',
    huongDanChung: item.huongDanChung || '',
    // Bài đọc dùng chung — cột riêng của bài tập, không nằm trong JSON câu hỏi.
    content: item.noiDungNguCanhChung || '',
    note: item.ghiChu || '',
    wordBank: Array.isArray(item.danhSachTu) ? item.danhSachTu : [],
    audioUrl: item.amThanhLink || '',
    imageUrl: item.hinhAnhLink || '',
    // Trạng thái duyệt lấy từ DB; dữ liệu cũ chưa có trường này thì coi là đã duyệt.
    status: EXERCISE_STATUS_LABEL_BY_CODE[item.trangThaiDuyet] || 'Đã duyệt',
    createdAt: item.thoiGianTao || new Date().toISOString(),
    childQuestions: (item.cauHoiCon || []).map((child) => {
      const question = parseSingleQuestion({
        mode,
        deBai: child.deBai,
        dapAn: child.dapAn,
        giaiThich: child.giaiThich,
        createBase: () => createChildQuestion(questionFormat),
      });
      question.score = Number(child.diemCuaCau || 1);
      question.soCau = child.soCau || '';
      return question;
    }),
  };
};

/**
 * Ngân hàng đề giờ là bảng thật (nganhangde), không còn suy ra bằng cách gom
 * bài tập theo khoá học. Mỗi bài tập trỏ về ngân hàng qua maNganHang.
 */
const buildBanksFromGroups = (groups = [], items = [], labelByCode = new Map()) => {
  const exercisesByBank = new Map();
  items.forEach((item) => {
    const key = item.maNganHang || '';
    const bucket = exercisesByBank.get(key) || [];
    bucket.push(item);
    exercisesByBank.set(key, bucket);
  });

  return groups.map((group) => ({
    id: `QB-${group.maNganHang}`,
    bankId: group.maNganHang,
    code: group.maCode || '',
    name: group.tenNganHang || '',
    // Ngân hàng chưa đặt trình độ thì để trống, KHÔNG bịa 'IELTS': giá trị bịa
    // đó chảy vào tên đề và ô Trình độ ở wizard, khiến người dùng tưởng đề có
    // trình độ trong khi CSDL vẫn rỗng.
    level: labelByCode.get(group.trinhDoCode) || '',
    difficulty: labelByCode.get(group.mucDoCode) || 'Trung bình',
    skill: labelByCode.get(group.kyNangCode) || 'Đọc',
    // Giữ mã để tra dạng câu hỏi — tra theo nhãn sẽ gãy khi đổi tên danh mục.
    skillCode: group.kyNangCode || '',
    unit: group.unit || '',
    description: group.moTa || '',
    status: BANK_STATUS_LABEL_BY_CODE[group.trangThai] || 'Nháp',
    createdAt: group.thoiGianTao || new Date().toISOString(),
    // Sắp xếp theo mã bài tập (vd PT16-2 trước PT16-10) thay vì thứ tự API trả
    // về — API không ORDER BY theo mã vì mã nằm trong JSON (MoTa), không phải
    // cột riêng nên không sort được ở SQL. localeCompare({numeric:true}) so
    // sánh đúng giá trị số thay vì so từng ký tự.
    exercises: (exercisesByBank.get(group.maNganHang) || [])
      .map(buildExerciseFromBankItem)
      .sort((a, b) => (a.code || a.title || '').localeCompare(b.code || b.title || '', undefined, { numeric: true, sensitivity: 'base' })),
    courseId: group.maKhoaHoc || '',
    courseName: group.tenKhoaHoc || '',
  }));
};

const normalizeBackendAssignment = (item) => {
  const statusKey = item.StatusKey || item.statusKey;
  const totalStudents = Number(item.TotalStudents ?? item.totalStudents ?? 0);

  return {
    id: item.MaBaiTap || item.maBaiTap,
    code: item.Code || item.code || '',
    title: item.TenBaiTap || item.tenBaiTap || '',
    type: (item.LoaiBaiTapCode || item.loaiBaiTapCode || 'HOMEWORK') === 'EXAM' ? 'Đề thi' : 'Bài tập',
    // Ba cột này trước đây lấy tạm tên khoá học / mã loại bài / nhãn loại bài,
    // nên hiện sai hoàn toàn (cột "Mức độ" hiện "EXAM"). Giờ backend trả đúng.
    level: item.trinhDoLabel || item.TrinhDoLabel || '--',
    difficulty: item.mucDoLabel || item.MucDoLabel || '--',
    skill: item.kyNangLabel || item.KyNangLabel || '--',
    courseName: item.TenKhoaHoc || item.tenKhoaHoc || '',
    // Cần để lọc lớp/học sinh cùng khoá học khi giao bài.
    courseId: item.MaKhoaHoc || item.maKhoaHoc || '',
    totalItems: item.TotalQuestions || item.totalQuestions || 0,
    durationMinutes: item.ThoiGianLamBai || item.thoiGianLamBai || 0,
    status: statusKey === 'ACTIVE' ? 'Đã giao' : statusKey === 'CLOSED' ? 'Đã đóng' : statusKey === 'SCHEDULED' ? 'Đã tạo' : 'Nháp',
    createdAt: item.UpdatedAt || item.updatedAt || item.ThoiGianTao || item.thoiGianTao || new Date().toISOString(),
    // Lớp và số học sinh đã giao, lấy thẳng từ sukienlophoc/nguoinhansukien.
    targetClasses: item.SelectedClassIds || item.selectedClassIds || [],
    // Backend chỉ trả về SỐ LƯỢNG học sinh chứ không trả danh sách id. Phải để
    // targetStudents rỗng: form giao bài dùng chính mảng này làm danh sách đã
    // tick, nên id giữ chỗ sẽ bị gửi lên và làm hỏng ràng buộc Guid ở backend.
    targetStudents: [],
    totalStudents,
    studentsDone: item.SubmissionStats?.Submitted || item.submissionStats?.submitted || 0,
    // Trước đây gán cứng 0; giờ backend tính từ điểm các bài đã nộp.
    averageScore: Number(item.diemTrungBinh ?? item.DiemTrungBinh ?? 0),
  };
};

const isManualGradingMode = (questionFormat) => ['essay', 'sentence_rewrite'].includes(getQuestionEditorMode(questionFormat));

const getDefaultWritingWordLimit = (questionFormat) => {
  switch (questionFormat) {
    case 'Viết câu':
      return { minWords: 10, maxWords: 25 };
    case 'Viết đoạn văn':
      return { minWords: 120, maxWords: 180 };
    case 'Viết bài luận':
      return { minWords: 250, maxWords: 320 };
    default:
      return { minWords: 0, maxWords: 0 };
  }
};

const getDefaultWritingRubric = (questionFormat) => {
  switch (questionFormat) {
    case 'Viết câu':
      return ['Đúng cấu trúc câu', 'Ngữ pháp chính xác', 'Dùng từ phù hợp'];
    case 'Viết đoạn văn':
      return ['Đúng yêu cầu đề', 'Mạch ý rõ ràng', 'Từ vựng phù hợp', 'Ngữ pháp và chính tả'];
    case 'Viết bài luận':
      return ['Task response', 'Coherence & cohesion', 'Lexical resource', 'Grammar range & accuracy'];
    case 'Viết lại câu':
      return ['Giữ nguyên ý nghĩa', 'Đúng ngữ pháp', 'Đúng cấu trúc yêu cầu'];
    default:
      return [];
  }
};

const hasFilledText = (items = []) => items.some((item) => String(item || '').trim());

const formatWordRange = (question) => {
  const minWords = Number(question?.minWords || 0);
  const maxWords = Number(question?.maxWords || 0);

  if (minWords > 0 && maxWords > 0) {
    return `${minWords}-${maxWords} từ`;
  }

  if (minWords > 0) {
    return `Tối thiểu ${minWords} từ`;
  }

  if (maxWords > 0) {
    return `Tối đa ${maxWords} từ`;
  }

  return '';
};

const createChildQuestion = (questionFormat) => {
  const answerType = getQuestionEditorMode(questionFormat);
  const defaultWordLimit = getDefaultWritingWordLimit(questionFormat);
  const defaultRubric = getDefaultWritingRubric(questionFormat);
  const base = {
    id: createId('CQ'),
    prompt: '',
    answerType,
    options: [],
    acceptedAnswers: [''],
    score: 1,
    explanation: '',
    passage: '',
    insertSentence: '',
    correctPosition: '',
    wrongText: '',
    correctedText: '',
    leftItems: ['', ''],
    rightItems: ['', ''],
    matchingPairs: [{ left: '', right: '' }],
    classificationGroups: ['Nhóm 1', 'Nhóm 2'],
    classificationItems: [{ value: '', group: 'Nhóm 1' }],
    arrangementSentences: ['', '', ''],
    arrangementCorrectOrder: '',
    // Dạng điền từ từ danh sách: mỗi câu con là một chỗ trống trong đoạn văn chung.
    blankNumber: 0,
    blankAnswer: '',
    sourceSentence: '',
    sampleAnswer: '',
    gradingGuide: '',
    minWords: defaultWordLimit.minWords,
    maxWords: defaultWordLimit.maxWords,
    rubricCriteria: defaultRubric,
    reviewNote: '',
    manualGradingRequired: isManualGradingMode(questionFormat),
  };

  if (answerType === 'single_choice') {
    return {
      ...base,
      options: normalizeOptions([createOption(0), createOption(1), createOption(2), createOption(3)]).map((option, index) => ({
        ...option,
        isCorrect: index === 0,
      })),
      acceptedAnswers: [],
    };
  }

  if (answerType === 'multi_choice') {
    return {
      ...base,
      options: normalizeOptions([createOption(0), createOption(1), createOption(2), createOption(3)]),
      acceptedAnswers: [],
    };
  }

  if (answerType === 'matching') {
    return { ...base, acceptedAnswers: [] };
  }

  if (answerType === 'classification') {
    return { ...base, acceptedAnswers: [] };
  }

  if (answerType === 'sentence_arrangement') {
    return { ...base, acceptedAnswers: [] };
  }

  if (answerType === 'essay') {
    return { ...base, acceptedAnswers: [] };
  }

  return base;
};

const createQuestionBankDraft = (courseId = '') => ({
  id: '',
  // bankId rỗng = ngân hàng mới; có giá trị = đang sửa bản ghi trong nganhangde.
  bankId: '',
  code: '',
  name: '',
  courseId,
  level: 'IELTS',
  difficulty: 'Trung bình',
  skill: 'Đọc',
  unit: '',
  description: '',
  status: 'Nháp',
  createdAt: new Date().toISOString(),
  exercises: [],
});

const createExerciseDraft = (bank) => {
  const defaultFormat = getSupportedQuestionFormats(bank?.skillCode || bank?.skill)?.[0] || '';

  return {
    id: '',
    code: '',
    title: '',
    questionFormat: defaultFormat,
    unit: bank?.unit || '',
    content: '',
    audioUrl: '',
    imageUrl: '',
    note: '',
    wordBank: [''],
    status: 'Nháp',
    createdAt: new Date().toISOString(),
    childQuestions: defaultFormat ? [createChildQuestion(defaultFormat)] : [],
  };
};

const createDistributionDraft = (mode, item) => {
  const start = new Date();
  const end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);

  return {
    mode,
    item,
    targetIds: mode === 'CLASS' ? [...(item?.targetClasses || [])] : [...(item?.targetStudents || [])],
    keyword: '',
    classFilter: mode === 'STUDENT' && (item?.targetClasses || []).length === 1 ? item.targetClasses[0] : 'ALL',
    variantBatchId: item?.variantBatchId ?? item?.batchId ?? item?.id ?? null,
    variantCount: item?.variantCount ?? 1,
    startAt: toDateTimeLocalValue(start.toISOString()),
    endAt: toDateTimeLocalValue(end.toISOString()),
    durationMinutes: item?.durationMinutes || 30,
    attempts: 1,
    revealAnswers: false,
    studentNote: '',
  };
};

const createStructureForm = (bank) => {
  // Tên đề chỉ ghép những phần thật sự có, tránh ra "Cấu trúc đề -  Trung bình".
  const phan = [bank?.level, bank?.difficulty].filter(Boolean).join(' ');

  return {
    name: bank ? `Cấu trúc đề${phan ? ` - ${phan}` : ''}` : 'Cấu trúc đề mới',
    // Để trống khi ngân hàng chưa đặt — người soạn tự chọn ở bước cấu trúc,
    // và lựa chọn đó giờ được lưu vào đề.
    level: bank?.level || '',
    difficulty: bank?.difficulty || 'Trung bình',
    durationMinutes: 45,
    totalScore: 10,
    note: '',
  };
};

const createStructureRow = ({ skill = 'Đọc', skillCode = '', sourceBankIds = [], sectionOrder = 1 } = {}) => ({
  id: createId('STRUCT'),
  skill,
  skillCode,
  questionFormat: getSupportedQuestionFormats(skillCode || skill)[0] || '',
  sourceBankIds,
  requiredCount: 1,
  scoreWeight: 1,
  sectionOrder,
});

const createStructureRowsFromBank = (bank) => {
  return [
    createStructureRow({
      skill: bank?.skill || 'Đọc',
      skillCode: bank?.skillCode || '',
      sourceBankIds: bank?.id ? [bank.id] : [],
      sectionOrder: 1,
    }),
  ];
};

const getUniqueExamSkills = (sections = []) => [...new Set(sections.map((section) => section.skill).filter(Boolean))];

const getExamSkillSummary = (sections = []) => {
  const skills = getUniqueExamSkills(sections);
  if (!skills.length) {
    return '--';
  }

  return skills.length === 1 ? skills[0] : `Tổng hợp (${skills.join(' + ')})`;
};

/**
 * Đổi kết quả sinh đề của backend sang hình dạng mà phần preview đang dùng.
 * Backend trả về bài NGUỒN của từng phần (mã, tên, số câu con) chứ không trả
 * lại toàn bộ nội dung câu hỏi — preview chỉ cần bấy nhiêu.
 */
const buildGeneratedExamFromApi = (dto, context) => {
  const { bank, structureForm, generatorForm, rowsById, batchId, variantCount } = context;

  const sections = (dto.sections || []).map((section) => {
    const row = rowsById.get(section.rowId) || {};
    const items = (section.items || []).map((item) => ({
      id: item.maBaiTapNguon,
      code: item.code || '',
      title: item.tenBaiTap || '',
      bankId: bank.id,
      bankName: bank.name,
      unit: bank.unit || '',
      // Preview chỉ đếm độ dài, không đọc nội dung từng câu.
      childQuestions: Array.from({ length: Number(item.soCauCon || 0) }, (_, index) => ({ id: `${item.maBaiTapNguon}-${index}` })),
    }));

    const scoreWeight = Number(section.scoreWeight || 0);
    return {
      rowId: section.rowId,
      skill: section.skill || row.skill || '',
      questionFormat: row.questionFormat || section.loaiCauHoiCode || '',
      sourceBankIds: row.sourceBankIds || [bank.id],
      sourceBankNames: [bank.name],
      requiredCount: Number(row.requiredCount || items.length),
      scoreWeight,
      sectionOrder: Number(section.sectionOrder || 0),
      items,
      sectionMaxScore: items.reduce((sum, item) => sum + item.childQuestions.length * scoreWeight, 0),
    };
  });

  return {
    id: dto.maBaiTap,
    code: dto.code,
    title: dto.tenBaiTap,
    primaryBankId: bank.id,
    batchId,
    variantBatchId: batchId,
    variantIndex: Number(dto.variantIndex || 1),
    variantCount,
    sourceBankIds: [...new Set(sections.flatMap((section) => section.sourceBankIds).filter(Boolean))],
    structureName: structureForm.name,
    level: structureForm.level,
    difficulty: structureForm.difficulty,
    skillSummary: getExamSkillSummary(sections),
    skills: getUniqueExamSkills(sections),
    totalScore: Number(dto.tongDiem || 0),
    durationMinutes: Number(structureForm.durationMinutes || 0),
    createdAt: new Date().toISOString(),
    shuffleAnswers: Boolean(generatorForm.shuffleAnswers),
    note: structureForm.note || '',
    sections,
  };
};

const createGeneratedAssignment = (exam) => ({
  id: exam.id,
  code: exam.code,
  title: exam.title,
  type: 'Đề thi',
  level: exam.level,
  difficulty: exam.difficulty,
  skill: exam.skillSummary || getExamSkillSummary(exam.sections),
  skills: exam.skills || getUniqueExamSkills(exam.sections),
  totalItems: exam.sections.reduce((sum, section) => sum + section.items.length, 0),
  durationMinutes: exam.durationMinutes,
  status: 'Đã tạo',
  createdAt: exam.createdAt,
  primaryBankId: exam.primaryBankId,
  variantBatchId: exam.variantBatchId ?? exam.batchId ?? exam.id,
  variantIndex: exam.variantIndex ?? 1,
  variantCount: exam.variantCount ?? 1,
  targetClasses: [],
  targetStudents: [],
  studentVariantAssignments: [],
  studentsDone: 0,
  averageScore: 0,
});

const getAssignmentVariantBatchKey = (item) => item?.variantBatchId ?? item?.batchId ?? item?.id;

// Việc chia mã đề cho từng học sinh đã chuyển sang backend (endpoint
// assignments/distribute) nên các hàm dựng danh sách giả ở đây không còn dùng.

// Số học sinh lấy từ totalStudents (backend đếm), targetStudents chỉ chứa các
// id do người dùng tự tick nên không dùng để đếm được.
const getAssignmentStudentCount = (item) =>
  Number(item?.totalStudents ?? item?.targetStudents?.length ?? 0);

const formatAssignmentDistributionSummary = (item) => {
  const variantCount = Number(item?.variantCount || 0);
  const classCount = item?.targetClasses?.length || 0;
  const studentCount = getAssignmentStudentCount(item);

  if (variantCount > 1) {
    return studentCount > 0 ? `Bộ ${variantCount} đề · ${studentCount} học sinh được random` : `Bộ ${variantCount} đề · Chưa giao`;
  }

  return `${classCount ? `${classCount} lớp đã nhận` : 'Chưa gán lớp'} · ${studentCount ? `${studentCount} học sinh` : 'Chưa có học sinh'}`;
};

const getVariantBadgeLabel = (item) => {
  const variantCount = Number(item?.variantCount || 0);
  if (variantCount <= 1) {
    return '';
  }

  return `Phiên bản ${item.variantIndex || 1}/${variantCount}`;
};

function toDateTimeLocalValue(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Đổi giá trị ô <input type="datetime-local"> thành chuỗi gửi lên backend,
 * GIỮ NGUYÊN giờ người dùng gõ.
 *
 * Trước đây dùng `new Date(value).toISOString()`, tức quy về UTC. Backend lại
 * làm việc hoàn toàn bằng giờ máy chủ (DateTime.Now, cột datetime của MySQL
 * không mang múi giờ), nên giờ UTC bị ghi vào như thể là giờ địa phương và hạn
 * nộp lệch đúng bằng độ lệch múi giờ — ở VN là sớm 7 tiếng.
 */
function toBackendDateTime(value) {
  if (!value) {
    return null;
  }

  // Giá trị của datetime-local đã là "YYYY-MM-DDTHH:mm" theo giờ địa phương.
  return value.length === 16 ? `${value}:00` : value;
}

function formatDate(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function paginateItems(items, page, pageSize) {
  const total = items.length;
  const safePageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const pagedItems = items.slice(startIndex, startIndex + safePageSize);

  return {
    items: pagedItems,
    total,
    totalPages,
    currentPage,
    pageSize: safePageSize,
    startItem: total ? startIndex + 1 : 0,
    endItem: total ? startIndex + pagedItems.length : 0,
  };
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function StatusBadge({ meta, fallbackLabel }) {
  return <span className={`badge bg-${meta.tone}-subtle text-${meta.tone}`}>{meta.label || fallbackLabel}</span>;
}

function ActionMenu({ primaryAction, items }) {
  const PrimaryIcon = primaryAction?.icon;

  return (
    <div className="admin-eem-row-actions">
      {primaryAction ? (
        <button type="button" className={primaryAction.className || 'btn btn-sm btn-light border'} onClick={primaryAction.onClick}>
          {PrimaryIcon ? <PrimaryIcon size={14} className="me-1" /> : null}
          {primaryAction.label}
        </button>
      ) : null}

      <details className="admin-eem-action-menu">
        <summary className="btn btn-sm btn-outline-primary admin-eem-action-menu-trigger">Thao tác</summary>
        <div className="admin-eem-action-menu-list">
          {items.map((item, index) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={`${item.label}-${index}`}
                type="button"
                className={`admin-eem-action-menu-item${item.tone ? ` is-${item.tone}` : ''}`}
                onClick={(event) => {
                  const detailsElement = event.currentTarget.closest('details');
                  if (detailsElement) {
                    detailsElement.removeAttribute('open');
                  }
                  item.onClick();
                }}
              >
                {ItemIcon ? <ItemIcon size={14} className="me-2" /> : null}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function PaginationBar({ label, pagination, onPageChange, pageSize, onPageSizeChange }) {
  if (!pagination.total) {
    return null;
  }

  const visiblePages = getPaginationPages(pagination.currentPage, pagination.totalPages);

  return (
    <div className="admin-eem-pagination">
      <div className="small text-muted">
        Hiển thị <strong>{pagination.startItem}</strong> - <strong>{pagination.endItem}</strong> / <strong>{pagination.total}</strong>{' '}
        {label}
      </div>

      <div className="admin-eem-pagination-controls">
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">Mỗi trang</span>
          <select
            className="form-select form-select-sm admin-eem-page-size-select"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <nav aria-label={`Phân trang ${label}`}>
          <ul className="pagination pagination-sm mb-0 admin-eem-pagination-list">
            <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
            </li>

            {visiblePages[0] > 1 ? (
              <>
                <li className="page-item">
                  <button type="button" className="page-link" onClick={() => onPageChange(1)}>
                    1
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              </>
            ) : null}

            {visiblePages.map((pageNumber) => (
              <li key={pageNumber} className={`page-item ${pagination.currentPage === pageNumber ? 'active' : ''}`}>
                <button type="button" className="page-link" onClick={() => onPageChange(pageNumber)}>
                  {pageNumber}
                </button>
              </li>
            ))}

            {visiblePages[visiblePages.length - 1] < pagination.totalPages ? (
              <>
                <li className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
                <li className="page-item">
                  <button type="button" className="page-link" onClick={() => onPageChange(pagination.totalPages)}>
                    {pagination.totalPages}
                  </button>
                </li>
              </>
            ) : null}

            <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children, footer, size = 'xl' }) {
  return (
    <div className="modal d-block admin-eem-backdrop" tabIndex="-1" role="dialog">
      <div className={`modal-dialog modal-dialog-scrollable modal-${size}`}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header border-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold mb-1">{title}</h5>
              {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
            </div>
            <button type="button" className="btn btn-sm btn-light rounded-circle" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-footer border-0 pt-0">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, helpText }) {
  return (
    <div className="col-md-6 col-xl">
      <div className="card border-0 shadow-sm h-100 admin-eem-stat">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="small text-muted mb-2">{label}</div>
              <div className={`display-6 fw-bold text-${tone}`}>{value}</div>
              {helpText ? <div className="small text-muted mt-2">{helpText}</div> : null}
            </div>
            <div className={`admin-eem-icon text-${tone}`}>
              <Icon size={22} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryFilterCard({ filters, options, onChange, onReset }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        {/* 4 ô lọc x 2 cột + ô tìm kiếm 4 cột = đủ 12, không còn khoảng trống
            thừa bên phải sau khi bỏ ô lọc Kỹ năng. */}
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Loại nội dung</label>
            <select className="form-select" value={filters.type} onChange={(event) => onChange('type', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.assignmentTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trình độ</label>
            <select className="form-select" value={filters.level} onChange={(event) => onChange('level', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.levels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Mức độ</label>
            <select className="form-select" value={filters.difficulty} onChange={(event) => onChange('difficulty', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.difficulties.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {/* Bỏ lọc theo kỹ năng: một đề có thể ghép nhiều kỹ năng nên lọc
              theo một kỹ năng duy nhất sẽ bỏ sót đề hỗn hợp. */}
          <div className="col-12 col-sm-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trạng thái</label>
            <select className="form-select" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.publishModes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-4">
            <label className="form-label small fw-semibold text-muted">Tìm kiếm</label>
            <div className="input-group admin-eem-search-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} />
              </span>
              <input
                className="form-control border-start-0 admin-eem-search-input"
                value={filters.keyword}
                onChange={(event) => onChange('keyword', event.target.value)}
                placeholder="Tên bài / đề"
              />
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-end mt-3">
          <button className="btn btn-light border" onClick={onReset}>
            <Filter size={16} className="me-2" />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionBankFilterCard({ filters, options, units, onChange, onReset }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trình độ</label>
            <select className="form-select" value={filters.level} onChange={(event) => onChange('level', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.levels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Mức độ</label>
            <select className="form-select" value={filters.difficulty} onChange={(event) => onChange('difficulty', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.difficulties.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Kỹ năng</label>
            <select className="form-select" value={filters.skill} onChange={(event) => onChange('skill', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {options.skills.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Unit/Bài học</label>
            <select className="form-select" value={filters.unit} onChange={(event) => onChange('unit', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trạng thái</label>
            <select className="form-select" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {QUESTION_BANK_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Tìm kiếm</label>
            <div className="input-group admin-eem-search-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} />
              </span>
              <input
                className="form-control border-start-0 admin-eem-search-input"
                value={filters.keyword}
                onChange={(event) => onChange('keyword', event.target.value)}
                placeholder="Tìm ngân hàng"
              />
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-end mt-3">
          <button className="btn btn-light border" onClick={onReset}>
            <Filter size={16} className="me-2" />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}

function StringListEditor({ label, items, onChange, addLabel, placeholder }) {
  return (
    <div className="admin-eem-subeditor">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="small fw-semibold">{label}</div>
        <button
          type="button"
          className="btn btn-sm btn-light border"
          onClick={() => onChange([...(items || []), ''])}
        >
          <Plus size={14} className="me-1" />
          {addLabel}
        </button>
      </div>
      <div className="d-flex flex-column gap-2">
        {(items || []).map((item, index) => (
          <div key={`${label}-${index}`} className="d-flex gap-2">
            <input
              className="form-control"
              value={item}
              placeholder={placeholder}
              onChange={(event) => onChange(items.map((current, currentIndex) => (currentIndex === index ? event.target.value : current)))}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}
              disabled={items.length <= 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceOptionsEditor({ options, onChange, multi }) {
  const addOption = () => onChange(normalizeOptions([...(options || []), createOption(options.length)]));

  const updateOption = (optionId, field, value) => {
    const next = normalizeOptions(
      options.map((option) => {
        if (option.id !== optionId) {
          return option;
        }
        return { ...option, [field]: value };
      })
    );
    onChange(next);
  };

  const toggleCorrect = (optionId) => {
    const next = normalizeOptions(
      options.map((option) => {
        if (multi) {
          return option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option;
        }
        return { ...option, isCorrect: option.id === optionId };
      })
    );
    onChange(next);
  };

  const removeOption = (optionId) => {
    onChange(normalizeOptions(options.filter((option) => option.id !== optionId)));
  };

  return (
    <div className="admin-eem-subeditor">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="small fw-semibold">Danh sách đáp án</div>
        <button type="button" className="btn btn-sm btn-light border" onClick={addOption}>
          <Plus size={14} className="me-1" />
          Thêm đáp án
        </button>
      </div>
      <div className="d-flex flex-column gap-2">
        {(options || []).map((option) => (
          <div key={option.id} className="admin-eem-option-row">
            <button type="button" className={`btn btn-sm ${option.isCorrect ? 'btn-success' : 'btn-light border'}`} onClick={() => toggleCorrect(option.id)}>
              {option.label}
            </button>
            <input
              className="form-control"
              value={option.text}
              placeholder={`Nội dung đáp án ${option.label}`}
              onChange={(event) => updateOption(option.id, 'text', event.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => removeOption(option.id)}
              disabled={(options || []).length <= 2}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="small text-muted mt-2">
        {multi ? 'Có thể chọn nhiều đáp án đúng.' : 'Chỉ được chọn đúng 1 đáp án.'}
      </div>
    </div>
  );
}

function MatchingEditor({ question, onChange }) {
  const updatePairs = (pairs) => onChange({ ...question, matchingPairs: pairs });

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <StringListEditor
          label="Cột trái"
          items={question.leftItems}
          addLabel="Thêm mục trái"
          placeholder="Nội dung cột trái"
          onChange={(leftItems) => onChange({ ...question, leftItems })}
        />
      </div>
      <div className="col-md-6">
        <StringListEditor
          label="Cột phải"
          items={question.rightItems}
          addLabel="Thêm mục phải"
          placeholder="Nội dung cột phải"
          onChange={(rightItems) => onChange({ ...question, rightItems })}
        />
      </div>
      <div className="col-12">
        <div className="admin-eem-subeditor">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small fw-semibold">Cặp nội dung</div>
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={() => updatePairs([...(question.matchingPairs || []), { left: '', right: '' }])}
            >
              <Plus size={14} className="me-1" />
              Thêm cặp nối
            </button>
          </div>
          <div className="d-flex flex-column gap-2">
            {(question.matchingPairs || []).map((pair, index) => (
              <div key={`pair-${index}`} className="row g-2 align-items-center">
                <div className="col-md-5">
                  <input
                    className="form-control"
                    value={pair.left}
                    placeholder="Giá trị cột trái"
                    onChange={(event) =>
                      updatePairs(
                        question.matchingPairs.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, left: event.target.value } : current
                        )
                      )
                    }
                  />
                </div>
                <div className="col-md-5">
                  <input
                    className="form-control"
                    value={pair.right}
                    placeholder="Giá trị cột phải"
                    onChange={(event) =>
                      updatePairs(
                        question.matchingPairs.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, right: event.target.value } : current
                        )
                      )
                    }
                  />
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger w-100"
                    onClick={() => updatePairs(question.matchingPairs.filter((_, currentIndex) => currentIndex !== index))}
                    disabled={(question.matchingPairs || []).length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hiển thị nội dung một câu hỏi con ở chế độ chỉ đọc.
 * Mỗi dạng có cấu trúc riêng nên phải render riêng, không dùng chung được.
 */
function ChildQuestionDetail({ question, mode }) {
  const label = (index) => String.fromCharCode(97 + index);

  const rows = [];

  if (mode === 'sentence_arrangement') {
    const sentences = question.arrangementSentences || [];
    const order = String(question.arrangementCorrectOrder || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    rows.push(
      <div key="sentences">
        <div className="small fw-semibold mb-1">Các câu cần sắp xếp</div>
        {sentences.map((text, index) => (
          <div key={`s-${index}`} className="small mb-1">
            <span className="badge text-bg-secondary me-2">{label(index)}</span>
            {text}
          </div>
        ))}
      </div>
    );

    if (order.length) {
      rows.push(
        <div key="order">
          <div className="small fw-semibold mb-1">Thứ tự đúng</div>
          <div className="small mb-2">{order.join(' → ')}</div>
          {order.map((key, index) => {
            const position = key.charCodeAt(0) - 97;
            return (
              <div key={`o-${index}`} className="small mb-1">
                <span className="text-muted me-2">{index + 1}.</span>
                {sentences[position] ?? <span className="text-danger">không tìm thấy nhãn “{key}”</span>}
              </div>
            );
          })}
        </div>
      );
    }
  }

  if (mode === 'matching') {
    const left = question.leftItems || [];
    const right = question.rightItems || [];
    const pairs = question.matchingPairs || [];

    rows.push(
      <div key="matching" className="row g-3">
        <div className="col-md-6">
          <div className="small fw-semibold mb-1">Cột trái</div>
          {left.map((text, index) => (
            <div key={`l-${index}`} className="small mb-1">
              <span className="badge text-bg-light border me-2">t{index + 1}</span>
              {text}
            </div>
          ))}
        </div>
        <div className="col-md-6">
          <div className="small fw-semibold mb-1">Cột phải</div>
          {right.map((text, index) => (
            <div key={`r-${index}`} className="small mb-1">
              <span className="badge text-bg-light border me-2">{label(index)}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    );

    if (pairs.length) {
      rows.push(
        <div key="pairs">
          <div className="small fw-semibold mb-1">Đáp án ghép</div>
          {pairs.map((pair, index) => {
            const leftText = left[Number(String(pair.left).replace(/\D/g, '')) - 1] ?? pair.left;
            const rightText = right[String(pair.right).charCodeAt(0) - 97] ?? pair.right;
            return (
              <div key={`p-${index}`} className="small mb-1">
                {leftText} <span className="text-muted">→</span> {rightText}
              </div>
            );
          })}
        </div>
      );
    }
  }

  if (mode === 'cloze_from_list') {
    rows.push(
      <div key="cloze">
        <div className="small">
          <span className="fw-semibold">Chỗ trống số:</span> {question.blankNumber || '--'}
        </div>
        <div className="small">
          <span className="fw-semibold">Đáp án:</span>{' '}
          {question.blankAnswer ? (
            <span className="badge text-bg-success">{question.blankAnswer}</span>
          ) : (
            <span className="text-danger">chưa chọn</span>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'classification') {
    rows.push(
      <div key="classification">
        <div className="small fw-semibold mb-1">Phân loại</div>
        {(question.classificationItems || []).map((item, index) => (
          <div key={`c-${index}`} className="small mb-1">
            {item.value} <span className="text-muted">→</span> {item.group || '--'}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'insert_sentence') {
    rows.push(
      <div key="insert">
        {question.passage ? (
          <>
            <div className="small fw-semibold mb-1">Đoạn văn</div>
            <div className="small mb-2" style={{ whiteSpace: 'pre-wrap' }}>{question.passage}</div>
          </>
        ) : null}
        <div className="small">
          <span className="fw-semibold">Câu cần chèn:</span> {question.insertSentence || '--'}
        </div>
        <div className="small">
          <span className="fw-semibold">Vị trí đúng:</span> {question.correctPosition || '--'}
        </div>
      </div>
    );
  }

  if (mode === 'error_correction') {
    rows.push(
      <div key="error">
        <div className="small"><span className="fw-semibold">Câu sai:</span> {question.wrongText || '--'}</div>
        <div className="small"><span className="fw-semibold">Câu đúng:</span> {question.correctedText || '--'}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return <div className="d-flex flex-column gap-3 mt-2">{rows}</div>;
}

function SentenceArrangementEditor({ question, onChange }) {
  const sentences = question.arrangementSentences || [];
  const labels = sentences.map((_, index) => String.fromCharCode(97 + index));
  const correctOrder = question.arrangementCorrectOrder || '';

  const usedLabels = correctOrder
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const orderError = (() => {
    if (!correctOrder.trim()) {
      return 'Chưa nhập thứ tự đúng.';
    }
    if (usedLabels.length !== sentences.length) {
      return `Thứ tự đúng phải gồm đủ ${sentences.length} câu.`;
    }
    if (new Set(usedLabels).size !== usedLabels.length) {
      return 'Thứ tự đúng đang bị lặp nhãn.';
    }
    const unknown = usedLabels.filter((item) => !labels.includes(item));
    if (unknown.length) {
      return `Nhãn không tồn tại: ${unknown.join(', ')}.`;
    }
    return '';
  })();

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="admin-eem-subeditor">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small fw-semibold">Các câu cần sắp xếp (thứ tự hiển thị cho học viên)</div>
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={() => onChange({ ...question, arrangementSentences: [...sentences, ''] })}
            >
              <Plus size={14} className="me-1" />
              Thêm câu
            </button>
          </div>
          <div className="d-flex flex-column gap-2">
            {sentences.map((sentence, index) => (
              <div key={`arrangement-${index}`} className="d-flex gap-2 align-items-center">
                <span className="badge text-bg-secondary text-uppercase">{labels[index]}</span>
                <input
                  className="form-control"
                  value={sentence}
                  placeholder="Nội dung câu"
                  onChange={(event) =>
                    onChange({
                      ...question,
                      arrangementSentences: sentences.map((current, currentIndex) =>
                        currentIndex === index ? event.target.value : current
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={sentences.length <= 2}
                  onClick={() =>
                    onChange({
                      ...question,
                      arrangementSentences: sentences.filter((_, currentIndex) => currentIndex !== index),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <label className="form-label fw-semibold">Thứ tự đúng</label>
        <input
          className={`form-control ${orderError ? 'is-invalid' : ''}`}
          value={correctOrder}
          placeholder={labels.join(', ')}
          onChange={(event) => onChange({ ...question, arrangementCorrectOrder: event.target.value })}
        />
        {orderError ? (
          <div className="invalid-feedback d-block">{orderError}</div>
        ) : (
          <div className="form-text">Nhập nhãn theo đúng trình tự, cách nhau bằng dấu phẩy.</div>
        )}
      </div>
    </div>
  );
}

function ClassificationEditor({ question, onChange }) {
  const groups = question.classificationGroups || [];
  const items = question.classificationItems || [];

  return (
    <div className="row g-3">
      <div className="col-md-5">
        <StringListEditor
          label="Nhóm / phân loại"
          items={groups}
          addLabel="Thêm nhóm"
          placeholder="Tên nhóm"
          onChange={(classificationGroups) => onChange({ ...question, classificationGroups })}
        />
      </div>
      <div className="col-md-7">
        <div className="admin-eem-subeditor">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small fw-semibold">Danh sách item cần phân loại</div>
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={() =>
                onChange({
                  ...question,
                  classificationItems: [...items, { value: '', group: groups[0] || '' }],
                })
              }
            >
              <Plus size={14} className="me-1" />
              Thêm item
            </button>
          </div>
          <div className="d-flex flex-column gap-2">
            {items.map((item, index) => (
              <div key={`classification-${index}`} className="row g-2">
                <div className="col-md-7">
                  <input
                    className="form-control"
                    value={item.value}
                    placeholder="Nội dung item"
                    onChange={(event) =>
                      onChange({
                        ...question,
                        classificationItems: items.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, value: event.target.value } : current
                        ),
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={item.group}
                    onChange={(event) =>
                      onChange({
                        ...question,
                        classificationItems: items.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, group: event.target.value } : current
                        ),
                      })
                    }
                  >
                    {groups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger w-100"
                    onClick={() =>
                      onChange({
                        ...question,
                        classificationItems: items.filter((_, currentIndex) => currentIndex !== index),
                      })
                    }
                    disabled={items.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildQuestionEditor({ question, index, questionFormat, wordBank = [], onChange, onDuplicate, onDelete }) {
  const mode = getQuestionEditorMode(questionFormat);

  return (
    <div className="admin-eem-child-card">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <div className="fw-semibold">Câu hỏi con {index + 1}</div>
          <div className="small text-muted">Dạng hiển thị: {questionFormat || 'Chưa chọn'}</div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-light border" onClick={onDuplicate}>
            <Copy size={14} className="me-1" />
            Nhân bản
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete}>
            <Trash2 size={14} className="me-1" />
            Xóa
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <label className="form-label fw-semibold">Nội dung câu hỏi</label>
          <textarea
            rows="3"
            className="form-control"
            value={question.prompt}
            onChange={(event) => onChange({ ...question, prompt: event.target.value })}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Loại đáp án</label>
          <input className="form-control" value={question.answerType} readOnly />
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Điểm</label>
          <input
            type="number"
            className="form-control"
            value={question.score}
            min="0"
            onChange={(event) => onChange({ ...question, score: Number(event.target.value) })}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Giải thích đáp án</label>
          <input
            className="form-control"
            value={question.explanation}
            onChange={(event) => onChange({ ...question, explanation: event.target.value })}
          />
        </div>
      </div>

      {['essay', 'sentence_rewrite'].includes(mode) ? (
        <div className="admin-eem-inline-note p-3 mt-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="badge text-bg-warning">Chấm tay</span>
            <span className="small">
              Câu hỏi kỹ năng Viết nên có đáp án mẫu, rubric chấm và ghi chú để giáo viên chấm nhất quán hơn.
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        {mode === 'single_choice' ? (
          <ChoiceOptionsEditor options={question.options} onChange={(options) => onChange({ ...question, options })} multi={false} />
        ) : null}

        {mode === 'multi_choice' ? (
          <ChoiceOptionsEditor options={question.options} onChange={(options) => onChange({ ...question, options })} multi />
        ) : null}

        {mode === 'short_text' ? (
          <StringListEditor
            label="Danh sách đáp án đúng chấp nhận được"
            items={question.acceptedAnswers}
            addLabel="Thêm đáp án"
            placeholder="Đáp án đúng"
            onChange={(acceptedAnswers) => onChange({ ...question, acceptedAnswers })}
          />
        ) : null}

        {mode === 'gap_fill' ? (
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-semibold">Câu / đoạn có chỗ trống</label>
              <textarea
                rows="3"
                className="form-control"
                value={question.prompt}
                onChange={(event) => onChange({ ...question, prompt: event.target.value })}
              />
            </div>
            <div className="col-12">
              <StringListEditor
                label="Đáp án đúng / chấp nhận được"
                items={question.acceptedAnswers}
                addLabel="Thêm đáp án"
                placeholder="Đáp án"
                onChange={(acceptedAnswers) => onChange({ ...question, acceptedAnswers })}
              />
            </div>
          </div>
        ) : null}

        {mode === 'cloze_from_list' ? (
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Chỗ trống số</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={question.blankNumber || ''}
                onChange={(event) => onChange({ ...question, blankNumber: Number(event.target.value) })}
              />
              <div className="form-text">Khớp với số trong đoạn văn.</div>
            </div>
            <div className="col-md-9">
              <label className="form-label fw-semibold">Đáp án đúng</label>
              <select
                className={`form-select ${question.blankAnswer ? '' : 'is-invalid'}`}
                value={question.blankAnswer || ''}
                onChange={(event) => onChange({ ...question, blankAnswer: event.target.value })}
              >
                <option value="">-- Chọn từ trong word bank --</option>
                {wordBank.filter(Boolean).map((word) => (
                  <option key={word} value={word}>
                    {word}
                  </option>
                ))}
              </select>
              {question.blankAnswer ? null : (
                <div className="invalid-feedback d-block">Chưa chọn đáp án cho chỗ trống này.</div>
              )}
            </div>
          </div>
        ) : null}

        {mode === 'matching' ? <MatchingEditor question={question} onChange={onChange} /> : null}

        {mode === 'classification' ? <ClassificationEditor question={question} onChange={onChange} /> : null}

        {mode === 'sentence_arrangement' ? <SentenceArrangementEditor question={question} onChange={onChange} /> : null}

        {mode === 'insert_sentence' ? (
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-semibold">Đoạn văn</label>
              <textarea
                rows="4"
                className="form-control"
                value={question.passage}
                onChange={(event) => onChange({ ...question, passage: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Câu cần chèn</label>
              <input
                className="form-control"
                value={question.insertSentence}
                onChange={(event) => onChange({ ...question, insertSentence: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Vị trí đúng</label>
              <input
                className="form-control"
                value={question.correctPosition}
                onChange={(event) => onChange({ ...question, correctPosition: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        {mode === 'error_correction' ? (
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-semibold">Câu / đoạn văn chứa lỗi</label>
              <textarea
                rows="3"
                className="form-control"
                value={question.prompt}
                onChange={(event) => onChange({ ...question, prompt: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Lỗi sai</label>
              <input
                className="form-control"
                value={question.wrongText}
                onChange={(event) => onChange({ ...question, wrongText: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Đáp án sửa đúng</label>
              <input
                className="form-control"
                value={question.correctedText}
                onChange={(event) => onChange({ ...question, correctedText: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        {mode === 'sentence_rewrite' ? (
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Câu gốc</label>
              <textarea
                rows="3"
                className="form-control"
                value={question.sourceSentence}
                onChange={(event) => onChange({ ...question, sourceSentence: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Đáp án mẫu</label>
              <textarea
                rows="3"
                className="form-control"
                value={question.sampleAnswer}
                onChange={(event) => onChange({ ...question, sampleAnswer: event.target.value })}
              />
            </div>
            <div className="col-12">
              <StringListEditor
                label="Tiêu chí chấm"
                items={question.rubricCriteria || []}
                addLabel="Thêm tiêu chí"
                placeholder="Ví dụ: Giữ nguyên ý nghĩa"
                onChange={(rubricCriteria) => onChange({ ...question, rubricCriteria })}
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Hướng dẫn chấm</label>
              <textarea
                rows="2"
                className="form-control"
                value={question.gradingGuide}
                onChange={(event) => onChange({ ...question, gradingGuide: event.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Ghi chú cho giáo viên chấm</label>
              <textarea
                rows="2"
                className="form-control"
                value={question.reviewNote}
                onChange={(event) => onChange({ ...question, reviewNote: event.target.value })}
                placeholder="Ví dụ: Chấp nhận đáp án đồng nghĩa nếu không đổi nghĩa gốc."
              />
            </div>
          </div>
        ) : null}

        {mode === 'essay' ? (
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Tối thiểu số từ</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={question.minWords || 0}
                onChange={(event) => onChange({ ...question, minWords: Number(event.target.value) })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Tối đa số từ</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={question.maxWords || 0}
                onChange={(event) => onChange({ ...question, maxWords: Number(event.target.value) })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Nhắc nhở chấm</label>
              <input
                className="form-control"
                value={question.reviewNote}
                onChange={(event) => onChange({ ...question, reviewNote: event.target.value })}
                placeholder="Ví dụ: Trừ điểm nếu dưới số từ tối thiểu."
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Đáp án mẫu</label>
              <textarea
                rows="4"
                className="form-control"
                value={question.sampleAnswer}
                onChange={(event) => onChange({ ...question, sampleAnswer: event.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Hướng dẫn chấm</label>
              <textarea
                rows="4"
                className="form-control"
                value={question.gradingGuide}
                onChange={(event) => onChange({ ...question, gradingGuide: event.target.value })}
              />
            </div>
            <div className="col-12">
              <StringListEditor
                label="Rubric / tiêu chí chấm"
                items={question.rubricCriteria || []}
                addLabel="Thêm tiêu chí"
                placeholder="Ví dụ: Task response"
                onChange={(rubricCriteria) => onChange({ ...question, rubricCriteria })}
              />
            </div>
          </div>
        ) : null}

        {mode === 'generic' ? (
          <StringListEditor
            label="Đáp án / dữ liệu chấm"
            items={question.acceptedAnswers}
            addLabel="Thêm đáp án"
            placeholder="Dữ liệu đúng"
            onChange={(acceptedAnswers) => onChange({ ...question, acceptedAnswers })}
          />
        ) : null}
      </div>
    </div>
  );
}

function AdminExerciseExamManagement() {
  const [activeTab, setActiveTab] = useState('QUESTION_BANK');
  const [assignments, setAssignments] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [deliveryFilters, setDeliveryFilters] = useState(DELIVERY_FILTERS);
  const [bankFilters, setBankFilters] = useState(BANK_FILTERS);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [bankPage, setBankPage] = useState(1);
  const [bankPageSize, setBankPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [exercisePage, setExercisePage] = useState(1);
  const [exercisePageSize, setExercisePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [bankDraft, setBankDraft] = useState(null);
  const [exerciseDraft, setExerciseDraft] = useState(null);
  const [exerciseDetailItem, setExerciseDetailItem] = useState(null);
  const [distributionDraft, setDistributionDraft] = useState(null);
  const [assignmentDetailItem, setAssignmentDetailItem] = useState(null);
  const [assignmentDetailTab, setAssignmentDetailTab] = useState('INFO');

  // Mo bai nao thi luon bat dau o the thong tin, khong giu the cua bai truoc.
  const openAssignmentDetail = useCallback((item) => {
    setAssignmentDetailTab('INFO');
    setAssignmentDetailItem(item);
  }, []);
  const [assignmentResultItem, setAssignmentResultItem] = useState(null);
  const [assignmentEditDraft, setAssignmentEditDraft] = useState(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [structureForm, setStructureForm] = useState(createStructureForm(null));
  const [structureRows, setStructureRows] = useState(createStructureRowsFromBank(null));
  const [sourceFilters, setSourceFilters] = useState(SOURCE_FILTERS);
  const [sourceSelections, setSourceSelections] = useState({});
  const [generatedExams, setGeneratedExams] = useState([]);
  const [previewExam, setPreviewExam] = useState(null);
  const [previewExamTab, setPreviewExamTab] = useState('STRUCTURE');

  // Mở đề nào thì luôn bắt đầu ở thẻ cấu trúc, không giữ thẻ của đề trước.
  const openExamPreview = useCallback((exam) => {
    setPreviewExamTab('STRUCTURE');
    setPreviewExam(exam);
  }, []);
  const [catalog, setCatalog] = useState({
    levels: [], skills: [], difficultyLevels: [], assignmentTypes: [], publishModes: [],
  });
  // Khoá học để gán cho ngân hàng đề khi thêm/sửa.
  const [courseOptions, setCourseOptions] = useState([]);
  // Lớp và học sinh thật, lấy từ backend để giao bài.
  const [classOptions, setClassOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  // Tăng lên mỗi khi ghi thành công để nạp lại dữ liệu từ backend.
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshFromBackend = useCallback(() => setRefreshToken((value) => value + 1), []);

  /**
   * Danh sách lựa chọn cho các dropdown.
   *
   * Năm nhóm này là DANH MỤC TRONG CSDL (bảng chitietdanhmuc) nên lấy thẳng từ
   * /bootstrap; danh sách gán cứng chỉ còn là phương án dự phòng khi backend
   * chưa trả về. Nhờ vậy thêm/sửa một trình độ hay kỹ năng trong CSDL là
   * dropdown tự có, không phải sửa code.
   */
  const options = useMemo(() => {
    const labels = (rows, fallback) => {
      const list = (rows || []).map((item) => item?.label ?? item?.Label).filter(Boolean);
      return list.length ? list : fallback;
    };

    return {
      levels: labels(catalog.levels, LEVEL_OPTIONS),
      skills: labels(catalog.skills, SKILL_OPTIONS),
      difficulties: labels(catalog.difficultyLevels, DIFFICULTY_OPTIONS),
      assignmentTypes: labels(catalog.assignmentTypes, ASSIGNMENT_TYPE_OPTIONS),
      publishModes: labels(catalog.publishModes, DELIVERY_STATUS_OPTIONS),
    };
  }, [catalog]);

  // Nhãn hiển thị trên UI -> mã trong CSDL, lấy từ /bootstrap nên không gán cứng.
  const toLevelCode = useMemo(() => createCatalogLookup(catalog.levels), [catalog.levels]);
  const toSkillCode = useMemo(() => createCatalogLookup(catalog.skills), [catalog.skills]);
  const toDifficultyCode = useMemo(
    () => createCatalogLookup(catalog.difficultyLevels),
    [catalog.difficultyLevels]
  );

  const selectedBank = useMemo(
    () => questionBanks.find((bank) => bank.id === selectedBankId) || null,
    [questionBanks, selectedBankId]
  );

  const reloadBackendData = useCallback(async () => {
    const [assignmentItems, questionBankItems, bankGroups, targets, bootstrap] = await Promise.all([
      adminAssignmentService.getAssignments(),
      adminAssignmentService.getQuestionBank(),
      adminAssignmentService.getQuestionBankGroups(),
      adminAssignmentService.getDistributionTargets(),
      adminAssignmentService.getBootstrap(),
    ]);

    const readOptions = (value) => (Array.isArray(value) ? value : []);
    const levels = readOptions(bootstrap?.levels ?? bootstrap?.Levels);
    const skills = readOptions(bootstrap?.skills ?? bootstrap?.Skills);
    const difficultyLevels = readOptions(bootstrap?.difficultyLevels ?? bootstrap?.DifficultyLevels);
    const assignmentTypes = readOptions(bootstrap?.assignmentTypes ?? bootstrap?.AssignmentTypes);
    const publishModes = readOptions(bootstrap?.publishModes ?? bootstrap?.PublishModes);
    const courses = readOptions(bootstrap?.courses ?? bootstrap?.Courses).map((course) => ({
      id: course?.maKhoaHoc ?? course?.MaKhoaHoc,
      name: course?.tenKhoaHoc ?? course?.TenKhoaHoc ?? '',
    }));

    const labelByCode = new Map(
      [...levels, ...skills, ...difficultyLevels]
        .map((option) => [option?.code ?? option?.Code, option?.label ?? option?.Label])
        .filter(([code, label]) => code && label)
    );

    // Lớp và học sinh thật, dùng cho màn hình giao bài.
    const classes = readOptions(targets?.classes ?? targets?.Classes).map((item) => ({
      id: item?.maLopHoc ?? item?.MaLopHoc,
      name: item?.tenLop ?? item?.TenLop ?? '',
      teacher: item?.tenGiangVien ?? item?.TenGiangVien ?? '',
      students: Number(item?.soHocSinh ?? item?.SoHocSinh ?? 0),
      courseIds: readOptions(item?.maKhoaHocs ?? item?.MaKhoaHocs),
    }));
    const students = readOptions(targets?.students ?? targets?.Students).map((item) => ({
      id: item?.maHocSinh ?? item?.MaHocSinh,
      name: item?.hoTen ?? item?.HoTen ?? '',
      classId: item?.maLopHoc ?? item?.MaLopHoc,
      className: item?.tenLop ?? item?.TenLop ?? '',
      courseIds: readOptions(item?.maKhoaHocs ?? item?.MaKhoaHocs),
    }));

    return {
      assignmentItems, questionBankItems, bankGroups,
      levels, skills, difficultyLevels, assignmentTypes, publishModes,
      courses, classes, students, labelByCode,
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    const loadBackendData = async () => {
      try {
        const {
          assignmentItems, questionBankItems, bankGroups,
          levels, skills, difficultyLevels, assignmentTypes, publishModes,
          courses, classes, students, labelByCode,
        } = await reloadBackendData();
        if (canceled) {
          return;
        }

        setCatalog({ levels, skills, difficultyLevels, assignmentTypes, publishModes });
        setCourseOptions(courses.filter((course) => course.id));
        setClassOptions(classes.filter((item) => item.id));
        setStudentOptions(students.filter((item) => item.id));

        const normalizedAssignments = Array.isArray(assignmentItems)
          ? assignmentItems.map(normalizeBackendAssignment)
          : [];
        setAssignments(normalizedAssignments);
        const groupedBanks = buildBanksFromGroups(
          Array.isArray(bankGroups) ? bankGroups : [],
          Array.isArray(questionBankItems) ? questionBankItems : [],
          labelByCode
        );
        setQuestionBanks(groupedBanks);
        setSelectedBankId((current) => current || groupedBanks[0]?.id || null);
      } catch (error) {
        toast.error(error.message || 'Không thể tải dữ liệu quản lý đề/ngân hàng từ backend.');
      }
    };

    loadBackendData();

    return () => {
      canceled = true;
    };
  }, [reloadBackendData, refreshToken]);

  const unitOptions = useMemo(
    () => [...new Set(questionBanks.map((bank) => bank.unit).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [questionBanks]
  );

  const approvedExercises = useMemo(
    () => selectedBank?.exercises.filter((exercise) => exercise.status === 'Đã duyệt') || [],
    [selectedBank]
  );

  const approvedExercisesWithBank = useMemo(
    () =>
      questionBanks.flatMap((bank) =>
        (bank.exercises || [])
          .filter((exercise) => exercise.status === 'Đã duyệt')
          .map((exercise) => ({
            ...exercise,
            bankId: bank.id,
            bankName: bank.name,
            bankSkill: bank.skill,
            bankLevel: bank.level,
            bankDifficulty: bank.difficulty,
          }))
      ),
    [questionBanks]
  );

  const activeBanksForStructure = useMemo(
    () =>
      questionBanks.filter(
        (bank) =>
          bank.status === 'Đang sử dụng' &&
          bank.level === structureForm.level &&
          bank.difficulty === structureForm.difficulty
      ),
    [questionBanks, structureForm.difficulty, structureForm.level]
  );

  const availableSkillsForStructure = useMemo(
    () => [...new Set(activeBanksForStructure.map((bank) => bank.skill))],
    [activeBanksForStructure]
  );

  const structureSkillOptions = availableSkillsForStructure.length ? availableSkillsForStructure : options.skills;

  useEffect(() => {
    if (!selectedBank) {
      return;
    }

    setSelectedExerciseIds([]);
    setExercisePage(1);
    setExercisePageSize(DEFAULT_PAGE_SIZE);
    setSourceFilters(SOURCE_FILTERS);
    setSourceSelections({});
    setWizardStep(1);
    setStructureForm(createStructureForm(selectedBank));
    setStructureRows(createStructureRowsFromBank(selectedBank));
  }, [selectedBankId]);

  useEffect(() => {
    setStructureRows((prev) => {
      let changed = false;

      const next = prev.map((row, index) => {
        const normalizedSkill = structureSkillOptions.includes(row.skill) ? row.skill : structureSkillOptions[0] || 'Đọc';
        const normalizedSkillCode = toSkillCode(normalizedSkill) || row.skillCode || '';
        const formatOptions = getSupportedQuestionFormats(normalizedSkillCode || normalizedSkill);
        const normalizedFormat = formatOptions.includes(row.questionFormat) ? row.questionFormat : formatOptions[0] || '';
        const validBankIds = activeBanksForStructure.filter((bank) => bank.skill === normalizedSkill).map((bank) => bank.id);
        const normalizedSourceBankIds = (row.sourceBankIds || []).filter((bankId) => validBankIds.includes(bankId));
        const normalizedOrder = Number(row.sectionOrder || index + 1);

        if (
          normalizedSkill !== row.skill ||
          normalizedSkillCode !== (row.skillCode || '') ||
          normalizedFormat !== row.questionFormat ||
          normalizedOrder !== row.sectionOrder ||
          normalizedSourceBankIds.length !== (row.sourceBankIds || []).length
        ) {
          changed = true;
          return {
            ...row,
            skill: normalizedSkill,
            skillCode: normalizedSkillCode,
            questionFormat: normalizedFormat,
            sourceBankIds: normalizedSourceBankIds,
            sectionOrder: normalizedOrder,
          };
        }

        return row;
      });

      return changed ? next : prev;
    });
  }, [activeBanksForStructure, structureSkillOptions]);

  useEffect(() => {
    setDeliveryPage(1);
  }, [deliveryFilters]);

  useEffect(() => {
    setBankPage(1);
  }, [bankFilters]);

  const deliveryStats = useMemo(() => {
    const delivered = assignments.filter((item) => item.status === 'Đã giao' || item.status === 'Đã đóng');
    const averageCandidates = assignments.filter((item) => Number(item.averageScore) > 0);
    const averageScore = averageCandidates.length
      ? averageCandidates.reduce((sum, item) => sum + Number(item.averageScore || 0), 0) / averageCandidates.length
      : 0;

    return {
      total: assignments.length,
      delivered: delivered.length,
      notDelivered: assignments.length - delivered.length,
      studentsDone: assignments.reduce((sum, item) => sum + Number(item.studentsDone || 0), 0),
      averageScore,
    };
  }, [assignments]);

  const bankStats = useMemo(() => {
    const allExercises = questionBanks.flatMap((bank) => bank.exercises || []);
    return {
      totalBanks: questionBanks.length,
      activeBanks: questionBanks.filter((bank) => bank.status === 'Đang sử dụng').length,
      totalExercises: allExercises.length,
      approvedExercises: allExercises.filter((exercise) => exercise.status === 'Đã duyệt').length,
    };
  }, [questionBanks]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const keyword = deliveryFilters.keyword.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword);

      const matchesType = deliveryFilters.type === 'ALL' || item.type === deliveryFilters.type;
      const matchesLevel = deliveryFilters.level === 'ALL' || item.level === deliveryFilters.level;
      const matchesDifficulty = deliveryFilters.difficulty === 'ALL' || item.difficulty === deliveryFilters.difficulty;
      const matchesStatus = deliveryFilters.status === 'ALL' || item.status === deliveryFilters.status;

      // Không lọc theo kỹ năng ở đây: đề có thể ghép nhiều kỹ năng.
      return matchesKeyword && matchesType && matchesLevel && matchesDifficulty && matchesStatus;
    });
  }, [assignments, deliveryFilters]);

  const deliveryPagination = useMemo(
    () => paginateItems(filteredAssignments, deliveryPage, deliveryPageSize),
    [deliveryPage, deliveryPageSize, filteredAssignments]
  );

  const filteredBanks = useMemo(() => {
    return questionBanks.filter((bank) => {
      const keyword = bankFilters.keyword.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        bank.name.toLowerCase().includes(keyword) ||
        bank.code.toLowerCase().includes(keyword);

      const matchesLevel = bankFilters.level === 'ALL' || bank.level === bankFilters.level;
      const matchesDifficulty = bankFilters.difficulty === 'ALL' || bank.difficulty === bankFilters.difficulty;
      const matchesSkill = bankFilters.skill === 'ALL' || bank.skill === bankFilters.skill;
      const matchesUnit = bankFilters.unit === 'ALL' || bank.unit === bankFilters.unit;
      const matchesStatus = bankFilters.status === 'ALL' || bank.status === bankFilters.status;

      return matchesKeyword && matchesLevel && matchesDifficulty && matchesSkill && matchesUnit && matchesStatus;
    });
  }, [bankFilters, questionBanks]);

  const bankPagination = useMemo(
    () => paginateItems(filteredBanks, bankPage, bankPageSize),
    [bankPage, bankPageSize, filteredBanks]
  );

  const selectedBankStats = useMemo(() => {
    if (!selectedBank) {
      return null;
    }

    const exercises = selectedBank.exercises || [];
    const approved = exercises.filter((exercise) => exercise.status === 'Đã duyệt').length;
    const pending = exercises.filter((exercise) => exercise.status === 'Chờ duyệt' || exercise.status === 'Nháp').length;
    const formatCount = new Set(exercises.map((exercise) => exercise.questionFormat).filter(Boolean)).size;

    return {
      total: exercises.length,
      approved,
      pending,
      formatCount,
    };
  }, [selectedBank]);

  const selectedBankExercises = selectedBank?.exercises || [];

  const exercisePagination = useMemo(
    () => paginateItems(selectedBankExercises, exercisePage, exercisePageSize),
    [exercisePage, exercisePageSize, selectedBankExercises]
  );

  const currentExercisePageIds = useMemo(
    () => exercisePagination.items.map((exercise) => exercise.id),
    [exercisePagination.items]
  );

  const allCurrentExercisePageSelected = useMemo(
    () => currentExercisePageIds.length > 0 && currentExercisePageIds.every((id) => selectedExerciseIds.includes(id)),
    [currentExercisePageIds, selectedExerciseIds]
  );

  const structureErrors = useMemo(() => {
    const errors = [];

    if (!selectedBank) {
      errors.push('Cần chọn một ngân hàng đề trước khi tạo cấu trúc đề.');
      return errors;
    }

    if (!structureForm.name.trim()) {
      errors.push('Tên đề / cấu trúc đề không được để trống.');
    }

    if (!Number(structureForm.durationMinutes) || Number(structureForm.durationMinutes) <= 0) {
      errors.push('Thời gian làm bài phải lớn hơn 0.');
    }

    if (!Number(structureForm.totalScore) || Number(structureForm.totalScore) <= 0) {
      errors.push('Tổng điểm phải lớn hơn 0.');
    }

    if (!structureRows.length) {
      errors.push('Phải có ít nhất 1 phần trong cấu trúc đề.');
    }

    const rowError = structureRows.some(
      (row) =>
        !row.skill ||
        !row.questionFormat ||
        !Number(row.requiredCount) ||
        Number(row.requiredCount) <= 0 ||
        !getSupportedQuestionFormats(row.skillCode || row.skill).includes(row.questionFormat)
    );

    if (rowError) {
      errors.push('Mỗi phần phải có kỹ năng, dạng câu hỏi hợp lệ và A phải lớn hơn 0.');
    }

    const missingSourceBank = structureRows.some(
      (row) => !activeBanksForStructure.some((bank) => bank.skill === row.skill)
    );

    if (missingSourceBank) {
      errors.push('Một hoặc nhiều kỹ năng chưa có ngân hàng nguồn đang sử dụng ở đúng trình độ và mức độ.');
    }

    return errors;
  }, [activeBanksForStructure, selectedBank, structureForm, structureRows]);

  const matchingSourceBanksByRow = useMemo(
    () =>
      Object.fromEntries(
        structureRows.map((row) => [row.id, activeBanksForStructure.filter((bank) => bank.skill === row.skill)])
      ),
    [activeBanksForStructure, structureRows]
  );

  const sourceUnitOptions = useMemo(
    () =>
      [
        ...new Set(
          approvedExercisesWithBank
            .filter(
              (exercise) =>
                exercise.bankLevel === structureForm.level &&
                exercise.bankDifficulty === structureForm.difficulty
            )
            .map((exercise) => exercise.unit)
            .filter(Boolean)
        ),
      ].sort((first, second) => first.localeCompare(second)),
    [approvedExercisesWithBank, structureForm.difficulty, structureForm.level]
  );

  const sourcePools = useMemo(() => {
    return Object.fromEntries(
      structureRows.map((row) => {
        const selectedBankIds = row.sourceBankIds || [];

        const pool = approvedExercisesWithBank.filter((exercise) => {
          const keyword = sourceFilters.keyword.trim().toLowerCase();
          const matchesKeyword =
            !keyword ||
            exercise.title.toLowerCase().includes(keyword) ||
            exercise.code.toLowerCase().includes(keyword);
          const matchesUnit = sourceFilters.unit === 'ALL' || exercise.unit === sourceFilters.unit;

          return (
            selectedBankIds.includes(exercise.bankId) &&
            exercise.bankSkill === row.skill &&
            exercise.questionFormat === row.questionFormat &&
            matchesKeyword &&
            matchesUnit &&
            exercise.bankLevel === structureForm.level &&
            exercise.bankDifficulty === structureForm.difficulty
          );
        });

        return [row.id, pool];
      })
    );
  }, [approvedExercisesWithBank, sourceFilters, structureForm, structureRows]);

  useEffect(() => {
    setSourceSelections((prev) => {
      let changed = false;
      const next = { ...prev };

      structureRows.forEach((row) => {
        const allowedIds = new Set((sourcePools[row.id] || []).map((exercise) => exercise.id));
        const current = next[row.id] || [];
        const filtered = current.filter((id) => allowedIds.has(id));

        if (filtered.length !== current.length) {
          next[row.id] = filtered;
          changed = true;
        }
      });

      Object.keys(next).forEach((rowId) => {
        if (!structureRows.some((row) => row.id === rowId)) {
          delete next[rowId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sourcePools, structureRows]);

  const sourceValidation = useMemo(
    () =>
      structureRows.map((row) => {
        const selectedIds = sourceSelections[row.id] || [];
        const required = Number(row.requiredCount || 0);
        const selectedBankIds = row.sourceBankIds || [];
        return {
          rowId: row.id,
          skill: row.skill,
          questionFormat: row.questionFormat,
          required,
          selectedBanks: selectedBankIds.length,
          selected: selectedIds.length,
          valid: selectedBankIds.length > 0 && selectedIds.length >= required,
        };
      }),
    [sourceSelections, structureRows]
  );

  const sourceStepValid = useMemo(() => {
    if (!structureRows.length) {
      return false;
    }

    return sourceValidation.every((item) => item.valid);
  }, [sourceValidation, structureRows.length]);

  const generatedExamsForSelectedBank = useMemo(
    () => generatedExams.filter((exam) => (exam.sourceBankIds || []).includes(selectedBankId)),
    [generatedExams, selectedBankId]
  );

  const scoreFormulaPreview = useMemo(() => {
    const sampleRows = structureRows.slice(0, 2);
    if (!sampleRows.length) {
      return null;
    }

    const exampleSections = sampleRows.map((row, index) => ({
      questionCount: index === 0 ? 10 : 10,
      correctCount: index === 0 ? 7 : 5,
      weight: index === 0 ? Number(row.scoreWeight || 1) : Number(sampleRows[1]?.scoreWeight || 2),
    }));

    const achieved = exampleSections.reduce((sum, section) => sum + section.correctCount * section.weight, 0);
    const maxScore = exampleSections.reduce((sum, section) => sum + section.questionCount * section.weight, 0);

    return {
      achieved,
      maxScore,
      finalScore: maxScore > 0 ? (achieved / maxScore) * 10 : 0,
    };
  }, [structureRows]);

  // Lớp/học sinh lấy từ backend. Không lọc theo "trình độ" nữa vì trình độ là
  // nhãn của đề, còn lớp thật gắn với KHÓA HỌC — hai thứ khác nhau.
  // Chỉ được giao cho lớp cùng khoá học với bài tập — backend kiểm điều kiện
  // này khi cập nhật, nên nếu cho chọn lớp khác khoá thì giao xong sẽ không
  // sửa được bài nữa.
  const distributionCourseId = distributionDraft?.item?.courseId || '';

  const classesInCourse = useMemo(
    () =>
      classOptions.filter(
        (item) => !distributionCourseId || (item.courseIds || []).includes(distributionCourseId)
      ),
    [classOptions, distributionCourseId]
  );

  const distributionTargets = useMemo(() => {
    if (!distributionDraft?.item) {
      return [];
    }

    const keyword = distributionDraft.keyword?.trim().toLowerCase() || '';

    if (distributionDraft.mode === 'CLASS') {
      return classesInCourse.filter((item) => {
        const haystack = `${item.name} ${item.teacher}`.toLowerCase();
        return !keyword || haystack.includes(keyword);
      });
    }

    const classIdsInCourse = new Set(classesInCourse.map((item) => item.id));

    return studentOptions
      .filter((item) => {
        const matchesCourse = !distributionCourseId || classIdsInCourse.has(item.classId);
        const matchesSelectedClass =
          distributionDraft.classFilter === 'ALL' || item.classId === distributionDraft.classFilter;
        const haystack = `${item.name} ${item.className}`.toLowerCase();
        return matchesCourse && matchesSelectedClass && (!keyword || haystack.includes(keyword));
      })
      .sort((first, second) =>
        `${first.className} ${first.name}`.localeCompare(`${second.className} ${second.name}`, 'vi')
      );
  }, [classesInCourse, distributionCourseId, distributionDraft, studentOptions]);

  const distributionClassOptions = useMemo(
    () => [...classesInCourse].sort((first, second) => first.name.localeCompare(second.name, 'vi')),
    [classesInCourse]
  );

  useEffect(() => {
    if (!distributionDraft || distributionDraft.mode !== 'STUDENT') {
      return;
    }

    if (
      distributionDraft.classFilter !== 'ALL' &&
      !distributionClassOptions.some((item) => item.id === distributionDraft.classFilter)
    ) {
      setDistributionDraft((prev) => (prev ? { ...prev, classFilter: 'ALL' } : prev));
    }
  }, [distributionClassOptions, distributionDraft]);

  useEffect(() => {
    setDeliveryPage((prev) => Math.min(prev, Math.max(1, Math.ceil(filteredAssignments.length / deliveryPageSize))));
  }, [deliveryPageSize, filteredAssignments.length]);

  useEffect(() => {
    setBankPage((prev) => Math.min(prev, Math.max(1, Math.ceil(filteredBanks.length / bankPageSize))));
  }, [bankPageSize, filteredBanks.length]);

  useEffect(() => {
    setExercisePage((prev) => Math.min(prev, Math.max(1, Math.ceil(selectedBankExercises.length / exercisePageSize))));
  }, [exercisePageSize, selectedBankExercises.length]);

  const changeDeliveryFilter = (field, value) => {
    setDeliveryFilters((prev) => ({ ...prev, [field]: value }));
  };

  const changeBankFilter = (field, value) => {
    setBankFilters((prev) => ({ ...prev, [field]: value }));
  };

  const changeSourceFilter = (field, value) => {
    setSourceFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCurrentExercisePageSelection = (checked) => {
    if (!currentExercisePageIds.length) {
      return;
    }

    setSelectedExerciseIds((prev) =>
      checked
        ? [...new Set([...prev, ...currentExercisePageIds])]
        : prev.filter((id) => !currentExercisePageIds.includes(id))
    );
  };

  const openDistributionModal = (mode, item) => {
    setDistributionDraft(createDistributionDraft(mode, item));
  };

  const toggleDistributionTarget = (targetId) => {
    setDistributionDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        targetIds: prev.targetIds.includes(targetId)
          ? prev.targetIds.filter((item) => item !== targetId)
          : [...prev.targetIds, targetId],
      };
    });
  };

  const confirmDistribution = async () => {
    if (!distributionDraft?.targetIds.length) {
      toast.error('Cần chọn ít nhất 1 lớp hoặc học sinh.');
      return;
    }

    // Cả bộ đề cùng batch được giao một lần: backend chia mỗi học sinh một mã đề.
    const variantBatchId = distributionDraft.variantBatchId ?? getAssignmentVariantBatchKey(distributionDraft.item);
    const variantPool = assignments.filter((item) => getAssignmentVariantBatchKey(item) === variantBatchId);
    const examIds = (variantPool.length ? variantPool : [distributionDraft.item]).map((item) => item.id).filter(isUuid);

    // Backend khai kiểu Guid; lọt một id không phải GUID là cả request hỏng ở
    // tầng model binding và trả về 400 không kèm lý do.
    const targetIds = distributionDraft.targetIds.filter(isUuid);
    if (!targetIds.length) {
      toast.error('Danh sách lớp/học sinh đã chọn không hợp lệ. Hãy tải lại trang và chọn lại.');
      return;
    }

    const payload = {
      examIds,
      classIds: distributionDraft.mode === 'CLASS' ? targetIds : [],
      studentIds: distributionDraft.mode === 'STUDENT' ? targetIds : [],
      randomTheoHocSinh: examIds.length > 1,
      openAt: toBackendDateTime(distributionDraft.startAt),
      dueAt: toBackendDateTime(distributionDraft.endAt),
      soLanLamToiDa: Math.min(10, Math.max(1, Number(distributionDraft.attempts) || 1)),
      choXemDapAn: Boolean(distributionDraft.revealAnswers),
      ghiChuChoHocSinh: distributionDraft.studentNote || null,
      // Trước đây ô "Thời lượng làm bài" chỉ đổi state rồi bị bỏ quên ở đây,
      // nên sửa xong giao bài là học sinh vẫn thấy thời lượng cũ.
      thoiGianLamBai: Number(distributionDraft.durationMinutes) > 0
        ? Number(distributionDraft.durationMinutes)
        : null,
    };

    let result;
    try {
      result = await adminAssignmentService.distributeAssignments(payload);
    } catch (error) {
      toast.error(error.message || 'Không thể giao bài.');
      return;
    }

    (result?.warnings || []).forEach((warning) => toast(warning, { icon: '⚠️' }));
    refreshFromBackend();
    setDistributionDraft(null);

    toast.success(
      examIds.length > 1
        ? `Đã chia ${examIds.length} mã đề cho ${result.tongHocSinh} học sinh thuộc ${result.tongLop} lớp.`
        : `Đã giao cho ${result.tongHocSinh} học sinh thuộc ${result.tongLop} lớp.`
    );
  };

  const saveAssignmentEdit = async () => {
    if (!assignmentEditDraft?.title.trim()) {
      toast.error('Tên bài tập/đề thi không được để trống.');
      return;
    }

    // Đọc bản đầy đủ từ backend rồi chỉ ghi đè các trường form cho sửa, để
    // không làm mất cấu hình khác trong envelope (mã đề, hạn nộp, số lần làm...).
    let detail;
    try {
      detail = await adminAssignmentService.getAssignmentDetail(assignmentEditDraft.id);
    } catch (error) {
      toast.error(error.message || 'Không thể tải bài tập/đề thi để cập nhật.');
      return;
    }

    const payload = {
      ...detail,
      code: detail.code,
      tenBaiTap: assignmentEditDraft.title.trim(),
      maKhoaHoc: detail.maKhoaHoc,
      loaiBaiTapCode: ASSIGNMENT_TYPE_CODE_BY_LABEL[assignmentEditDraft.type] || 'HOMEWORK',
      publishMode: PUBLISH_MODE_CODE_BY_LABEL[assignmentEditDraft.status] || detail.publishMode,
      thoiGianLamBai: Number(assignmentEditDraft.durationMinutes || 0),
      // Ba ô này trước đây không được gửi lên nên đổi xong bấm Lưu là mất trắng.
      trinhDoCode: toLevelCode(assignmentEditDraft.level) || null,
      mucDoCode: toDifficultyCode(assignmentEditDraft.difficulty) || null,
      selectedClassIds: detail.selectedClassIds || [],
      // KHÔNG gửi selectedQuestions: form này không sửa danh sách câu hỏi.
      // Gửi mảng rỗng đồng nghĩa "xoá hết câu hỏi của đề".
      selectedQuestions: null,
    };

    try {
      await adminAssignmentService.updateAssignment(assignmentEditDraft.id, payload);
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật bài tập/đề thi.');
      return;
    }

    setAssignmentEditDraft(null);
    refreshFromBackend();
    toast.success('Đã cập nhật bài tập/đề thi.');
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập/đề thi này?')) {
      return;
    }

    try {
      await adminAssignmentService.deleteAssignment(assignmentId);
    } catch (error) {
      toast.error(error.message || 'Không thể xóa bài tập/đề thi.');
      return;
    }

    setGeneratedExams((prev) => prev.filter((item) => item.id !== assignmentId));
    refreshFromBackend();
    toast.success('Đã xóa bài tập/đề thi.');
  };

  const openBankCreate = () => {
    // Mặc định gán khoá học của ngân hàng đang chọn để đỡ phải chọn lại.
    setBankDraft(createQuestionBankDraft(selectedBank?.courseId || courseOptions[0]?.id || ''));
  };

  const openBankEdit = (bank) => {
    setBankDraft({ ...bank });
  };

  const saveQuestionBank = async (mode) => {
    if (!bankDraft) {
      return;
    }

    if (!bankDraft.name.trim()) {
      toast.error('Tên ngân hàng đề không được để trống.');
      return;
    }

    if (mode === 'FINAL' && (!bankDraft.level || !bankDraft.difficulty || !bankDraft.skill || !bankDraft.status)) {
      toast.error('Trình độ, mức độ, kỹ năng và trạng thái là bắt buộc.');
      return;
    }

    const payload = {
      maCode: (bankDraft.code || '').trim(),
      tenNganHang: bankDraft.name.trim(),
      maKhoaHoc: bankDraft.courseId || null,
      trinhDoCode: toLevelCode(bankDraft.level) || null,
      mucDoCode: toDifficultyCode(bankDraft.difficulty, 'TRUNG_BINH'),
      kyNangCode: toSkillCode(bankDraft.skill) || null,
      unit: bankDraft.unit || null,
      moTa: bankDraft.description || null,
      trangThai:
        mode === 'DRAFT' ? 'DRAFT' : BANK_STATUS_CODE_BY_LABEL[bankDraft.status] || 'DRAFT',
    };

    try {
      const saved = bankDraft.bankId
        ? await adminAssignmentService.updateQuestionBankGroup(bankDraft.bankId, payload)
        : await adminAssignmentService.createQuestionBankGroup(payload);

      setBankDraft(null);
      if (saved?.maNganHang) {
        setSelectedBankId(`QB-${saved.maNganHang}`);
      }
      refreshFromBackend();
      toast.success(mode === 'DRAFT' ? 'Đã lưu nháp ngân hàng đề.' : 'Đã lưu ngân hàng đề.');
    } catch (error) {
      toast.error(error.message || 'Không thể lưu ngân hàng đề.');
    }
  };

  const deleteQuestionBank = async (bankId) => {
    if (!window.confirm('Bạn có chắc muốn xóa ngân hàng đề này?')) {
      return;
    }

    try {
      await adminAssignmentService.deleteQuestionBankGroup(toBankGuid(bankId));
    } catch (error) {
      toast.error(error.message || 'Không thể xóa ngân hàng đề.');
      return;
    }

    refreshFromBackend();
    if (selectedBankId === bankId) {
      setSelectedBankId(null);
      setGeneratorOpen(false);
    }
    toast.success('Đã xóa ngân hàng đề.');
  };

  /**
   * Nhân bản tạo ra ngân hàng RỖNG, không chép bài tập sang.
   * Chép bài tập cần nhân bản cả câu con ở backend; khi nào cần sẽ làm endpoint
   * riêng, còn hơn là chép ở frontend rồi lưu thiếu.
   */
  const duplicateQuestionBank = async (bank) => {
    try {
      const saved = await adminAssignmentService.createQuestionBankGroup({
        maCode: `${bank.code}-COPY`,
        tenNganHang: `${bank.name} (bản sao)`,
        maKhoaHoc: bank.courseId || null,
        trinhDoCode: toLevelCode(bank.level) || null,
        mucDoCode: toDifficultyCode(bank.difficulty, 'TRUNG_BINH'),
        kyNangCode: toSkillCode(bank.skill) || null,
        unit: bank.unit || null,
        moTa: bank.description || null,
        trangThai: 'DRAFT',
      });

      refreshFromBackend();
      if (saved?.maNganHang) {
        setSelectedBankId(`QB-${saved.maNganHang}`);
      }
      toast.success('Đã tạo ngân hàng đề bản sao (chưa có bài tập).');
    } catch (error) {
      toast.error(error.message || 'Không thể nhân bản ngân hàng đề.');
    }
  };

  const changeQuestionBankStatus = async (bank, label) => {
    const code = BANK_STATUS_CODE_BY_LABEL[label];
    if (!code) {
      return;
    }

    try {
      await adminAssignmentService.updateQuestionBankGroupStatus(toBankGuid(bank.id), code);
      refreshFromBackend();
      toast.success(`Đã chuyển ngân hàng đề sang "${label}".`);
    } catch (error) {
      toast.error(error.message || 'Không thể đổi trạng thái ngân hàng đề.');
    }
  };

  const exportQuestionBanks = () => {
    toast.success('Đã chuẩn bị dữ liệu xuất danh sách ngân hàng đề.');
  };

  const updateSelectedBankExercises = (mutator) => {
    if (!selectedBankId) {
      return;
    }

    setQuestionBanks((prev) =>
      prev.map((bank) =>
        bank.id === selectedBankId
          ? {
              ...bank,
              exercises: mutator(bank.exercises || []),
            }
          : bank
      )
    );
  };

  const openExerciseCreate = () => {
    if (!selectedBank) {
      toast.error('Cần chọn ngân hàng đề trước khi thêm bài tập.');
      return;
    }

    setExerciseDraft(createExerciseDraft(selectedBank));
  };

  const openExerciseEdit = (exercise) => {
    setExerciseDraft(JSON.parse(JSON.stringify(exercise)));
  };

  const duplicateExercise = (exercise) => {
    updateSelectedBankExercises((prev) => [
      {
        ...JSON.parse(JSON.stringify(exercise)),
        id: createId('EX'),
        code: `${exercise.code}-COPY`,
        title: `${exercise.title} (bản sao)`,
        status: 'Nháp',
        createdAt: new Date().toISOString(),
        childQuestions: exercise.childQuestions.map((question) => ({ ...question, id: createId('CQ') })),
      },
      ...prev,
    ]);
    toast.success('Đã nhân bản bài tập.');
  };

  const deleteExercise = async (exerciseId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập này?')) {
      return;
    }

    // Bài chỉ tồn tại trên UI (chưa lưu) thì bỏ khỏi state là xong.
    if (String(exerciseId).startsWith('EX-')) {
      updateSelectedBankExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId));
      setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
      toast.success('Đã xóa bài tập.');
      return;
    }

    try {
      await adminAssignmentService.deleteQuestion(exerciseId);
    } catch (error) {
      toast.error(error.message || 'Không thể xóa bài tập khỏi ngân hàng đề.');
      return;
    }

    setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
    refreshFromBackend();
    toast.success('Đã xóa bài tập.');
  };

  /**
   * Đổi trạng thái duyệt của một hoặc nhiều bài tập rồi nạp lại từ backend.
   * Bài chưa lưu (id "EX-...") không có gì để đổi trên server nên bỏ qua.
   */
  const changeExerciseStatus = async (exerciseIds, label) => {
    const code = EXERCISE_STATUS_CODE_BY_LABEL[label];
    const ids = exerciseIds.filter((id) => id && !String(id).startsWith('EX-'));

    if (!code || !ids.length) {
      toast.error('Bài tập chưa được lưu nên chưa đổi được trạng thái.');
      return;
    }

    try {
      await Promise.all(ids.map((id) => adminAssignmentService.updateQuestionStatus(id, code)));
    } catch (error) {
      toast.error(error.message || 'Không thể đổi trạng thái bài tập.');
      return;
    }

    refreshFromBackend();
    toast.success(`Đã chuyển ${ids.length} bài tập sang "${label}".`);
  };

  const approveExercise = (exerciseId) => changeExerciseStatus([exerciseId], 'Đã duyệt');

  const deactivateExercise = (exerciseId) => changeExerciseStatus([exerciseId], 'Ngừng sử dụng');

  const saveExercise = async (mode) => {
    if (!exerciseDraft || !selectedBank) {
      return;
    }

    const questionMode = getQuestionEditorMode(exerciseDraft.questionFormat);
    const isAutoGradable = !['essay', 'generic', 'sentence_rewrite'].includes(questionMode);

    if (!exerciseDraft.title.trim()) {
      toast.error('Tên bài tập không được để trống.');
      return;
    }

    if (!exerciseDraft.questionFormat) {
      toast.error('Dạng câu hỏi không được để trống.');
      return;
    }

    const maBaiTap = String(exerciseDraft.code || '').trim();
    if (!maBaiTap) {
      toast.error('Mã bài tập không được để trống.');
      return;
    }

    const trungMa = (selectedBank.exercises || []).some(
      (item) => item.id !== exerciseDraft.id && String(item.code || '').trim().toLowerCase() === maBaiTap.toLowerCase()
    );
    if (trungMa) {
      toast.error(`Mã bài tập "${maBaiTap}" đã tồn tại trong ngân hàng này.`);
      return;
    }

    if (mode === 'FINAL') {
      if (!exerciseDraft.content.trim() && !exerciseDraft.childQuestions.some((question) => question.prompt.trim())) {
        toast.error('Nội dung bài tập hoặc nội dung câu hỏi con không được để trống.');
        return;
      }

      if (!exerciseDraft.childQuestions.length) {
        toast.error('Phải có ít nhất 1 câu hỏi con.');
        return;
      }

      const invalidScore = exerciseDraft.childQuestions.some((question) => Number(question.score || 0) <= 0);
      if (invalidScore) {
        toast.error('Điểm của câu hỏi phải lớn hơn 0.');
        return;
      }

      const invalidAutoAnswer = exerciseDraft.childQuestions.some((question) => {
        const modeByFormat = questionMode;

        if (modeByFormat === 'single_choice') {
          return question.options.filter((option) => option.isCorrect).length !== 1;
        }

        if (modeByFormat === 'multi_choice') {
          return question.options.filter((option) => option.isCorrect).length < 1;
        }

        if (modeByFormat === 'cloze_from_list') {
          const words = (exerciseDraft.wordBank || []).map((item) => String(item ?? '').trim()).filter(Boolean);
          // Đáp án phải là một từ có thật trong word bank, nếu không học viên
          // không thể chọn được nó khi làm bài.
          return !question.blankAnswer || !words.includes(question.blankAnswer);
        }

        if (modeByFormat === 'sentence_arrangement') {
          const sentences = (question.arrangementSentences || []).map((item) => item.trim());
          if (sentences.length < 2 || sentences.some((item) => !item)) {
            return true;
          }

          const labels = sentences.map((_, index) => String.fromCharCode(97 + index));
          const order = (question.arrangementCorrectOrder || '')
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);

          return (
            order.length !== sentences.length ||
            new Set(order).size !== order.length ||
            order.some((label) => !labels.includes(label))
          );
        }

        if (isAutoGradable && ['short_text', 'gap_fill', 'generic'].includes(modeByFormat)) {
          return !question.acceptedAnswers.some((answer) => answer.trim());
        }

        return false;
      });

      if (invalidAutoAnswer) {
        toast.error('Mỗi câu hỏi tự chấm phải có đáp án đúng hợp lệ.');
        return;
      }

      const invalidWritingQuestion = exerciseDraft.childQuestions.find((question) => {
        if (questionMode === 'essay') {
          const minWords = Number(question.minWords || 0);
          const maxWords = Number(question.maxWords || 0);
          const invalidWordRange = minWords > 0 && maxWords > 0 && minWords > maxWords;
          return !question.prompt.trim() || invalidWordRange || (!question.gradingGuide.trim() && !hasFilledText(question.rubricCriteria));
        }

        if (questionMode === 'sentence_rewrite') {
          return !question.sourceSentence.trim() || !question.sampleAnswer.trim() || (!question.gradingGuide.trim() && !hasFilledText(question.rubricCriteria));
        }

        return false;
      });

      if (invalidWritingQuestion) {
        if (questionMode === 'essay') {
          toast.error('Câu hỏi Viết cần có nội dung, rubric hoặc hướng dẫn chấm, và số từ hợp lệ.');
          return;
        }

        if (questionMode === 'sentence_rewrite') {
          toast.error('Câu viết lại câu cần có câu gốc, đáp án mẫu và rubric hoặc hướng dẫn chấm.');
          return;
        }
      }
    }

    const normalized = {
      ...exerciseDraft,
      id: exerciseDraft.id || createId('EX'),
      code: maBaiTap,
      unit: exerciseDraft.unit || selectedBank.unit,
      status: mode === 'DRAFT' ? 'Nháp' : 'Chờ duyệt',
      createdAt: exerciseDraft.createdAt || new Date().toISOString(),
      childQuestions: exerciseDraft.childQuestions.map((question) => ({
        ...question,
        acceptedAnswers: question.acceptedAnswers || [],
        options: question.options || [],
        minWords: Number(question.minWords || 0),
        maxWords: Number(question.maxWords || 0),
        rubricCriteria: (question.rubricCriteria || []).map((item) => item.trim()).filter(Boolean),
        reviewNote: question.reviewNote || '',
        manualGradingRequired: Boolean(question.manualGradingRequired),
      })),
    };

    if (!getQuestionTypeCode(normalized.questionFormat)) {
      toast.error(`Dạng "${normalized.questionFormat}" chưa được ánh xạ sang mã trong CSDL.`);
      return;
    }

    // Bài tập bắt buộc thuộc một khoá học; ngân hàng không gán khoá thì không
    // suy ra được, phải báo rõ thay vì gửi lên một GUID sai kiểu.
    if (!selectedBank.courseId) {
      toast.error('Ngân hàng đề này chưa gắn khóa học. Hãy sửa ngân hàng và chọn khóa học trước.');
      return;
    }

    const payload = buildBankExercisePayload({
      mode: questionMode,
      exercise: normalized,
      questions: normalized.childQuestions,
      courseId: selectedBank.courseId,
      bankId: selectedBank.bankId,
      // Lưu nháp -> DRAFT, lưu và gửi duyệt -> PENDING. Trước đây trạng thái này
      // chỉ nằm trong state React nên F5 là quay về "Đã duyệt".
      trangThaiDuyet: EXERCISE_STATUS_CODE_BY_LABEL[normalized.status] || 'PENDING',
      catalog: {
        mucDoCode: toDifficultyCode(selectedBank.difficulty, 'TRUNG_BINH'),
        trinhDoCode: toLevelCode(selectedBank.level) || null,
        kyNangCode: toSkillCode(selectedBank.skill) || null,
      },
    });

    // Bài đọc từ backend có id là GUID của bài tập; bài mới tạo tại chỗ
    // thì id dạng "EX-..." nên phải tạo mới thay vì cập nhật.
    const isExisting = Boolean(exerciseDraft.id) && !String(exerciseDraft.id).startsWith('EX-');

    try {
      if (isExisting) {
        await adminAssignmentService.updateQuestion(exerciseDraft.id, payload);
      } else {
        await adminAssignmentService.createQuestion(payload);
      }
    } catch (error) {
      toast.error(error.message || 'Không thể lưu bài tập vào ngân hàng đề.');
      return;
    }

    setExerciseDraft(null);
    refreshFromBackend();
    toast.success(mode === 'DRAFT' ? 'Đã lưu nháp bài tập.' : 'Đã lưu và gửi duyệt bài tập.');
  };

  const updateExerciseDraft = (field, value) => {
    setExerciseDraft((prev) => {
      if (!prev) {
        return prev;
      }

      if (field === 'questionFormat') {
        return {
          ...prev,
          questionFormat: value,
          childQuestions: [createChildQuestion(value)],
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const patchChildQuestion = (questionId, nextQuestion) => {
    setExerciseDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        childQuestions: prev.childQuestions.map((question) => (question.id === questionId ? nextQuestion : question)),
      };
    });
  };

  const addChildQuestion = () => {
    setExerciseDraft((prev) => {
      if (!prev || !prev.questionFormat) {
        return prev;
      }

      return {
        ...prev,
        childQuestions: [...prev.childQuestions, createChildQuestion(prev.questionFormat)],
      };
    });
  };

  const duplicateChildQuestion = (questionId) => {
    setExerciseDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const target = prev.childQuestions.find((question) => question.id === questionId);
      if (!target) {
        return prev;
      }

      return {
        ...prev,
        childQuestions: [
          ...prev.childQuestions,
          {
            ...JSON.parse(JSON.stringify(target)),
            id: createId('CQ'),
          },
        ],
      };
    });
  };

  const deleteChildQuestion = (questionId) => {
    setExerciseDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        childQuestions: prev.childQuestions.filter((question) => question.id !== questionId),
      };
    });
  };

  const toggleExerciseSelection = (exerciseId) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((item) => item !== exerciseId) : [...prev, exerciseId]
    );
  };

  const approveSelectedExercises = async () => {
    if (!selectedExerciseIds.length) {
      toast.error('Chưa có bài tập nào được chọn.');
      return;
    }

    await changeExerciseStatus(selectedExerciseIds, 'Đã duyệt');
    setSelectedExerciseIds([]);
  };

  const deleteSelectedExercises = () => {
    if (!selectedExerciseIds.length) {
      toast.error('Chưa có bài tập nào được chọn.');
      return;
    }

    if (!window.confirm('Bạn có chắc muốn xóa các bài tập đã chọn?')) {
      return;
    }

    updateSelectedBankExercises((prev) => prev.filter((exercise) => !selectedExerciseIds.includes(exercise.id)));
    setSelectedExerciseIds([]);
    toast.success('Đã xóa các bài tập đã chọn.');
  };

  const openGenerator = (bank) => {
    setSelectedBankId(bank.id);
    setGeneratorOpen(true);
    setWizardStep(1);
    setSourceFilters(SOURCE_FILTERS);
    setSourceSelections({});
    setStructureForm(createStructureForm(bank));
    setStructureRows(createStructureRowsFromBank(bank));
  };

  const addStructureRow = () => {
    const defaultSkill = structureRows.at(-1)?.skill || selectedBank?.skill || structureSkillOptions[0] || 'Đọc';

    setStructureRows((prev) => [
      ...prev,
      createStructureRow({
        skill: defaultSkill,
        sourceBankIds:
          selectedBank &&
          selectedBank.level === structureForm.level &&
          selectedBank.difficulty === structureForm.difficulty &&
          selectedBank.skill === defaultSkill
            ? [selectedBank.id]
            : [],
        sectionOrder: prev.length + 1,
      }),
    ]);
  };

  const updateStructureRow = (rowId, field, value) => {
    setStructureRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (field === 'skill') {
          const nextSkill = value;
          const nextSkillCode = toSkillCode(nextSkill) || '';
          const nextFormats = getSupportedQuestionFormats(nextSkillCode || nextSkill);
          const nextSourceBankIds =
            selectedBank &&
            selectedBank.level === structureForm.level &&
            selectedBank.difficulty === structureForm.difficulty &&
            selectedBank.skill === nextSkill
              ? [selectedBank.id]
              : [];

          return {
            ...row,
            skill: nextSkill,
            skillCode: nextSkillCode,
            questionFormat: nextFormats[0] || '',
            sourceBankIds: nextSourceBankIds,
          };
        }

        return {
          ...row,
          [field]: ['requiredCount', 'scoreWeight', 'sectionOrder'].includes(field) ? Number(value) : value,
        };
      })
    );
  };

  const toggleSourceBankSelection = (rowId, bankId) => {
    setStructureRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              sourceBankIds: (row.sourceBankIds || []).includes(bankId)
                ? row.sourceBankIds.filter((item) => item !== bankId)
                : [...(row.sourceBankIds || []), bankId],
            }
          : row
      )
    );
  };

  const removeStructureRow = (rowId) => {
    setStructureRows((prev) => prev.filter((row) => row.id !== rowId));
    setSourceSelections((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const goToWizardStep = (targetStep) => {
    if (targetStep <= wizardStep) {
      setWizardStep(targetStep);
      return;
    }

    if (targetStep === 2) {
      if (structureErrors.length) {
        toast.error(structureErrors[0]);
        return;
      }
      setWizardStep(2);
      return;
    }

    if (targetStep === 3) {
      if (structureErrors.length) {
        toast.error(structureErrors[0]);
        return;
      }
      if (!sourceStepValid) {
        toast.error('Mỗi phần phải chọn ngân hàng nguồn và có B lớn hơn hoặc bằng A trước khi sinh đề.');
        return;
      }
      setWizardStep(3);
    }
  };

  const saveSourcePool = async () => {
    if (!sourceStepValid) {
      toast.error('Mỗi phần phải chọn ngân hàng nguồn và có B lớn hơn hoặc bằng A.');
      return;
    }

    const payload = {
      CourseId: selectedBank?.courseId || null,
      Name: structureForm.name,
      Level: structureForm.level,
      Difficulty: structureForm.difficulty,
      Skill: selectedBank?.skill || null,
      DurationMinutes: Number(structureForm.durationMinutes || 0),
      TotalScore: Number(structureForm.totalScore || 0),
      Note: structureForm.note || null,
      ShuffleExercises: Boolean(generatorForm.shuffleExercises),
      ShuffleSections: Boolean(generatorForm.shuffleSections),
      ShuffleAnswers: Boolean(generatorForm.shuffleAnswers),
      ExamCount: Number(generatorForm.examCount || 1),
      Sections: structureRows.map((row) => ({
        RowId: row.id,
        Skill: row.skill,
        QuestionFormat: row.questionFormat,
        SourceBankIds: toBankGuids(row.sourceBankIds),
        RequiredCount: Number(row.requiredCount || 0),
        ScoreWeight: Number(row.scoreWeight || 0),
        SectionOrder: Number(row.sectionOrder || 0),
      })),
    };

    try {
      await adminExerciseExamManagementService.saveSourcePool(toBankGuid(selectedBank.id), payload);
    } catch (error) {
      toast.error(error.message || 'Không thể lưu nguồn random cho ngân hàng đề.');
      return;
    }

    toast.success('Đã lưu nguồn random cho ngân hàng đề.');
  };

  const toggleSourceSelection = (rowId, exerciseId) => {
    setSourceSelections((prev) => {
      const current = prev[rowId] || [];
      return {
        ...prev,
        [rowId]: current.includes(exerciseId) ? current.filter((item) => item !== exerciseId) : [...current, exerciseId],
      };
    });
  };

  const generateExams = async () => {
    if (!selectedBank) {
      toast.error('Cần chọn ngân hàng đề trước khi sinh đề.');
      return;
    }

    if (!sourceStepValid) {
      toast.error('Không thể sinh đề khi B nhỏ hơn A.');
      return;
    }

    const examCount = Number(generatorForm.examCount || 0);
    if (!examCount || examCount <= 0) {
      toast.error('Số lượng đề cần sinh phải lớn hơn 0.');
      return;
    }

    // Chỉ gửi CẤU TRÚC, backend tự bốc. Kèm danh sách bài người dùng đã tick
    // để backend chỉ random trong đúng phạm vi đó.
    const payload = {
      courseId: selectedBank.courseId || null,
      templateName: structureForm.name,
      level: structureForm.level,
      difficulty: structureForm.difficulty,
      // Gửi cả MÃ để đề sinh ra mang đúng trình độ / mức độ admin chọn ở bước
      // cấu trúc, thay vì lấy theo ngân hàng (thường chưa đặt trình độ).
      trinhDoCode: toLevelCode(structureForm.level) || null,
      mucDoCode: toDifficultyCode(structureForm.difficulty) || null,
      durationMinutes: Number(structureForm.durationMinutes || 0),
      totalScore: Number(structureForm.totalScore || 0),
      note: structureForm.note || null,
      examCount,
      shuffleExercises: Boolean(generatorForm.shuffleExercises),
      shuffleSections: Boolean(generatorForm.shuffleSections),
      shuffleAnswers: Boolean(generatorForm.shuffleAnswers),
      sections: structureRows.map((row) => ({
        rowId: row.id,
        skill: row.skill,
        // Backend lọc theo MÃ danh mục, không theo nhãn tiếng Việt.
        kyNangCode: toSkillCode(row.skill) || null,
        loaiCauHoiCode: getQuestionTypeCode(row.questionFormat) || null,
        sourceBankIds: toBankGuids(row.sourceBankIds),
        candidateExerciseIds: sourceSelections[row.id] || [],
        requiredCount: Number(row.requiredCount || 0),
        scoreWeight: Number(row.scoreWeight || 0),
        sectionOrder: Number(row.sectionOrder || 0),
      })),
    };

    let result;
    try {
      result = await adminAssignmentService.generateExamsFromBank(toBankGuid(selectedBank.id), payload);
    } catch (error) {
      toast.error(error.message || 'Không thể sinh và lưu đề vào backend.');
      return;
    }

    const rowsById = new Map(structureRows.map((row) => [row.id, row]));
    const exams = (result?.exams || []).map((dto) =>
      buildGeneratedExamFromApi(dto, {
        bank: selectedBank,
        structureForm,
        generatorForm,
        rowsById,
        batchId: result.batchId,
        variantCount: result.createdCount || examCount,
      })
    );

    setGeneratedExams((prev) => {
      const remaining = prev.filter((exam) => exam.primaryBankId !== selectedBank.id);
      return [...exams, ...remaining];
    });
    refreshFromBackend();

    // Cảnh báo không chặn việc sinh (vd kho vừa đủ nên các đề trùng bài).
    (result?.warnings || []).forEach((warning) => toast(warning, { icon: '⚠️' }));
    toast.success(`Đã sinh ${exams.length} đề và lưu vào hệ thống.`);
  };

  const deleteGeneratedExam = async (examId) => {
    if (!window.confirm('Bạn có chắc muốn xóa đề này?')) {
      return;
    }

    // Đề sinh ra là bản ghi thật trong DB nên phải xóa ở backend, không chỉ
    // bỏ khỏi state như trước.
    try {
      await adminAssignmentService.deleteAssignment(examId);
    } catch (error) {
      toast.error(error.message || 'Không thể xóa đề.');
      return;
    }

    setGeneratedExams((prev) => prev.filter((exam) => exam.id !== examId));
    refreshFromBackend();
    toast.success('Đã xóa đề đã sinh.');
  };

  const editGeneratedExam = (exam) => {
    if (exam.primaryBankId !== selectedBankId) {
      setSelectedBankId(exam.primaryBankId);
    }

    const rows = exam.sections.map((section, index) => ({
      id: section.rowId || createId('STRUCT'),
      skill: section.skill,
      questionFormat: section.questionFormat,
      sourceBankIds: section.sourceBankIds || [],
      requiredCount: section.requiredCount,
      scoreWeight: section.scoreWeight,
      sectionOrder: section.sectionOrder || index + 1,
    }));
    const selections = Object.fromEntries(
      rows.map((row, index) => [row.id, exam.sections[index].items.map((item) => item.id)])
    );

    setStructureForm({
      name: exam.structureName,
      level: exam.level,
      difficulty: exam.difficulty,
      durationMinutes: exam.durationMinutes,
      totalScore: exam.totalScore,
      note: exam.note || '',
    });
    setStructureRows(rows);
    setSourceSelections(selections);
    setGeneratorOpen(true);
    setWizardStep(1);
    toast('Đã nạp đề vào khu vực sinh đề để chỉnh sửa.');
  };

  const [generatorForm, setGeneratorForm] = useState({
    examCount: 3,
    shuffleSections: false,
    shuffleExercises: true,
    shuffleAnswers: true,
  });

  return (
    <div className="admin-eem">
      <Toaster position="top-right" />

      <div className="container-fluid px-4 py-4">
        <div className="admin-eem-hero mb-4">
          <div className="admin-eem-eyebrow">AdminExerciseExamManagement</div>
          <h2 className="fw-bold mb-0">Quản lý bài tập và đề thi</h2>
        </div>

        <div className="admin-eem-tabs mb-4">
          {TAB_OPTIONS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`admin-eem-tab ${active ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="admin-eem-tab-copy">
                  <div className="fw-semibold">{tab.label}</div>
                  <div className="small text-muted">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {activeTab === 'DELIVERY' ? (
          <>
            <div className="row g-3 mb-4">
              <StatCard icon={BookOpen} label="Tổng bài tập/đề thi" value={deliveryStats.total} tone="primary" helpText="Tất cả nội dung đang được quản lý." />
              <StatCard icon={Send} label="Đã giao" value={deliveryStats.delivered} tone="success" helpText="Đã có lịch giao bài tới lớp hoặc học sinh." />
              <StatCard icon={ClipboardCheck} label="Chưa giao" value={deliveryStats.notDelivered} tone="warning" helpText="Các bài đang ở trạng thái nháp hoặc đã tạo." />
              <StatCard icon={Users} label="Học sinh đã làm" value={deliveryStats.studentsDone} tone="info" helpText="Tổng lượt học sinh đã làm bài." />
              <StatCard icon={BarChart3} label="Điểm trung bình" value={deliveryStats.averageScore.toFixed(1)} tone="danger" helpText="Điểm trung bình trên các bài đã có kết quả." />
            </div>

            <DeliveryFilterCard
              filters={deliveryFilters}
              options={options}
              onChange={changeDeliveryFilter}
              onReset={() => setDeliveryFilters(DELIVERY_FILTERS)}
            />

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Danh sách bài tập/đề thi</h5>
                  <div className="small text-muted">{filteredAssignments.length} mục phù hợp bộ lọc hiện tại.</div>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('QUESTION_BANK')}>
                  Sang ngân hàng đề
                </button>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0 admin-eem-table admin-eem-table-delivery">
                  <thead className="table-light">
                    <tr className="small text-uppercase text-muted">
                      <th className="ps-4 admin-eem-col-code">Mã</th>
                      <th className="admin-eem-col-name">Tên bài tập/đề thi</th>
                      <th className="admin-eem-col-compact">Loại</th>
                      <th className="admin-eem-col-compact">Trình độ</th>
                      <th className="admin-eem-col-compact">Mức độ</th>
                      {/* Không có cột Kỹ năng: một đề có thể ghép nhiều kỹ năng. */}
                      <th className="text-center admin-eem-col-count">Số câu / bài tập</th>
                      <th className="text-center admin-eem-col-count">Thời gian làm bài</th>
                      <th className="text-center admin-eem-col-status">Trạng thái</th>
                      <th className="admin-eem-col-date">Ngày tạo</th>
                      <th className="text-center admin-eem-col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryPagination.items.map((item) => (
                      <tr key={item.id}>
                        <td className="ps-4 fw-semibold admin-eem-col-code">{item.code}</td>
                        <td className="admin-eem-col-name">
                          <div className="fw-semibold admin-eem-cell-title" title={item.title}>
                            {item.title}
                          </div>
                          <div className="small text-muted admin-eem-cell-description">
                            {getVariantBadgeLabel(item) ? `${getVariantBadgeLabel(item)} · ` : ''}
                            {formatAssignmentDistributionSummary(item)}
                          </div>
                        </td>
                        <td className="admin-eem-col-compact">{item.type}</td>
                        <td className="admin-eem-col-compact">{item.level}</td>
                        <td className="admin-eem-col-compact">{item.difficulty}</td>
                        <td className="text-center admin-eem-col-count">{item.totalItems}</td>
                        <td className="text-center admin-eem-col-count">{item.durationMinutes} phút</td>
                        <td className="text-center admin-eem-col-status">
                          <StatusBadge meta={DELIVERY_STATUS_META[item.status] || DELIVERY_STATUS_META.Nháp} fallbackLabel={item.status} />
                        </td>
                        <td className="admin-eem-col-date">{formatDate(item.createdAt)}</td>
                        <td className="text-center admin-eem-col-actions">
                          <ActionMenu
                            primaryAction={{
                              label: 'Xem chi tiết',
                              icon: Eye,
                              onClick: () => openAssignmentDetail(item),
                            }}
                            items={[
                              {
                                label: item.variantCount > 1 ? 'Giao bộ đề' : 'Giao cho lớp',
                                icon: Users,
                                tone: 'primary',
                                onClick: () => openDistributionModal('CLASS', item),
                              },
                              {
                                label: 'Giao học sinh',
                                icon: User,
                                tone: 'info',
                                onClick: () => openDistributionModal('STUDENT', item),
                              },
                              {
                                label: 'Xem kết quả',
                                icon: BarChart3,
                                tone: 'success',
                                onClick: () => setAssignmentResultItem(item),
                              },
                              {
                                label: 'Chỉnh sửa',
                                icon: Pencil,
                                tone: 'secondary',
                                onClick: () => setAssignmentEditDraft({ ...item }),
                              },
                              {
                                label: 'Xóa',
                                icon: Trash2,
                                tone: 'danger',
                                onClick: () => deleteAssignment(item.id),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}

                    {!filteredAssignments.length ? (
                      <tr>
                        <td colSpan="11" className="text-center py-5 text-muted">
                          Không có bài tập/đề thi phù hợp bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                label="mục"
                pagination={deliveryPagination}
                pageSize={deliveryPageSize}
                onPageChange={setDeliveryPage}
                onPageSizeChange={(size) => {
                  setDeliveryPageSize(size);
                  setDeliveryPage(1);
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <StatCard icon={Layers3} label="Tổng ngân hàng đề" value={bankStats.totalBanks} tone="primary" helpText="Số ngân hàng đề hiện có trong hệ thống." />
              <StatCard icon={CheckCircle2} label="Đang sử dụng" value={bankStats.activeBanks} tone="success" helpText="Ngân hàng đề đang hoạt động." />
              <StatCard icon={FileStack} label="Tổng bài tập" value={bankStats.totalExercises} tone="warning" helpText="Tổng số bài tập đã nhập thủ công." />
              <StatCard icon={ListChecks} label="Đã duyệt" value={bankStats.approvedExercises} tone="info" helpText="Chỉ bài tập đã duyệt mới được dùng để sinh đề." />
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Quản lý ngân hàng đề</h5>
                  <div className="small text-muted">
                    Quản lý các ngân hàng bài tập gốc dùng để tạo cấu trúc đề và sinh đề tự động.
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button className="btn btn-light border" onClick={exportQuestionBanks}>
                    Xuất danh sách
                  </button>
                  <button className="btn btn-primary" onClick={openBankCreate}>
                    <Plus size={16} className="me-2" />
                    Thêm ngân hàng đề
                  </button>
                </div>
              </div>
              <div className="card-body">
                <QuestionBankFilterCard
                  filters={bankFilters}
                  options={options}
                  units={unitOptions}
                  onChange={changeBankFilter}
                  onReset={() => setBankFilters(BANK_FILTERS)}
                />
              </div>

              <div className="table-responsive">
                <table className="table align-middle mb-0 admin-eem-table admin-eem-table-bank">
                  <thead className="table-light">
                    <tr className="small text-uppercase text-muted">
                      <th className="ps-4 admin-eem-col-code">Mã ngân hàng</th>
                      <th className="admin-eem-col-name">Tên ngân hàng đề</th>
                      <th className="admin-eem-col-compact">Trình độ</th>
                      <th className="admin-eem-col-compact">Mức độ</th>
                      <th className="admin-eem-col-compact">Kỹ năng</th>
                      <th className="admin-eem-col-compact">Unit/Bài học</th>
                      <th className="text-center admin-eem-col-count">Số lượng bài tập</th>
                      <th className="text-center admin-eem-col-count">Số dạng câu hỏi</th>
                      <th className="text-center admin-eem-col-status">Trạng thái</th>
                      <th className="admin-eem-col-date">Ngày tạo</th>
                      <th className="text-center admin-eem-col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankPagination.items.map((bank) => {
                      const formatCount = new Set(bank.exercises.map((exercise) => exercise.questionFormat).filter(Boolean)).size;
                      return (
                        <tr key={bank.id}>
                          <td className="ps-4 fw-semibold admin-eem-col-code">{bank.code}</td>
                          <td className="admin-eem-col-name">
                            <div className="fw-semibold admin-eem-cell-title" title={bank.name}>
                              {bank.name}
                            </div>
                            <div className="small text-muted admin-eem-cell-description" title={bank.description}>
                              {bank.description}
                            </div>
                          </td>
                          <td className="admin-eem-col-compact">{bank.level || '--'}</td>
                          <td className="admin-eem-col-compact">{bank.difficulty}</td>
                          <td className="admin-eem-col-compact">{bank.skill}</td>
                          <td className="admin-eem-col-compact">{bank.unit || '--'}</td>
                          <td className="text-center admin-eem-col-count">{bank.exercises.length}</td>
                          <td className="text-center admin-eem-col-count">{formatCount}</td>
                          <td className="text-center admin-eem-col-status">
                            <StatusBadge
                              meta={QUESTION_BANK_STATUS_META[bank.status] || QUESTION_BANK_STATUS_META.Nháp}
                              fallbackLabel={bank.status}
                            />
                          </td>
                          <td className="admin-eem-col-date">{formatDate(bank.createdAt)}</td>
                          <td className="text-center admin-eem-col-actions">
                            <ActionMenu
                              primaryAction={{
                                label: 'Xem chi tiết',
                                icon: Eye,
                                onClick: () => {
                                  setSelectedBankId(bank.id);
                                  setGeneratorOpen(false);
                                },
                              }}
                              items={[
                                {
                                  label: 'Chỉnh sửa',
                                  icon: Pencil,
                                  tone: 'secondary',
                                  onClick: () => openBankEdit(bank),
                                },
                                {
                                  label: 'Nhân bản',
                                  icon: Copy,
                                  tone: 'info',
                                  onClick: () => duplicateQuestionBank(bank),
                                },
                                {
                                  label: 'Sinh đề',
                                  icon: Shuffle,
                                  tone: 'primary',
                                  onClick: () => openGenerator(bank),
                                },
                                // Ngân hàng chưa dùng thì duyệt, đang dùng thì cho ngừng.
                                bank.status === 'Đang sử dụng'
                                  ? {
                                      label: 'Ngừng sử dụng',
                                      icon: Ban,
                                      tone: 'dark',
                                      onClick: () => changeQuestionBankStatus(bank, 'Ngừng sử dụng'),
                                    }
                                  : {
                                      label: 'Duyệt / đưa vào sử dụng',
                                      icon: CheckCircle2,
                                      tone: 'success',
                                      onClick: () => changeQuestionBankStatus(bank, 'Đang sử dụng'),
                                    },
                                {
                                  label: 'Xóa',
                                  icon: Trash2,
                                  tone: 'danger',
                                  onClick: () => deleteQuestionBank(bank.id),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {!filteredBanks.length ? (
                      <tr>
                        <td colSpan="11" className="text-center py-5 text-muted">
                          Chưa có ngân hàng đề nào phù hợp bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                label="ngân hàng đề"
                pagination={bankPagination}
                pageSize={bankPageSize}
                onPageChange={setBankPage}
                onPageSizeChange={(size) => {
                  setBankPageSize(size);
                  setBankPage(1);
                }}
              />
            </div>

            {selectedBank ? (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">{selectedBank.name}</h5>
                      <div className="small text-muted">
                        {selectedBank.level} · {selectedBank.difficulty} · {selectedBank.skill} · {selectedBank.unit || 'Không gắn unit'}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn btn-primary" onClick={openExerciseCreate}>
                        <Plus size={16} className="me-2" />
                        Thêm bài tập
                      </button>
                      <button className="btn btn-outline-danger" onClick={deleteSelectedExercises}>
                        <Trash2 size={16} className="me-2" />
                        Xóa bài đã chọn
                      </button>
                      <button className="btn btn-outline-success" onClick={approveSelectedExercises}>
                        <ShieldCheck size={16} className="me-2" />
                        Duyệt bài tập
                      </button>
                      <button className="btn btn-outline-primary" onClick={() => openGenerator(selectedBank)}>
                        <Shuffle size={16} className="me-2" />
                        Sinh đề từ ngân hàng này
                      </button>
                      <button className="btn btn-light border" onClick={() => setSelectedBankId(null)}>
                        <ArrowLeft size={16} className="me-2" />
                        Quay lại danh sách
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="admin-eem-summary-chip">
                        <div className="small text-muted">Tổng số bài tập</div>
                        <div className="fw-semibold">{selectedBankStats?.total || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-eem-summary-chip">
                        <div className="small text-muted">Bài tập đã duyệt</div>
                        <div className="fw-semibold">{selectedBankStats?.approved || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-eem-summary-chip">
                        <div className="small text-muted">Nháp / chờ duyệt</div>
                        <div className="fw-semibold">{selectedBankStats?.pending || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-eem-summary-chip">
                        <div className="small text-muted">Số dạng câu hỏi</div>
                        <div className="fw-semibold">{selectedBankStats?.formatCount || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-light border admin-eem-inline-note mb-4">
                    Chỉ bài tập có trạng thái <strong>Đã duyệt</strong> mới được dùng để sinh đề tự động. Mỗi bài tập có thể có 1 hoặc nhiều câu hỏi con.
                  </div>

                  <div className="table-responsive">
                    <table className="table align-middle mb-0 admin-eem-table admin-eem-table-exercise">
                      <thead className="table-light">
                        <tr className="small text-uppercase text-muted">
                          <th className="ps-4">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={allCurrentExercisePageSelected}
                              onChange={(event) => toggleCurrentExercisePageSelection(event.target.checked)}
                            />
                          </th>
                          <th className="admin-eem-col-code">Mã bài tập</th>
                          <th className="admin-eem-col-name">Tên bài tập</th>
                          <th className="admin-eem-col-compact">Dạng câu hỏi</th>
                          <th className="admin-eem-col-compact">Unit</th>
                          <th className="text-center admin-eem-col-count">Số câu hỏi con</th>
                          <th className="text-center admin-eem-col-status">Trạng thái</th>
                          <th className="admin-eem-col-date">Ngày tạo</th>
                          <th className="text-center admin-eem-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercisePagination.items.map((exercise) => (
                          <tr key={exercise.id}>
                            <td className="ps-4">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedExerciseIds.includes(exercise.id)}
                                onChange={() => toggleExerciseSelection(exercise.id)}
                              />
                            </td>
                            <td className="fw-semibold admin-eem-col-code">{exercise.code}</td>
                            <td className="admin-eem-col-name">
                              <div className="fw-semibold admin-eem-cell-title" title={exercise.title}>
                                {exercise.title}
                              </div>
                              <div className="small text-muted admin-eem-cell-description" title={exercise.content}>
                                {exercise.content}
                              </div>
                            </td>
                            <td className="admin-eem-col-compact">{exercise.questionFormat}</td>
                            <td className="admin-eem-col-compact">{exercise.unit || '--'}</td>
                            <td className="text-center admin-eem-col-count">{exercise.childQuestions.length}</td>
                            <td className="text-center admin-eem-col-status">
                              <StatusBadge
                                meta={EXERCISE_STATUS_META[exercise.status] || EXERCISE_STATUS_META.Nháp}
                                fallbackLabel={exercise.status}
                              />
                            </td>
                            <td className="admin-eem-col-date">{formatDate(exercise.createdAt)}</td>
                            <td className="text-center admin-eem-col-actions">
                              <ActionMenu
                                primaryAction={{
                                  label: 'Xem',
                                  icon: Eye,
                                  onClick: () => setExerciseDetailItem(exercise),
                                }}
                                items={[
                                  {
                                    label: 'Sửa',
                                    icon: Pencil,
                                    tone: 'secondary',
                                    onClick: () => openExerciseEdit(exercise),
                                  },
                                  {
                                    label: 'Nhân bản',
                                    icon: Copy,
                                    tone: 'info',
                                    onClick: () => duplicateExercise(exercise),
                                  },
                                  {
                                    label: 'Duyệt',
                                    icon: ShieldCheck,
                                    tone: 'success',
                                    onClick: () => approveExercise(exercise.id),
                                  },
                                  {
                                    label: 'Ngừng sử dụng',
                                    icon: Ban,
                                    tone: 'dark',
                                    onClick: () => deactivateExercise(exercise.id),
                                  },
                                  {
                                    label: 'Xóa',
                                    icon: Trash2,
                                    tone: 'danger',
                                    onClick: () => deleteExercise(exercise.id),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        ))}

                        {!selectedBankExercises.length ? (
                          <tr>
                            <td colSpan="9" className="text-center py-5 text-muted">
                              Chưa có bài tập nào trong ngân hàng đề này.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    label="bài tập"
                    pagination={exercisePagination}
                    pageSize={exercisePageSize}
                    onPageChange={setExercisePage}
                    onPageSizeChange={(size) => {
                      setExercisePageSize(size);
                      setExercisePage(1);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="admin-eem-empty-state mb-4">
                <FileText size={28} className="mb-3 text-muted" />
                <div className="fw-semibold mb-2">Chọn một ngân hàng đề để xem chi tiết</div>
                <div className="text-muted">Phần chi tiết ngân hàng đề, danh sách bài tập và khu vực sinh đề sẽ hiển thị ngay trong Tab 2.</div>
              </div>
            )}

            {selectedBank && generatorOpen ? (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h5 className="fw-bold mb-1">Sinh đề tự động từ ngân hàng đề</h5>
                    <div className="small text-muted">
                      Khởi tạo từ ngân hàng: {selectedBank.name}. Bạn có thể ghép nhiều kỹ năng và nhiều ngân hàng nguồn cùng trình độ, mức độ.
                    </div>
                  </div>
                  <button className="btn btn-light border" onClick={() => setGeneratorOpen(false)}>
                    Thu gọn
                  </button>
                </div>
                <div className="card-body">
                  <div className="admin-eem-stepper mb-4">
                    {GENERATOR_STEPS.map((step, index) => {
                      const active = wizardStep === step.id;
                      const complete = wizardStep > step.id;
                      return (
                        <React.Fragment key={step.id}>
                          <button
                            type="button"
                            className={`admin-eem-stepper-item ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                            onClick={() => goToWizardStep(step.id)}
                          >
                            <div className="admin-eem-stepper-index">{step.id}</div>
                            <div className="text-start">
                              <div className="fw-semibold">{step.title}</div>
                              <div className="small text-muted">{step.caption}</div>
                            </div>
                          </button>
                          {index < GENERATOR_STEPS.length - 1 ? (
                            <div className="admin-eem-stepper-arrow">
                              <ChevronRight size={18} />
                            </div>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {wizardStep === 1 ? (
                    <div className="row g-4">
                      <div className="col-lg-8">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-header bg-white border-0">
                            <h6 className="fw-bold mb-1">Bước 1: Tạo cấu trúc đề</h6>
                            <div className="small text-muted">Chọn trình độ, mức độ của đề rồi khai báo từng phần theo kỹ năng riêng.</div>
                          </div>
                          <div className="card-body">
                            <div className="row g-3 mb-4">
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Tên đề / cấu trúc đề</label>
                                <input
                                  className="form-control"
                                  value={structureForm.name}
                                  onChange={(event) => setStructureForm((prev) => ({ ...prev, name: event.target.value }))}
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Trình độ</label>
                                <select
                                  className="form-select"
                                  value={options.levels.includes(structureForm.level) ? structureForm.level : ''}
                                  onChange={(event) => setStructureForm((prev) => ({ ...prev, level: event.target.value }))}
                                >
                                  {/* Trình độ chọn ở đây được LƯU vào đề sinh ra. */}
                                  <option value="">-- Chưa đặt --</option>
                                  {options.levels.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Mức độ</label>
                                <select
                                  className="form-select"
                                  value={structureForm.difficulty}
                                  onChange={(event) => setStructureForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                                >
                                  {options.difficulties.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Thời gian làm bài</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={structureForm.durationMinutes}
                                  onChange={(event) =>
                                    setStructureForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                                  }
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Tổng điểm</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={structureForm.totalScore}
                                  onChange={(event) =>
                                    setStructureForm((prev) => ({ ...prev, totalScore: Number(event.target.value) }))
                                  }
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Ghi chú</label>
                                <input
                                  className="form-control"
                                  value={structureForm.note}
                                  onChange={(event) => setStructureForm((prev) => ({ ...prev, note: event.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="alert alert-light border mb-4">
                              <div className="fw-semibold mb-2">Đề hỗn hợp nhiều kỹ năng</div>
                              <div className="small text-muted mb-0">
                                Mỗi dòng là một phần của đề. Bạn có thể ghép Nghe, Đọc, Viết trong cùng một cấu trúc và chọn
                                nhiều ngân hàng nguồn ở bước 2.
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div>
                                <h6 className="fw-bold mb-1">Bảng cấu trúc đề</h6>
                                <div className="small text-muted">
                                  Mỗi dòng là một phần, nhập số lượng bài tập cần lấy gọi là A.
                                </div>
                              </div>
                              <button className="btn btn-outline-primary" onClick={addStructureRow}>
                                <Plus size={16} className="me-2" />
                                Thêm phần
                              </button>
                            </div>

                            <div className="table-responsive">
                              <table className="table align-middle">
                                <thead className="table-light">
                                  <tr className="small text-uppercase text-muted">
                                    <th>Kỹ năng</th>
                                    <th>Dạng câu hỏi</th>
                                    <th className="text-center">Số bài tập cần lấy (A)</th>
                                    <th className="text-center">Trọng số điểm</th>
                                    <th className="text-center">Thứ tự phần</th>
                                    <th className="text-center">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {structureRows.map((row) => (
                                    <tr key={row.id}>
                                      <td>
                                        <select
                                          className="form-select"
                                          value={row.skill}
                                          onChange={(event) => updateStructureRow(row.id, 'skill', event.target.value)}
                                        >
                                          {structureSkillOptions.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td>
                                        <select
                                          className="form-select"
                                          value={row.questionFormat}
                                          onChange={(event) => updateStructureRow(row.id, 'questionFormat', event.target.value)}
                                        >
                                          {getSupportedQuestionFormats(row.skillCode || row.skill).map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="number"
                                          className="form-control text-center"
                                          value={row.requiredCount}
                                          onChange={(event) => updateStructureRow(row.id, 'requiredCount', event.target.value)}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="number"
                                          step="0.5"
                                          className="form-control text-center"
                                          value={row.scoreWeight}
                                          onChange={(event) => updateStructureRow(row.id, 'scoreWeight', event.target.value)}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="number"
                                          className="form-control text-center"
                                          value={row.sectionOrder}
                                          onChange={(event) => updateStructureRow(row.id, 'sectionOrder', event.target.value)}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeStructureRow(row.id)}>
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {structureErrors.length ? (
                              <div className="alert alert-danger mt-3 mb-0">
                                <ul className="mb-0 ps-3">
                                  {structureErrors.map((error) => (
                                    <li key={error}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                          <div className="card-footer bg-white border-0 d-flex justify-content-end">
                            <button className="btn btn-primary" onClick={() => goToWizardStep(2)}>
                              Tiếp tục
                              <ChevronRight size={16} className="ms-2" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-lg-4">
                        <div className="card border-0 shadow-sm mb-4">
                          <div className="card-header bg-white border-0">
                            <h6 className="fw-bold mb-0">Ngân hàng nguồn khả dụng</h6>
                          </div>
                          <div className="card-body">
                            {activeBanksForStructure.length ? (
                              <div className="d-flex flex-column gap-3">
                                {structureSkillOptions.map((skill) => {
                                  const banks = activeBanksForStructure.filter((bank) => bank.skill === skill);
                                  if (!banks.length) {
                                    return null;
                                  }

                                  return (
                                    <div key={skill}>
                                      <div className="fw-semibold mb-2">{skill}</div>
                                      <div className="d-flex flex-wrap gap-2">
                                        {banks.map((bank) => (
                                          <div key={bank.id} className="admin-eem-chip">
                                            {bank.name}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="alert alert-light border mb-0">
                                <div className="small text-muted">
                                  Chưa có ngân hàng đang sử dụng phù hợp với trình độ và mức độ bạn đã chọn.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card border-0 shadow-sm">
                          <div className="card-header bg-white border-0">
                            <h6 className="fw-bold mb-0">Cách tính điểm</h6>
                          </div>
                          <div className="card-body">
                            <div className="admin-eem-formula mb-2">
                              Điểm đạt được = tổng số câu đúng của từng phần * trọng số phần đó
                            </div>
                            <div className="admin-eem-formula mb-2">
                              Điểm tối đa = tổng số câu của từng phần * trọng số phần đó
                            </div>
                            <div className="admin-eem-formula">
                              Điểm cuối cùng = (Điểm đạt được / Điểm tối đa) * 10
                            </div>

                            {scoreFormulaPreview ? (
                              <div className="alert alert-light border mt-3 mb-0">
                                <div className="fw-semibold mb-2">Ví dụ nhỏ</div>
                                <div className="small mb-1">Phần 1: 10 câu, trọng số 1, đúng 7 câu</div>
                                <div className="small mb-1">Phần 2: 10 câu, trọng số 2, đúng 5 câu</div>
                                <div className="small mb-1">Điểm đạt được = 7*1 + 5*2 = 17</div>
                                <div className="small mb-1">Điểm tối đa = 10*1 + 10*2 = 30</div>
                                <div className="small fw-semibold">Điểm cuối cùng = {scoreFormulaPreview.finalScore.toFixed(2)}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 2 ? (
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                          <h6 className="fw-bold mb-1">Bước 2: Chọn ngân hàng gốc</h6>
                          <div className="small text-muted">
                            Mỗi phần có thể chọn một hoặc nhiều ngân hàng nguồn. Hệ thống chỉ lấy bài tập đã duyệt, đúng trình độ,
                            mức độ, kỹ năng và dạng câu hỏi của phần đó.
                          </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          <button className="btn btn-light border" onClick={() => goToWizardStep(1)}>
                            Quay lại bước 1
                          </button>
                          <button className="btn btn-primary" onClick={() => goToWizardStep(3)} disabled={!sourceStepValid}>
                            Sang bước sinh đề
                            <ChevronRight size={16} className="ms-2" />
                          </button>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="row g-3 mb-4">
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold text-muted">Tìm kiếm theo tên bài tập</label>
                            <div className="input-group">
                              <span className="input-group-text bg-white border-end-0">
                                <Search size={16} />
                              </span>
                              <input
                                className="form-control border-start-0"
                                value={sourceFilters.keyword}
                                onChange={(event) => changeSourceFilter('keyword', event.target.value)}
                                placeholder="Tên bài tập"
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold text-muted">Unit/Bài học</label>
                            <select className="form-select" value={sourceFilters.unit} onChange={(event) => changeSourceFilter('unit', event.target.value)}>
                              <option value="ALL">Tất cả</option>
                              {sourceUnitOptions.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-5 d-flex align-items-end justify-content-end">
                            <button className="btn btn-outline-primary me-2" onClick={saveSourcePool}>
                              <Settings2 size={16} className="me-2" />
                              Lưu ngân hàng gốc
                            </button>
                            <button className="btn btn-light border" onClick={() => setSourceFilters(SOURCE_FILTERS)}>
                              <Filter size={16} className="me-2" />
                              Đặt lại
                            </button>
                          </div>
                        </div>

                        <div className="d-flex flex-column gap-4">
                          {structureRows.map((row) => {
                            const pool = sourcePools[row.id] || [];
                            const selectedIds = sourceSelections[row.id] || [];
                            const requirement = sourceValidation.find((item) => item.rowId === row.id);
                            const matchingBanks = matchingSourceBanksByRow[row.id] || [];
                            const selectedSourceBankIds = row.sourceBankIds || [];

                            return (
                              <div key={row.id} className="admin-eem-source-block">
                                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                                  <div>
                                    <div className="fw-semibold">
                                      Phần {row.sectionOrder}: {row.skill} · {row.questionFormat}
                                    </div>
                                    <div className="small text-muted">
                                      A = {row.requiredCount} bài tập. B = {selectedIds.length} bài đã chọn. Nguồn ngân hàng đang bật:{' '}
                                      {selectedSourceBankIds.length}.
                                    </div>
                                  </div>
                                  <div>
                                    {requirement?.valid ? (
                                      <span className="badge bg-success-subtle text-success">Đủ điều kiện ngân hàng nguồn và B &gt;= A</span>
                                    ) : (
                                      <span className="badge bg-danger-subtle text-danger">Thiếu ngân hàng nguồn hoặc B &lt; A</span>
                                    )}
                                  </div>
                                </div>

                                {matchingBanks.length ? (
                                  <>
                                    <div className="mb-3">
                                      <div className="small fw-semibold text-muted mb-2">Chọn ngân hàng nguồn</div>
                                      <div className="d-flex flex-wrap gap-2">
                                        {matchingBanks.map((bank) => {
                                          const active = selectedSourceBankIds.includes(bank.id);
                                          return (
                                            <button
                                              key={bank.id}
                                              type="button"
                                              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-light border'}`}
                                              onClick={() => toggleSourceBankSelection(row.id, bank.id)}
                                            >
                                              {bank.name} · {bank.unit || 'Không gắn unit'}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {selectedSourceBankIds.length ? (
                                      pool.length ? (
                                        <div className="row g-3">
                                          {pool.map((exercise) => {
                                            const checked = selectedIds.includes(exercise.id);
                                            return (
                                              <div key={`${row.id}-${exercise.id}`} className="col-lg-4 col-md-6">
                                                <label className={`admin-eem-source-card ${checked ? 'is-selected' : ''}`}>
                                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                                    <input
                                                      type="checkbox"
                                                      className="form-check-input mt-1"
                                                      checked={checked}
                                                      onChange={() => toggleSourceSelection(row.id, exercise.id)}
                                                    />
                                                    <button
                                                      type="button"
                                                      className="btn btn-sm btn-light border"
                                                      onClick={() => setExerciseDetailItem(exercise)}
                                                    >
                                                      <Eye size={14} />
                                                    </button>
                                                  </div>
                                                  <div className="fw-semibold mt-3">{exercise.title}</div>
                                                  <div className="small text-muted mt-2">
                                                    {exercise.bankName} · {exercise.unit} · {exercise.childQuestions.length} câu hỏi con
                                                  </div>
                                                  <div className="d-flex flex-wrap gap-2 mt-3">
                                                    <span className="badge text-bg-light border">{exercise.code}</span>
                                                    <span className="badge text-bg-light border">{exercise.bankSkill}</span>
                                                  </div>
                                                </label>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="alert alert-warning mb-0">
                                          Chưa có bài tập đã duyệt phù hợp với bộ lọc hiện tại trong các ngân hàng nguồn đã chọn.
                                        </div>
                                      )
                                    ) : (
                                      <div className="alert alert-info mb-0">
                                        Hãy chọn ít nhất 1 ngân hàng nguồn cho phần này trước khi tích bài tập random.
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="alert alert-warning mb-0">
                                    Chưa có ngân hàng đang sử dụng nào phù hợp với kỹ năng {row.skill} ở trình độ {structureForm.level}
                                    và mức độ {structureForm.difficulty}.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {!sourceStepValid ? (
                          <div className="alert alert-danger mt-4 mb-0">
                            Mỗi phần phải chọn ngân hàng nguồn và có B lớn hơn hoặc bằng A. Nếu thiếu một trong hai điều kiện, hệ thống sẽ khóa bước sinh đề.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 3 ? (
                    <div className="row g-4">
                      <div className="col-lg-4">
                        <div className="card border-0 shadow-sm">
                          <div className="card-header bg-white border-0">
                            <h6 className="fw-bold mb-1">Bước 3: Sinh đề</h6>
                            <div className="small text-muted">
                              Đề sinh xong được lưu cố định, không random lại khi học sinh mở đề.
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <label className="form-label fw-semibold">Số lượng đề cần sinh</label>
                              <input
                                type="number"
                                className="form-control"
                                value={generatorForm.examCount}
                                onChange={(event) =>
                                  setGeneratorForm((prev) => ({ ...prev, examCount: Number(event.target.value) }))
                                }
                              />
                            </div>
                            <div className="d-flex flex-column gap-3 mb-4">
                              <label className="admin-eem-toggle-row">
                                <span>Đảo thứ tự phần</span>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={generatorForm.shuffleSections}
                                  onChange={(event) =>
                                    setGeneratorForm((prev) => ({ ...prev, shuffleSections: event.target.checked }))
                                  }
                                />
                              </label>
                              <label className="admin-eem-toggle-row">
                                <span>Đảo thứ tự bài tập</span>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={generatorForm.shuffleExercises}
                                  onChange={(event) =>
                                    setGeneratorForm((prev) => ({ ...prev, shuffleExercises: event.target.checked }))
                                  }
                                />
                              </label>
                              <label className="admin-eem-toggle-row">
                                <span>Đảo đáp án trắc nghiệm</span>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={generatorForm.shuffleAnswers}
                                  onChange={(event) =>
                                    setGeneratorForm((prev) => ({ ...prev, shuffleAnswers: event.target.checked }))
                                  }
                                />
                              </label>
                            </div>
                            <button className="btn btn-primary w-100" onClick={generateExams}>
                              <Shuffle size={16} className="me-2" />
                              Sinh đề
                            </button>

                            <div className="admin-eem-generation-rules mt-4">
                              <div className="fw-semibold mb-2">Quy tắc sinh đề</div>
                              <div className="small text-muted">
                                Với mỗi phần trong cấu trúc đề, hệ thống random A bài tập từ B bài tập đã chọn trong các
                                ngân hàng nguồn tương ứng, sau đó ghép các phần lại thành đề hoàn chỉnh và lưu cố định.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-lg-8">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                              <h6 className="fw-bold mb-1">Preview đề đã sinh</h6>
                              <div className="small text-muted">
                                {generatedExamsForSelectedBank.length
                                  ?
                                  `${generatedExamsForSelectedBank.length} đề đã được tạo và lưu cố định.`
                                  : 'Chưa có đề nào được sinh từ ngân hàng đề này.'}
                              </div>
                            </div>
                            <button className="btn btn-light border" onClick={() => goToWizardStep(2)}>
                              Quay lại bước 2
                            </button>
                          </div>
                          <div className="card-body">
                            {generatedExamsForSelectedBank.length ? (
                              <div className="d-flex flex-column gap-3">
                                {generatedExamsForSelectedBank.map((exam) => (
                                  <div key={exam.id} className="admin-eem-generated-card">
                                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                                      <div>
                                        <div className="small text-muted">{exam.code}</div>
                                        <div className="fw-semibold">{exam.title}</div>
                                        <div className="small text-muted">
                                          {exam.level} · {exam.difficulty} · {exam.skillSummary || getExamSkillSummary(exam.sections)} ·{' '}
                                          {exam.durationMinutes} phút
                                        </div>
                                        <div className="small text-muted">
                                          {getVariantBadgeLabel(exam) ? `${getVariantBadgeLabel(exam)} · ` : ''}
                                          {exam.sourceBankIds?.length || 0} ngân hàng nguồn được dùng
                                        </div>
                                      </div>
                                      <div className="d-flex flex-wrap gap-2">
                                        <button className="btn btn-sm btn-light border" onClick={() => openExamPreview(exam)}>
                                          <Eye size={14} className="me-1" />
                                          Xem đề
                                        </button>
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => editGeneratedExam(exam)}>
                                          <Pencil size={14} className="me-1" />
                                          Chỉnh sửa
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() => {
                                            const assignment = assignments.find((item) => item.id === exam.id) || createGeneratedAssignment(exam);
                                            openDistributionModal('CLASS', assignment);
                                          }}
                                        >
                                          <Send size={14} className="me-1" />
                                          {exam.variantCount > 1 ? 'Giao bộ đề' : 'Giao đề'}
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteGeneratedExam(exam.id)}>
                                          <Trash2 size={14} className="me-1" />
                                          Xóa
                                        </button>
                                      </div>
                                    </div>

                                    <div className="row g-3">
                                      {exam.sections.map((section, index) => (
                                        <div key={`${exam.id}-${section.rowId}`} className="col-md-6">
                                          <div className="admin-eem-generated-section">
                                            <div className="small text-muted">Phần {index + 1}</div>
                                            <div className="fw-semibold">
                                              {section.skill} · {section.questionFormat}
                                            </div>
                                            <div className="small text-muted mt-2">
                                              {section.items.length} bài tập đã random · trọng số {section.scoreWeight}
                                            </div>
                                            <div className="small text-muted mt-2">
                                              Nguồn: {(section.sourceBankNames || []).join(', ') || 'Chưa chọn'}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="admin-eem-empty-state">
                                <FileText size={28} className="mb-3 text-muted" />
                                <div className="fw-semibold mb-2">Chưa có đề nào được sinh</div>
                                <div className="text-muted">Sau khi bấm “Sinh đề”, danh sách Đề 1, Đề 2, Đề 3... sẽ hiển thị ở đây.</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {distributionDraft ? (
        <ModalShell
          title={distributionDraft.mode === 'CLASS' ? 'Giao cho lớp' : 'Giao cho học sinh'}
          subtitle={distributionDraft.item.title}
          onClose={() => setDistributionDraft(null)}
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setDistributionDraft(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={confirmDistribution}>
                Xác nhận giao bài
              </button>
            </>
          }
        >
          <div className="row g-4">
            <div className="col-lg-6">
              <h6 className="fw-bold mb-3">
                {distributionDraft.mode === 'CLASS' ? 'Chọn lớp' : 'Chọn học sinh'}
              </h6>
              {distributionDraft.variantCount > 1 ? (
                <div className="alert alert-info py-2 small">
                  {distributionDraft.mode === 'CLASS'
                    ? `Hệ thống sẽ random ngẫu nhiên trong ${distributionDraft.variantCount} phiên bản cho từng học sinh của lớp.`
                    : `Hệ thống sẽ random ngẫu nhiên trong ${distributionDraft.variantCount} phiên bản cho từng học sinh được chọn.`}
                </div>
              ) : null}

              <div className="row g-3 mb-3">
                <div className={distributionDraft.mode === 'CLASS' ? 'col-12' : 'col-md-7'}>
                  <label className="form-label small fw-semibold text-muted">
                    {distributionDraft.mode === 'CLASS' ? 'Tìm lớp' : 'Tìm học sinh'}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={16} />
                    </span>
                    <input
                      className="form-control border-start-0"
                      value={distributionDraft.keyword}
                      onChange={(event) => setDistributionDraft((prev) => ({ ...prev, keyword: event.target.value }))}
                      placeholder={distributionDraft.mode === 'CLASS' ? 'Tên lớp, giáo viên...' : 'Tên học sinh, lớp...'}
                    />
                  </div>
                </div>

                {distributionDraft.mode === 'STUDENT' ? (
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold text-muted">Lọc theo lớp</label>
                    <select
                      className="form-select"
                      value={distributionDraft.classFilter}
                      onChange={(event) => setDistributionDraft((prev) => ({ ...prev, classFilter: event.target.value }))}
                    >
                      <option value="ALL">Tất cả lớp phù hợp</option>
                      {distributionClassOptions.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="small text-muted mb-3">
                {distributionDraft.mode === 'CLASS'
                  ? `${distributionTargets.length} lớp phù hợp với trình độ ${distributionDraft.item.level}.`
                  : `${distributionTargets.length} học sinh phù hợp với trình độ ${distributionDraft.item.level}.`}
              </div>

              <div className="d-flex flex-column gap-2 admin-eem-scroll-panel">
                {distributionTargets.length ? (
                  distributionTargets.map((target) => (
                    <label key={target.id} className="admin-eem-target-card">
                      <div>
                        <div className="fw-semibold">{target.name}</div>
                        {'teacher' in target ? (
                          <div className="small text-muted">
                            {target.teacher ? `${target.teacher} · ` : ''}
                            {target.students} học viên
                          </div>
                        ) : (
                          <div className="small text-muted">
                            {target.className || 'Học sinh chưa xếp lớp'}
                          </div>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={distributionDraft.targetIds.includes(target.id)}
                        onChange={() => toggleDistributionTarget(target.id)}
                      />
                    </label>
                  ))
                ) : (
                  <div className="admin-eem-empty-state py-4">
                    <div className="fw-semibold mb-2">
                      {distributionDraft.mode === 'CLASS' ? 'Không có lớp phù hợp' : 'Không có học sinh phù hợp'}
                    </div>
                    <div className="text-muted small">
                      Hãy đổi từ khóa hoặc bộ lọc lớp để tìm thêm đối tượng nhận bài.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={distributionDraft.startAt}
                    onChange={(event) => setDistributionDraft((prev) => ({ ...prev, startAt: event.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={distributionDraft.endAt}
                    onChange={(event) => setDistributionDraft((prev) => ({ ...prev, endAt: event.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Thời lượng làm bài</label>
                  <input
                    type="number"
                    className="form-control"
                    value={distributionDraft.durationMinutes}
                    onChange={(event) =>
                      setDistributionDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Số lần được nộp</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-control"
                    value={distributionDraft.attempts}
                    onChange={(event) =>
                      setDistributionDraft((prev) => ({
                        ...prev,
                        // Giới hạn 1..10 ngay tại chỗ nhập cho khớp với backend.
                        attempts: Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                      }))
                    }
                  />
                  <div className="form-text">Học sinh nộp đủ số lần này thì không nộp thêm được.</div>
                </div>
                <div className="col-12">
                  <label className="admin-eem-toggle-row border rounded-3 px-3 py-2">
                    <span>Có hiển thị đáp án sau khi nộp không</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={distributionDraft.revealAnswers}
                      onChange={(event) =>
                        setDistributionDraft((prev) => ({ ...prev, revealAnswers: event.target.checked }))
                      }
                    />
                  </label>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Ghi chú cho học sinh</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    value={distributionDraft.studentNote}
                    onChange={(event) => setDistributionDraft((prev) => ({ ...prev, studentNote: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {assignmentDetailItem ? (
        <ModalShell
          title="Chi tiết bài tập/đề thi"
          subtitle={assignmentDetailItem.code}
          onClose={() => setAssignmentDetailItem(null)}
          footer={<button className="btn btn-primary" onClick={() => setAssignmentDetailItem(null)}>Đóng</button>}
        >
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${assignmentDetailTab === 'INFO' ? 'active' : ''}`}
                onClick={() => setAssignmentDetailTab('INFO')}
              >
                Thông tin chung
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${assignmentDetailTab === 'CONTENT' ? 'active' : ''}`}
                onClick={() => setAssignmentDetailTab('CONTENT')}
              >
                Nội dung chi tiết
              </button>
            </li>
          </ul>

          {assignmentDetailTab === 'CONTENT' ? (
            <ExamContentPreview assignmentId={assignmentDetailItem.id} />
          ) : (
            <div className="row g-3">
              {[
                ['Tên', assignmentDetailItem.title],
                ['Loại', assignmentDetailItem.type],
                ['Trình độ', assignmentDetailItem.level],
                ['Mức độ', assignmentDetailItem.difficulty],
                ['Khóa học', assignmentDetailItem.courseName || '--'],
                ['Phiên bản', getVariantBadgeLabel(assignmentDetailItem) || 'Đề cố định'],
                ['Số câu / bài tập', assignmentDetailItem.totalItems],
                ['Thời gian', `${assignmentDetailItem.durationMinutes} phút`],
                ['Trạng thái', assignmentDetailItem.status],
                ['Ngày tạo', formatDateTime(assignmentDetailItem.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="col-md-4">
                  <div className="admin-eem-summary-chip h-100">
                    <div className="small text-muted">{label}</div>
                    <div className="fw-semibold mt-1">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      ) : null}

      {assignmentResultItem ? (
        <ModalShell
          title="Kết quả bài tập/đề thi"
          subtitle={assignmentResultItem.code}
          onClose={() => setAssignmentResultItem(null)}
          footer={<button className="btn btn-primary" onClick={() => setAssignmentResultItem(null)}>Đóng</button>}
        >
          <div className="row g-3">
            <div className="col-md-4">
              <div className="admin-eem-summary-chip h-100">
                <div className="small text-muted">Số học sinh đã làm</div>
                <div className="fw-semibold mt-1">{assignmentResultItem.studentsDone}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="admin-eem-summary-chip h-100">
                <div className="small text-muted">Điểm trung bình</div>
                <div className="fw-semibold mt-1">{assignmentResultItem.averageScore || 0}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="admin-eem-summary-chip h-100">
                <div className="small text-muted">Trạng thái</div>
                <div className="fw-semibold mt-1">{assignmentResultItem.status}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="admin-eem-summary-chip h-100">
                <div className="small text-muted">Phân bổ đề</div>
                <div className="fw-semibold mt-1">
                  {assignmentResultItem.variantCount > 1
                    ? `${getAssignmentStudentCount(assignmentResultItem)} học sinh trong ${assignmentResultItem.variantCount} phiên bản`
                    : 'Giao theo một đề cố định'}
                </div>
              </div>
            </div>
          </div>

          {assignmentResultItem.variantCount > 1 ? (
            <div className="alert alert-info small mt-4 mb-0">
              Bộ đề này có {assignmentResultItem.variantCount} phiên bản. Khi giao cho lớp, hệ thống sẽ random ngẫu nhiên 1
              phiên bản cho từng học sinh.
            </div>
          ) : null}

          <div className="table-responsive mt-4">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-uppercase text-muted">
                  <th>Chỉ số</th>
                  <th>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Số lớp / học sinh mục tiêu</td>
                  <td>
                    {assignmentResultItem.targetClasses?.length || 0} lớp · {getAssignmentStudentCount(assignmentResultItem)} học sinh
                  </td>
                </tr>
                {assignmentResultItem.variantCount > 1 ? (
                  <tr>
                    <td>Bộ đề</td>
                    <td>{assignmentResultItem.variantCount} phiên bản, random ngẫu nhiên theo từng học sinh</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Tỷ lệ đã làm</td>
                  <td>
                    {/* Trước đây dùng công thức bịa studentsDone/(studentsDone+5).
                        Giờ chia cho số học sinh thật sự được giao bài. */}
                    {(() => {
                      const tong = getAssignmentStudentCount(assignmentResultItem);
                      if (!tong) {
                        return 'Chưa giao cho học sinh nào';
                      }
                      const daLam = Number(assignmentResultItem.studentsDone || 0);
                      return `${daLam}/${tong} học sinh (${Math.round((daLam / tong) * 100)}%)`;
                    })()}
                  </td>
                </tr>
                <tr>
                  <td>Nhận xét nhanh</td>
                  <td>
                    {!assignmentResultItem.studentsDone
                      ? 'Chưa có ai nộp bài nên chưa đánh giá được.'
                      : assignmentResultItem.averageScore >= 8
                        ? 'Kết quả tốt, có thể nâng mức độ cho lần tiếp theo.'
                        : assignmentResultItem.averageScore >= 6
                          ? 'Kết quả ổn định, nên bổ sung thêm bài tập hỗ trợ.'
                          : 'Cần xem lại cấu trúc đề hoặc độ khó của bài.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ModalShell>
      ) : null}

      {assignmentEditDraft ? (
        <ModalShell
          title="Chỉnh sửa bài tập/đề thi"
          subtitle={assignmentEditDraft.code}
          onClose={() => setAssignmentEditDraft(null)}
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setAssignmentEditDraft(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={saveAssignmentEdit}>
                Lưu thay đổi
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Tên bài tập/đề thi</label>
              <input
                className="form-control"
                value={assignmentEditDraft.title}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Loại</label>
              <select
                className="form-select"
                value={assignmentEditDraft.type}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, type: event.target.value }))}
              >
                {options.assignmentTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={assignmentEditDraft.status}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                {options.publishModes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trình độ</label>
              <select
                className="form-select"
                value={options.levels.includes(assignmentEditDraft.level) ? assignmentEditDraft.level : ''}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, level: event.target.value }))}
              >
                {/* Đề chưa đặt trình độ phải hiện rõ là chưa đặt. Không có mục
                    này thì trình duyệt tự chọn mục đầu ("Lớp 1"), nhìn như đề
                    có trình độ đó và bấm Lưu là ghi đè thật. */}
                <option value="">-- Chưa đặt --</option>
                {options.levels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Mức độ</label>
              <select
                className="form-select"
                value={assignmentEditDraft.difficulty}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, difficulty: event.target.value }))}
              >
                {options.difficulties.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {/* Không có ô Kỹ năng: một đề có thể ghép nhiều kỹ năng, ép về một
                giá trị duy nhất là sai. Kỹ năng được đặt ở từng phần khi sinh đề. */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Thời gian (phút)</label>
              <input
                type="number"
                className="form-control"
                value={assignmentEditDraft.type === 'Bài tập' ? 0 : assignmentEditDraft.durationMinutes}
                disabled={assignmentEditDraft.type === 'Bài tập'}
                onChange={(event) =>
                  setAssignmentEditDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                }
              />
              {assignmentEditDraft.type === 'Bài tập' ? (
                // Backend ép thời gian về 0 với loại HOMEWORK; nếu vẫn cho nhập
                // thì người dùng gõ 45 rồi lưu xong thấy 0 mà không hiểu vì sao.
                <div className="form-text">Bài tập không giới hạn thời gian làm.</div>
              ) : null}
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Số câu / bài tập</label>
              <input className="form-control" value={assignmentEditDraft.totalItems} disabled readOnly />
              <div className="form-text">
                Đếm từ câu hỏi thật của đề, sửa ở đây không đổi được nội dung đề.
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {bankDraft ? (
        <ModalShell
          title={bankDraft.bankId ? 'Chỉnh sửa ngân hàng đề' : 'Thêm ngân hàng đề'}
          subtitle="Quản lý ngân hàng đề và phạm vi bài tập gốc"
          onClose={() => setBankDraft(null)}
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setBankDraft(null)}>
                Hủy
              </button>
              <button className="btn btn-outline-primary" onClick={() => saveQuestionBank('DRAFT')}>
                Lưu nháp
              </button>
              <button className="btn btn-primary" onClick={() => saveQuestionBank('FINAL')}>
                Lưu ngân hàng đề
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Mã ngân hàng <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={bankDraft.code}
                placeholder="VD: NHD-READ-01"
                onChange={(event) => setBankDraft((prev) => ({ ...prev, code: event.target.value }))}
              />
              <div className="form-text">Do người soạn tự đặt, không trùng trong hệ thống.</div>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Tên ngân hàng đề</label>
              <input
                className="form-control"
                value={bankDraft.name}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={bankDraft.status}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                {QUESTION_BANK_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Trình độ</label>
              <select
                className="form-select"
                value={options.levels.includes(bankDraft.level) ? bankDraft.level : ''}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, level: event.target.value }))}
              >
                {/* Đặt trình độ ở đây thì đề sinh từ ngân hàng sẽ tự kế thừa. */}
                <option value="">-- Chưa đặt --</option>
                {options.levels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Mức độ</label>
              <select
                className="form-select"
                value={bankDraft.difficulty}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, difficulty: event.target.value }))}
              >
                {options.difficulties.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Kỹ năng</label>
              <select
                className="form-select"
                value={bankDraft.skill}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, skill: event.target.value }))}
              >
                {options.skills.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Khóa học</label>
              <select
                className="form-select"
                value={bankDraft.courseId || ''}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, courseId: event.target.value }))}
              >
                <option value="">-- Không gắn khóa học --</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <div className="form-text">Bài tập trong ngân hàng sẽ thuộc khóa học này.</div>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Unit/Bài học</label>
              <input
                className="form-control"
                value={bankDraft.unit}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Mô tả</label>
              <input
                className="form-control"
                value={bankDraft.description}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="fw-semibold mb-2">Dạng câu hỏi theo kỹ năng</div>
            {getSupportedQuestionFormats(toSkillCode(bankDraft.skill) || bankDraft.skill).length ? (
              <div className="d-flex flex-wrap gap-2">
                {getSupportedQuestionFormats(toSkillCode(bankDraft.skill) || bankDraft.skill).map((format) => (
                  <div key={format} className="admin-eem-chip">
                    {format}
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-light border mb-0">
                <div className="small text-muted">Chưa có dạng câu hỏi nào được cấu hình cho kỹ năng này.</div>
              </div>
            )}
          </div>
        </ModalShell>
      ) : null}

      {exerciseDraft ? (
        <ModalShell
          title={exerciseDraft.id ? 'Chỉnh sửa bài tập trong ngân hàng đề' : 'Thêm bài tập trong ngân hàng đề'}
          subtitle={selectedBank ? `${selectedBank.name} · ${selectedBank.level} · ${selectedBank.difficulty} · ${selectedBank.skill}` : ''}
          onClose={() => setExerciseDraft(null)}
          size="xl"
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setExerciseDraft(null)}>
                Hủy
              </button>
              <button className="btn btn-outline-primary" onClick={() => saveExercise('DRAFT')}>
                Lưu nháp
              </button>
              <button className="btn btn-primary" onClick={() => saveExercise('FINAL')}>
                Lưu và gửi duyệt
              </button>
            </>
          }
        >
          <div className="alert alert-light border">
            Admin nhập trực tiếp nội dung bài tập và câu hỏi con trên form, không upload file đề và không import Excel.
          </div>

          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-semibold">
                Mã bài tập <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={exerciseDraft.code}
                placeholder="VD: BT-001"
                onChange={(event) => updateExerciseDraft('code', event.target.value)}
              />
              <div className="form-text">Do người soạn tự đặt, không trùng trong cùng ngân hàng.</div>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Tên bài tập</label>
              <input
                className="form-control"
                value={exerciseDraft.title}
                onChange={(event) => updateExerciseDraft('title', event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Dạng câu hỏi</label>
              <select
                className="form-select"
                value={exerciseDraft.questionFormat}
                onChange={(event) => updateExerciseDraft('questionFormat', event.target.value)}
              >
                {getSupportedQuestionFormats(selectedBank?.skillCode || selectedBank?.skill).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={exerciseDraft.status}
                onChange={(event) => updateExerciseDraft('status', event.target.value)}
              >
                {EXERCISE_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Trình độ</label>
              <input className="form-control" value={selectedBank?.level || ''} readOnly />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Mức độ</label>
              <input className="form-control" value={selectedBank?.difficulty || ''} readOnly />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Kỹ năng</label>
              <input className="form-control" value={selectedBank?.skill || ''} readOnly />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Unit/Bài học</label>
              <input
                className="form-control"
                value={exerciseDraft.unit}
                onChange={(event) => updateExerciseDraft('unit', event.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Audio URL (nếu là nghe)</label>
              <input
                className="form-control"
                value={exerciseDraft.audioUrl}
                onChange={(event) => updateExerciseDraft('audioUrl', event.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Hình ảnh URL (nếu cần)</label>
              <input
                className="form-control"
                value={exerciseDraft.imageUrl}
                onChange={(event) => updateExerciseDraft('imageUrl', event.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Nội dung bài tập</label>
              <textarea
                rows="4"
                className="form-control"
                value={exerciseDraft.content}
                onChange={(event) => updateExerciseDraft('content', event.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Ghi chú / giải thích</label>
              <textarea
                rows="2"
                className="form-control"
                value={exerciseDraft.note}
                onChange={(event) => updateExerciseDraft('note', event.target.value)}
              />
            </div>
          </div>

          {getQuestionEditorMode(exerciseDraft.questionFormat) === 'cloze_from_list' ? (
            <div className="mt-4">
              <StringListEditor
                label="Danh sách từ cho sẵn (word bank) — dùng chung cho mọi chỗ trống"
                items={exerciseDraft.wordBank?.length ? exerciseDraft.wordBank : ['']}
                addLabel="Thêm từ"
                placeholder="Ví dụ: planning"
                onChange={(wordBank) => updateExerciseDraft('wordBank', wordBank)}
              />
              <div className="form-text">
                Đánh số chỗ trống trong đoạn văn theo dạng <code>(1) __________</code>. Mỗi chỗ trống là
                một câu hỏi con bên dưới, đáp án chọn trực tiếp từ danh sách này.
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="fw-semibold">Danh sách câu hỏi con</div>
                <div className="small text-muted">
                  Mỗi bài tập có thể có một hoặc nhiều câu hỏi con. Form hiển thị theo đúng dạng câu hỏi đã chọn.
                </div>
              </div>
              <button type="button" className="btn btn-outline-primary" onClick={addChildQuestion}>
                <Plus size={16} className="me-2" />
                Thêm câu hỏi con
              </button>
            </div>

            <div className="d-flex flex-column gap-3">
              {exerciseDraft.childQuestions.map((question, index) => (
                <ChildQuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  questionFormat={exerciseDraft.questionFormat}
                  wordBank={exerciseDraft.wordBank || []}
                  onChange={(nextQuestion) => patchChildQuestion(question.id, nextQuestion)}
                  onDuplicate={() => duplicateChildQuestion(question.id)}
                  onDelete={() => deleteChildQuestion(question.id)}
                />
              ))}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {exerciseDetailItem ? (
        <ModalShell
          title="Chi tiết bài tập trong ngân hàng đề"
          subtitle={exerciseDetailItem.code}
          onClose={() => setExerciseDetailItem(null)}
          footer={<button className="btn btn-primary" onClick={() => setExerciseDetailItem(null)}>Đóng</button>}
          size="xl"
        >
          <div className="row g-3 mb-4">
            {[
              ['Tên bài tập', exerciseDetailItem.title],
              ['Dạng câu hỏi', exerciseDetailItem.questionFormat],
              ['Unit', exerciseDetailItem.unit || '--'],
              ['Trạng thái', exerciseDetailItem.status],
              ['Ngày tạo', formatDateTime(exerciseDetailItem.createdAt)],
              ['Số câu hỏi con', exerciseDetailItem.childQuestions.length],
            ].map(([label, value]) => (
              <div key={label} className="col-md-4">
                <div className="admin-eem-summary-chip h-100">
                  <div className="small text-muted">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <div className="small text-muted mb-1">Nội dung bài tập</div>
            <div
              className="border rounded p-3 bg-light"
              style={{ whiteSpace: 'pre-wrap', maxHeight: '18rem', overflowY: 'auto' }}
            >
              {exerciseDetailItem.content || '--'}
            </div>
          </div>

          {exerciseDetailItem.note ? (
            <div className="mb-4">
              <div className="small text-muted mb-1">Ghi chú / giải thích</div>
              <div className="border rounded p-3" style={{ whiteSpace: 'pre-wrap' }}>
                {exerciseDetailItem.note}
              </div>
            </div>
          ) : null}
          <div className="d-flex flex-column gap-3">
            {exerciseDetailItem.childQuestions.map((question, index) => (
              <div key={question.id} className="admin-eem-child-card">
                <div className="fw-semibold mb-2">Câu hỏi con {index + 1}</div>
                <div className="small text-muted mb-2">{question.prompt || 'Chưa có nội dung'}</div>
                <div className="small">Điểm: {question.score}</div>
                {question.manualGradingRequired ? (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <span className="badge text-bg-warning">Chấm tay</span>
                    {formatWordRange(question) ? <span className="badge text-bg-light border">{formatWordRange(question)}</span> : null}
                  </div>
                ) : null}
                {question.sourceSentence ? (
                  <div className="small mt-2">
                    <span className="fw-semibold">Câu gốc:</span> {question.sourceSentence}
                  </div>
                ) : null}
                {question.options?.length ? (
                  <div className="mt-2">
                    {question.options.map((option) => (
                      <div key={option.id} className="small">
                        {option.label}. {option.text} {option.isCorrect ? '(đúng)' : ''}
                      </div>
                    ))}
                  </div>
                ) : null}
                {question.acceptedAnswers?.length ? (
                  <div className="small mt-2">Đáp án đúng: {question.acceptedAnswers.filter(Boolean).join(', ') || '--'}</div>
                ) : null}
                {question.sampleAnswer ? (
                  <div className="small mt-2">
                    <span className="fw-semibold">Đáp án mẫu:</span> {question.sampleAnswer}
                  </div>
                ) : null}
                {question.gradingGuide ? (
                  <div className="small mt-2">
                    <span className="fw-semibold">Hướng dẫn chấm:</span> {question.gradingGuide}
                  </div>
                ) : null}
                {question.rubricCriteria?.length ? (
                  <div className="mt-2">
                    <div className="small fw-semibold mb-1">Rubric</div>
                    <div className="d-flex flex-wrap gap-2">
                      {question.rubricCriteria.map((criterion, rubricIndex) => (
                        <span key={`${question.id}-rubric-${rubricIndex}`} className="badge text-bg-light border">
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {question.reviewNote ? (
                  <div className="small mt-2">
                    <span className="fw-semibold">Ghi chú chấm:</span> {question.reviewNote}
                  </div>
                ) : null}

                <ChildQuestionDetail
                  question={question}
                  mode={getQuestionEditorMode(exerciseDetailItem.questionFormat)}
                />

                {question.explanation ? (
                  <div className="mt-3 pt-3 border-top">
                    <div className="small fw-semibold mb-1">Giải thích</div>
                    <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                      {question.explanation}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {previewExam ? (
        <ModalShell
          title="Preview đề đã sinh"
          subtitle={previewExam.title}
          onClose={() => setPreviewExam(null)}
          footer={<button className="btn btn-primary" onClick={() => setPreviewExam(null)}>Đóng</button>}
          size="xl"
        >
          <div className="row g-3 mb-4">
            {[
              ['Mã đề', previewExam.code],
              ['Cấu trúc', previewExam.structureName],
              ['Trình độ', previewExam.level],
              ['Mức độ', previewExam.difficulty],
              ['Kỹ năng', previewExam.skillSummary || getExamSkillSummary(previewExam.sections)],
              ['Thời gian', `${previewExam.durationMinutes} phút`],
              ['Số ngân hàng nguồn', previewExam.sourceBankIds?.length || 0],
            ].map(([label, value]) => (
              <div key={label} className="col-md-4">
                <div className="admin-eem-summary-chip h-100">
                  <div className="small text-muted">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${previewExamTab === 'STRUCTURE' ? 'active' : ''}`}
                onClick={() => setPreviewExamTab('STRUCTURE')}
              >
                Cấu trúc đề
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${previewExamTab === 'CONTENT' ? 'active' : ''}`}
                onClick={() => setPreviewExamTab('CONTENT')}
              >
                Nội dung chi tiết
              </button>
            </li>
          </ul>

          {previewExamTab === 'CONTENT' ? (
            <ExamContentPreview assignmentId={previewExam.id} />
          ) : (
            <div className="d-flex flex-column gap-3">
              {previewExam.sections.map((section, index) => (
                <div key={`${previewExam.id}-${section.rowId}`} className="admin-eem-generated-section">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <div className="small text-muted">Phần {index + 1}</div>
                      <div className="fw-semibold">
                        {section.skill} · {section.questionFormat}
                      </div>
                    </div>
                    <span className="badge text-bg-light border">{section.items.length} bài tập random</span>
                  </div>
                  <div className="small text-muted mb-3">
                    Trọng số {section.scoreWeight} · Điểm tối đa phần {section.sectionMaxScore.toFixed(2)} · Đảo đáp án{' '}
                    {previewExam.shuffleAnswers ? 'Bật' : 'Tắt'}
                  </div>
                  <div className="small text-muted mb-3">
                    Ngân hàng nguồn: {(section.sourceBankNames || []).join(', ') || 'Chưa có'}
                  </div>
                  <ul className="mb-0 ps-3">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <span className="fw-semibold">{item.title}</span> · {item.bankName || item.unit} · {item.childQuestions.length} câu hỏi con
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

export default AdminExerciseExamManagement;

