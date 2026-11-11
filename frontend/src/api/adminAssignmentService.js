import apiClient from './BaseApi';

const ensureSuccess = (response, fallbackMessage) => {
  const isError = response?.success === false || response?.Success === false;

  if (isError) {
    const error = new Error(response.message || response.Message || fallbackMessage);
    error.status = response.status;
    error.response = response.raw || response;
    throw error;
  }

  return response;
};

const unwrapData = (response) => {
  if (response?.Success === true) {
    return response.Data;
  }

  if (response?.success === true) {
    return response.data;
  }

  return response;
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, value);
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const adminAssignmentService = {
  getBootstrap: async () => {
    const response = ensureSuccess(
      await apiClient.get('/AdminAssignment/bootstrap'),
      'Khong the tai du lieu khoi tao bai tap.'
    );

    return unwrapData(response);
  },

  getAssignments: async (filters = {}) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/assignments${buildQueryString(filters)}`),
      'Khong the tai danh sach bai tap/de thi.'
    );

    return unwrapData(response);
  },

  getAssignmentDetail: async (assignmentId) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/assignments/${assignmentId}`),
      'Khong the tai chi tiet bai tap/de thi.'
    );

    return unwrapData(response);
  },

  createAssignment: async (payload) => {
    const response = ensureSuccess(
      await apiClient.post('/AdminAssignment/assignments', payload),
      'Khong the tao bai tap/de thi.'
    );

    return unwrapData(response);
  },

  updateAssignment: async (assignmentId, payload) => {
    const response = ensureSuccess(
      await apiClient.put(`/AdminAssignment/assignments/${assignmentId}`, payload),
      'Khong the cap nhat bai tap/de thi.'
    );

    return unwrapData(response);
  },

  deleteAssignment: async (assignmentId) => {
    const response = ensureSuccess(
      await apiClient.delete(`/AdminAssignment/assignments/${assignmentId}`),
      'Khong the xoa bai tap/de thi.'
    );

    return unwrapData(response);
  },

  // ---- Ngân hàng đề (bảng nganhangde) ----
  // Trước đây ngân hàng chỉ là kết quả gom nhóm ở frontend nên mọi thao tác
  // thêm/sửa/xoá đều mất sau khi tải lại trang.

  getQuestionBankGroups: async (filters = {}) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/question-bank-groups${buildQueryString(filters)}`),
      'Khong the tai danh sach ngan hang de.'
    );

    return unwrapData(response);
  },

  createQuestionBankGroup: async (payload) => {
    const response = ensureSuccess(
      await apiClient.post('/AdminAssignment/question-bank-groups', payload),
      'Khong the tao ngan hang de.'
    );

    return unwrapData(response);
  },

  updateQuestionBankGroup: async (bankId, payload) => {
    const response = ensureSuccess(
      await apiClient.put(`/AdminAssignment/question-bank-groups/${bankId}`, payload),
      'Khong the cap nhat ngan hang de.'
    );

    return unwrapData(response);
  },

  updateQuestionBankGroupStatus: async (bankId, trangThai) => {
    const response = ensureSuccess(
      await apiClient.patch(`/AdminAssignment/question-bank-groups/${bankId}/status`, { trangThai }),
      'Khong the doi trang thai ngan hang de.'
    );

    return unwrapData(response);
  },

  deleteQuestionBankGroup: async (bankId) => {
    const response = ensureSuccess(
      await apiClient.delete(`/AdminAssignment/question-bank-groups/${bankId}`),
      'Khong the xoa ngan hang de.'
    );

    return unwrapData(response);
  },

  /**
   * Sinh đề tự động. Chỉ gửi CẤU TRÚC đề (mỗi phần cần bao nhiêu bài, lấy từ
   * ngân hàng nào, dạng gì) — backend tự bốc ngẫu nhiên, kiểm tra kho có đủ
   * bài không và sinh mã đề. Trước đây trình duyệt tự bốc rồi gửi kết quả.
   */
  generateExamsFromBank: async (bankId, payload) => {
    const response = ensureSuccess(
      await apiClient.post(`/AdminAssignment/question-bank-groups/${bankId}/generate`, payload),
      'Khong the sinh de.'
    );

    return unwrapData(response);
  },

  /** Lớp và học sinh THẬT để chọn khi giao bài (trước đây dùng dữ liệu giả). */
  getDistributionTargets: async (filters = {}) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/distribution-targets${buildQueryString(filters)}`),
      'Khong the tai danh sach lop / hoc sinh.'
    );

    return unwrapData(response);
  },

  /** Giao một hoặc nhiều mã đề cho lớp / học sinh. */
  distributeAssignments: async (payload) => {
    const response = ensureSuccess(
      await apiClient.post('/AdminAssignment/assignments/distribute', payload),
      'Khong the giao bai.'
    );

    return unwrapData(response);
  },

  getQuestionBank: async (filters = {}) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/question-bank${buildQueryString(filters)}`),
      'Khong the tai ngan hang cau hoi.'
    );

    return unwrapData(response);
  },

  getQuestionDetail: async (questionId) => {
    const response = ensureSuccess(
      await apiClient.get(`/AdminAssignment/question-bank/${questionId}`),
      'Khong the tai chi tiet cau hoi.'
    );

    return unwrapData(response);
  },

  createQuestion: async (payload) => {
    const response = ensureSuccess(
      await apiClient.post('/AdminAssignment/question-bank', payload),
      'Khong the tao cau hoi.'
    );

    return unwrapData(response);
  },

  updateQuestion: async (questionId, payload) => {
    const response = ensureSuccess(
      await apiClient.put(`/AdminAssignment/question-bank/${questionId}`, payload),
      'Khong the cap nhat cau hoi.'
    );

    return unwrapData(response);
  },

  updateQuestionStatus: async (questionId, trangThai) => {
    const response = ensureSuccess(
      await apiClient.patch(`/AdminAssignment/question-bank/${questionId}/status`, { trangThai }),
      'Khong the doi trang thai bai tap.'
    );

    return unwrapData(response);
  },

  deleteQuestion: async (questionId) => {
    const response = ensureSuccess(
      await apiClient.delete(`/AdminAssignment/question-bank/${questionId}`),
      'Khong the xoa cau hoi.'
    );

    return unwrapData(response);
  },

  saveSourcePool: async (bankId, payload) => {
    const response = ensureSuccess(
      await apiClient.post(`/AdminAssignment/question-bank/${bankId}/source-pool`, payload),
      'Khong the luu cau truc nguon.'
    );

    return unwrapData(response);
  },

  generateExams: async (bankId, payload) => {
    const response = ensureSuccess(
      await apiClient.post(`/AdminAssignment/question-bank/${bankId}/generate-exams`, payload),
      'Khong the sinh de.'
    );

    return unwrapData(response);
  },

  importQuestions: async (payload) => {
    const response = ensureSuccess(
      await apiClient.post('/AdminAssignment/question-bank/import', payload),
      'Khong the import ngan hang cau hoi.'
    );

    return unwrapData(response);
  },
};

export default adminAssignmentService;
