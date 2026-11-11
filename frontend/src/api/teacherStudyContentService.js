import apiClient, { getApiBaseUrl, getSignalRBaseUrl } from './BaseApi';

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

const resolveDocumentUrl = (path) => {
    if (!path) {
        return '';
    }

    return /^https?:\/\//i.test(path) ? path : resolveStoredFileUrl(path);
};

const readJsonIfPossible = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }

    return response.json();
};

const extractFileName = (contentDisposition, fallbackName) => {
    if (!contentDisposition) {
        return fallbackName;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const asciiMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    return asciiMatch?.[1] || fallbackName;
};

const triggerDownload = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName || 'tai-lieu';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
};

const buildMultipartFormData = (payload) => {
    const formData = new FormData();

    Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }

        if (value instanceof File) {
            formData.append(key, value);
            return;
        }

        if (typeof value === 'string') {
            formData.append(key, value);
            return;
        }

        formData.append(key, String(value));
    });

    return formData;
};

const sendMultipartRequest = async (path, method, payload, fallbackMessage) => {
    const token = apiClient.getAuthToken();
    const response = await fetch(`${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: buildMultipartFormData(payload)
    });

    const parsedPayload = await readJsonIfPossible(response);

    if (!response.ok) {
        throw new Error(parsedPayload?.message || parsedPayload?.Message || fallbackMessage);
    }

    return unwrapData(ensureSuccess(parsedPayload, fallbackMessage));
};

const teacherStudyContentService = {
    getCourses: async () => {
        const response = ensureSuccess(
            await apiClient.get('/TeacherStudyContent/courses'),
            'Không thể tải danh sách khóa học giảng dạy.'
        );

        return unwrapData(response);
    },

    getClassesByCourse: async (courseId) => {
        if (!courseId) {
            return [];
        }

        const response = ensureSuccess(
            await apiClient.get(`/TeacherStudyContent/courses/${courseId}/classes`),
            'Không thể tải danh sách lớp học phụ trách.'
        );

        return unwrapData(response);
    },

    getContents: async (courseId, classId) => {
        if (!courseId || !classId) {
            return null;
        }

        const params = new URLSearchParams({ courseId, classId });
        const response = ensureSuccess(
            await apiClient.get(`/TeacherStudyContent/contents?${params.toString()}`),
            'Không thể tải nội dung học tập.'
        );

        return unwrapData(response);
    },

    createChapter: async (payload) => {
        const response = ensureSuccess(
            await apiClient.post('/TeacherStudyContent/chapters', payload),
            'Không thể tạo chương học.'
        );

        return unwrapData(response);
    },

    updateChapter: async (chapterId, payload) => {
        const response = ensureSuccess(
            await apiClient.put(`/TeacherStudyContent/chapters/${chapterId}`, payload),
            'Không thể cập nhật chương học.'
        );

        return unwrapData(response);
    },

    deleteChapter: async (chapterId, classId) => {
        const params = new URLSearchParams({ classId });
        const response = ensureSuccess(
            await apiClient.delete(`/TeacherStudyContent/chapters/${chapterId}?${params.toString()}`),
            'Không thể xóa chương học.'
        );

        return unwrapData(response);
    },

    createDocument: async (payload) =>
        sendMultipartRequest('/TeacherStudyContent/documents', 'POST', payload, 'Không thể tạo tài liệu.'),

    updateDocument: async (documentId, payload) =>
        sendMultipartRequest(`/TeacherStudyContent/documents/${documentId}`, 'PUT', payload, 'Không thể cập nhật tài liệu.'),

    deleteDocument: async (documentId, classId) => {
        const params = new URLSearchParams({ classId });
        const response = ensureSuccess(
            await apiClient.delete(`/TeacherStudyContent/documents/${documentId}?${params.toString()}`),
            'Không thể xóa tài liệu.'
        );

        return unwrapData(response);
    },

    viewDocument: (documentInfo) => {
        const link = documentInfo?.linkTaiLieu || documentInfo?.LinkTaiLieu || '';
        const targetUrl = resolveDocumentUrl(link);

        if (!targetUrl) {
            throw new Error('Tài liệu chưa có đường dẫn để xem.');
        }

        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    },

    downloadDocument: async (documentInfo, classId = '') => {
        const documentId = documentInfo?.maTaiLieu || documentInfo?.MaTaiLieu;
        const link = documentInfo?.linkTaiLieu || documentInfo?.LinkTaiLieu || '';
        const fileName = documentInfo?.tenTaiLieu || documentInfo?.TenTaiLieu || 'tai-lieu';
        const isExternal = documentInfo?.laLinkNgoai ?? documentInfo?.LaLinkNgoai ?? /^https?:\/\//i.test(link);

        if (!documentId) {
            throw new Error('Thiếu mã tài liệu để tải xuống.');
        }

        if (isExternal) {
            const externalUrl = resolveDocumentUrl(link);
            if (!externalUrl) {
                throw new Error('Tài liệu ngoài chưa có đường dẫn hợp lệ.');
            }

            window.open(externalUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        const token = apiClient.getAuthToken();
        const params = new URLSearchParams();
        if (classId) {
            params.set('classId', classId);
        }

        const query = params.toString();
        const response = await fetch(
            `${getApiBaseUrl()}/TeacherStudyContent/documents/${documentId}/download${query ? `?${query}` : ''}`,
            {
                method: 'GET',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            }
        );

        if (!response.ok) {
            const payload = await readJsonIfPossible(response);
            throw new Error(payload?.message || payload?.Message || 'Không thể tải tài liệu.');
        }

        const blob = await response.blob();
        const resolvedFileName = extractFileName(response.headers.get('content-disposition'), fileName);
        triggerDownload(blob, resolvedFileName);
    },

    resolveStoredFileUrl,
    resolveDocumentUrl
};

export default teacherStudyContentService;
