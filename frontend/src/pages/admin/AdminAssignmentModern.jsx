import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock3,
  Copy,
  Filter,
  Pencil,
  Plus,
  Search,
  Settings2,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AssignAssignmentContentModern from './AssignAssignmentContentModern';

const ASSIGNMENT_TYPE_OPTIONS = [
  { value: 'HOMEWORK', label: 'Bài tập', prefix: 'BT' },
  { value: 'QUIZ', label: 'Kiểm tra nhanh', prefix: 'KT' },
  { value: 'EXAM', label: 'Đề thi', prefix: 'EX' },
];

const COURSE_OPTIONS = [
  { id: 'KH-IELTS-65', name: 'IELTS 6.5 Foundation', gradeBand: 'IELTS', activeClasses: 2 },
  { id: 'KH-TOEIC-700', name: 'TOEIC 700+', gradeBand: 'TOEIC', activeClasses: 2 },
  { id: 'KH-K12-9', name: 'Tiếng Anh 9 tăng tốc', gradeBand: 'K12', activeClasses: 1 },
];

const CLASS_OPTIONS = [
  { id: 'LH-IELTS-SANG', courseId: 'KH-IELTS-65', name: 'IELTS 6.5 Sáng T3-T5-T7', teacher: 'Cô Mai', students: 18 },
  { id: 'LH-IELTS-TOI', courseId: 'KH-IELTS-65', name: 'IELTS 6.5 Tối T2-T4-T6', teacher: 'Thầy Khoa', students: 22 },
  { id: 'LH-TOEIC-A', courseId: 'KH-TOEIC-700', name: 'TOEIC 700 A', teacher: 'Cô Linh', students: 20 },
  { id: 'LH-TOEIC-B', courseId: 'KH-TOEIC-700', name: 'TOEIC 700 B', teacher: 'Thầy Huy', students: 16 },
  { id: 'LH-K12-9A', courseId: 'KH-K12-9', name: 'Tiếng Anh 9A chuyên đề', teacher: 'Cô Vân', students: 24 },
];

const QUESTION_BANK = [
  {
    id: 'Q-IELTS-001',
    courseId: 'KH-IELTS-65',
    content: 'Reading Matching Headings: chọn tiêu đề phù hợp cho 5 đoạn văn về chủ đề education.',
    questionType: 'TRAC_NGHIEM',
    difficulty: 'MEDIUM',
    objective: true,
    topic: 'Reading',
    source: 'Bộ đề trung tâm',
    estimatedMinutes: 2,
  },
  {
    id: 'Q-IELTS-002',
    courseId: 'KH-IELTS-65',
    content: 'Listening Note Completion: điền 6 thông tin còn thiếu trong form đăng ký khóa học.',
    questionType: 'DIEN_KHUYET',
    difficulty: 'EASY',
    objective: true,
    topic: 'Listening',
    source: 'Kho Azota nội bộ',
    estimatedMinutes: 2,
  },
  {
    id: 'Q-IELTS-003',
    courseId: 'KH-IELTS-65',
    content: 'Writing Task 2: nêu quan điểm về việc học online có thay thế lớp học truyền thống hay không.',
    questionType: 'TU_LUAN',
    difficulty: 'HARD',
    objective: false,
    topic: 'Writing',
    source: 'Essay template',
    estimatedMinutes: 18,
  },
  {
    id: 'Q-IELTS-004',
    courseId: 'KH-IELTS-65',
    content: 'Grammar transformation: viết lại 4 câu sử dụng mệnh đề quan hệ.',
    questionType: 'TU_LUAN_NGAN',
    difficulty: 'MEDIUM',
    objective: false,
    topic: 'Grammar',
    source: 'Unit 4',
    estimatedMinutes: 6,
  },
  {
    id: 'Q-TOEIC-001',
    courseId: 'KH-TOEIC-700',
    content: 'Part 5: chọn đáp án đúng cho 8 câu ngữ pháp về thì hiện tại hoàn thành.',
    questionType: 'TRAC_NGHIEM',
    difficulty: 'EASY',
    objective: true,
    topic: 'Part 5',
    source: 'Đề luyện TOEIC',
    estimatedMinutes: 6,
  },
  {
    id: 'Q-TOEIC-002',
    courseId: 'KH-TOEIC-700',
    content: 'Part 6: điền từ còn thiếu vào email thông báo lịch họp của công ty.',
    questionType: 'DIEN_KHUYET',
    difficulty: 'MEDIUM',
    objective: true,
    topic: 'Part 6',
    source: 'Đề thi thử tháng 4',
    estimatedMinutes: 4,
  },
  {
    id: 'Q-TOEIC-003',
    courseId: 'KH-TOEIC-700',
    content: 'Part 7: đọc đoạn văn về recruitment fair và trả lời 5 câu hỏi.',
    questionType: 'DOC_HIEU',
    difficulty: 'HARD',
    objective: true,
    topic: 'Part 7',
    source: 'Bộ đề đối soát',
    estimatedMinutes: 8,
  },
  {
    id: 'Q-TOEIC-004',
    courseId: 'KH-TOEIC-700',
    content: 'Viết email ngắn 80-100 từ xác nhận lịch phỏng vấn với bộ phận nhân sự.',
    questionType: 'TU_LUAN',
    difficulty: 'MEDIUM',
    objective: false,
    topic: 'Writing',
    source: 'Task bổ sung',
    estimatedMinutes: 10,
  },
  {
    id: 'Q-K12-001',
    courseId: 'KH-K12-9',
    content: 'Chọn đáp án đúng cho 10 câu trắc nghiệm về cấu trúc If type 2.',
    questionType: 'TRAC_NGHIEM',
    difficulty: 'EASY',
    objective: true,
    topic: 'Grammar',
    source: 'Học kỳ II',
    estimatedMinutes: 7,
  },
  {
    id: 'Q-K12-002',
    courseId: 'KH-K12-9',
    content: 'Đọc hiểu đoạn văn về climate change và trả lời 4 câu hỏi.',
    questionType: 'DOC_HIEU',
    difficulty: 'MEDIUM',
    objective: true,
    topic: 'Reading',
    source: 'Đề cương giữa kỳ',
    estimatedMinutes: 6,
  },
  {
    id: 'Q-K12-003',
    courseId: 'KH-K12-9',
    content: 'Viết đoạn văn 120 từ nêu giải pháp giảm rác thải nhựa ở trường học.',
    questionType: 'TU_LUAN',
    difficulty: 'HARD',
    objective: false,
    topic: 'Writing',
    source: 'Bộ bài viết mẫu',
    estimatedMinutes: 15,
  },
  {
    id: 'Q-IELTS-005',
    courseId: 'KH-IELTS-65',
    content: 'Heading Matching: Nối 5 tiêu đề (A-E) với 5 đoạn văn tương ứng trong bài đọc về môi trường.',
    questionType: 'MATCHING',
    difficulty: 'MEDIUM',
    objective: true,
    topic: 'Reading',
    source: 'Bộ đề trung tâm',
    estimatedMinutes: 8,
    pairs: [
      { id: 'A', text: 'Tác động của biến đổi khí hậu' },
      { id: 'B', text: 'Giải pháp bảo vệ môi trường' },
      { id: 'C', text: 'Vai trò của con người' },
      { id: 'D', text: 'Tương lai của các loài động vật' },
      { id: 'E', text: 'Đầu tư vào năng lượng sạch' },
    ],
    description: 'Chọn tiêu đề A-E để điền vào các đoạn văn.',
  },
  {
    id: 'Q-TOEIC-005',
    courseId: 'KH-TOEIC-700',
    content: 'Information Matching: Xác định thông tin cụ thể nằm ở phần nào của 3 bức thư tương ứng (A, B, C).',
    questionType: 'MATCHING',
    difficulty: 'HARD',
    objective: true,
    topic: 'Reading',
    source: 'Đề luyện TOEIC',
    estimatedMinutes: 10,
    pairs: [
      { id: 'A', text: 'Bức thư 1: Thông báo tuyển dụng' },
      { id: 'B', text: 'Bức thư 2: Yêu cầu bổ sung hồ sơ' },
      { id: 'C', text: 'Bức thư 3: Mời phỏng vấn' },
    ],
    description: 'Trả lời 5 câu hỏi về chi tiết từ các bức thư.',
  },
  {
    id: 'Q-K12-004',
    courseId: 'KH-K12-9',
    content: 'Viết lại câu: Viết lại 4 câu sau sao cho nghĩa không đổi, sử dụng từ khóa được cấp.',
    questionType: 'TRANSFORMATION',
    difficulty: 'MEDIUM',
    objective: false,
    topic: 'Grammar',
    source: 'Unit 5',
    estimatedMinutes: 8,
    transformationTemplate: {
      examples: [
        {
          original: 'She is so intelligent that she can solve the problem easily.',
          hint: 'Bắt đầu bằng "Such..."',
          expectedStart: 'Such',
        },
        {
          original: 'I last visited Paris 5 years ago.',
          hint: 'Sử dụng "have not"',
          expectedStart: 'I have not',
        },
      ],
    },
    description: 'Viết lại sử dụng cấu trúc tương đương.',
  },
  {
    id: 'Q-IELTS-006',
    courseId: 'KH-IELTS-65',
    content: 'Sentence Transformation: Viết lại 5 câu sử dụng từ cho sẵn mà không đổi nghĩa câu gốc.',
    questionType: 'TRANSFORMATION',
    difficulty: 'HARD',
    objective: false,
    topic: 'Grammar',
    source: 'CPE Practice',
    estimatedMinutes: 12,
    transformationTemplate: {
      instruction: 'Viết lại câu sao cho có nghĩa tương đương, sử dụng từ được gợi ý.',
      examples: [
        {
          original: 'The project was so complicated that we couldn\'t complete it on time.',
          hint: 'Bắt đầu: "Had the project..."',
          expectedStart: 'Had the project',
        },
        {
          original: 'She regretted not accepting the job offer.',
          hint: 'Sử dụng "wish"',
          expectedStart: 'She wished',
        },
        {
          original: 'Not only does he speak English, but he also speaks French.',
          hint: 'Bắt đầu: "Not only..."',
          expectedStart: 'Not only',
        },
      ],
    },
    description: 'Viết lại các câu với các cấu trúc ngữ pháp khác nhau.',
  },
];

const makeQuestionSelection = (questionId, order, score) => {
  const question = QUESTION_BANK.find((item) => item.id === questionId);
  return {
    ...question,
    order,
    score,
  };
};

const TYPE_DEFAULTS = {
  HOMEWORK: {
    publishMode: 'DRAFT',
    durationMinutes: 0,
    totalScore: 10,
    maxAttempts: 3,
    openAt: '2026-04-15T19:00',
    dueAt: '2026-04-18T23:00',
    allowLateSubmission: true,
    showScoreWhenDone: true,
    showAnswerAfterDeadline: true,
    shuffleQuestions: false,
    shuffleAnswers: true,
    autoGradeObjective: true,
    requireManualReview: true,
    accessCode: '',
    scoreMode: 'AUTO_EQUAL',
  },
  QUIZ: {
    publishMode: 'SCHEDULED',
    durationMinutes: 20,
    totalScore: 10,
    maxAttempts: 1,
    openAt: '2026-04-16T20:00',
    dueAt: '2026-04-16T20:30',
    allowLateSubmission: false,
    showScoreWhenDone: true,
    showAnswerAfterDeadline: false,
    shuffleQuestions: true,
    shuffleAnswers: true,
    autoGradeObjective: true,
    requireManualReview: false,
    accessCode: '',
    scoreMode: 'AUTO_EQUAL',
  },
  EXAM: {
    publishMode: 'SCHEDULED',
    durationMinutes: 75,
    totalScore: 10,
    maxAttempts: 1,
    openAt: '2026-04-18T19:00',
    dueAt: '2026-04-18T20:20',
    allowLateSubmission: false,
    showScoreWhenDone: false,
    showAnswerAfterDeadline: false,
    shuffleQuestions: true,
    shuffleAnswers: true,
    autoGradeObjective: true,
    requireManualReview: true,
    accessCode: 'EXAM2026',
    scoreMode: 'AUTO_BY_DIFFICULTY',
  },
};

const createAssignmentCode = (type, assignments) => {
  const option = ASSIGNMENT_TYPE_OPTIONS.find((item) => item.value === type) || ASSIGNMENT_TYPE_OPTIONS[0];
  const count = assignments.filter((item) => item.assignmentKind === type).length + 1;
  return `${option.prefix}-${String(count).padStart(3, '0')}`;
};

const createAssignmentDraft = (type, assignments) => ({
  id: `ASSIGN-${Date.now()}`,
  code: createAssignmentCode(type, assignments),
  title: '',
  description: '',
  courseId: '',
  courseName: '',
  assignmentKind: type,
  selectedClassIds: [],
  selectedQuestions: [],
  submissionStats: {
    totalStudents: 0,
    submitted: 0,
    lateSubmitted: 0,
    needsGrading: 0,
  },
  updatedAt: new Date().toISOString(),
  createdBy: 'Admin',
  ...TYPE_DEFAULTS[type],
});

const INITIAL_ASSIGNMENTS = [
  {
    ...createAssignmentDraft('EXAM', []),
    id: 'ASSIGN-EXAM-001',
    code: 'EX-001',
    title: 'Thi thử TOEIC Reading giữa khóa',
    description: 'Đề thi theo quy trình Azota: một lần làm bài, trộn câu hỏi, ẩn đáp án đến sau hạn nộp.',
    courseId: 'KH-TOEIC-700',
    courseName: 'TOEIC 700+',
    selectedClassIds: ['LH-TOEIC-A', 'LH-TOEIC-B'],
    selectedQuestions: [
      makeQuestionSelection('Q-TOEIC-001', 1, 2),
      makeQuestionSelection('Q-TOEIC-002', 2, 2),
      makeQuestionSelection('Q-TOEIC-003', 3, 3),
      makeQuestionSelection('Q-TOEIC-004', 4, 3),
    ],
    submissionStats: {
      totalStudents: 36,
      submitted: 24,
      lateSubmitted: 0,
      needsGrading: 6,
    },
    updatedAt: '2026-04-12T09:30',
    createdBy: 'Admin Toàn',
  },
  {
    ...createAssignmentDraft('HOMEWORK', []),
    id: 'ASSIGN-HW-001',
    code: 'BT-001',
    title: 'Bài tập Writing Task 2 cuối tuần',
    description: 'Giao bài tập viết có hạn nộp 3 ngày, học viên được nộp tối đa 2 lần trước khi khóa bài.',
    courseId: 'KH-IELTS-65',
    courseName: 'IELTS 6.5 Foundation',
    selectedClassIds: ['LH-IELTS-SANG'],
    selectedQuestions: [
      makeQuestionSelection('Q-IELTS-003', 1, 6),
      makeQuestionSelection('Q-IELTS-004', 2, 4),
    ],
    maxAttempts: 2,
    submissionStats: {
      totalStudents: 18,
      submitted: 12,
      lateSubmitted: 1,
      needsGrading: 12,
    },
    updatedAt: '2026-04-11T15:15',
    createdBy: 'Admin Toàn',
  },
  {
    ...createAssignmentDraft('QUIZ', []),
    id: 'ASSIGN-QUIZ-001',
    code: 'KT-001',
    title: 'Quiz ngữ pháp If type 2',
    description: 'Kiểm tra nhanh 20 phút, hiện điểm ngay sau khi nộp, dùng để đánh giá đầu buổi.',
    courseId: 'KH-K12-9',
    courseName: 'Tiếng Anh 9 tăng tốc',
    selectedClassIds: ['LH-K12-9A'],
    selectedQuestions: [
      makeQuestionSelection('Q-K12-001', 1, 6),
      makeQuestionSelection('Q-K12-002', 2, 4),
    ],
    submissionStats: {
      totalStudents: 24,
      submitted: 24,
      lateSubmitted: 0,
      needsGrading: 0,
    },
    updatedAt: '2026-04-10T08:45',
    createdBy: 'Admin Toàn',
  },
];

const STATUS_META = {
  DRAFT: { label: 'Nháp', tone: 'secondary' },
  NEEDS_SETUP: { label: 'Cần thiết lập', tone: 'warning' },
  SCHEDULED: { label: 'Đã lên lịch', tone: 'info' },
  ACTIVE: { label: 'Đang mở', tone: 'success' },
  CLOSED: { label: 'Đã đóng', tone: 'dark' },
};

const TYPE_META = {
  HOMEWORK: { label: 'Bài tập', tone: 'primary' },
  QUIZ: { label: 'Quiz', tone: 'warning' },
  EXAM: { label: 'Đề thi', tone: 'danger' },
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa đặt lịch';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const getOperationalStatus = (assignment) => {
  if (assignment.publishMode === 'DRAFT') {
    return 'DRAFT';
  }

  if (!assignment.selectedQuestions.length || !assignment.selectedClassIds.length) {
    return 'NEEDS_SETUP';
  }

  const now = new Date();

  if (assignment.openAt && now < new Date(assignment.openAt)) {
    return 'SCHEDULED';
  }

  if (assignment.dueAt && now > new Date(assignment.dueAt)) {
    return 'CLOSED';
  }

  return 'ACTIVE';
};

const getSelectedClassSummary = (selectedClassIds) => {
  const matchedClasses = CLASS_OPTIONS.filter((item) => selectedClassIds.includes(item.id));
  return {
    totalClasses: matchedClasses.length,
    totalStudents: matchedClasses.reduce((sum, item) => sum + item.students, 0),
  };
};

const validateAssignmentForm = (formData) => {
  const errors = {};

  if (!formData.title.trim()) {
    errors.title = 'Cần nhập tên bài tập/đề thi.';
  }

  if (!formData.courseId) {
    errors.courseId = 'Cần chọn khóa học.';
  }

  // Chỉ validate thời gian làm bài cho các loại QUIZ và EXAM (không phải HOMEWORK)
  if (formData.assignmentKind !== 'HOMEWORK') {
    if (!Number(formData.durationMinutes) || Number(formData.durationMinutes) <= 0) {
      errors.durationMinutes = 'Thời gian làm bài phải lớn hơn 0.';
    }
  }

  if (!Number(formData.totalScore) || Number(formData.totalScore) <= 0) {
    errors.totalScore = 'Điểm tối đa phải lớn hơn 0.';
  }

  if (formData.publishMode === 'SCHEDULED') {
    if (!formData.openAt) {
      errors.openAt = 'Cần chọn giờ mở bài.';
    }
    // Chỉ validate hạn nộp cho HOMEWORK
    if (formData.assignmentKind === 'HOMEWORK') {
      if (!formData.dueAt) {
        errors.dueAt = 'Cần chọn hạn nộp.';
      }
    }
  }

  if (formData.assignmentKind === 'HOMEWORK' && formData.openAt && formData.dueAt && new Date(formData.dueAt) <= new Date(formData.openAt)) {
    errors.dueAt = 'Hạn nộp phải sau giờ mở bài.';
  }

  return errors;
};

const AdminAssignmentModern = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [formData, setFormData] = useState(createAssignmentDraft('HOMEWORK', INITIAL_ASSIGNMENTS));
  const [formErrors, setFormErrors] = useState({});
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const selectedAssignment = assignments.find((item) => item.id === selectedAssignmentId) || null;

  const assignmentRows = useMemo(
    () =>
      assignments.map((item) => {
        const statusKey = getOperationalStatus(item);
        const classSummary = getSelectedClassSummary(item.selectedClassIds);
        return {
          ...item,
          statusKey,
          totalClasses: classSummary.totalClasses,
          totalStudents: item.submissionStats.totalStudents || classSummary.totalStudents,
        };
      }),
    [assignments],
  );

  const filteredAssignments = useMemo(() => {
    return assignmentRows.filter((item) => {
      const matchedSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchedCourse = courseFilter === 'ALL' || item.courseId === courseFilter;
      const matchedType = typeFilter === 'ALL' || item.assignmentKind === typeFilter;
      const matchedStatus = statusFilter === 'ALL' || item.statusKey === statusFilter;
      return matchedSearch && matchedCourse && matchedType && matchedStatus;
    });
  }, [assignmentRows, courseFilter, searchTerm, statusFilter, typeFilter]);

  const dashboardStats = useMemo(() => {
    return {
      totalAssignments: assignmentRows.length,
      activeAssignments: assignmentRows.filter((item) => item.statusKey === 'ACTIVE').length,
      needsSetup: assignmentRows.filter((item) => item.statusKey === 'NEEDS_SETUP' || item.statusKey === 'DRAFT').length,
      needsGrading: assignmentRows.reduce((sum, item) => sum + (item.submissionStats?.needsGrading || 0), 0),
    };
  }, [assignmentRows]);

  const openCreateModal = () => {
    const draft = createAssignmentDraft('HOMEWORK', assignments);
    setModalMode('CREATE');
    setFormData(draft);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (assignment) => {
    setModalMode('EDIT');
    setFormData({ ...assignment });
    setFormErrors({});
    setShowModal(true);
  };

  const handleTypeChange = (nextType) => {
    setFormData((prev) => {
      const defaults = TYPE_DEFAULTS[nextType];
      return {
        ...prev,
        assignmentKind: nextType,
        code: modalMode === 'CREATE' ? createAssignmentCode(nextType, assignments) : prev.code,
        durationMinutes: defaults.durationMinutes,
        totalScore: defaults.totalScore,
        maxAttempts: defaults.maxAttempts,
        publishMode: defaults.publishMode,
        openAt: defaults.openAt,
        dueAt: defaults.dueAt,
        allowLateSubmission: defaults.allowLateSubmission,
        showScoreWhenDone: defaults.showScoreWhenDone,
        showAnswerAfterDeadline: defaults.showAnswerAfterDeadline,
        shuffleQuestions: defaults.shuffleQuestions,
        shuffleAnswers: defaults.shuffleAnswers,
        autoGradeObjective: defaults.autoGradeObjective,
        requireManualReview: defaults.requireManualReview,
        accessCode: defaults.accessCode,
        scoreMode: defaults.scoreMode,
      };
    });
  };

  const handleSaveAssignment = () => {
    const errors = validateAssignmentForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const matchedCourse = COURSE_OPTIONS.find((item) => item.id === formData.courseId);
    const normalized = {
      ...formData,
      courseName: matchedCourse?.name || '',
      durationMinutes: Number(formData.durationMinutes),
      totalScore: Number(formData.totalScore),
      maxAttempts: Number(formData.maxAttempts),
      updatedAt: new Date().toISOString(),
    };

    if (modalMode === 'CREATE') {
      setAssignments((prev) => [normalized, ...prev]);
    } else {
      setAssignments((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)));
    }

    setShowModal(false);
  };

  const handleDuplicate = (assignment) => {
    const classSummary = getSelectedClassSummary(assignment.selectedClassIds);
    const clone = {
      ...assignment,
      id: `ASSIGN-${Date.now()}`,
      code: createAssignmentCode(assignment.assignmentKind, assignments),
      title: `${assignment.title} (ban sao)`,
      publishMode: 'DRAFT',
      submissionStats: {
        totalStudents: classSummary.totalStudents,
        submitted: 0,
        lateSubmitted: 0,
        needsGrading: assignment.selectedQuestions.some((item) => !item.objective) ? classSummary.totalStudents : 0,
      },
      updatedAt: new Date().toISOString(),
    };

    setAssignments((prev) => [clone, ...prev]);
  };

  const handleDelete = (assignmentId) => {
    const shouldDelete = window.confirm('Xóa đầu bài này khỏi danh sách quản lý?');
    if (!shouldDelete) {
      return;
    }

    setAssignments((prev) => prev.filter((item) => item.id !== assignmentId));
    if (selectedAssignmentId === assignmentId) {
      setSelectedAssignmentId(null);
    }
  };

  const handleContentSave = (updatedAssignment) => {
    setAssignments((prev) => prev.map((item) => (item.id === updatedAssignment.id ? updatedAssignment : item)));
    setSelectedAssignmentId(updatedAssignment.id);
  };

  if (selectedAssignment) {
    return (
      <AssignAssignmentContentModern
        assignment={selectedAssignment}
        courses={COURSE_OPTIONS}
        classes={CLASS_OPTIONS}
        questionBank={QUESTION_BANK}
        onBack={() => setSelectedAssignmentId(null)}
        onSave={handleContentSave}
      />
    );
  }

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý bài tập và đề thi</h3>
          <div className="text-muted">
            Tạo đầu bài, cấu hình lịch mở bài, gán lớp học, theo dõi nộp bài và mô trình biên tập để chi tiết.
          </div>
          <div className="small text-secondary mt-2">Người quản trị hiện tại: {user?.name || 'Admin'}</div>
        </div>

        <button className="btn btn-primary d-flex align-items-center px-4 py-2 shadow-sm" onClick={openCreateModal}>
          <Plus size={18} className="me-2" />
          Tạo đầu bài mới
        </button>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Tổng đầu bài', value: dashboardStats.totalAssignments, color: 'primary', icon: BookOpen },
          { label: 'Đang mở bài', value: dashboardStats.activeAssignments, color: 'success', icon: CalendarDays },
          { label: 'Cần bổ sung cấu hình', value: dashboardStats.needsSetup, color: 'warning', icon: Target },
          { label: 'Chờ chấm tay', value: dashboardStats.needsGrading, color: 'danger', icon: CheckCircle },
        ].map((item) => (
          <div key={item.label} className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">{item.label}</div>
                <div className="d-flex align-items-center justify-content-between">
                  <div className={`display-6 fw-bold text-${item.color}`}>{item.value}</div>
                  <item.icon size={28} className={`text-${item.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-5">
              <label className="form-label small fw-semibold text-muted">Tìm kiếm</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={16} />
                </span>
                <input
                  className="form-control border-start-0"
                  placeholder="Tìm theo mã đầu bài hoặc tên đề..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="col-lg-2">
              <label className="form-label small fw-semibold text-muted">Khóa học</label>
              <select className="form-select" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                <option value="ALL">Tất cả khóa học</option>
                {COURSE_OPTIONS.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2">
              <label className="form-label small fw-semibold text-muted">Loại đầu bài</label>
              <select className="form-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="ALL">Tất cả loại</option>
                {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2">
              <label className="form-label small fw-semibold text-muted">Trạng thái</label>
              <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-1 d-grid">
              <button
                className="btn btn-light border d-flex align-items-center justify-content-center"
                onClick={() => {
                  setSearchTerm('');
                  setCourseFilter('ALL');
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                <Filter size={16} className="me-2" />
                Lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-muted text-uppercase">
                <th className="ps-4">Đầu bài</th>
                <th>Khóa học</th>
                <th className="text-center">Lớp / Học viên</th>
                <th>Lịch mở bài</th>
                <th className="text-center">Tiến độ nộp bài</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((assignment) => {
                const typeMeta = TYPE_META[assignment.assignmentKind];
                const statusMeta = STATUS_META[assignment.statusKey];
                const progressValue = assignment.totalStudents
                  ? Math.round((assignment.submissionStats.submitted / assignment.totalStudents) * 100)
                  : 0;

                return (
                  <tr key={assignment.id}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{assignment.title}</div>
                      <div className="small text-muted mt-1">
                        {assignment.code} · {assignment.selectedQuestions.length} câu · {assignment.durationMinutes} phút
                      </div>
                      <div className="mt-2">
                        <span className={`badge bg-${typeMeta.tone}-subtle text-${typeMeta.tone} border border-${typeMeta.tone}-subtle`}>
                          {typeMeta.label}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{assignment.courseName || 'Chưa gán khóa học'}</div>
                      <div className="small text-muted">{assignment.description || 'Chưa có mô tả.'}</div>
                    </td>
                    <td className="text-center">
                      <div className="fw-semibold">{assignment.totalClasses} lớp</div>
                      <div className="small text-muted">{assignment.totalStudents} học viên</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center mb-1">
                        <Clock3 size={14} className="me-2 text-primary" />
                        <span className="small">Mở bài: {formatDateTime(assignment.openAt)}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <CalendarDays size={14} className="me-2 text-danger" />
                        <span className="small">Hạn nộp: {formatDateTime(assignment.dueAt)}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="fw-semibold mb-1">
                        {assignment.submissionStats.submitted}/{assignment.totalStudents}
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div className="progress-bar" style={{ width: `${progressValue}%` }} />
                      </div>
                      <div className="small text-muted mt-1">Chờ chấm tay: {assignment.submissionStats.needsGrading}</div>
                    </td>
                    <td className="text-center">
                      <span className={`badge bg-${statusMeta.tone}-subtle text-${statusMeta.tone} border border-${statusMeta.tone}-subtle px-3 py-2`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-primary d-flex align-items-center"
                          onClick={() => setSelectedAssignmentId(assignment.id)}
                        >
                          <Settings2 size={14} className="me-1" />
                          Thiết lập đề
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(assignment)} title="Sửa metadata">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleDuplicate(assignment)} title="Nhân bản">
                          <Copy size={14} />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(assignment.id)} title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="text-muted">
                      <Users size={36} className="mb-3 opacity-50" />
                      <div className="fw-semibold">Không tìm thấy đầu bài phù hợp bộ lọc hiện tại.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <div>
                  <h5 className="modal-title mb-1">
                    {modalMode === 'CREATE' ? 'Tạo đầu bài mới' : 'Cập nhật thông tin đầu bài'}
                  </h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label fw-semibold">Tên đầu bài</label>
                    <input
                      className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                      value={formData.title}
                      onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Ví dụ: Thi thử TOEIC Reading giữa khóa"
                    />
                    {formErrors.title && <div className="invalid-feedback">{formErrors.title}</div>}
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Mã</label>
                    <input className="form-control bg-light" value={formData.code} readOnly />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Loại</label>
                    <select className="form-select" value={formData.assignmentKind} onChange={(event) => handleTypeChange(event.target.value)}>
                      {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Khóa học</label>
                    <select
                      className={`form-select ${formErrors.courseId ? 'is-invalid' : ''}`}
                      value={formData.courseId}
                      onChange={(event) => setFormData((prev) => ({ ...prev, courseId: event.target.value }))}
                    >
                      <option value="">Chọn khóa học</option>
                      {COURSE_OPTIONS.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.courseId && <div className="invalid-feedback">{formErrors.courseId}</div>}
                  </div>
                  {formData.assignmentKind !== 'HOMEWORK' && (
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Thời gian</label>
                      <input
                        type="number"
                        className={`form-control ${formErrors.durationMinutes ? 'is-invalid' : ''}`}
                        value={formData.durationMinutes}
                        onChange={(event) => setFormData((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                      />
                      {formErrors.durationMinutes && <div className="invalid-feedback">{formErrors.durationMinutes}</div>}
                    </div>
                  )}
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Tổng điểm</label>
                    <input
                      type="number"
                      className={`form-control ${formErrors.totalScore ? 'is-invalid' : ''}`}
                      value={formData.totalScore}
                      onChange={(event) => setFormData((prev) => ({ ...prev, totalScore: Number(event.target.value) }))}
                    />
                    {formErrors.totalScore && <div className="invalid-feedback">{formErrors.totalScore}</div>}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Mô tả nghiệp vụ</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={formData.description}
                      onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Mô tả mục tiêu, cách hiển điểm, cách giao bài, yêu cầu chấm tay..."
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Chế độ phát hành</label>
                    <select className="form-select" value={formData.publishMode} onChange={(event) => setFormData((prev) => ({ ...prev, publishMode: event.target.value }))}>
                      <option value="DRAFT">Nháp</option>
                      <option value="SCHEDULED">Lên lịch</option>
                      <option value="IMMEDIATE">Mở ngay</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Giờ mở bài</label>
                    <input
                      type="datetime-local"
                      className={`form-control ${formErrors.openAt ? 'is-invalid' : ''}`}
                      value={formData.openAt}
                      onChange={(event) => setFormData((prev) => ({ ...prev, openAt: event.target.value }))}
                    />
                    {formErrors.openAt && <div className="invalid-feedback">{formErrors.openAt}</div>}
                  </div>
                  {formData.assignmentKind === 'HOMEWORK' && (
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Hạn nộp</label>
                      <input
                        type="datetime-local"
                        className={`form-control ${formErrors.dueAt ? 'is-invalid' : ''}`}
                        value={formData.dueAt}
                        onChange={(event) => setFormData((prev) => ({ ...prev, dueAt: event.target.value }))}
                      />
                      {formErrors.dueAt && <div className="invalid-feedback">{formErrors.dueAt}</div>}
                    </div>
                  )}

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Số lần nộp tối đa</label>
                    <input type="number" className="form-control" value={formData.maxAttempts} onChange={(event) => setFormData((prev) => ({ ...prev, maxAttempts: Number(event.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Mã vào bài</label>
                    <input className="form-control" value={formData.accessCode} onChange={(event) => setFormData((prev) => ({ ...prev, accessCode: event.target.value }))} placeholder="Không bắt buộc" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Quy tắc tính điểm</label>
                    <select className="form-select" value={formData.scoreMode} onChange={(event) => setFormData((prev) => ({ ...prev, scoreMode: event.target.value }))}>
                      <option value="AUTO_EQUAL">Chia đều</option>
                      <option value="AUTO_BY_DIFFICULTY">Theo mức độ</option>
                      <option value="MANUAL">Nhập tay</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <div className="row g-3">
                      {[
                        { key: 'shuffleQuestions', label: 'Trộn thứ tự câu hỏi' },
                        { key: 'shuffleAnswers', label: 'Trộn đáp án' },
                        { key: 'autoGradeObjective', label: 'Chấm tự động câu objective' },
                        { key: 'requireManualReview', label: 'Yêu cầu chấm tay câu tự luận' },
                        { key: 'showScoreWhenDone', label: 'Cho học viên xem điểm ngay' },
                        { key: 'showAnswerAfterDeadline', label: 'Mở đáp án sau hạn nộp' },
                        { key: 'allowLateSubmission', label: 'Cho nộp muộn' },
                      ].map((item) => (
                        <div key={item.key} className="col-md-4">
                          <div className="form-check">
                            <input
                              id={item.key}
                              type="checkbox"
                              className="form-check-input"
                              checked={Boolean(formData[item.key])}
                              onChange={(event) => setFormData((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor={item.key}>
                              {item.label}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button className="btn btn-light" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn btn-primary px-4" onClick={handleSaveAssignment}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssignmentModern;
