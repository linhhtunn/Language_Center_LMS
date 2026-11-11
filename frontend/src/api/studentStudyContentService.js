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

const studentStudyContentService = {
    getCurrentContent: async () => {
        const response = ensureSuccess(
            await apiClient.get('/StudentStudyContent/current-content'),
            'Khong the tai noi dung hoc tap hien tai.'
        );

        return unwrapData(response);
    },

    getCourses: async () => {
        const response = ensureSuccess(
            await apiClient.get('/StudentStudyContent/courses'),
            'Khong the tai danh sach khoa hoc.'
        );

        return unwrapData(response);
    },

    getClassesByCourse: async (courseId) => {
        if (!courseId) {
            return [];
        }

        const response = ensureSuccess(
            await apiClient.get(`/StudentStudyContent/courses/${courseId}/classes`),
            'Khong the tai danh sach lop hoc.'
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
            await apiClient.get(`/StudentStudyContent/contents?${params.toString()}`),
            'Khong the tai noi dung hoc tap.'
        );

        return unwrapData(response);
    },

    viewDocument: (documentInfo) => {
        const link = documentInfo?.linkTaiLieu || documentInfo?.LinkTaiLieu || '';
        const targetUrl = resolveDocumentUrl(link);

        if (!targetUrl) {
            throw new Error('Tai lieu chua co duong dan de xem.');
        }

        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    },

    downloadDocument: async (documentInfo, classId = '') => {
        const documentId = documentInfo?.maTaiLieu || documentInfo?.MaTaiLieu;
        const link = documentInfo?.linkTaiLieu || documentInfo?.LinkTaiLieu || '';
        const fileName = documentInfo?.tenTaiLieu || documentInfo?.TenTaiLieu || 'tai-lieu';
        const isExternal = documentInfo?.laLinkNgoai ?? documentInfo?.LaLinkNgoai ?? /^https?:\/\//i.test(link);

        if (!documentId) {
            throw new Error('Thieu ma tai lieu de tai xuong.');
        }

        if (isExternal) {
            const externalUrl = resolveDocumentUrl(link);
            if (!externalUrl) {
                throw new Error('Tai lieu ngoai chua co duong dan hop le.');
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
            `${getApiBaseUrl()}/StudentStudyContent/documents/${documentId}/download${query ? `?${query}` : ''}`,
            {
                method: 'GET',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            }
        );

        if (!response.ok) {
            const payload = await readJsonIfPossible(response);
            throw new Error(payload?.message || payload?.Message || 'Khong the tai tai lieu.');
        }

        const blob = await response.blob();
        const resolvedFileName = extractFileName(response.headers.get('content-disposition'), fileName);
        triggerDownload(blob, resolvedFileName);
    },

    resolveStoredFileUrl,
    resolveDocumentUrl
};

export default studentStudyContentService;
