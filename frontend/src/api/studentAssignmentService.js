import BaseApi from './BaseApi';

export const getStudentAssignments = async () => {
    try {
        const response = await BaseApi.get('/StudentAssignment');
        return response;
    } catch (error) {
        throw error;
    }
};

export const getStudentAssignmentDetails = async (assignmentId) => {
    try {
        const response = await BaseApi.get(`/StudentAssignment/${assignmentId}`);
        return response;
    } catch (error) {
        throw error;
    }
};

// Nộp bài: backend chấm các câu khách quan và ghi vào nopbai/chitietnopbai.
export const submitStudentAssignment = async (assignmentId, payload) => {
    try {
        const response = await BaseApi.post(`/StudentAssignment/${assignmentId}/submit`, payload);
        return response;
    } catch (error) {
        throw error;
    }
};

// Kết quả lần nộp gần nhất.
export const getStudentAssignmentResult = async (assignmentId) => {
    try {
        const response = await BaseApi.get(`/StudentAssignment/${assignmentId}/result`);
        return response;
    } catch (error) {
        throw error;
    }
};

// Nhận xét AI (AI1 từng bài/dạng + AI2 tổng thể) của lần nộp gần nhất. AI chạy
// nền nên có thể gọi lại (poll) endpoint này vài giây 1 lần cho tới khi xong.
export const getStudentAssignmentAiFeedback = async (assignmentId) => {
    try {
        const response = await BaseApi.get(`/StudentAssignment/${assignmentId}/ai-feedback`);
        return response;
    } catch (error) {
        throw error;
    }
};

// Nhận xét tiến bộ AI3 (so sánh nhiều lần nộp bài theo thời gian) gần nhất cho
// từng khóa học. Rỗng nếu chưa đủ dữ liệu (cần ít nhất 2 lần nộp đã chấm AI2).
export const getStudentAiProgress = async () => {
    try {
        const response = await BaseApi.get('/StudentAssignment/ai-progress');
        return response;
    } catch (error) {
        throw error;
    }
};
