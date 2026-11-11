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

const adminStudyContentService = {
    getCourses: async () => {
        const response = ensureSuccess(
            await apiClient.get('/AdminStudyContent/courses'),
            'Không thể tải danh sách khóa học.'
        );

        return unwrapData(response);
    },

    getClassesByCourse: async (courseId) => {
        if (!courseId) {
            return [];
        }

        const response = ensureSuccess(
            await apiClient.get(`/AdminStudyContent/courses/${courseId}/classes`),
            'Không thể tải danh sách lớp học.'
        );

        return unwrapData(response);
    },

    getContents: async (courseId, classId = '') => {
        if (!courseId) {
            return null;
        }

        const params = new URLSearchParams({ courseId });
        if (classId) {
            params.set('classId', classId);
        }

        const response = ensureSuccess(
            await apiClient.get(`/AdminStudyContent/contents?${params.toString()}`),
            'Không thể tải nội dung học tập.'
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

    downloadDocument: async (documentInfo) => {
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
        const response = await fetch(`${getApiBaseUrl()}/AdminStudyContent/documents/${documentId}/download`, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

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

export default adminStudyContentService;
