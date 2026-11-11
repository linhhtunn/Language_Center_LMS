import adminAssignmentService from './adminAssignmentService';

const mapQuestionBankItemToLegacyExercise = (item) => ({
  id: item.MaCauHoi || item.maCauHoi,
  code: item.MaCauHoi || item.maCauHoi ? `BT-${String(item.MaCauHoi || item.maCauHoi).slice(0, 8).toUpperCase()}` : '',
  title: item.NoiDungCauHoi || item.noiDungCauHoi || '',
  questionFormat: item.LoaiCauHoiLabel || item.loaiCauHoiLabel || '',
  unit: item.TenKhoaHoc || item.tenKhoaHoc || '',
  content: item.NoiDungCauHoi || item.noiDungCauHoi || '',
  audioUrl: item.AmThanhLink || item.amThanhLink || '',
  imageUrl: item.HinhAnhLink || item.hinhAnhLink || '',
  note: item.GiaiThichDapAn || item.giaiThichDapAn || '',
  status: 'Đã duyệt',
  createdAt: item.ThoiGianTao || item.thoiGianTao || new Date().toISOString(),
  childQuestions: [],
});

const mapAssignmentToLegacy = (item) => ({
  id: item.MaBaiTap || item.maBaiTap,
  code: item.Code || item.code || '',
  title: item.TenBaiTap || item.tenBaiTap || '',
  type: (item.LoaiBaiTapCode || item.loaiBaiTapCode || 'HOMEWORK') === 'EXAM' ? 'Đề thi' : 'Bài tập',
  level: item.TenKhoaHoc || item.tenKhoaHoc || 'IELTS',
  difficulty: item.StatusKey || item.statusKey || 'Nháp',
  skill: 'Đọc',
  totalItems: item.TotalQuestions || item.totalQuestions || 0,
  durationMinutes: item.ThoiGianLamBai || item.thoiGianLamBai || 0,
  status: item.StatusKey === 'ACTIVE' ? 'Đã giao' : item.StatusKey === 'CLOSED' ? 'Đã đóng' : item.StatusKey === 'SCHEDULED' ? 'Đã tạo' : 'Nháp',
  createdAt: item.UpdatedAt || item.updatedAt || item.ThoiGianTao || item.thoiGianTao || new Date().toISOString(),
  targetClasses: item.SelectedClassIds || item.selectedClassIds || [],
  targetStudents: [],
  studentsDone: item.SubmissionStats?.Submitted || item.submissionStats?.submitted || 0,
  averageScore: 0,
});

export const adminExerciseExamManagementService = {
  async getExerciseExams() {
    const items = await adminAssignmentService.getAssignments();
    return Array.isArray(items) ? items.map(mapAssignmentToLegacy) : [];
  },
  assignExerciseExam(payload) {
    return adminAssignmentService.createAssignment(payload);
  },
  async getQuestionBanks() {
    const items = await adminAssignmentService.getQuestionBank();
    if (!Array.isArray(items)) {
      return [];
    }

    const grouped = new Map();
    items.forEach((item) => {
      const courseId = item.MaKhoaHoc || item.maKhoaHoc || 'UNKNOWN';
      const bucket = grouped.get(courseId) || [];
      bucket.push(item);
      grouped.set(courseId, bucket);
    });

    return Array.from(grouped.entries()).map(([courseId, questionItems]) => {
      const first = questionItems[0] || {};
      return {
        id: `QB-${courseId}`,
        code: `NHD-${String(courseId).slice(0, 8).toUpperCase()}`,
        name: `Ngân hàng ${first.TenKhoaHoc || first.tenKhoaHoc || courseId}`,
        level: first.TrinhDoCode || first.trinhDoCode || 'IELTS',
        difficulty: first.MucDoLabel || first.mucDoLabel || 'Trung bình',
        skill: 'Đọc',
        unit: first.TenKhoaHoc || first.tenKhoaHoc || '',
        description: `Ngân hàng câu hỏi từ ${first.TenKhoaHoc || first.tenKhoaHoc || courseId}`,
        status: 'Đang sử dụng',
        createdAt: first.ThoiGianTao || first.thoiGianTao || new Date().toISOString(),
        exercises: questionItems.map(mapQuestionBankItemToLegacyExercise),
      };
    });
  },
  createQuestionBank(payload) {
    return adminAssignmentService.createQuestion(payload);
  },
  updateQuestionBank(id, payload) {
    return adminAssignmentService.updateQuestion(id, payload);
  },
  deleteQuestionBank(id) {
    return adminAssignmentService.deleteQuestion(id);
  },
  async getQuestionBankExercises(id) {
    const items = await adminAssignmentService.getQuestionBank({ courseId: id });
    return Array.isArray(items) ? items.map(mapQuestionBankItemToLegacyExercise) : [];
  },
  createQuestionBankExercise(id, payload) {
    return adminAssignmentService.createQuestion({ ...payload, MaKhoaHoc: id });
  },
  updateQuestionBankExercise(id, exerciseId, payload) {
    return adminAssignmentService.updateQuestion(exerciseId, { ...payload, MaKhoaHoc: id });
  },
  deleteQuestionBankExercise(id, exerciseId) {
    return adminAssignmentService.deleteQuestion(exerciseId);
  },
  approveQuestionBankExercise(id, exerciseId) {
    return adminAssignmentService.updateQuestion(exerciseId, { MaKhoaHoc: id });
  },
  deactivateQuestionBankExercise(id, exerciseId) {
    return adminAssignmentService.updateQuestion(exerciseId, { MaKhoaHoc: id });
  },
  createExamTemplate(id, payload) {
    return adminAssignmentService.createAssignment(payload);
  },
  saveSourcePool(id, payload) {
    return adminAssignmentService.saveSourcePool(id, payload);
  },
  generateExams(id, payload) {
    return adminAssignmentService.generateExams(id, payload);
  },
};

export default adminExerciseExamManagementService;
