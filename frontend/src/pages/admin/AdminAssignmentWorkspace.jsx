import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileJson,
  Filter,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import adminAssignmentService from '../../api/adminAssignmentService';
import AdminAssignmentBuilder from './AdminAssignmentBuilder';

const ASSIGNMENT_STATUS_META = {
  DRAFT: { label: 'Nhap', tone: 'secondary' },
  NEEDS_SETUP: { label: 'Can thiet lap', tone: 'warning' },
  SCHEDULED: { label: 'Da len lich', tone: 'info' },
  ACTIVE: { label: 'Dang mo', tone: 'success' },
  CLOSED: { label: 'Da dong', tone: 'dark' },
};

const TYPE_TONE_LOOKUP = {
  HOMEWORK: 'primary',
  QUIZ: 'warning',
  EXAM: 'danger',
  LCH_MCQ: 'primary',
  CQ_TRAC_NGHIEM_1: 'primary',
  CQ_TRAC_NGHIEM_NHIEU: 'primary',
  LCH_MATCHING: 'success',
  CQ_NOI_GHEP: 'success',
  CQ_MATCHING_HEADINGS: 'success',
  CQ_MATCHING_PARAGRAPH: 'success',
  LCH_GAPFILL: 'info',
  CQ_DIEN_KHUYET_TU_NHAP: 'info',
  CQ_DIEN_TU_DANH_SACH: 'info',
  CQ_WORD_FORM: 'info',
  CQ_SHORT_ANSWER: 'info',
  LCH_TRANSFORM: 'danger',
  CQ_TU_LUAN: 'danger',
  CQ_SENTENCE_TRANSFORM: 'danger',
};

const DIFFICULTY_TONE_LOOKUP = {
  DE: { tone: 'success', weight: 1 },
  TRUNG_BINH: { tone: 'warning', weight: 1.25 },
  KHO: { tone: 'danger', weight: 1.5 },
};

const pickValue = (...values) => values.find((value) => value !== undefined && value !== null);

const createDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

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
};

const createAssignmentDraft = (assignmentTypeOptions = [], publishModeOptions = []) => {
  const defaultType = assignmentTypeOptions[0]?.code || 'HOMEWORK';
  const defaultPublishMode = publishModeOptions.find((item) => item.code === 'DRAFT')?.code || publishModeOptions[0]?.code || 'DRAFT';

  return {
    id: null,
    code: '',
    title: '',
    description: '',
    courseId: '',
    courseName: '',
    assignmentKind: defaultType,
    selectedClassIds: [],
    selectedQuestions: [],
    publishMode: defaultPublishMode,
    durationMinutes: 0,
    totalScore: 10,
    maxAttempts: 1,
    openAt: '',
    dueAt: '',
    allowLateSubmission: false,
    showScoreWhenDone: false,
    showAnswerAfterDeadline: false,
    shuffleQuestions: true,
    shuffleAnswers: true,
    autoGradeObjective: true,
    requireManualReview: true,
    accessCode: '',
    scoreMode: 'AUTO_EQUAL',
    submissionStats: {
      totalStudents: 0,
      submitted: 0,
      lateSubmitted: 0,
      needsGrading: 0,
    },
    updatedAt: '',
  };
};

const createQuestionForm = (questionTypeOptions = [], difficultyOptions = [], courseId = '') => ({
  id: null,
  courseId,
  questionType: questionTypeOptions[0]?.code || '',
  difficulty: difficultyOptions[0]?.code || '',
  content: '',
  explanation: '',
  audioLink: '',
  imageLink: '',
  parentQuestionId: '',
  order: 0,
  choiceAnswers: [
    { label: 'A', content: '', isCorrect: false, matchValue: '', order: 1 },
    { label: 'B', content: '', isCorrect: false, matchValue: '', order: 2 },
  ],
  textAnswers: [{ answer: '', alternative: '', caseSensitive: false }],
});

const normalizeOption = (option) => ({
  code: option.Code || option.code || '',
  label: option.Label || option.label || option.Code || option.code || '',
  order: option.Order ?? option.order ?? 0,
});

const buildQuestionTypeMeta = (questionTypeOptions) =>
  Object.fromEntries(
    questionTypeOptions.map((option) => [
      option.code,
      {
        label: option.label,
        tone: TYPE_TONE_LOOKUP[option.code] || 'secondary',
      },
    ])
  );

const buildDifficultyMeta = (difficultyOptions) =>
  Object.fromEntries(
    difficultyOptions.map((option) => [
      option.code,
      {
        label: option.label,
        tone: DIFFICULTY_TONE_LOOKUP[option.code]?.tone || 'secondary',
        weight: DIFFICULTY_TONE_LOOKUP[option.code]?.weight || 1,
      },
    ])
  );

const normalizeQuestionBankItem = (item) => ({
  id: pickValue(item.maCauHoi, item.MaCauHoi),
  courseId: pickValue(item.maKhoaHoc, item.MaKhoaHoc),
  courseName: pickValue(item.tenKhoaHoc, item.TenKhoaHoc, ''),
  questionType: pickValue(item.loaiCauHoiCode, item.LoaiCauHoiCode, ''),
  questionTypeLabel: pickValue(item.loaiCauHoiLabel, item.LoaiCauHoiLabel, item.loaiCauHoiCode, item.LoaiCauHoiCode, ''),
  difficulty: pickValue(item.mucDoCode, item.MucDoCode, ''),
  difficultyLabel: pickValue(item.mucDoLabel, item.MucDoLabel, item.mucDoCode, item.MucDoCode, ''),
  content: pickValue(item.noiDungCauHoi, item.NoiDungCauHoi, ''),
  explanation: pickValue(item.giaiThichDapAn, item.GiaiThichDapAn, ''),
  audioLink: pickValue(item.amThanhLink, item.AmThanhLink, ''),
  imageLink: pickValue(item.hinhAnhLink, item.HinhAnhLink, ''),
  parentQuestionId: pickValue(item.maCauHoiCha, item.MaCauHoiCha, ''),
  order: pickValue(item.thuTu, item.ThuTu, 0),
  objective: !pickValue(item.laCauHoiTuLuan, item.LaCauHoiTuLuan, false),
  source: pickValue(item.tenKhoaHoc, item.TenKhoaHoc, 'Ngan hang cau hoi'),
  topic: pickValue(item.loaiCauHoiLabel, item.LoaiCauHoiLabel, ''),
  estimatedMinutes: pickValue(item.laCauHoiTuLuan, item.LaCauHoiTuLuan, false) ? 10 : 2,
  choiceAnswerCount: pickValue(item.soDapAnLuaChon, item.SoDapAnLuaChon, 0),
  textAnswerCount: pickValue(item.soDapAnNhapLieu, item.SoDapAnNhapLieu, 0),
  createdAt: pickValue(item.thoiGianTao, item.ThoiGianTao, ''),
});

const normalizeAssignment = (item) => {
  const rawSelectedQuestions = pickValue(item.selectedQuestions, item.SelectedQuestions, []);
  const rawSubmissionStats = pickValue(item.submissionStats, item.SubmissionStats, {});

  return {
    id: pickValue(item.maBaiTap, item.MaBaiTap),
    code: pickValue(item.code, item.Code, ''),
    title: pickValue(item.tenBaiTap, item.TenBaiTap, ''),
    description: pickValue(item.moTa, item.MoTa, ''),
    courseId: pickValue(item.maKhoaHoc, item.MaKhoaHoc),
    courseName: pickValue(item.tenKhoaHoc, item.TenKhoaHoc, ''),
    assignmentKind: pickValue(item.loaiBaiTapCode, item.LoaiBaiTapCode, 'HOMEWORK'),
    selectedClassIds: pickValue(item.selectedClassIds, item.SelectedClassIds, []),
    selectedQuestions: rawSelectedQuestions.map((question, index) => ({
      id: pickValue(question.maCauHoi, question.MaCauHoi),
      courseId: pickValue(question.maKhoaHoc, question.MaKhoaHoc),
      content: pickValue(question.noiDungCauHoi, question.NoiDungCauHoi, ''),
      questionType: pickValue(question.loaiCauHoiCode, question.LoaiCauHoiCode, ''),
      questionTypeLabel: pickValue(question.loaiCauHoiLabel, question.LoaiCauHoiLabel, ''),
      difficulty: pickValue(question.mucDoCode, question.MucDoCode, ''),
      difficultyLabel: pickValue(question.mucDoLabel, question.MucDoLabel, ''),
      objective: !pickValue(question.laCauHoiTuLuan, question.LaCauHoiTuLuan, false),
      topic: pickValue(question.loaiCauHoiLabel, question.LoaiCauHoiLabel, ''),
      source: pickValue(question.mucDoLabel, question.MucDoLabel, 'Ngan hang cau hoi'),
      estimatedMinutes: pickValue(question.laCauHoiTuLuan, question.LaCauHoiTuLuan, false) ? 10 : 2,
      order: pickValue(question.thuTu, question.ThuTu, index + 1),
      score: Number(pickValue(question.diemCuaCau, question.DiemCuaCau, 0)),
    })),
    publishMode: pickValue(item.publishMode, item.PublishMode, 'DRAFT'),
    statusKey: pickValue(item.statusKey, item.StatusKey, 'DRAFT'),
    durationMinutes: Number(pickValue(item.thoiGianLamBai, item.ThoiGianLamBai, 0)),
    totalScore: Number(pickValue(item.diemToiDa, item.DiemToiDa, 0)),
    maxAttempts: Number(pickValue(item.maxAttempts, item.MaxAttempts, 1)),
    openAt: createDateTimeLocalValue(pickValue(item.openAt, item.OpenAt)),
    dueAt: createDateTimeLocalValue(pickValue(item.dueAt, item.DueAt)),
    allowLateSubmission: Boolean(pickValue(item.allowLateSubmission, item.AllowLateSubmission, false)),
    showScoreWhenDone: Boolean(pickValue(item.showScoreWhenDone, item.ShowScoreWhenDone, false)),
    showAnswerAfterDeadline: Boolean(pickValue(item.showAnswerAfterDeadline, item.ShowAnswerAfterDeadline, false)),
    shuffleQuestions: Boolean(pickValue(item.shuffleQuestions, item.ShuffleQuestions, true)),
    shuffleAnswers: Boolean(pickValue(item.shuffleAnswers, item.ShuffleAnswers, true)),
    autoGradeObjective: Boolean(pickValue(item.autoGradeObjective, item.AutoGradeObjective, true)),
    requireManualReview: Boolean(pickValue(item.requireManualReview, item.RequireManualReview, true)),
    accessCode: pickValue(item.accessCode, item.AccessCode, ''),
    scoreMode: pickValue(item.scoreMode, item.ScoreMode, 'AUTO_EQUAL'),
    totalQuestions: pickValue(item.totalQuestions, item.TotalQuestions, 0),
    totalClasses: pickValue(item.totalClasses, item.TotalClasses, 0),
    totalStudents: pickValue(item.totalStudents, item.TotalStudents, 0),
    submissionStats: {
      totalStudents: pickValue(rawSubmissionStats.totalStudents, rawSubmissionStats.TotalStudents, 0),
      submitted: pickValue(rawSubmissionStats.submitted, rawSubmissionStats.Submitted, 0),
      lateSubmitted: pickValue(rawSubmissionStats.lateSubmitted, rawSubmissionStats.LateSubmitted, 0),
      needsGrading: pickValue(rawSubmissionStats.needsGrading, rawSubmissionStats.NeedsGrading, 0),
    },
    updatedAt: pickValue(item.updatedAt, item.UpdatedAt, ''),
  };
};

const normalizeQuestionDetailToForm = (detail, questionTypeOptions = [], difficultyOptions = []) => {
  const rawChoiceAnswers = pickValue(detail.choiceAnswers, detail.ChoiceAnswers, []);
  const rawTextAnswers = pickValue(detail.textAnswers, detail.TextAnswers, []);

  return {
    id: pickValue(detail.maCauHoi, detail.MaCauHoi),
    courseId: pickValue(detail.maKhoaHoc, detail.MaKhoaHoc),
    questionType: pickValue(detail.loaiCauHoiCode, detail.LoaiCauHoiCode, questionTypeOptions[0]?.code || ''),
    difficulty: pickValue(detail.mucDoCode, detail.MucDoCode, difficultyOptions[0]?.code || ''),
    content: pickValue(detail.noiDungCauHoi, detail.NoiDungCauHoi, ''),
    explanation: pickValue(detail.giaiThichDapAn, detail.GiaiThichDapAn, ''),
    audioLink: pickValue(detail.amThanhLink, detail.AmThanhLink, ''),
    imageLink: pickValue(detail.hinhAnhLink, detail.HinhAnhLink, ''),
    parentQuestionId: pickValue(detail.maCauHoiCha, detail.MaCauHoiCha, ''),
    order: pickValue(detail.thuTu, detail.ThuTu, 0),
    choiceAnswers:
      rawChoiceAnswers.length > 0
        ? rawChoiceAnswers.map((answer, index) => ({
            label: pickValue(answer.tenDapAn, answer.TenDapAn, String.fromCharCode(65 + index)),
            content: pickValue(answer.noiDungDapAn, answer.NoiDungDapAn, ''),
            isCorrect: Boolean(pickValue(answer.laDapAnDung, answer.LaDapAnDung, false)),
            matchValue: pickValue(answer.giaTriDoiChieu, answer.GiaTriDoiChieu, ''),
            order: pickValue(answer.thuTu, answer.ThuTu, index + 1),
          }))
      : [
          { label: 'A', content: '', isCorrect: false, matchValue: '', order: 1 },
          { label: 'B', content: '', isCorrect: false, matchValue: '', order: 2 },
        ],
    textAnswers:
      rawTextAnswers.length > 0
        ? rawTextAnswers.map((answer) => ({
            answer: pickValue(answer.dapAnChuan, answer.DapAnChuan, ''),
            alternative: pickValue(answer.dapAnThayThe, answer.DapAnThayThe, ''),
            caseSensitive: Boolean(pickValue(answer.phanBietHoaThuong, answer.PhanBietHoaThuong, false)),
          }))
      : [{ answer: '', alternative: '', caseSensitive: false }],
  };
};

const buildQuestionPayload = (form) => ({
  MaKhoaHoc: form.courseId,
  LoaiCauHoiCode: form.questionType,
  MucDoCode: form.difficulty,
  NoiDungCauHoi: form.content,
  GiaiThichDapAn: form.explanation || null,
  AmThanhLink: form.audioLink || null,
  HinhAnhLink: form.imageLink || null,
  MaCauHoiCha: form.parentQuestionId || null,
  ThuTu: Number(form.order || 0),
  ChoiceAnswers: (form.choiceAnswers || []).map((answer, index) => ({
    TenDapAn: answer.label || String.fromCharCode(65 + index),
    NoiDungDapAn: answer.content,
    LaDapAnDung: Boolean(answer.isCorrect),
    GiaTriDoiChieu: answer.matchValue || null,
    ThuTu: Number(answer.order || index + 1),
  })),
  TextAnswers: (form.textAnswers || []).map((answer) => ({
    DapAnChuan: answer.answer,
    DapAnThayThe: answer.alternative || null,
    PhanBietHoaThuong: Boolean(answer.caseSensitive),
  })),
});

const isChoiceQuestionType = (questionType) =>
  ['LCH_MCQ', 'CQ_TRAC_NGHIEM_1', 'CQ_TRAC_NGHIEM_NHIEU', 'LCH_MATCHING', 'CQ_NOI_GHEP', 'CQ_MATCHING_HEADINGS', 'CQ_MATCHING_PARAGRAPH'].includes(questionType);
const isTextQuestionType = (questionType) =>
  ['LCH_GAPFILL', 'CQ_DIEN_KHUYET_TU_NHAP', 'CQ_DIEN_TU_DANH_SACH', 'CQ_WORD_FORM', 'CQ_SHORT_ANSWER', 'LCH_TRANSFORM', 'CQ_TU_LUAN', 'CQ_SENTENCE_TRANSFORM'].includes(questionType);

const AdminAssignmentWorkspace = () => {
  const [bootstrap, setBootstrap] = useState({
    courses: [],
    classes: [],
    assignmentTypes: [],
    publishModes: [],
    questionTypes: [],
    difficultyLevels: [],
  });
  const [assignments, setAssignments] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState('ASSIGNMENTS');
  const [editorAssignment, setEditorAssignment] = useState(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState(createQuestionForm());
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPayload, setImportPayload] = useState(`[
  {
    "MaKhoaHoc": "GUID_KHOA_HOC",
    "LoaiCauHoiCode": "LCH_MCQ",
    "MucDoCode": "DE",
    "NoiDungCauHoi": "Noi dung cau hoi",
    "GiaiThichDapAn": "Giai thich ngan gon",
    "ChoiceAnswers": [
      { "TenDapAn": "A", "NoiDungDapAn": "Lua chon A", "LaDapAnDung": true, "ThuTu": 1 },
      { "TenDapAn": "B", "NoiDungDapAn": "Lua chon B", "LaDapAnDung": false, "ThuTu": 2 }
    ],
    "TextAnswers": []
  }
]`);

  const [assignmentFilters, setAssignmentFilters] = useState({
    search: '',
    courseId: 'ALL',
    assignmentType: 'ALL',
    status: 'ALL',
  });
  const [questionFilters, setQuestionFilters] = useState({
    search: '',
    courseId: 'ALL',
    questionType: 'ALL',
    difficulty: 'ALL',
  });

  const questionTypeMeta = useMemo(() => buildQuestionTypeMeta(bootstrap.questionTypes), [bootstrap.questionTypes]);
  const difficultyMeta = useMemo(() => buildDifficultyMeta(bootstrap.difficultyLevels), [bootstrap.difficultyLevels]);

  const loadInitialData = async () => {
    setLoading(true);

    try {
      const [bootstrapResponse, assignmentResponse, questionResponse] = await Promise.all([
        adminAssignmentService.getBootstrap(),
        adminAssignmentService.getAssignments(),
        adminAssignmentService.getQuestionBank(),
      ]);

      const rawCourses = pickValue(bootstrapResponse.courses, bootstrapResponse.Courses, []);
      const rawClasses = pickValue(bootstrapResponse.classes, bootstrapResponse.Classes, []);
      const rawAssignmentTypes = pickValue(bootstrapResponse.assignmentTypes, bootstrapResponse.AssignmentTypes, []);
      const rawPublishModes = pickValue(bootstrapResponse.publishModes, bootstrapResponse.PublishModes, []);
      const rawQuestionTypes = pickValue(bootstrapResponse.questionTypes, bootstrapResponse.QuestionTypes, []);
      const rawDifficultyLevels = pickValue(bootstrapResponse.difficultyLevels, bootstrapResponse.DifficultyLevels, []);

      setBootstrap({
        courses: rawCourses.map((course) => ({
          id: pickValue(course.maKhoaHoc, course.MaKhoaHoc),
          name: pickValue(course.tenKhoaHoc, course.TenKhoaHoc, ''),
          totalClasses: pickValue(course.soLopHoc, course.SoLopHoc, 0),
          totalAssignments: pickValue(course.soBaiTap, course.SoBaiTap, 0),
          totalQuestions: pickValue(course.soCauHoi, course.SoCauHoi, 0),
        })),
        classes: rawClasses.map((item) => ({
          id: pickValue(item.maLopHoc, item.MaLopHoc),
          courseId: pickValue(item.maKhoaHoc, item.MaKhoaHoc),
          name: pickValue(item.tenLop, item.TenLop, ''),
          teacher: pickValue(item.tenGiangVien, item.TenGiangVien, ''),
          students: pickValue(item.soHocVien, item.SoHocVien, 0),
        })),
        assignmentTypes: rawAssignmentTypes.map(normalizeOption),
        publishModes: rawPublishModes.map(normalizeOption),
        questionTypes: rawQuestionTypes.map(normalizeOption),
        difficultyLevels: rawDifficultyLevels.map(normalizeOption),
      });
      setAssignments((assignmentResponse || []).map(normalizeAssignment));
      setQuestionBank((questionResponse || []).map(normalizeQuestionBankItem));
    } catch (error) {
      toast.error(error.message || 'Khong the tai du lieu bai tap/de thi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const assignmentStats = useMemo(
    () => ({
      totalAssignments: assignments.length,
      activeAssignments: assignments.filter((item) => item.statusKey === 'ACTIVE').length,
      draftAssignments: assignments.filter((item) => item.statusKey === 'DRAFT' || item.statusKey === 'NEEDS_SETUP').length,
      needsGrading: assignments.reduce((sum, item) => sum + Number(item.submissionStats?.needsGrading || 0), 0),
    }),
    [assignments]
  );

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchedSearch =
        assignment.title.toLowerCase().includes(assignmentFilters.search.toLowerCase()) ||
        assignment.code.toLowerCase().includes(assignmentFilters.search.toLowerCase());
      const matchedCourse = assignmentFilters.courseId === 'ALL' || assignment.courseId === assignmentFilters.courseId;
      const matchedType = assignmentFilters.assignmentType === 'ALL' || assignment.assignmentKind === assignmentFilters.assignmentType;
      const matchedStatus = assignmentFilters.status === 'ALL' || assignment.statusKey === assignmentFilters.status;
      return matchedSearch && matchedCourse && matchedType && matchedStatus;
    });
  }, [assignmentFilters, assignments]);

  const filteredQuestionBank = useMemo(() => {
    return questionBank.filter((question) => {
      const matchedSearch = question.content.toLowerCase().includes(questionFilters.search.toLowerCase());
      const matchedCourse = questionFilters.courseId === 'ALL' || question.courseId === questionFilters.courseId;
      const matchedType = questionFilters.questionType === 'ALL' || question.questionType === questionFilters.questionType;
      const matchedDifficulty = questionFilters.difficulty === 'ALL' || question.difficulty === questionFilters.difficulty;
      return matchedSearch && matchedCourse && matchedType && matchedDifficulty;
    });
  }, [questionBank, questionFilters]);

  const openCreateAssignment = () => {
    setEditorAssignment(createAssignmentDraft(bootstrap.assignmentTypes, bootstrap.publishModes));
  };

  const openEditAssignment = async (assignmentId) => {
    try {
      const detail = await adminAssignmentService.getAssignmentDetail(assignmentId);
      setEditorAssignment(normalizeAssignment(detail));
    } catch (error) {
      toast.error(error.message || 'Khong the tai chi tiet bai tap/de thi.');
    }
  };

  const handleSaveAssignment = async (draft) => {
    const payload = {
      Code: draft.code || null,
      TenBaiTap: draft.title,
      MoTa: draft.description || null,
      MaKhoaHoc: draft.courseId,
      LoaiBaiTapCode: draft.assignmentKind,
      PublishMode: draft.publishMode,
      ThoiGianLamBai: draft.assignmentKind === 'HOMEWORK' ? 0 : Number(draft.durationMinutes || 0),
      DiemToiDa: Number(draft.totalScore || 0),
      MaxAttempts: Number(draft.maxAttempts || 1),
      OpenAt: draft.openAt || null,
      DueAt: draft.assignmentKind === 'HOMEWORK' ? draft.dueAt || null : null,
      AllowLateSubmission: Boolean(draft.allowLateSubmission),
      ShowScoreWhenDone: Boolean(draft.showScoreWhenDone),
      ShowAnswerAfterDeadline: Boolean(draft.showAnswerAfterDeadline),
      ShuffleQuestions: Boolean(draft.shuffleQuestions),
      ShuffleAnswers: Boolean(draft.shuffleAnswers),
      AutoGradeObjective: Boolean(draft.autoGradeObjective),
      RequireManualReview: Boolean(draft.requireManualReview),
      AccessCode: draft.accessCode || null,
      ScoreMode: draft.scoreMode,
      SelectedClassIds: draft.selectedClassIds,
      SelectedQuestions: draft.selectedQuestions.map((question) => ({
        MaCauHoi: question.id,
        ThuTu: question.order,
        DiemCuaCau: Number(question.score || 0),
      })),
    };

    const response = draft.id
      ? await adminAssignmentService.updateAssignment(draft.id, payload)
      : await adminAssignmentService.createAssignment(payload);

    const normalized = normalizeAssignment(response);
    const refreshedAssignments = await adminAssignmentService.getAssignments();
    setAssignments((refreshedAssignments || []).map(normalizeAssignment));
    toast.success(draft.id ? 'Cap nhat bai tap/de thi thanh cong.' : 'Tao bai tap/de thi thanh cong.');
    return normalized;
  };

  const handleDeleteAssignment = async (assignmentId) => {
    const shouldDelete = window.confirm('Ban co chac muon xoa bai tap/de thi nay?');
    if (!shouldDelete) {
      return;
    }

    try {
      await adminAssignmentService.deleteAssignment(assignmentId);
      const refreshedAssignments = await adminAssignmentService.getAssignments();
      setAssignments((refreshedAssignments || []).map(normalizeAssignment));
      toast.success('Da xoa bai tap/de thi.');
    } catch (error) {
      toast.error(error.message || 'Khong the xoa bai tap/de thi.');
    }
  };

  const openCreateQuestion = () => {
    setQuestionForm(createQuestionForm(bootstrap.questionTypes, bootstrap.difficultyLevels));
    setQuestionModalOpen(true);
  };

  const openEditQuestion = async (questionId) => {
    try {
      const detail = await adminAssignmentService.getQuestionDetail(questionId);
      setQuestionForm(normalizeQuestionDetailToForm(detail, bootstrap.questionTypes, bootstrap.difficultyLevels));
      setQuestionModalOpen(true);
    } catch (error) {
      toast.error(error.message || 'Khong the tai chi tiet cau hoi.');
    }
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setQuestionSubmitting(false);
  };

  const refreshQuestionBank = async () => {
    const refreshed = await adminAssignmentService.getQuestionBank();
    setQuestionBank((refreshed || []).map(normalizeQuestionBankItem));
  };

  const handleSaveQuestion = async () => {
    setQuestionSubmitting(true);

    try {
      const payload = buildQuestionPayload(questionForm);
      if (questionForm.id) {
        await adminAssignmentService.updateQuestion(questionForm.id, payload);
        toast.success('Cap nhat cau hoi thanh cong.');
      } else {
        await adminAssignmentService.createQuestion(payload);
        toast.success('Tao cau hoi thanh cong.');
      }

      await refreshQuestionBank();
      closeQuestionModal();
    } catch (error) {
      setQuestionSubmitting(false);
      toast.error(error.message || 'Khong the luu cau hoi.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const shouldDelete = window.confirm('Ban co chac muon xoa cau hoi nay?');
    if (!shouldDelete) {
      return;
    }

    try {
      await adminAssignmentService.deleteQuestion(questionId);
      await refreshQuestionBank();
      toast.success('Da xoa cau hoi.');
    } catch (error) {
      toast.error(error.message || 'Khong the xoa cau hoi.');
    }
  };

  const handleImportQuestions = async () => {
    try {
      const parsed = JSON.parse(importPayload);
      const payload = Array.isArray(parsed) ? { Questions: parsed } : parsed;
      if (!payload?.Questions || !Array.isArray(payload.Questions)) {
        throw new Error('JSON import phai la mot mang cau hoi hoac object co truong Questions.');
      }

      await adminAssignmentService.importQuestions(payload);
      await refreshQuestionBank();
      setImportModalOpen(false);
      toast.success('Import ngan hang cau hoi thanh cong.');
    } catch (error) {
      toast.error(error.message || 'Khong the import ngan hang cau hoi.');
    }
  };

  const parentQuestionOptions = useMemo(() => {
    return questionBank.filter((question) => question.courseId === questionForm.courseId && question.id !== questionForm.id);
  }, [questionBank, questionForm.courseId, questionForm.id]);

  const resetAssignmentFilters = () => {
    setAssignmentFilters({ search: '', courseId: 'ALL', assignmentType: 'ALL', status: 'ALL' });
  };

  const resetQuestionFilters = () => {
    setQuestionFilters({ search: '', courseId: 'ALL', questionType: 'ALL', difficulty: 'ALL' });
  };

  if (editorAssignment) {
    return (
      <>
        <Toaster position="top-right" />
        <AdminAssignmentBuilder
          assignment={editorAssignment}
          courses={bootstrap.courses}
          classes={bootstrap.classes}
          questionBank={questionBank}
          questionTypeMeta={questionTypeMeta}
          difficultyMeta={difficultyMeta}
          assignmentTypeOptions={bootstrap.assignmentTypes}
          publishModeOptions={bootstrap.publishModes}
          onBack={() => setEditorAssignment(null)}
          onSave={async (draft) => {
            const normalized = await handleSaveAssignment(draft);
            setEditorAssignment(normalized);
            return normalized;
          }}
        />
      </>
    );
  }

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <Toaster position="top-right" />

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quan ly bai tap va de thi</h3>
          <div className="text-muted">
            Quan ly dau bai, giao bai cho lop hoc, va van hanh ngan hang cau hoi cho admin.
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            className={`btn ${activePanel === 'ASSIGNMENTS' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActivePanel('ASSIGNMENTS')}
          >
            <BookOpen size={16} className="me-2" />
            Bai tap / De thi
          </button>
          <button
            className={`btn ${activePanel === 'QUESTION_BANK' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActivePanel('QUESTION_BANK')}
          >
            <FileJson size={16} className="me-2" />
            Ngan hang cau hoi
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center text-muted">Dang tai du lieu...</div>
        </div>
      ) : activePanel === 'ASSIGNMENTS' ? (
        <>
          <div className="row g-3 mb-4">
            {[
              { label: 'Tong dau bai', value: assignmentStats.totalAssignments, color: 'primary', icon: BookOpen },
              { label: 'Dang mo bai', value: assignmentStats.activeAssignments, color: 'success', icon: CalendarDays },
              { label: 'Dang nhap / can setup', value: assignmentStats.draftAssignments, color: 'warning', icon: Settings2 },
              { label: 'Cho cham tay', value: assignmentStats.needsGrading, color: 'danger', icon: CheckCircle2 },
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
                <div className="col-lg-4">
                  <label className="form-label small fw-semibold text-muted">Tim kiem</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={16} />
                    </span>
                    <input
                      className="form-control border-start-0"
                      value={assignmentFilters.search}
                      onChange={(event) => setAssignmentFilters((prev) => ({ ...prev, search: event.target.value }))}
                      placeholder="Tim theo ma hoac ten de"
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Khoa hoc</label>
                  <select
                    className="form-select"
                    value={assignmentFilters.courseId}
                    onChange={(event) => setAssignmentFilters((prev) => ({ ...prev, courseId: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {bootstrap.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Loai</label>
                  <select
                    className="form-select"
                    value={assignmentFilters.assignmentType}
                    onChange={(event) => setAssignmentFilters((prev) => ({ ...prev, assignmentType: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {bootstrap.assignmentTypes.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Trang thai</label>
                  <select
                    className="form-select"
                    value={assignmentFilters.status}
                    onChange={(event) => setAssignmentFilters((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {Object.entries(ASSIGNMENT_STATUS_META).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2 d-flex gap-2">
                  <button className="btn btn-light border flex-grow-1" onClick={resetAssignmentFilters}>
                    <Filter size={16} className="me-2" />
                    Loc lai
                  </button>
                  <button className="btn btn-primary flex-grow-1" onClick={openCreateAssignment}>
                    <Plus size={16} className="me-2" />
                    Tao moi
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
                    <th className="ps-4">Dau bai</th>
                    <th>Khoa hoc</th>
                    <th className="text-center">Lop / Hoc vien</th>
                    <th>Lich mo bai</th>
                    <th className="text-center">Tien do</th>
                    <th className="text-center">Trang thai</th>
                    <th className="text-center">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => {
                    const statusMeta = ASSIGNMENT_STATUS_META[assignment.statusKey] || ASSIGNMENT_STATUS_META.DRAFT;
                    const typeMeta = {
                      label: bootstrap.assignmentTypes.find((item) => item.code === assignment.assignmentKind)?.label || assignment.assignmentKind,
                      tone: TYPE_TONE_LOOKUP[assignment.assignmentKind] || 'secondary',
                    };
                    const progressValue = assignment.submissionStats.totalStudents
                      ? Math.round((assignment.submissionStats.submitted / assignment.submissionStats.totalStudents) * 100)
                      : 0;

                    return (
                      <tr key={assignment.id}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{assignment.title}</div>
                          <div className="small text-muted mt-1">
                            {assignment.code} · {assignment.selectedQuestions.length || assignment.totalQuestions || 0} cau · {assignment.durationMinutes || 0} phut
                          </div>
                          <div className="mt-2">
                            <span className={`badge bg-${typeMeta.tone}-subtle text-${typeMeta.tone}`}>{typeMeta.label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium">{assignment.courseName || 'Chua gan khoa hoc'}</div>
                          <div className="small text-muted">{assignment.description || 'Chua co mo ta.'}</div>
                        </td>
                        <td className="text-center">
                          <div className="fw-semibold">{assignment.totalClasses || 0} lop</div>
                          <div className="small text-muted">{assignment.totalStudents || 0} hoc vien</div>
                        </td>
                        <td>
                          <div className="small">Mo bai: {assignment.openAt ? assignment.openAt.replace('T', ' ') : 'Chua dat'}</div>
                          <div className="small text-muted">Han nop: {assignment.dueAt ? assignment.dueAt.replace('T', ' ') : 'Tu dong tinh/Chua dat'}</div>
                        </td>
                        <td className="text-center">
                          <div className="fw-semibold mb-1">
                            {assignment.submissionStats.submitted}/{assignment.submissionStats.totalStudents || 0}
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div className="progress-bar" style={{ width: `${progressValue}%` }} />
                          </div>
                          <div className="small text-muted mt-1">Cho cham tay: {assignment.submissionStats.needsGrading || 0}</div>
                        </td>
                        <td className="text-center">
                          <span className={`badge bg-${statusMeta.tone}-subtle text-${statusMeta.tone}`}>{statusMeta.label}</span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group">
                            <button className="btn btn-sm btn-primary" onClick={() => openEditAssignment(assignment.id)}>
                              <Settings2 size={14} className="me-1" />
                              Thiet lap
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditAssignment(assignment.id)} title="Chinh sua">
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteAssignment(assignment.id)} title="Xoa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        Khong tim thay bai tap/de thi phu hop bo loc hien tai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-lg-4">
                  <label className="form-label small fw-semibold text-muted">Tim kiem</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={16} />
                    </span>
                    <input
                      className="form-control border-start-0"
                      value={questionFilters.search}
                      onChange={(event) => setQuestionFilters((prev) => ({ ...prev, search: event.target.value }))}
                      placeholder="Tim noi dung cau hoi"
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Khoa hoc</label>
                  <select
                    className="form-select"
                    value={questionFilters.courseId}
                    onChange={(event) => setQuestionFilters((prev) => ({ ...prev, courseId: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {bootstrap.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Loai cau hoi</label>
                  <select
                    className="form-select"
                    value={questionFilters.questionType}
                    onChange={(event) => setQuestionFilters((prev) => ({ ...prev, questionType: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {bootstrap.questionTypes.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2">
                  <label className="form-label small fw-semibold text-muted">Muc do</label>
                  <select
                    className="form-select"
                    value={questionFilters.difficulty}
                    onChange={(event) => setQuestionFilters((prev) => ({ ...prev, difficulty: event.target.value }))}
                  >
                    <option value="ALL">Tat ca</option>
                    {bootstrap.difficultyLevels.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2 d-flex gap-2">
                  <button className="btn btn-light border flex-grow-1" onClick={resetQuestionFilters}>
                    <Filter size={16} className="me-2" />
                    Loc lai
                  </button>
                  <button className="btn btn-primary flex-grow-1" onClick={openCreateQuestion}>
                    <Plus size={16} className="me-2" />
                    Them
                  </button>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-3">
                <button className="btn btn-outline-primary" onClick={openCreateQuestion}>
                  <Plus size={16} className="me-2" />
                  Nhap tay cau hoi
                </button>
                <button className="btn btn-outline-success" onClick={() => setImportModalOpen(true)}>
                  <Upload size={16} className="me-2" />
                  Import JSON
                </button>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th className="ps-4">Cau hoi</th>
                    <th>Khoa hoc</th>
                    <th className="text-center">Loai</th>
                    <th className="text-center">Muc do</th>
                    <th className="text-center">Dap an</th>
                    <th className="text-center">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestionBank.map((question) => {
                    const typeMeta = questionTypeMeta[question.questionType] || { label: question.questionTypeLabel, tone: 'secondary' };
                    const difficulty = difficultyMeta[question.difficulty] || { label: question.difficultyLabel, tone: 'secondary' };

                    return (
                      <tr key={question.id}>
                        <td className="ps-4">
                          <div className="fw-medium">{question.content}</div>
                          <div className="small text-muted mt-1">
                            {question.id} · Thu tu: {question.order || 0}
                          </div>
                        </td>
                        <td>{question.courseName}</td>
                        <td className="text-center">
                          <span className={`badge bg-${typeMeta.tone}-subtle text-${typeMeta.tone}`}>{typeMeta.label}</span>
                        </td>
                        <td className="text-center">
                          <span className={`badge bg-${difficulty.tone}-subtle text-${difficulty.tone}`}>{difficulty.label}</span>
                        </td>
                        <td className="text-center">
                          <div className="small">{question.choiceAnswerCount || 0} lua chon</div>
                          <div className="small text-muted">{question.textAnswerCount || 0} nhap lieu</div>
                        </td>
                        <td className="text-center">
                          <div className="btn-group">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditQuestion(question.id)}>
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteQuestion(question.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredQuestionBank.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        Chua co cau hoi nao phu hop bo loc hien tai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {questionModalOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">{questionForm.id ? 'Cap nhat cau hoi' : 'Them cau hoi moi'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeQuestionModal} />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Khoa hoc</label>
                    <select
                      className="form-select"
                      value={questionForm.courseId}
                      onChange={(event) =>
                        setQuestionForm((prev) => ({ ...prev, courseId: event.target.value, parentQuestionId: '' }))
                      }
                    >
                      <option value="">Chon khoa hoc</option>
                      {bootstrap.courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Loai cau hoi</label>
                    <select
                      className="form-select"
                      value={questionForm.questionType}
                      onChange={(event) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          questionType: event.target.value,
                          choiceAnswers: isChoiceQuestionType(event.target.value)
                            ? prev.choiceAnswers.length
                              ? prev.choiceAnswers
                              : [
                                  { label: 'A', content: '', isCorrect: false, matchValue: '', order: 1 },
                                  { label: 'B', content: '', isCorrect: false, matchValue: '', order: 2 },
                                ]
                            : prev.choiceAnswers,
                          textAnswers: isTextQuestionType(event.target.value)
                            ? prev.textAnswers.length
                              ? prev.textAnswers
                              : [{ answer: '', alternative: '', caseSensitive: false }]
                            : prev.textAnswers,
                        }))
                      }
                    >
                      {bootstrap.questionTypes.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Muc do</label>
                    <select
                      className="form-select"
                      value={questionForm.difficulty}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                    >
                      {bootstrap.difficultyLevels.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-8">
                    <label className="form-label fw-semibold">Noi dung cau hoi</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={questionForm.content}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, content: event.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Cau hoi cha (neu co)</label>
                    <select
                      className="form-select"
                      value={questionForm.parentQuestionId}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, parentQuestionId: event.target.value }))}
                    >
                      <option value="">Khong co</option>
                      {parentQuestionOptions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.content.slice(0, 60)}
                        </option>
                      ))}
                    </select>
                    <label className="form-label fw-semibold mt-3">Thu tu</label>
                    <input
                      type="number"
                      className="form-control"
                      value={questionForm.order}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, order: Number(event.target.value) }))}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Giai thich dap an</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={questionForm.explanation}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, explanation: event.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Audio link</label>
                    <input
                      className="form-control"
                      value={questionForm.audioLink}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, audioLink: event.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Image link</label>
                    <input
                      className="form-control"
                      value={questionForm.imageLink}
                      onChange={(event) => setQuestionForm((prev) => ({ ...prev, imageLink: event.target.value }))}
                    />
                  </div>

                  {isChoiceQuestionType(questionForm.questionType) && (
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0">Dap an lua chon</h6>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              choiceAnswers: [
                                ...prev.choiceAnswers,
                                {
                                  label: String.fromCharCode(65 + prev.choiceAnswers.length),
                                  content: '',
                                  isCorrect: false,
                                  matchValue: '',
                                  order: prev.choiceAnswers.length + 1,
                                },
                              ],
                            }))
                          }
                        >
                          <Plus size={14} className="me-1" />
                          Them dap an
                        </button>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th style={{ width: '80px' }}>Nhan</th>
                              <th>Noi dung</th>
                              {questionForm.questionType === 'LCH_MATCHING' && <th>Gia tri doi chieu</th>}
                              {questionForm.questionType === 'LCH_MCQ' && <th style={{ width: '110px' }}>Dap an dung</th>}
                              <th style={{ width: '80px' }}>STT</th>
                              <th style={{ width: '70px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {questionForm.choiceAnswers.map((answer, index) => (
                              <tr key={`${answer.label}-${index}`}>
                                <td>
                                  <input
                                    className="form-control"
                                    value={answer.label}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        choiceAnswers: prev.choiceAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, label: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="form-control"
                                    value={answer.content}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        choiceAnswers: prev.choiceAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, content: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                {questionForm.questionType === 'LCH_MATCHING' && (
                                  <td>
                                    <input
                                      className="form-control"
                                      value={answer.matchValue}
                                      onChange={(event) =>
                                        setQuestionForm((prev) => ({
                                          ...prev,
                                          choiceAnswers: prev.choiceAnswers.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, matchValue: event.target.value } : item
                                          ),
                                        }))
                                      }
                                    />
                                  </td>
                                )}
                                {questionForm.questionType === 'LCH_MCQ' && (
                                  <td className="text-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(answer.isCorrect)}
                                      onChange={(event) =>
                                        setQuestionForm((prev) => ({
                                          ...prev,
                                          choiceAnswers: prev.choiceAnswers.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, isCorrect: event.target.checked } : item
                                          ),
                                        }))
                                      }
                                    />
                                  </td>
                                )}
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={answer.order}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        choiceAnswers: prev.choiceAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, order: Number(event.target.value) } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-end">
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        choiceAnswers:
                                          prev.choiceAnswers.length > 1
                                            ? prev.choiceAnswers.filter((_, itemIndex) => itemIndex !== index)
                                            : prev.choiceAnswers,
                                      }))
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {isTextQuestionType(questionForm.questionType) && (
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0">Dap an nhap lieu</h6>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              textAnswers: [...prev.textAnswers, { answer: '', alternative: '', caseSensitive: false }],
                            }))
                          }
                        >
                          <Plus size={14} className="me-1" />
                          Them dap an
                        </button>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th>Dap an chuan</th>
                              <th>Dap an thay the</th>
                              <th style={{ width: '140px' }}>Phan biet hoa thuong</th>
                              <th style={{ width: '70px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {questionForm.textAnswers.map((answer, index) => (
                              <tr key={`text-answer-${index}`}>
                                <td>
                                  <input
                                    className="form-control"
                                    value={answer.answer}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        textAnswers: prev.textAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, answer: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="form-control"
                                    value={answer.alternative}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        textAnswers: prev.textAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, alternative: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={Boolean(answer.caseSensitive)}
                                    onChange={(event) =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        textAnswers: prev.textAnswers.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, caseSensitive: event.target.checked } : item
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-end">
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        textAnswers:
                                          prev.textAnswers.length > 1
                                            ? prev.textAnswers.filter((_, itemIndex) => itemIndex !== index)
                                            : prev.textAnswers,
                                      }))
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button className="btn btn-light" onClick={closeQuestionModal}>
                  Huy
                </button>
                <button className="btn btn-primary" onClick={handleSaveQuestion} disabled={questionSubmitting}>
                  {questionSubmitting ? 'Dang luu...' : 'Luu cau hoi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Import ngan hang cau hoi bang JSON</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setImportModalOpen(false)} />
              </div>
              <div className="modal-body">
                <p className="text-muted">
                  Dan JSON array hoac object co truong <code>Questions</code>. Moi phan tu chinh la payload tao cau hoi.
                </p>
                <textarea
                  className="form-control font-monospace"
                  rows="16"
                  value={importPayload}
                  onChange={(event) => setImportPayload(event.target.value)}
                />
              </div>
              <div className="modal-footer bg-light">
                <button className="btn btn-light" onClick={() => setImportModalOpen(false)}>
                  Huy
                </button>
                <button className="btn btn-success" onClick={handleImportQuestions}>
                  <Upload size={16} className="me-2" />
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssignmentWorkspace;
