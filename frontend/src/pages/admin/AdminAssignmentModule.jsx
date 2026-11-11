import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileStack,
  FileText,
  Filter,
  GraduationCap,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  Shuffle,
  Sparkles,
  Target,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import './AdminAssignmentModule.css';
import {
  ASSIGNMENT_TYPE_OPTIONS,
  BANK_STATUS_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DIFFICULTY_OPTIONS,
  LEVEL_OPTIONS,
  MOCK_ASSIGNMENTS,
  MOCK_BANK_ITEMS,
  MOCK_CLASSES,
  MOCK_STUDENTS,
  QUESTION_FORMATS_BY_SKILL,
  SKILL_OPTIONS,
} from './adminAssignmentMockDataVi';

const TAB_OPTIONS = [
  {
    id: 'QUESTION_BANK',
    label: 'Ngân hàng bài tập & sinh đề',
    description: 'Bám theo tài liệu sinh đề từ ngân hàng đề: chọn A, chọn B > A và lưu đề cố định.',
  },
  {
    id: 'DELIVERY',
    label: 'Giao bài tập & đề thi',
    description: 'Khu vực phụ để xem đề đã có và giao cho lớp hoặc học sinh.',
  },
];

const STEP_OPTIONS = [
  { id: 1, title: 'Quản lý bank gốc', caption: 'Lọc, thêm, import và xem bài tập gốc.' },
  { id: 2, title: 'Tạo cấu trúc đề', caption: 'Chọn skill, dạng câu hỏi và khai báo số lượng A cần lấy.' },
  { id: 3, title: 'Chọn nguồn random', caption: 'Tích chọn B bài tập làm nguồn random cho từng dạng câu hỏi.' },
  { id: 4, title: 'Sinh đề cố định', caption: 'Random A từ B đã chọn và lưu đề cố định cho học sinh làm bài.' },
];

const DELIVERY_STATUS_META = {
  Nháp: { tone: 'secondary', label: 'Nháp' },
  'Đã sinh đề': { tone: 'warning', label: 'Đã sinh đề' },
  'Đã giao': { tone: 'primary', label: 'Đã giao' },
  'Đã đóng': { tone: 'dark', label: 'Đã đóng' },
};

const BANK_STATUS_META = {
  Nháp: { tone: 'secondary', label: 'Nháp' },
  'Sẵn sàng': { tone: 'success', label: 'Sẵn sàng' },
  'Đang dùng': { tone: 'primary', label: 'Đang dùng' },
};

Object.assign(DELIVERY_STATUS_META, {
  'Nháp': { tone: 'secondary', label: 'Nháp' },
  'Đã sinh đề': { tone: 'warning', label: 'Đã sinh đề' },
  'Đã giao': { tone: 'primary', label: 'Đã giao' },
  'Đã đóng': { tone: 'dark', label: 'Đã đóng' },
});

Object.assign(BANK_STATUS_META, {
  'Nháp': { tone: 'secondary', label: 'Nháp' },
  'Sẵn sàng': { tone: 'success', label: 'Sẵn sàng' },
  'Đang dùng': { tone: 'primary', label: 'Đang dùng' },
});

const emptyDeliveryFilters = {
  type: 'ALL',
  level: 'ALL',
  difficulty: 'ALL',
  skill: 'ALL',
  status: 'ALL',
  keyword: '',
};

const emptyBankFilters = {
  level: 'ALL',
  difficulty: 'ALL',
  skill: 'ALL',
  questionFormat: 'ALL',
  unit: 'ALL',
  keyword: '',
};

const emptySourceFilters = {
  unit: 'ALL',
  keyword: '',
};

const DEFAULT_PRIMARY_TAB = 'QUESTION_BANK';
const WRITING_PLACEHOLDER_SKILL = 'Viết';
const WRITING_PLACEHOLDER_MESSAGE =
  'Kỹ năng Viết hiện chỉ hiển thị ở mức placeholder vì tài liệu chưa mô tả chi tiết dạng câu hỏi. Có thể cấu hình thêm sau.';

const getSupportedQuestionFormats = (skill) => {
  if (skill === WRITING_PLACEHOLDER_SKILL) {
    return [];
  }

  return QUESTION_FORMATS_BY_SKILL[skill] || [];
};

const buildDefaultStructureForm = () => ({
  name: 'Đề đọc hiểu tổng hợp',
  level: 'IELTS',
  difficulty: 'Trung bình',
  skill: 'Đọc',
  durationMinutes: 45,
  totalScore: 10,
});

const createStructureRow = (skill, index = 0) => ({
  id: `STRUCT-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`,
  questionFormat: getSupportedQuestionFormats(skill)[index] || getSupportedQuestionFormats(skill)[0] || '',
  requiredCount: 1,
  scoreWeight: 0.5,
  sectionOrder: index + 1,
});

const createBankDraft = () => ({
  id: '',
  title: '',
  level: 'IELTS',
  difficulty: 'Trung bình',
  skill: 'Đọc',
  questionFormat: QUESTION_FORMATS_BY_SKILL['Đọc'][0],
  unit: '',
  childQuestionCount: 4,
  status: 'Sẵn sàng',
  description: '',
});

const buildDefaultStructureFormVi = () => ({
  name: 'Đề đọc hiểu tổng hợp',
  level: 'IELTS',
  difficulty: 'Trung bình',
  skill: 'Đọc',
  durationMinutes: 45,
  totalScore: 10,
});

const createBankDraftVi = () => ({
  id: '',
  title: '',
  level: 'IELTS',
  difficulty: 'Trung bình',
  skill: 'Đọc',
  questionFormat: QUESTION_FORMATS_BY_SKILL['Đọc'][0],
  unit: '',
  childQuestionCount: 4,
  status: 'Sẵn sàng',
  description: '',
});

const createDistributionDraft = (mode, item) => {
  const start = new Date();
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    mode,
    item,
    targetIds: [],
    startAt: toDateTimeLocalValue(start.toISOString()),
    endAt: toDateTimeLocalValue(end.toISOString()),
    durationMinutes: item?.durationMinutes || 30,
    attempts: 1,
    revealAnswers: false,
  };
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

function createGeneratedAssignment(exam) {
  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    type: 'Đề thi',
    level: exam.level,
    difficulty: exam.difficulty,
    skill: exam.skill,
    totalItems: exam.sections.reduce((sum, section) => sum + section.items.length, 0),
    durationMinutes: exam.durationMinutes,
    status: 'Đã sinh đề',
    createdAt: exam.createdAt,
    targetClasses: [],
    targetStudents: [],
    studentsDone: 0,
    averageScore: 0,
    structureName: exam.structureName,
  };
}

function shuffleList(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function ModalShell({ title, subtitle, onClose, children, footer, size = 'xl' }) {
  return (
    <div className="modal d-block admin-assignment-backdrop" tabIndex="-1" role="dialog">
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
      <div className="card border-0 shadow-sm h-100 admin-assignment-stat">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="small text-muted mb-2">{label}</div>
              <div className={`display-6 fw-bold text-${tone}`}>{value}</div>
              {helpText ? <div className="small text-muted mt-2">{helpText}</div> : null}
            </div>
            <div className={`admin-assignment-icon text-${tone}`}>
              <Icon size={22} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ meta, fallbackLabel }) {
  return <span className={`badge bg-${meta.tone}-subtle text-${meta.tone}`}>{meta.label || fallbackLabel}</span>;
}

function DeliveryFilterCard({ filters, onChange, onReset }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Loại nội dung</label>
            <select className="form-select" value={filters.type} onChange={(event) => onChange('type', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trình độ</label>
            <select className="form-select" value={filters.level} onChange={(event) => onChange('level', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Mức độ</label>
            <select className="form-select" value={filters.difficulty} onChange={(event) => onChange('difficulty', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Kỹ năng</label>
            <select className="form-select" value={filters.skill} onChange={(event) => onChange('skill', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {SKILL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trạng thái</label>
            <select className="form-select" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {DELIVERY_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Tìm kiếm</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} />
              </span>
              <input
                className="form-control border-start-0"
                value={filters.keyword}
                onChange={(event) => onChange('keyword', event.target.value)}
                placeholder="Tên bài tập/đề thi"
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

function BankFilterCard({ filters, units, onChange, onReset }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Trình độ</label>
            <select className="form-select" value={filters.level} onChange={(event) => onChange('level', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Mức độ</label>
            <select className="form-select" value={filters.difficulty} onChange={(event) => onChange('difficulty', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Kỹ năng</label>
            <select className="form-select" value={filters.skill} onChange={(event) => onChange('skill', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {SKILL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Dạng câu hỏi</label>
            <select className="form-select" value={filters.questionFormat} onChange={(event) => onChange('questionFormat', event.target.value)}>
              <option value="ALL">Tất cả</option>
              {SKILL_OPTIONS.flatMap((skill) => QUESTION_FORMATS_BY_SKILL[skill]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-xl-2">
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
          <div className="col-12 col-xl-2">
            <label className="form-label small fw-semibold text-muted">Từ khóa</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} />
              </span>
              <input
                className="form-control border-start-0"
                value={filters.keyword}
                onChange={(event) => onChange('keyword', event.target.value)}
                placeholder="Tìm tên bài tập"
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

const AdminAssignmentModule = () => {
  const [activeTab, setActiveTab] = useState(DEFAULT_PRIMARY_TAB);
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [bankItems, setBankItems] = useState(MOCK_BANK_ITEMS);
  const [deliveryFilters, setDeliveryFilters] = useState(emptyDeliveryFilters);
  const [bankFilters, setBankFilters] = useState(emptyBankFilters);
  const [wizardStep, setWizardStep] = useState(1);
  const [structureForm, setStructureForm] = useState(buildDefaultStructureFormVi);
  const [structureRows, setStructureRows] = useState([
    createStructureRow('Đọc', 0),
    { ...createStructureRow('Đọc', 1), requiredCount: 2, scoreWeight: 0.75 },
  ]);
  const [sourceFilters, setSourceFilters] = useState(emptySourceFilters);
  const [sourceSelections, setSourceSelections] = useState({});
  const [generatedExams, setGeneratedExams] = useState([]);
  const [generatorForm, setGeneratorForm] = useState({
    examCount: 3,
    shuffleSections: false,
    shuffleExercises: true,
    shuffleAnswers: true,
  });
  const [distributionDraft, setDistributionDraft] = useState(null);
  const [assignmentDetailItem, setAssignmentDetailItem] = useState(null);
  const [assignmentResultItem, setAssignmentResultItem] = useState(null);
  const [assignmentEditDraft, setAssignmentEditDraft] = useState(null);
  const [bankDetailItem, setBankDetailItem] = useState(null);
  const [bankDraft, setBankDraft] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPayload, setImportPayload] = useState(`[
  {
    "title": "Reading MCQ - Global Warming",
    "level": "IELTS",
    "difficulty": "Trung bình",
    "skill": "Đọc",
    "questionFormat": "Trắc nghiệm 1 đáp án",
    "unit": "Unit Demo",
    "childQuestionCount": 5,
    "status": "Sẵn sàng",
    "description": "Mock item import vào bank."
  }
]`);
  const [previewExam, setPreviewExam] = useState(null);

  useEffect(() => {
    setStructureForm(buildDefaultStructureFormVi());
    setStructureRows([
      createStructureRow('Đọc', 0),
      { ...createStructureRow('Đọc', 1), requiredCount: 2, scoreWeight: 0.75 },
    ]);
    setImportPayload(`[
  {
    "title": "Reading MCQ - Global Warming",
    "level": "IELTS",
    "difficulty": "Trung bình",
    "skill": "Đọc",
    "questionFormat": "Trắc nghiệm 1 đáp án",
    "unit": "Unit Demo",
    "childQuestionCount": 5,
    "status": "Sẵn sàng",
    "description": "Mock item import vào bank."
  }
]`);
  }, []);

  const isWritingSkillPlaceholder = structureForm.skill === WRITING_PLACEHOLDER_SKILL;
  const availableStructureFormats = useMemo(() => getSupportedQuestionFormats(structureForm.skill), [structureForm.skill]);

  const unitOptions = useMemo(
    () => [...new Set(bankItems.map((item) => item.unit).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [bankItems]
  );

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
    return {
      total: bankItems.length,
      ready: bankItems.filter((item) => item.status === 'Sẵn sàng').length,
      inUse: bankItems.filter((item) => item.status === 'Đang dùng').length,
      totalChildren: bankItems.reduce((sum, item) => sum + Number(item.childQuestionCount || 0), 0),
    };
  }, [bankItems]);

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
      const matchesSkill = deliveryFilters.skill === 'ALL' || item.skill === deliveryFilters.skill;
      const matchesStatus = deliveryFilters.status === 'ALL' || item.status === deliveryFilters.status;

      return matchesKeyword && matchesType && matchesLevel && matchesDifficulty && matchesSkill && matchesStatus;
    });
  }, [assignments, deliveryFilters]);

  const filteredBankItems = useMemo(() => {
    return bankItems.filter((item) => {
      const keyword = bankFilters.keyword.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword);

      const matchesLevel = bankFilters.level === 'ALL' || item.level === bankFilters.level;
      const matchesDifficulty = bankFilters.difficulty === 'ALL' || item.difficulty === bankFilters.difficulty;
      const matchesSkill = bankFilters.skill === 'ALL' || item.skill === bankFilters.skill;
      const matchesFormat = bankFilters.questionFormat === 'ALL' || item.questionFormat === bankFilters.questionFormat;
      const matchesUnit = bankFilters.unit === 'ALL' || item.unit === bankFilters.unit;

      return matchesKeyword && matchesLevel && matchesDifficulty && matchesSkill && matchesFormat && matchesUnit;
    });
  }, [bankFilters, bankItems]);

  const structureErrors = useMemo(() => {
    const errors = [];

    if (!structureForm.name.trim()) {
      errors.push('Cần nhập tên cấu trúc đề.');
    }

    if (!Number(structureForm.durationMinutes) || Number(structureForm.durationMinutes) <= 0) {
      errors.push('Thời gian làm bài phải lớn hơn 0.');
    }

    if (!Number(structureForm.totalScore) || Number(structureForm.totalScore) <= 0) {
      errors.push('Tổng điểm phải lớn hơn 0.');
    }

    if (isWritingSkillPlaceholder) {
      errors.push(WRITING_PLACEHOLDER_MESSAGE);
      return errors;
    }

    if (!structureRows.length) {
      errors.push('Cần có ít nhất 1 dạng câu hỏi trong cấu trúc đề.');
    }

    const rowErrors = structureRows.some(
      (row) =>
        !row.questionFormat ||
        !Number(row.requiredCount) ||
        Number(row.requiredCount) <= 0 ||
        !Number(row.scoreWeight) ||
        Number(row.scoreWeight) <= 0
    );

    if (rowErrors) {
      errors.push('Mỗi dòng cấu trúc đề phải có dạng câu hỏi, số bài tập và trọng số hợp lệ.');
    }

    return errors;
  }, [isWritingSkillPlaceholder, structureForm, structureRows]);

  const sourcePools = useMemo(() => {
    return Object.fromEntries(
      structureRows.map((row) => {
        const matched = bankItems.filter((item) => {
          const keyword = sourceFilters.keyword.trim().toLowerCase();
          const matchesKeyword =
            !keyword ||
            item.title.toLowerCase().includes(keyword) ||
            item.description.toLowerCase().includes(keyword);

          const matchesUnit = sourceFilters.unit === 'ALL' || item.unit === sourceFilters.unit;

          return (
            item.level === structureForm.level &&
            item.difficulty === structureForm.difficulty &&
            item.skill === structureForm.skill &&
            item.questionFormat === row.questionFormat &&
            matchesKeyword &&
            matchesUnit
          );
        });

        return [row.id, matched];
      })
    );
  }, [bankItems, sourceFilters, structureForm, structureRows]);

  const sourceValidation = useMemo(() => {
    return structureRows.map((row) => {
      const selected = sourceSelections[row.id] || [];
      const required = Number(row.requiredCount || 0);
      return {
        rowId: row.id,
        questionFormat: row.questionFormat,
        required,
        selected: selected.length,
        valid: selected.length > required,
      };
    });
  }, [sourceSelections, structureRows]);

  const sourceStepValid = useMemo(() => {
    if (isWritingSkillPlaceholder || !sourceValidation.length) {
      return false;
    }

    return sourceValidation.every((item) => item.valid);
  }, [isWritingSkillPlaceholder, sourceValidation]);

  const scoreFormulaPreview = useMemo(() => {
    const sampleRow = structureRows[0];
    if (!sampleRow) {
      return null;
    }

    const sampleTotalQuestions = Math.max(Number(sampleRow.requiredCount || 1) * 4, 4);
    const sampleCorrectQuestions = Math.max(sampleTotalQuestions - 2, 1);
    const sampleMaxScore = sampleTotalQuestions * Number(sampleRow.scoreWeight || 0);
    const sampleAchievedScore = sampleCorrectQuestions * Number(sampleRow.scoreWeight || 0);
    const finalScore = sampleMaxScore > 0 ? (sampleAchievedScore / sampleMaxScore) * 10 : 0;

    return {
      format: sampleRow.questionFormat,
      sampleTotalQuestions,
      sampleCorrectQuestions,
      sampleMaxScore,
      sampleAchievedScore,
      finalScore,
    };
  }, [structureRows]);

  const changeDeliveryFilter = (field, value) => {
    setDeliveryFilters((prev) => ({ ...prev, [field]: value }));
  };

  const changeBankFilter = (field, value) => {
    setBankFilters((prev) => ({ ...prev, [field]: value }));
  };

  const changeSourceFilter = (field, value) => {
    setSourceFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openDistributionModal = (mode, item) => {
    setDistributionDraft(createDistributionDraft(mode, item));
  };

  const closeDistributionModal = () => {
    setDistributionDraft(null);
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

  const confirmDistribution = () => {
    if (!distributionDraft?.targetIds.length) {
      toast.error('Hãy chọn ít nhất 1 lớp học hoặc học sinh.');
      return;
    }

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === distributionDraft.item.id
          ? {
              ...item,
              status: 'Đã giao',
              durationMinutes: Number(distributionDraft.durationMinutes || item.durationMinutes),
              targetClasses:
                distributionDraft.mode === 'CLASS' ? distributionDraft.targetIds : item.targetClasses || [],
              targetStudents:
                distributionDraft.mode === 'STUDENT' ? distributionDraft.targetIds : item.targetStudents || [],
              assignmentWindow: {
                startAt: distributionDraft.startAt,
                endAt: distributionDraft.endAt,
                attempts: Number(distributionDraft.attempts || 1),
                revealAnswers: Boolean(distributionDraft.revealAnswers),
              },
            }
          : item
      )
    );

    toast.success('Đã xác nhận giao bài thành công.');
    closeDistributionModal();
  };

  const saveAssignmentEdit = () => {
    if (!assignmentEditDraft?.title.trim()) {
      toast.error('Tên bài tập/đề thi không được để trống.');
      return;
    }

    setAssignments((prev) =>
      prev.map((item) => (item.id === assignmentEditDraft.id ? { ...assignmentEditDraft } : item))
    );
    setAssignmentEditDraft(null);
    toast.success('Đã cập nhật thông tin bài tập/đề thi.');
  };

  const deleteAssignment = (assignmentId) => {
    const shouldDelete = window.confirm('Bạn có chắc muốn xóa bài tập/đề thi này?');
    if (!shouldDelete) {
      return;
    }

    setAssignments((prev) => prev.filter((item) => item.id !== assignmentId));
    setGeneratedExams((prev) => prev.filter((item) => item.id !== assignmentId));
    toast.success('Đã xóa bài tập/đề thi.');
  };

  const openBankCreate = () => {
    setBankDraft(createBankDraftVi());
  };

  const openBankEdit = (item) => {
    setBankDraft({ ...item });
  };

  const saveBankDraft = () => {
    if (!bankDraft?.title.trim()) {
      toast.error('Cần nhập tên bài tập gốc.');
      return;
    }

    if (!bankDraft.unit.trim()) {
      toast.error('Cần nhập Unit/Bài học.');
      return;
    }

    const normalized = {
      ...bankDraft,
      id: bankDraft.id || `BANK-${Date.now()}`,
      childQuestionCount: Number(bankDraft.childQuestionCount || 0),
    };

    setBankItems((prev) => {
      const exists = prev.some((item) => item.id === normalized.id);
      if (exists) {
        return prev.map((item) => (item.id === normalized.id ? normalized : item));
      }

      return [normalized, ...prev];
    });

    setBankDraft(null);
    toast.success(normalized.id.startsWith('BANK-') && !MOCK_BANK_ITEMS.some((item) => item.id === normalized.id) ? 'Đã thêm bài tập gốc.' : 'Đã lưu thông tin bài tập gốc.');
  };

  const importBankItems = () => {
    try {
      const parsed = JSON.parse(importPayload);
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error('Payload import phai la mot mang item khong rong.');
      }

      const nextItems = parsed.map((item, index) => ({
        id: item.id || `BANK-IMP-${Date.now()}-${index + 1}`,
        title: item.title || `Bài tập import ${index + 1}`,
        level: item.level || 'IELTS',
        difficulty: item.difficulty || 'Trung bình',
        skill: item.skill || 'Đọc',
        questionFormat: item.questionFormat || QUESTION_FORMATS_BY_SKILL[item.skill || 'Đọc']?.[0] || 'Trắc nghiệm 1 đáp án',
        unit: item.unit || 'Unit Import',
        childQuestionCount: Number(item.childQuestionCount || 1),
        status: item.status || 'Sẵn sàng',
        description: item.description || 'Dữ liệu import từ payload mock.',
      }));

      setBankItems((prev) => [...nextItems, ...prev]);
      setImportModalOpen(false);
      toast.success(`Đã import ${nextItems.length} bài tập vào ngân hàng.`);
    } catch (error) {
      toast.error(error.message || 'Không thể import dữ liệu.');
    }
  };

  const handleSkillChange = (skill) => {
    setStructureForm((prev) => ({ ...prev, skill }));
    setStructureRows(skill === WRITING_PLACEHOLDER_SKILL ? [] : [createStructureRow(skill, 0)]);
    setSourceSelections({});
    setGeneratedExams([]);
  };

  const addStructureRow = () => {
    if (isWritingSkillPlaceholder) {
      return;
    }

    setStructureRows((prev) => [...prev, createStructureRow(structureForm.skill, prev.length)]);
  };

  const updateStructureRow = (rowId, field, value) => {
    setStructureRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]:
                field === 'requiredCount' || field === 'scoreWeight' || field === 'sectionOrder'
                  ? Number(value)
                  : value,
            }
          : row
      )
    );
    setSourceSelections((prev) => ({ ...prev, [rowId]: prev[rowId] || [] }));
  };

  const removeStructureRow = (rowId) => {
    setStructureRows((prev) => prev.filter((row) => row.id !== rowId));
    setSourceSelections((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const saveStructure = () => {
    if (isWritingSkillPlaceholder) {
      toast(WRITING_PLACEHOLDER_MESSAGE);
      return;
    }

    if (structureErrors.length) {
      toast.error(structureErrors[0]);
      return;
    }

    toast.success('Đã lưu cấu trúc đề.');
  };

  const continueToSourceStep = () => {
    if (structureErrors.length) {
      toast.error(structureErrors[0]);
      return;
    }

    setWizardStep(3);
  };

  const toggleSourceSelection = (rowId, itemId) => {
    setSourceSelections((prev) => {
      const current = prev[rowId] || [];
      const next = current.includes(itemId)
        ? current.filter((item) => item !== itemId)
        : [...current, itemId];

      return { ...prev, [rowId]: next };
    });
  };

  const saveSourceBank = () => {
    if (!sourceStepValid) {
      toast.error('Với mỗi dạng câu hỏi, số bài tập nguồn B phải lớn hơn số lượng A cần lấy.');
      return;
    }

    toast.success('Đã lưu ngân hàng gốc cho quy trình sinh đề.');
  };

  const goToStep = (targetStep) => {
    if (targetStep <= wizardStep) {
      setWizardStep(targetStep);
      return;
    }

    if (targetStep === 2) {
      setWizardStep(targetStep);
      return;
    }

    if (targetStep === 3) {
      if (structureErrors.length) {
        toast.error(structureErrors[0]);
        return;
      }

      setWizardStep(targetStep);
      return;
    }

    if (targetStep === 4) {
      if (structureErrors.length) {
        toast.error(structureErrors[0]);
        return;
      }

      if (!sourceStepValid) {
        toast.error('Cần chọn ngân hàng gốc sao cho B > A trước khi sang bước sinh đề.');
        return;
      }

      setWizardStep(targetStep);
    }
  };

  const generateExams = () => {
    if (!sourceStepValid) {
      toast.error('Nguồn random chưa hợp lệ. Mỗi dạng câu hỏi phải có B > A trước khi sinh đề.');
      return;
    }

    const examCount = Number(generatorForm.examCount || 0);
    if (!examCount || examCount <= 0) {
      toast.error('Số lượng đề cần sinh phải lớn hơn 0.');
      return;
    }

    const batchSeed = Date.now();
    const exams = Array.from({ length: examCount }, (_, examIndex) => {
      const rawSections = structureRows.map((row) => {
        const selectedIds = sourceSelections[row.id] || [];
        const selectedItems = bankItems.filter((item) => selectedIds.includes(item.id));
        const pickedItems = shuffleList(selectedItems).slice(0, Number(row.requiredCount || 0));

        return {
          rowId: row.id,
          questionFormat: row.questionFormat,
          requiredCount: Number(row.requiredCount || 0),
          scoreWeight: Number(row.scoreWeight || 0),
          sectionOrder: Number(row.sectionOrder || 0),
          items: generatorForm.shuffleExercises ? shuffleList(pickedItems) : pickedItems,
          sectionMaxScore: pickedItems.reduce(
            (sum, item) => sum + Number(item.childQuestionCount || 0) * Number(row.scoreWeight || 0),
            0
          ),
        };
      });

      const sections = generatorForm.shuffleSections
        ? shuffleList(rawSections)
        : [...rawSections].sort((first, second) => first.sectionOrder - second.sectionOrder);

      return {
        id: `GEN-${batchSeed}-${examIndex + 1}`,
        code: `DE-${String(batchSeed).slice(-5)}-${examIndex + 1}`,
        title: `${structureForm.name} - De ${examIndex + 1}`,
        structureName: structureForm.name,
        level: structureForm.level,
        difficulty: structureForm.difficulty,
        skill: structureForm.skill,
        totalScore: Number(structureForm.totalScore || 10),
        durationMinutes: Number(structureForm.durationMinutes || 0),
        createdAt: new Date().toISOString(),
        shuffleAnswers: Boolean(generatorForm.shuffleAnswers),
        sections,
      };
    });

    setGeneratedExams(exams);
    setAssignments((prev) => {
      const base = prev.filter((item) => !exams.some((exam) => exam.id === item.id));
      return [...exams.map(createGeneratedAssignment), ...base];
    });
    toast.success(`Đã sinh ${exams.length} đề hoàn chỉnh và lưu cố định.`);
  };

  const deleteGeneratedExam = (examId) => {
    setGeneratedExams((prev) => prev.filter((item) => item.id !== examId));
    setAssignments((prev) => prev.filter((item) => item.id !== examId));
    toast.success('Đã xóa đề đã sinh.');
  };

  const distributionTargets = useMemo(() => {
    if (!distributionDraft?.item) {
      return [];
    }

    if (distributionDraft.mode === 'CLASS') {
      return MOCK_CLASSES.filter((item) => item.level === distributionDraft.item.level);
    }

    return MOCK_STUDENTS.filter((item) => item.level === distributionDraft.item.level);
  }, [distributionDraft]);

  return (
    <div className="admin-assignment-module">
      <Toaster position="top-right" />

      <div className="container-fluid px-4 py-4">
        <div className="admin-assignment-hero mb-4">
          <div className="admin-assignment-eyebrow">Mô tả chức năng sinh đề từ ngân hàng đề</div>
          <h2 className="fw-bold mb-2">Quản lý bài tập và đề thi</h2>
          <p className="admin-assignment-hero-copy mb-0">
            Trọng tâm của màn hình là quản lý ngân hàng bài tập, tạo cấu trúc đề, chọn nguồn random theo quy tắc B &gt; A
            và sinh đề cố định để không random lại khi học sinh mở đề.
          </p>
        </div>

        <div className="admin-assignment-tabs mb-4">
          {TAB_OPTIONS.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`admin-assignment-tab ${active ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="admin-assignment-tab-copy">
                  <div className="fw-semibold">{tab.label}</div>
                  <div className="small text-muted">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="row g-3 mb-4">
          {[
            { label: 'Bộ lọc ngân hàng', value: 'Trình độ, mức độ, kỹ năng, dạng câu hỏi' },
            { label: 'Cấu trúc đề', value: 'Khai báo số lượng A cho từng dạng câu hỏi' },
            { label: 'Nguồn random', value: 'Mỗi dạng câu hỏi bắt buộc có B > A' },
            { label: 'Đề đã sinh', value: 'Lưu cố định, không random lại khi học sinh mở đề' },
          ].map((item) => (
            <div key={item.label} className="col-md-6 col-xl-3">
              <div className="admin-summary-chip h-100">
                <div className="small text-muted">{item.label}</div>
                <div className="fw-semibold mt-1">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {activeTab === 'DELIVERY' ? (
          <>
            <div className="row g-3 mb-4">
              <StatCard icon={BookOpen} label="Tổng bài tập/đề thi" value={deliveryStats.total} tone="primary" helpText="Tất cả nội dung đang được quản lý." />
              <StatCard icon={Send} label="Đã giao" value={deliveryStats.delivered} tone="success" helpText="Đã có lịch giao bài đến lớp/học sinh." />
              <StatCard icon={ClipboardCheck} label="Chưa giao" value={deliveryStats.notDelivered} tone="warning" helpText="Nháp hoặc đã sinh đề nhưng chưa giao." />
              <StatCard icon={Users} label="Học sinh đã làm" value={deliveryStats.studentsDone} tone="info" helpText="Tổng lượt học sinh đã nộp bài." />
              <StatCard icon={BarChart3} label="Điểm trung bình" value={deliveryStats.averageScore.toFixed(1)} tone="danger" helpText="Trung bình trên các bài đã có điểm." />
            </div>

            <DeliveryFilterCard
              filters={deliveryFilters}
              onChange={changeDeliveryFilter}
              onReset={() => setDeliveryFilters(emptyDeliveryFilters)}
            />

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Danh sách bài tập/đề thi</h5>
                  <div className="small text-muted">{filteredAssignments.length} mục phù hợp bộ lọc hiện tại.</div>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('QUESTION_BANK')}>
                  <Sparkles size={16} className="me-2" />
                  Sang tab sinh đề
                </button>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-uppercase text-muted">
                      <th className="ps-4">Ma</th>
                      <th>Tên bài tập/đề thi</th>
                      <th>Loại</th>
                      <th>Trình độ</th>
                      <th>Mức độ</th>
                      <th>Kỹ năng</th>
                      <th className="text-center">Số câu / bài</th>
                      <th className="text-center">Thời gian</th>
                      <th className="text-center">Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((item) => (
                      <tr key={item.id}>
                        <td className="ps-4 fw-semibold">{item.code}</td>
                        <td>
                          <div className="fw-semibold">{item.title}</div>
                          <div className="small text-muted">
                            {item.targetClasses?.length ? `${item.targetClasses.length} lớp đã nhận` : 'Chưa gán lớp'} ·{' '}
                            {item.targetStudents?.length ? `${item.targetStudents.length} học sinh lẻ` : 'Không có học sinh lẻ'}
                          </div>
                        </td>
                        <td>{item.type}</td>
                        <td>{item.level}</td>
                        <td>{item.difficulty}</td>
                        <td>{item.skill}</td>
                        <td className="text-center">{item.totalItems}</td>
                        <td className="text-center">{item.durationMinutes} phút</td>
                        <td className="text-center">
                          <StatusBadge meta={DELIVERY_STATUS_META[item.status] || DELIVERY_STATUS_META['Nháp']} fallbackLabel={item.status} />
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td className="text-center">
                          <div className="d-flex flex-wrap justify-content-center gap-2 admin-assignment-action-grid">
                            <button className="btn btn-sm btn-light border" onClick={() => setAssignmentDetailItem(item)}>
                              <Eye size={14} className="me-1" />
                              Xem chi tiết
                            </button>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openDistributionModal('CLASS', item)}>
                              <Users size={14} className="me-1" />
                              Giao lớp
                            </button>
                            <button className="btn btn-sm btn-outline-info" onClick={() => openDistributionModal('STUDENT', item)}>
                              <User size={14} className="me-1" />
                              Giao học sinh
                            </button>
                            <button className="btn btn-sm btn-outline-success" onClick={() => setAssignmentResultItem(item)}>
                              <BarChart3 size={14} className="me-1" />
                              Kết quả
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setAssignmentEditDraft({ ...item })}>
                              <Pencil size={14} className="me-1" />
                              Sửa
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAssignment(item.id)}>
                              <Trash2 size={14} className="me-1" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!filteredAssignments.length ? (
                      <tr>
                        <td colSpan="11" className="text-center py-5 text-muted">
                          Không có bài tập/đề thi nào phù hợp bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <StatCard icon={Layers3} label="Tổng bài tập gốc" value={bankStats.total} tone="primary" helpText="Tất cả bài tập trong bank gốc." />
              <StatCard icon={CheckCircle2} label="Sẵn sàng" value={bankStats.ready} tone="success" helpText="Có thể đưa vào cấu trúc đề ngay." />
              <StatCard icon={FileStack} label="Đang dùng" value={bankStats.inUse} tone="info" helpText="Đang nằm trong nguồn random hoặc đề đã sinh." />
              <StatCard icon={ListChecks} label="Tổng câu hỏi con" value={bankStats.totalChildren} tone="warning" helpText="Tổng số câu con thuộc bank gốc." />
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="admin-stepper">
                  {STEP_OPTIONS.map((step, index) => {
                    const active = wizardStep === step.id;
                    const complete = wizardStep > step.id;

                    return (
                      <React.Fragment key={step.id}>
                        <button
                          type="button"
                          className={`admin-stepper-item ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                          onClick={() => goToStep(step.id)}
                        >
                          <div className="admin-stepper-index">{step.id}</div>
                          <div className="text-start">
                            <div className="fw-semibold">{step.title}</div>
                            <div className="small text-muted">{step.caption}</div>
                          </div>
                        </button>
                        {index < STEP_OPTIONS.length - 1 ? (
                          <div className="admin-stepper-arrow">
                            <ChevronRight size={18} />
                          </div>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {wizardStep === 1 ? (
              <>
                <BankFilterCard
                  filters={bankFilters}
                  units={unitOptions}
                  onChange={changeBankFilter}
                  onReset={() => setBankFilters(emptyBankFilters)}
                />

                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">Bước 1. Quản lý ngân hàng bài tập gốc</h5>
                      <div className="small text-muted">Quản lý bài tập gốc theo trình độ, kỹ năng, dạng câu hỏi và unit.</div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn btn-outline-success" onClick={() => setImportModalOpen(true)}>
                        <Upload size={16} className="me-2" />
                        Import bài tập
                      </button>
                      <button className="btn btn-primary" onClick={openBankCreate}>
                        <Plus size={16} className="me-2" />
                        Thêm bài tập
                      </button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase text-muted">
                          <th className="ps-4">Mã bài tập</th>
                          <th>Tên bài tập</th>
                          <th>Trình độ</th>
                          <th>Mức độ</th>
                          <th>Kỹ năng</th>
                          <th>Dạng câu hỏi</th>
                          <th>Unit</th>
                          <th className="text-center">Số câu con</th>
                          <th className="text-center">Trạng thái</th>
                          <th className="text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBankItems.map((item) => (
                          <tr key={item.id}>
                            <td className="ps-4 fw-semibold">{item.id}</td>
                            <td>
                              <div className="fw-semibold">{item.title}</div>
                              <div className="small text-muted">{item.description}</div>
                            </td>
                            <td>{item.level}</td>
                            <td>{item.difficulty}</td>
                            <td>{item.skill}</td>
                            <td>{item.questionFormat}</td>
                            <td>{item.unit}</td>
                            <td className="text-center">{item.childQuestionCount}</td>
                            <td className="text-center">
                              <StatusBadge meta={BANK_STATUS_META[item.status] || BANK_STATUS_META['Nháp']} fallbackLabel={item.status} />
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <button className="btn btn-sm btn-light border" onClick={() => setBankDetailItem(item)}>
                                  <Eye size={14} className="me-1" />
                                  Xem chi tiết
                                </button>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => openBankEdit(item)}>
                                  <Pencil size={14} className="me-1" />
                                  Sửa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {!filteredBankItems.length ? (
                          <tr>
                            <td colSpan="10" className="text-center py-5 text-muted">
                              Chưa có bài tập gốc nào phù hợp bộ lọc hiện tại.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <div className="card-footer bg-white border-0 d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={() => goToStep(2)}>
                      Tiếp tục tạo cấu trúc đề
                      <ChevronRight size={16} className="ms-2" />
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {wizardStep === 2 ? (
              <div className="row g-4">
                <div className="col-lg-8">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h5 className="fw-bold mb-1">Bước 2. Tạo cấu trúc đề</h5>
                      <div className="small text-muted">Khai báo tên cấu trúc, bộ lọc nghiệp vụ và bảng các phần trong đề.</div>
                    </div>
                    <div className="card-body">
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Tên cấu trúc đề</label>
                          <input
                            className="form-control"
                            value={structureForm.name}
                            onChange={(event) => setStructureForm((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Trình độ</label>
                          <select
                            className="form-select"
                            value={structureForm.level}
                            onChange={(event) => setStructureForm((prev) => ({ ...prev, level: event.target.value }))}
                          >
                            {LEVEL_OPTIONS.map((option) => (
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
                            value={structureForm.difficulty}
                            onChange={(event) => setStructureForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                          >
                            {DIFFICULTY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Kỹ năng</label>
                          <select className="form-select" value={structureForm.skill} onChange={(event) => handleSkillChange(event.target.value)}>
                            {SKILL_OPTIONS.map((option) => (
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
                            onChange={(event) => setStructureForm((prev) => ({ ...prev, totalScore: Number(event.target.value) }))}
                          />
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <h6 className="fw-bold mb-1">Bảng cấu trúc đề</h6>
                          <div className="small text-muted">Mỗi dòng là 1 phần trong đề theo đúng dạng câu hỏi của kỹ năng đã chọn.</div>
                        </div>
                        <button className="btn btn-outline-primary" onClick={addStructureRow} disabled={isWritingSkillPlaceholder}>
                          <Plus size={16} className="me-2" />
                          Thêm dạng câu hỏi
                        </button>
                      </div>

                      {isWritingSkillPlaceholder ? (
                        <div className="alert alert-warning border mb-0">
                          <div className="fw-semibold mb-2">Kỹ năng Viết đang ở mức placeholder</div>
                          <div className="small mb-2">
                            Tài liệu hiện chưa mô tả chi tiết dạng câu hỏi cho kỹ năng Viết, nên bước tạo cấu trúc đề chỉ dừng ở mức cấu hình placeholder.
                          </div>
                          <div className="small text-muted mb-0">
                            Bạn vẫn có thể chọn trình độ, mức độ và kỹ năng. Phần chọn dạng câu hỏi, chọn nguồn random và sinh đề cho Viết sẽ cấu hình bổ sung sau.
                          </div>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table align-middle">
                            <thead className="table-light">
                              <tr className="small text-uppercase text-muted">
                                <th>Dạng câu hỏi</th>
                                <th className="text-center">Số bài tập cần lấy</th>
                                <th className="text-center">Trọng số điểm</th>
                                <th className="text-center">Thứ tự phần</th>
                                <th className="text-center">Xóa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {structureRows.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <select
                                      className="form-select"
                                      value={row.questionFormat}
                                      onChange={(event) => updateStructureRow(row.id, 'questionFormat', event.target.value)}
                                    >
                                      {availableStructureFormats.map((option) => (
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
                                      step="0.05"
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
                      )}

                      {structureErrors.length ? (
                        <div className="alert alert-danger mt-3 mb-0">
                          <div className="fw-semibold mb-2">Cần xử lý trước khi sang bước tiếp theo</div>
                          <ul className="mb-0 ps-3">
                            {structureErrors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                    <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between gap-2">
                      <button className="btn btn-light border" onClick={() => goToStep(1)}>
                        Quay lại bank gốc
                      </button>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary" onClick={saveStructure}>
                          <Settings2 size={16} className="me-2" />
                          Lưu cấu trúc đề
                        </button>
                        <button className="btn btn-primary" onClick={continueToSourceStep} disabled={isWritingSkillPlaceholder}>
                          Tiếp tục
                          <ChevronRight size={16} className="ms-2" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white border-0">
                      <h6 className="fw-bold mb-0">
                        <Target size={16} className="me-2" />
                        Bảng dạng câu hỏi theo kỹ năng
                      </h6>
                    </div>
                    <div className="card-body">
                      {isWritingSkillPlaceholder ? (
                        <div className="alert alert-light border mb-0">
                          <div className="fw-semibold mb-2">Placeholder kỹ năng Viết</div>
                          <div className="small text-muted mb-0">
                            Tạm thời chưa hiển thị danh sách dạng câu hỏi cho kỹ năng Viết theo đúng tài liệu hiện có. Phần này sẽ cấu hình sau.
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {availableStructureFormats.map((format) => (
                            <div key={format} className="admin-chip">
                              {format}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h6 className="fw-bold mb-0">
                        <BarChart3 size={16} className="me-2" />
                        Cách tính điểm
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="small text-muted mb-3">
                        Giáo viên nhập trọng số cho từng phần. Hệ thống tính:
                      </div>
                      <div className="admin-formula">
                        Điểm đạt được = tổng số câu đúng của từng phần * trọng số phần đó
                      </div>
                      <div className="admin-formula">
                        Điểm tối đa = tổng số câu của từng phần * trọng số phần đó
                      </div>
                      <div className="admin-formula">
                        Điểm cuối cùng = (Điểm đạt được / Điểm tối đa) * 10
                      </div>

                      {scoreFormulaPreview ? (
                        <div className="alert alert-light border mt-3 mb-0">
                          <div className="fw-semibold mb-2">Ví dụ nhỏ</div>
                          <div className="small text-muted mb-2">Phần: {scoreFormulaPreview.format}</div>
                          <div className="small">
                            Học sinh đúng {scoreFormulaPreview.sampleCorrectQuestions}/{scoreFormulaPreview.sampleTotalQuestions} câu.
                          </div>
                          <div className="small">
                            Điểm đạt được = {scoreFormulaPreview.sampleCorrectQuestions} * {structureRows[0]?.scoreWeight || 0} ={' '}
                            {scoreFormulaPreview.sampleAchievedScore.toFixed(2)}
                          </div>
                          <div className="small">
                            Điểm tối đa = {scoreFormulaPreview.sampleTotalQuestions} * {structureRows[0]?.scoreWeight || 0} ={' '}
                            {scoreFormulaPreview.sampleMaxScore.toFixed(2)}
                          </div>
                          <div className="small fw-semibold mt-2">Điểm cuối = {scoreFormulaPreview.finalScore.toFixed(2)}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">Bước 3. Chọn ngân hàng gốc để sinh đề</h5>
                      <div className="small text-muted">
                        Hệ thống chỉ hiển thị bài tập phù hợp với trình độ, mức độ, kỹ năng và dạng câu hỏi đã chọn trong cấu trúc đề.
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn btn-light border" onClick={() => goToStep(2)}>
                        Quay lại cấu trúc đề
                      </button>
                      <button className="btn btn-primary" onClick={() => goToStep(4)} disabled={!sourceStepValid}>
                        Sang bước sinh đề
                        <ChevronRight size={16} className="ms-2" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="admin-summary-chip">
                        <div className="small text-muted">Cấu trúc đề</div>
                        <div className="fw-semibold">{structureForm.name}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-summary-chip">
                        <div className="small text-muted">Trình độ / Kỹ năng</div>
                        <div className="fw-semibold">
                          {structureForm.level} · {structureForm.skill}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-summary-chip">
                        <div className="small text-muted">Mức độ</div>
                        <div className="fw-semibold">{structureForm.difficulty}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="admin-summary-chip">
                        <div className="small text-muted">Tổng phần / Tổng điểm</div>
                        <div className="fw-semibold">
                          {structureRows.length} phần · {structureForm.totalScore} điểm
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tìm kiếm nguồn random</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0">
                          <Search size={16} />
                        </span>
                        <input
                          className="form-control border-start-0"
                          value={sourceFilters.keyword}
                          onChange={(event) => changeSourceFilter('keyword', event.target.value)}
                          placeholder="Tên bài tập gốc"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold text-muted">Unit/Bài học</label>
                      <select className="form-select" value={sourceFilters.unit} onChange={(event) => changeSourceFilter('unit', event.target.value)}>
                        <option value="ALL">Tất cả</option>
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-5 d-flex align-items-end justify-content-end">
                      <button className="btn btn-outline-primary me-2" onClick={saveSourceBank}>
                        <Settings2 size={16} className="me-2" />
                        Lưu ngân hàng gốc
                      </button>
                      <button className="btn btn-light border" onClick={() => setSourceFilters(emptySourceFilters)}>
                        <Filter size={16} className="me-2" />
                        Đặt lại
                      </button>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-4">
                    {structureRows.map((row) => {
                      const selectedIds = sourceSelections[row.id] || [];
                      const pool = sourcePools[row.id] || [];
                      const requirement = sourceValidation.find((item) => item.rowId === row.id);

                      return (
                        <div key={row.id} className="admin-source-block">
                          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                            <div>
                              <div className="fw-semibold">{row.questionFormat}</div>
                              <div className="small text-muted">
                                Cần lấy A = {row.requiredCount} bài tập. Đã chọn B = {selectedIds.length} bài tập làm nguồn random. Bắt buộc B &gt; A.
                              </div>
                            </div>
                            <div>
                              {requirement?.valid ? (
                                <span className="badge bg-success-subtle text-success">B &gt; A, đủ nguồn random</span>
                              ) : (
                                <span className="badge bg-danger-subtle text-danger">B &lt;= A, chưa đạt điều kiện sinh đề</span>
                              )}
                            </div>
                          </div>

                          {pool.length ? (
                            <div className="row g-3">
                              {pool.map((item) => {
                                const checked = selectedIds.includes(item.id);

                                return (
                                  <div key={item.id} className="col-lg-4 col-md-6">
                                    <label className={`admin-source-card ${checked ? 'is-selected' : ''}`}>
                                      <div className="d-flex justify-content-between align-items-start gap-2">
                                        <input
                                          type="checkbox"
                                          className="form-check-input mt-1"
                                          checked={checked}
                                          onChange={() => toggleSourceSelection(row.id, item.id)}
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-light border"
                                          onClick={() => setBankDetailItem(item)}
                                        >
                                          <Eye size={14} />
                                        </button>
                                      </div>
                                      <div className="fw-semibold mt-3">{item.title}</div>
                                      <div className="small text-muted mt-2">
                                        {item.unit} · {item.childQuestionCount} câu con
                                      </div>
                                      <div className="d-flex flex-wrap gap-2 mt-3">
                                        <span className="badge text-bg-light border">{item.level}</span>
                                        <span className="badge text-bg-light border">{item.difficulty}</span>
                                        <span className="badge text-bg-light border">{item.skill}</span>
                                      </div>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="alert alert-warning mb-0">
                              Chưa có bài tập nào trong bank gốc phù hợp với bộ lọc nghiệp vụ và dạng câu hỏi này.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!sourceStepValid ? (
                    <div className="alert alert-danger mt-4 mb-0">
                      Có ít nhất 1 dạng câu hỏi chưa thỏa điều kiện B &gt; A. Hệ thống sẽ khóa bước sinh đề cho đến khi mỗi nguồn random đều có số bài tập B lớn hơn số lượng A cần lấy.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {wizardStep === 4 ? (
              <div className="row g-4">
                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h5 className="fw-bold mb-1">Bước 4. Sinh đề tự động</h5>
                      <div className="small text-muted">
                        Mỗi đề sẽ random một lần từ ngân hàng gốc đã chọn, sau đó lưu cố định và không random lại khi học sinh mở đề.
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
                        <label className="admin-toggle-row">
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
                        <label className="admin-toggle-row">
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
                        <label className="admin-toggle-row">
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

                      <div className="admin-generation-rules mt-4">
                        <div className="fw-semibold mb-2">Quy tắc sinh đề</div>
                        <div className="small text-muted">
                          Với mỗi dạng câu hỏi, hệ thống chỉ sinh đề khi B lớn hơn A. Sau đó hệ thống random A bài tập từ B bài tập đã chọn, ghép các phần lại thành đề hoàn chỉnh và lưu cố định.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-8">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
                      <div>
                        <h5 className="fw-bold mb-1">Preview đề đã sinh</h5>
                        <div className="small text-muted">
                          {generatedExams.length
                            ? `${generatedExams.length} đề đã được tạo và lưu cố định.`
                            : 'Chưa có đề nào được sinh. Hãy bấm "Sinh đề" để tạo preview.'}
                        </div>
                      </div>
                      <button className="btn btn-light border" onClick={() => goToStep(3)}>
                        Quay lại nguồn random
                      </button>
                    </div>
                    <div className="card-body">
                      {generatedExams.length ? (
                        <div className="d-flex flex-column gap-3">
                          {generatedExams.map((exam) => (
                            <div key={exam.id} className="admin-generated-card">
                              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                                <div>
                                  <div className="small text-uppercase text-muted">{exam.code}</div>
                                  <div className="fw-bold fs-5">{exam.title}</div>
                                  <div className="small text-muted">
                                    {exam.level} · {exam.difficulty} · {exam.skill} · {exam.durationMinutes} phút
                                  </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                  <button className="btn btn-sm btn-light border" onClick={() => setPreviewExam(exam)}>
                                    <Eye size={14} className="me-1" />
                                    Xem de
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => {
                                      setWizardStep(2);
                                      toast('Đang mở lại bước cấu trúc đề để chỉnh sửa.');
                                    }}
                                  >
                                    <Pencil size={14} className="me-1" />
                                    Chỉnh sửa
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                      const linkedAssignment = assignments.find((item) => item.id === exam.id) || createGeneratedAssignment(exam);
                                      if (!assignments.some((item) => item.id === exam.id)) {
                                        setAssignments((prev) => [linkedAssignment, ...prev]);
                                      }
                                      openDistributionModal('CLASS', linkedAssignment);
                                    }}
                                  >
                                    <Send size={14} className="me-1" />
                                    Giao đề
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
                                    <div className="admin-generated-section">
                                      <div className="d-flex justify-content-between align-items-start gap-2">
                                        <div>
                                          <div className="small text-muted">Phần {index + 1}</div>
                                          <div className="fw-semibold">{section.questionFormat}</div>
                                        </div>
                                        <span className="badge text-bg-light border">{section.items.length} bài tập</span>
                                      </div>
                                      <div className="small text-muted mt-3">
                                        Trọng số {section.scoreWeight} · Điểm tối đa {section.sectionMaxScore.toFixed(2)}
                                      </div>
                                      <ul className="small mb-0 mt-3 ps-3">
                                        {section.items.map((item) => (
                                          <li key={item.id}>{item.title}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-empty-state">
                          <FileText size={28} className="mb-3 text-muted" />
                          <div className="fw-semibold mb-2">Chưa có đề nào được sinh</div>
                          <div className="text-muted">
                            Sau khi bấm "Sinh đề", hệ thống sẽ tạo danh sách Đề 1, Đề 2, Đề 3... và lưu cố định từng đề.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {distributionDraft ? (
        <ModalShell
          title={distributionDraft.mode === 'CLASS' ? 'Giao cho lớp học' : 'Giao cho học sinh'}
          subtitle={distributionDraft.item.title}
          onClose={closeDistributionModal}
          footer={
            <>
              <button className="btn btn-light border" onClick={closeDistributionModal}>
                Huy
              </button>
              <button className="btn btn-primary" onClick={confirmDistribution}>
                Xác nhận giao bài
              </button>
            </>
          }
        >
          <div className="row g-4">
            <div className="col-lg-6">
              <h6 className="fw-bold mb-3">{distributionDraft.mode === 'CLASS' ? 'Chọn lớp học' : 'Chọn học sinh'}</h6>
              <div className="d-flex flex-column gap-2 admin-scroll-panel">
                {distributionTargets.map((target) => (
                  <label key={target.id} className="admin-target-card">
                    <div>
                      <div className="fw-semibold">{target.name}</div>
                      {'teacher' in target ? (
                        <div className="small text-muted">
                          {target.teacher} · {target.students} học viên
                        </div>
                      ) : (
                        <div className="small text-muted">
                          {MOCK_CLASSES.find((item) => item.id === target.classId)?.name || 'Học sinh ngoài danh sách lớp'}
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
                ))}
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
                  <label className="form-label fw-semibold">Số lần được làm</label>
                  <input
                    type="number"
                    className="form-control"
                    value={distributionDraft.attempts}
                    onChange={(event) => setDistributionDraft((prev) => ({ ...prev, attempts: Number(event.target.value) }))}
                  />
                </div>
                <div className="col-12">
                  <label className="admin-toggle-row border rounded-3 px-3 py-2">
                    <span>Có hiển thị đáp án sau khi nộp hay không</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={distributionDraft.revealAnswers}
                      onChange={(event) => setDistributionDraft((prev) => ({ ...prev, revealAnswers: event.target.checked }))}
                    />
                  </label>
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
          <div className="row g-3">
            {[
              ['Tên', assignmentDetailItem.title],
              ['Loại', assignmentDetailItem.type],
              ['Trình độ', assignmentDetailItem.level],
              ['Mức độ', assignmentDetailItem.difficulty],
              ['Kỹ năng', assignmentDetailItem.skill],
              ['Số câu / bài', assignmentDetailItem.totalItems],
              ['Thời gian', `${assignmentDetailItem.durationMinutes} phút`],
              ['Trạng thái', assignmentDetailItem.status],
              ['Ngày tạo', formatDateTime(assignmentDetailItem.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="col-md-4">
                <div className="admin-summary-chip h-100">
                  <div className="small text-muted">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {assignmentResultItem ? (
        <ModalShell
          title="Kết quả bài tập/đề thi"
          subtitle={assignmentResultItem.title}
          onClose={() => setAssignmentResultItem(null)}
          footer={<button className="btn btn-primary" onClick={() => setAssignmentResultItem(null)}>Đóng</button>}
        >
          <div className="row g-3">
            <div className="col-md-4">
              <div className="admin-summary-chip h-100">
                <div className="small text-muted">Số học sinh đã làm</div>
                <div className="display-6 fw-bold text-primary">{assignmentResultItem.studentsDone}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="admin-summary-chip h-100">
                <div className="small text-muted">Điểm trung bình</div>
                <div className="display-6 fw-bold text-success">{Number(assignmentResultItem.averageScore || 0).toFixed(1)}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="admin-summary-chip h-100">
                <div className="small text-muted">Trạng thái</div>
                <div className="fw-semibold mt-3">{assignmentResultItem.status}</div>
              </div>
            </div>
          </div>

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
                    {assignmentResultItem.targetClasses?.length || 0} lớp · {assignmentResultItem.targetStudents?.length || 0} học sinh lẻ
                  </td>
                </tr>
                <tr>
                  <td>Tỷ lệ đã làm</td>
                  <td>
                    {assignmentResultItem.studentsDone
                      ? `${Math.min(100, Math.round((assignmentResultItem.studentsDone / Math.max(assignmentResultItem.studentsDone + 5, 1)) * 100))}%`
                      : '0%'}
                  </td>
                </tr>
                <tr>
                  <td>Nhận xét nhanh</td>
                  <td>
                    {assignmentResultItem.averageScore >= 8
                      ? 'Kết quả tốt, có thể nâng mức độ cho lần tiếp theo.'
                      : assignmentResultItem.averageScore >= 6
                        ? 'Kết quả ổn định, nên bổ sung thêm bài tập bổ trợ.'
                        : 'Cần xem lại cấu trúc đề hoặc mức độ khó của bài.'}
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
                Huy
              </button>
              <button className="btn btn-primary" onClick={saveAssignmentEdit}>
                Lưu thay đổi
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-md-8">
              <label className="form-label fw-semibold">Tên bài tập/đề thi</label>
              <input
                className="form-control"
                value={assignmentEditDraft.title}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Loại</label>
              <select
                className="form-select"
                value={assignmentEditDraft.type}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, type: event.target.value }))}
              >
                {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
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
                value={assignmentEditDraft.level}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, level: event.target.value }))}
              >
                {LEVEL_OPTIONS.map((option) => (
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
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Kỹ năng</label>
              <select
                className="form-select"
                value={assignmentEditDraft.skill}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, skill: event.target.value }))}
              >
                {SKILL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Thời gian (phút)</label>
              <input
                type="number"
                className="form-control"
                value={assignmentEditDraft.durationMinutes}
                onChange={(event) =>
                  setAssignmentEditDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Số bài tập/câu hỏi</label>
              <input
                type="number"
                className="form-control"
                value={assignmentEditDraft.totalItems}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, totalItems: Number(event.target.value) }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={assignmentEditDraft.status}
                onChange={(event) => setAssignmentEditDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                {DELIVERY_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {bankDetailItem ? (
        <ModalShell
          title="Chi tiết bài tập gốc"
          subtitle={bankDetailItem.id}
          onClose={() => setBankDetailItem(null)}
          footer={<button className="btn btn-primary" onClick={() => setBankDetailItem(null)}>Đóng</button>}
        >
          <div className="row g-3">
            {[
              ['Tên bài tập', bankDetailItem.title],
              ['Trình độ', bankDetailItem.level],
              ['Mức độ', bankDetailItem.difficulty],
              ['Kỹ năng', bankDetailItem.skill],
              ['Dạng câu hỏi', bankDetailItem.questionFormat],
              ['Unit', bankDetailItem.unit],
              ['Số câu con', bankDetailItem.childQuestionCount],
              ['Trạng thái', bankDetailItem.status],
            ].map(([label, value]) => (
              <div key={label} className="col-md-4">
                <div className="admin-summary-chip h-100">
                  <div className="small text-muted">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              </div>
            ))}
            <div className="col-12">
              <div className="admin-summary-chip h-100">
                <div className="small text-muted">Mô tả</div>
                <div className="fw-semibold mt-1">{bankDetailItem.description}</div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {bankDraft ? (
        <ModalShell
          title={bankDraft.id ? 'Cập nhật bài tập gốc' : 'Thêm bài tập gốc'}
          subtitle="Thông tin mock cho giao diện Admin"
          onClose={() => setBankDraft(null)}
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setBankDraft(null)}>
                Huy
              </button>
              <button className="btn btn-primary" onClick={saveBankDraft}>
                Lưu bài tập
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-md-8">
              <label className="form-label fw-semibold">Tên bài tập</label>
              <input
                className="form-control"
                value={bankDraft.title}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Unit/Bài học</label>
              <input
                className="form-control"
                value={bankDraft.unit}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trình độ</label>
              <select
                className="form-select"
                value={bankDraft.level}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, level: event.target.value }))}
              >
                {LEVEL_OPTIONS.map((option) => (
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
                value={bankDraft.difficulty}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, difficulty: event.target.value }))}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Kỹ năng</label>
              <select
                className="form-select"
                value={bankDraft.skill}
                onChange={(event) =>
                  setBankDraft((prev) => ({
                    ...prev,
                    skill: event.target.value,
                    questionFormat: QUESTION_FORMATS_BY_SKILL[event.target.value][0],
                  }))
                }
              >
                {SKILL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Số câu hỏi con</label>
              <input
                type="number"
                className="form-control"
                value={bankDraft.childQuestionCount}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, childQuestionCount: Number(event.target.value) }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Dạng câu hỏi</label>
              <select
                className="form-select"
                value={bankDraft.questionFormat}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, questionFormat: event.target.value }))}
              >
                {QUESTION_FORMATS_BY_SKILL[bankDraft.skill].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={bankDraft.status}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                {BANK_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Mô tả</label>
              <textarea
                rows="4"
                className="form-control"
                value={bankDraft.description}
                onChange={(event) => setBankDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
        </ModalShell>
      ) : null}

      {importModalOpen ? (
        <ModalShell
          title="Import bài tập"
          subtitle="Chấp nhận mock JSON để demo giao diện"
          onClose={() => setImportModalOpen(false)}
          footer={
            <>
              <button className="btn btn-light border" onClick={() => setImportModalOpen(false)}>
                Huy
              </button>
              <button className="btn btn-success" onClick={importBankItems}>
                <Upload size={16} className="me-2" />
                Import bài tập
              </button>
            </>
          }
        >
          <div className="alert alert-light border">
            Dán vào một mảng JSON các item có trường: <code>title</code>, <code>level</code>, <code>difficulty</code>, <code>skill</code>, <code>questionFormat</code>, <code>unit</code>, <code>childQuestionCount</code>, <code>status</code>.
          </div>
          <textarea
            rows="16"
            className="form-control font-monospace"
            value={importPayload}
            onChange={(event) => setImportPayload(event.target.value)}
          />
        </ModalShell>
      ) : null}

      {previewExam ? (
        <ModalShell
          title="Preview đề đã sinh"
          subtitle={previewExam.title}
          onClose={() => setPreviewExam(null)}
          footer={<button className="btn btn-primary" onClick={() => setPreviewExam(null)}>Đóng</button>}
        >
          <div className="row g-3 mb-4">
            {[
              ['Mã đề', previewExam.code],
              ['Cấu trúc', previewExam.structureName],
              ['Trình độ', previewExam.level],
              ['Mức độ', previewExam.difficulty],
              ['Kỹ năng', previewExam.skill],
              ['Thời gian', `${previewExam.durationMinutes} phút`],
            ].map(([label, value]) => (
              <div key={label} className="col-md-4">
                <div className="admin-summary-chip h-100">
                  <div className="small text-muted">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex flex-column gap-3">
            {previewExam.sections.map((section, index) => (
              <div key={`${previewExam.id}-${section.rowId}`} className="admin-generated-section">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <div className="small text-muted">Phần {index + 1}</div>
                    <div className="fw-semibold">{section.questionFormat}</div>
                  </div>
                  <span className="badge text-bg-light border">{section.items.length} bài tập random</span>
                </div>
                <div className="small text-muted mb-3">
                  Trọng số {section.scoreWeight} · Điểm tối đa phần {section.sectionMaxScore.toFixed(2)} · Đảo đáp án{' '}
                  {previewExam.shuffleAnswers ? 'Bật' : 'Tắt'}
                </div>
                <ul className="mb-0 ps-3">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <span className="fw-semibold">{item.title}</span> · {item.unit} · {item.childQuestionCount} câu con
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
};

export default AdminAssignmentModule;
