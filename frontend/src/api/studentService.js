import apiClient, { getApiBaseUrl, getSignalRBaseUrl } from './BaseApi';

// Service gom các API hồ sơ học sinh để page profile và luồng login dùng chung.
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

const resolveStoredFileUrl = (path) => {
    if (!path) {
        return '';
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const baseUrl = getSignalRBaseUrl().replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

const studentService = {
    // Lấy profile thật của học sinh đang đăng nhập.
    getProfile: async () => {
        const response = ensureSuccess(
            await apiClient.get('/HocSinh/my-profile'),
            'Không thể tải thông tin cá nhân.'
        );

        return unwrapData(response);
    },

    // Cập nhật thông tin hồ sơ học sinh.
    updateProfile: async (profileData) => {
        const response = ensureSuccess(
            await apiClient.put('/HocSinh/update-profile', profileData),
            'Không thể cập nhật thông tin cá nhân.'
        );

        return unwrapData(response);
    },

    // Upload avatar qua multipart/form-data vì BaseApi mặc định gửi JSON.
    uploadAvatar: async (file) => {
        if (!file) {
            throw new Error('Chưa chọn file ảnh.');
        }

        const formData = new FormData();
        formData.append('file', file);

        const token = apiClient.getAuthToken();
        const response = await fetch(`${getApiBaseUrl()}/HocSinh/upload-avatar`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : null;

        if (!response.ok) {
            throw new Error(payload?.message || 'Không thể upload ảnh đại diện.');
        }

        return unwrapData(ensureSuccess(payload, 'Không thể upload ảnh đại diện.'));
    },

    // Xóa avatar hiện tại của học sinh.
    deleteAvatar: async () => {
        const response = ensureSuccess(
            await apiClient.delete('/HocSinh/delete-avatar'),
            'Không thể xóa ảnh đại diện.'
        );

        return unwrapData(response);
    },

    resolveStoredFileUrl
};

export default studentService;
