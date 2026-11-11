import React, { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit,
    Eye,
    File,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    FileText,
    Folder,
    Info,
    Link2,
    Music,
    Plus,
    Presentation,
    Trash2,
    Upload,
    Video
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import teacherStudyContentService from '../../api/teacherStudyContentService';
import { useAuth } from '../../context/AuthContext';

const ITEMS_PER_PAGE = 5;

const EMPTY_OVERVIEW = {
    maKhoaHoc: '',
    tenKhoaHoc: '',
    maLopHoc: '',
    tenLop: '',
    noiDungHocTap: []
};

const EMPTY_CHAPTER_FORM = {
    tenChuong: '',
    moTa: '',
    thuTu: ''
};

const EMPTY_DOCUMENT_FORM = {
    maChuongHoc: '',
    tenTaiLieu: '',
    moTa: '',
    linkTaiLieu: '',
    file: null
};

const MAX_DOCUMENT_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.mp3', '.wav', '.m4a', '.mp4', '.mov', '.avi', '.mkv', '.webm',
    '.txt', '.zip', '.rar'
];
const DOCUMENT_FILE_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(',');
const DOCUMENT_FILE_HELPER_TEXT = 'Hỗ trợ PDF, Word, Excel, PowerPoint, Audio, Video, TXT, ZIP, RAR. Tối đa 100MB.';

const validateDocumentFile = (file) => {
    if (!file) {
        return '';
    }

    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(fileExtension)) {
        return 'Định dạng file chưa được hỗ trợ.';
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
        return 'Dung lượng tài liệu không vượt quá 100MB.';
    }

    return '';
};

const normalizeDocument = (document) => ({
    maTaiLieu: document?.MaTaiLieu || document?.maTaiLieu || '',
    maChuongHoc: document?.MaChuongHoc || document?.maChuongHoc || '',
    tenTaiLieu: document?.TenTaiLieu || document?.tenTaiLieu || '',
    linkTaiLieu: document?.LinkTaiLieu || document?.linkTaiLieu || '',
    moTa: document?.MoTa || document?.moTa || '',
    loaiTaiLieu: document?.LoaiTaiLieu || document?.loaiTaiLieu || 'File',
    ngayDang: document?.NgayDang || document?.ngayDang || '',
    ngayDangHienThi: document?.NgayDangHienThi || document?.ngayDangHienThi || '',
    laLinkNgoai: Boolean(document?.LaLinkNgoai ?? document?.laLinkNgoai)
});

const normalizeChapter = (chapter) => ({
    maChuong: chapter?.MaChuong || chapter?.maChuong || '',
    maKhoaHoc: chapter?.MaKhoaHoc || chapter?.maKhoaHoc || '',
    maLopHoc: chapter?.MaLopHoc || chapter?.maLopHoc || '',
    tenLop: chapter?.TenLop || chapter?.tenLop || '',
    tenChuong: chapter?.TenChuong || chapter?.tenChuong || '',
    moTa: chapter?.MoTa || chapter?.moTa || '',
    thuTu: chapter?.ThuTu ?? chapter?.thuTu ?? null,
    taiLieu: Array.isArray(chapter?.TaiLieu || chapter?.taiLieu)
        ? (chapter.TaiLieu || chapter.taiLieu).map(normalizeDocument)
        : []
});

const normalizeOverview = (overview) => ({
    maKhoaHoc: overview?.MaKhoaHoc || overview?.maKhoaHoc || '',
    tenKhoaHoc: overview?.TenKhoaHoc || overview?.tenKhoaHoc || '',
    maLopHoc: overview?.MaLopHoc || overview?.maLopHoc || '',
    tenLop: overview?.TenLop || overview?.tenLop || '',
    noiDungHocTap: Array.isArray(overview?.NoiDungHocTap || overview?.noiDungHocTap)
        ? (overview.NoiDungHocTap || overview.noiDungHocTap).map(normalizeChapter)
        : []
});

const normalizeCourse = (course) => ({
    id: course?.MaKhoaHoc || course?.maKhoaHoc || '',
    ten: course?.TenKhoaHoc || course?.tenKhoaHoc || '',
    soLopHoc: course?.SoLopHoc ?? course?.soLopHoc ?? 0,
    soChuongHoc: course?.SoChuongHoc ?? course?.soChuongHoc ?? 0
});

const normalizeClass = (classInfo) => ({
    id: classInfo?.MaLopHoc || classInfo?.maLopHoc || '',
    maKhoaHoc: classInfo?.MaKhoaHoc || classInfo?.maKhoaHoc || '',
    ten: classInfo?.TenLop || classInfo?.tenLop || '',
    ngayBatDau: classInfo?.NgayBatDau || classInfo?.ngayBatDau || '',
    ngayKetThuc: classInfo?.NgayKetThuc || classInfo?.ngayKetThuc || ''
});

const getFileIcon = (fileType) => {
    switch (fileType) {
        case 'PDF':
            return <FileText size={18} className="text-danger me-3" />;
        case 'Video':
            return <Video size={18} className="text-info me-3" />;
        case 'Word':
            return <FileCode size={18} className="text-primary me-3" />;
        case 'Excel':
            return <FileSpreadsheet size={18} className="text-success me-3" />;
        case 'Audio':
            return <Music size={18} className="text-warning me-3" />;
        case 'PowerPoint':
            return <Presentation size={18} className="text-warning me-3" />;
        case 'Archive':
            return <FileArchive size={18} className="text-secondary me-3" />;
        default:
            return <File size={18} className="text-secondary me-3" />;
    }
};

const TeacherStudyContent = () => {
    const { user } = useAuth();
    const documentFileInputRef = useRef(null);

    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [overview, setOverview] = useState(EMPTY_OVERVIEW);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingContents, setLoadingContents] = useState(false);
    const [savingChapter, setSavingChapter] = useState(false);
    const [savingDocument, setSavingDocument] = useState(false);
    const [downloadingId, setDownloadingId] = useState('');
    const [deletingTargetId, setDeletingTargetId] = useState('');
    const [error, setError] = useState('');

    const [showChapterModal, setShowChapterModal] = useState(false);
    const [currentChapter, setCurrentChapter] = useState(null);
    const [chapterForm, setChapterForm] = useState(EMPTY_CHAPTER_FORM);

    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);
    const [documentForm, setDocumentForm] = useState(EMPTY_DOCUMENT_FORM);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const resetDocumentFileSelection = () => {
        if (documentFileInputRef.current) {
            documentFileInputRef.current.value = '';
        }
    };

    const resetChapterModal = () => {
        setCurrentChapter(null);
        setChapterForm(EMPTY_CHAPTER_FORM);
        setShowChapterModal(false);
    };

    const resetDocumentModal = () => {
        setCurrentDocument(null);
        setDocumentForm(EMPTY_DOCUMENT_FORM);
        resetDocumentFileSelection();
        setShowDocumentModal(false);
    };

    const fetchContents = async (courseIdValue = selectedCourse, classIdValue = selectedClass) => {
        if (!courseIdValue || !classIdValue) {
            setOverview(EMPTY_OVERVIEW);
            setCurrentPage(1);
            return;
        }

        try {
            setLoadingContents(true);
            const contentOverview = await teacherStudyContentService.getContents(courseIdValue, classIdValue);
            setOverview(contentOverview ? normalizeOverview(contentOverview) : EMPTY_OVERVIEW);
            setCurrentPage(1);
            setError('');
        } catch (err) {
            setOverview(EMPTY_OVERVIEW);
            setError(err.message || 'Không thể tải nội dung học tập.');
        } finally {
            setLoadingContents(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const fetchCourses = async () => {
            try {
                const courseOptions = await teacherStudyContentService.getCourses();
                if (!isMounted) {
                    return;
                }

                setCourses(Array.isArray(courseOptions) ? courseOptions.map(normalizeCourse) : []);
                setError('');
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'Không thể tải danh sách khóa học.');
                }
            } finally {
                if (isMounted) {
                    setLoadingCourses(false);
                }
            }
        };

        fetchCourses();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!selectedCourse) {
            setClasses([]);
            setSelectedClass('');
            setOverview(EMPTY_OVERVIEW);
            setCurrentPage(1);
            return () => {
                isMounted = false;
            };
        }

        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                const classOptions = await teacherStudyContentService.getClassesByCourse(selectedCourse);
                if (!isMounted) {
                    return;
                }

                setClasses(Array.isArray(classOptions) ? classOptions.map(normalizeClass) : []);
                setError('');
            } catch (err) {
                if (isMounted) {
                    setClasses([]);
                    setError(err.message || 'Không thể tải danh sách lớp học.');
                }
            } finally {
                if (isMounted) {
                    setLoadingClasses(false);
                }
            }
        };

        fetchClasses();

        return () => {
            isMounted = false;
        };
    }, [selectedCourse]);

    useEffect(() => {
        if (!selectedCourse || !selectedClass) {
            setOverview(EMPTY_OVERVIEW);
            setCurrentPage(1);
            return;
        }

        fetchContents(selectedCourse, selectedClass);
    }, [selectedCourse, selectedClass]);

    const totalPages = Math.max(1, Math.ceil(overview.noiDungHocTap.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const currentChapters = overview.noiDungHocTap.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
    const totalDocuments = overview.noiDungHocTap.reduce((sum, chapter) => sum + chapter.taiLieu.length, 0);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleCourseChange = (event) => {
        setSelectedCourse(event.target.value);
        setSelectedClass('');
        setCurrentPage(1);
        setOverview(EMPTY_OVERVIEW);
        setError('');
        resetChapterModal();
        resetDocumentModal();
    };

    const handleClassChange = (event) => {
        setSelectedClass(event.target.value);
        setCurrentPage(1);
        setError('');
        resetChapterModal();
        resetDocumentModal();
    };

    const openCreateChapterModal = () => {
        if (!selectedCourse || !selectedClass) {
            toast.error('Chọn khóa học và lớp học trước khi thêm chương.');
            return;
        }

        setCurrentChapter(null);
        setChapterForm(EMPTY_CHAPTER_FORM);
        setShowChapterModal(true);
    };

    const openEditChapterModal = (chapter) => {
        setCurrentChapter(chapter);
        setChapterForm({
            tenChuong: chapter.tenChuong || '',
            moTa: chapter.moTa || '',
            thuTu: chapter.thuTu ?? ''
        });
        setShowChapterModal(true);
    };

    const openCreateDocumentModal = (chapter = null) => {
        if (!selectedCourse || !selectedClass) {
            toast.error('Chọn khóa học và lớp học trước khi thêm tài liệu.');
            return;
        }

        if (overview.noiDungHocTap.length === 0) {
            toast.error('Cần tạo ít nhất một chương học trước khi thêm tài liệu.');
            return;
        }

        setCurrentDocument(null);
        setDocumentForm({
            ...EMPTY_DOCUMENT_FORM,
            maChuongHoc: chapter?.maChuong || overview.noiDungHocTap[0]?.maChuong || ''
        });
        resetDocumentFileSelection();
        setShowDocumentModal(true);
    };

    const openEditDocumentModal = (documentInfo) => {
        setCurrentDocument(documentInfo);
        setDocumentForm({
            maChuongHoc: documentInfo.maChuongHoc || documentInfo.maChuong || '',
            tenTaiLieu: documentInfo.tenTaiLieu || '',
            moTa: documentInfo.moTa || '',
            linkTaiLieu: documentInfo.laLinkNgoai ? documentInfo.linkTaiLieu || '' : '',
            file: null
        });
        resetDocumentFileSelection();
        setShowDocumentModal(true);
    };

    const handleDocumentFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const validationError = validateDocumentFile(file);
        if (validationError) {
            resetDocumentFileSelection();
            toast.error(validationError);
            return;
        }

        setDocumentForm((prev) => ({
            ...prev,
            file,
            linkTaiLieu: '',
            tenTaiLieu: prev.tenTaiLieu || file.name
        }));

        toast.success(`Đã chọn file: ${file.name}`);
    };

    const handleDocumentLinkChange = (event) => {
        const nextLink = event.target.value;
        setDocumentForm((prev) => ({
            ...prev,
            linkTaiLieu: nextLink,
            file: nextLink.trim() ? null : prev.file
        }));

        if (nextLink.trim()) {
            resetDocumentFileSelection();
        }
    };

    const handleViewDocument = (documentInfo) => {
        try {
            teacherStudyContentService.viewDocument(documentInfo);
        } catch (err) {
            toast.error(err.message || 'Không thể mở tài liệu.');
        }
    };

    const handleDownloadDocument = async (documentInfo) => {
        try {
            setDownloadingId(documentInfo.maTaiLieu);
            await teacherStudyContentService.downloadDocument(documentInfo, selectedClass);
        } catch (err) {
            toast.error(err.message || 'Không thể tải tài liệu.');
        } finally {
            setDownloadingId('');
        }
    };

    const handleSaveChapter = async () => {
        if (!selectedCourse || !selectedClass) {
            toast.error('Chọn khóa học và lớp học trước khi lưu chương.');
            return;
        }

        if (!chapterForm.tenChuong.trim()) {
            toast.error('Tên chương không được để trống.');
            return;
        }

        const thuTu = chapterForm.thuTu === '' ? null : Number(chapterForm.thuTu);
        if (thuTu !== null && Number.isNaN(thuTu)) {
            toast.error('Thứ tự chương không hợp lệ.');
            return;
        }

        try {
            setSavingChapter(true);

            if (currentChapter) {
                await teacherStudyContentService.updateChapter(currentChapter.maChuong, {
                    MaLopHoc: selectedClass,
                    TenChuong: chapterForm.tenChuong.trim(),
                    MoTa: chapterForm.moTa,
                    ThuTu: thuTu
                });
                toast.success('Cập nhật chương học thành công.');
            } else {
                await teacherStudyContentService.createChapter({
                    MaKhoaHoc: selectedCourse,
                    MaLopHoc: selectedClass,
                    TenChuong: chapterForm.tenChuong.trim(),
                    MoTa: chapterForm.moTa,
                    ThuTu: thuTu
                });
                toast.success('Tạo chương học thành công.');
            }

            resetChapterModal();
            await fetchContents();
        } catch (err) {
            toast.error(err.message || 'Không thể lưu chương học.');
        } finally {
            setSavingChapter(false);
        }
    };

    const handleSaveDocument = async () => {
        if (!selectedCourse || !selectedClass) {
            toast.error('Chọn khóa học và lớp học trước khi lưu tài liệu.');
            return;
        }

        if (!documentForm.maChuongHoc) {
            toast.error('Chọn chương học cho tài liệu.');
            return;
        }

        if (documentForm.file && documentForm.linkTaiLieu.trim()) {
            toast.error('Chỉ được chọn upload file hoặc nhập link ngoại.')
            return;
        }

        if (!currentDocument && !documentForm.file && !documentForm.linkTaiLieu.trim()) {
            toast.error('Tài liệu mới cần có file upload hoặc link ngoại.');
            return;
        }

        const fileValidationError = validateDocumentFile(documentForm.file);
        if (fileValidationError) {
            toast.error(fileValidationError);
            return;
        }

        try {
            setSavingDocument(true);

            const commonPayload = {
                MaLopHoc: selectedClass,
                TenTaiLieu: documentForm.tenTaiLieu.trim(),
                MoTa: documentForm.moTa,
                LinkTaiLieu: documentForm.linkTaiLieu.trim(),
                File: documentForm.file || undefined
            };

            if (currentDocument) {
                await teacherStudyContentService.updateDocument(currentDocument.maTaiLieu, commonPayload);
                toast.success('Cập nhật tài liệu thành công.');
            } else {
                await teacherStudyContentService.createDocument({
                    ...commonPayload,
                    MaChuongHoc: documentForm.maChuongHoc
                });
                toast.success('Thêm tài liệu thành công.');
            }

            resetDocumentModal();
            await fetchContents();
        } catch (err) {
            toast.error(err.message || 'Không thể lưu tài liệu.');
        } finally {
            setSavingDocument(false);
        }
    };

    const openDeleteModal = (type, item) => {
        setDeleteTarget({ type, item });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget?.item || !selectedClass) {
            setShowDeleteModal(false);
            return;
        }

        try {
            const { type, item } = deleteTarget;
            setDeletingTargetId(type === 'chapter' ? item.maChuong : item.maTaiLieu);

            if (type === 'chapter') {
                await teacherStudyContentService.deleteChapter(item.maChuong, selectedClass);
                toast.success('Đã xóa chương học.');
            } else {
                await teacherStudyContentService.deleteDocument(item.maTaiLieu, selectedClass);
                toast.success('Đã xóa tài liệu.');
            }

            setShowDeleteModal(false);
            setDeleteTarget(null);
            await fetchContents();
        } catch (err) {
            toast.error(err.message || 'Không thể xóa dữ liệu.');
        } finally {
            setDeletingTargetId('');
        }
    };

    const isLoading = loadingCourses || loadingClasses || loadingContents;

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">
            <Toaster position="top-right" />

            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold text-primary mb-0" style={{ letterSpacing: '-0.5px' }}>QUẢN LÝ NỘI DUNG HỌC TẬP</h2>
                    <p className="text-muted mb-0 small">Giảng viên: <b>{user?.name || 'Giảng viên'}</b></p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-outline-primary rounded-3 px-3 py-2 fw-bold shadow-sm" onClick={openCreateChapterModal}>
                        <Plus size={18} className="me-2" />
                        Thêm chương
                    </button>
                    <button className="btn btn-primary rounded-3 px-4 py-2 fw-bold shadow-sm" onClick={() => openCreateDocumentModal()}>
                        <Plus size={18} className="me-2" />
                        Thêm tài liệu
                    </button>
                </div>
            </div>

            {error ? (
                <div className="alert alert-danger d-flex align-items-start gap-2 shadow-sm border-0">
                    <AlertCircle size={18} className="mt-1 flex-shrink-0" />
                    <div>{error}</div>
                </div>
            ) : null}

            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <select
                        className="form-select border-0 shadow-sm py-3 px-3 rounded-3 fw-medium"
                        value={selectedCourse}
                        onChange={handleCourseChange}
                        disabled={loadingCourses}
                    >
                        <option value="">-- Chọn khóa học --</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.ten} ({course.soLopHoc} lớp, {course.soChuongHoc} chương)
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-6">
                    <select
                        className="form-select border-0 shadow-sm py-3 px-3 rounded-3 fw-medium"
                        value={selectedClass}
                        onChange={handleClassChange}
                        disabled={!selectedCourse || loadingClasses}
                    >
                        <option value="">-- Chọn lớp học --</option>
                        {classes.map((classInfo) => (
                            <option key={classInfo.id} value={classInfo.id}>
                                {classInfo.ten}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedClass ? (
                <div className="card border-0 shadow-sm p-5 text-center rounded-4">
                    <Info size={48} className="mx-auto text-muted mb-3 opacity-25" />
                    <h5 className="text-muted">Chọn lớp học để bắt đầu quản lý nội dung</h5>
                    <p className="text-muted small mb-0">Nội dung học tập được tách riêng theo từng lớp giảng dạy.</p>
                </div>
            ) : (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="border-bottom px-4 py-3 bg-white">
                        <div className="fw-semibold text-dark">{overview.tenKhoaHoc || 'Nội dung học tập'}</div>
                        <div className="small text-muted">{overview.tenLop ? `Lớp: ${overview.tenLop}` : 'Chọn lớp học để xem nội dung'}</div>
                    </div>

                    {isLoading ? (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status" />
                            <div className="text-muted small">Đang tải nội dung học tập...</div>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead className="bg-white border-bottom">
                                        <tr className="text-muted small fw-bold">
                                            <th className="ps-4 py-3" style={{ width: '48%' }}>TÊN TÀI LIỆU</th>
                                            <th style={{ width: '14%' }}>ĐỊNH DẠNG</th>
                                            <th style={{ width: '18%' }}>NGÀY ĐĂNG</th>
                                            <th className="text-center" style={{ width: '20%' }}>THAO TÁC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentChapters.length > 0 ? (
                                            currentChapters.map((chapter) => (
                                                <React.Fragment key={chapter.maChuong}>
                                                    <tr style={{ border: 'none' }}>
                                                        <td colSpan="4" className="p-0" style={{ border: 'none', backgroundColor: 'transparent' }}>
                                                            <div
                                                                className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center py-3 px-4 border-top border-bottom"
                                                                style={{ backgroundColor: '#f1f5f9', width: '100%', marginTop: '8px', marginBottom: '2px' }}
                                                            >
                                                                <div className="d-flex align-items-start">
                                                                    <Folder size={18} className="text-primary me-2 mt-1" strokeWidth={2.5} />
                                                                    <div>
                                                                        <div className="fw-bold text-primary" style={{ fontSize: '15px' }}>
                                                                            {chapter.tenChuong}
                                                                        </div>
                                                                        <div className="text-muted small">
                                                                            Thứ tự: {chapter.thuTu ?? '--'}
                                                                        </div>
                                                                        {chapter.moTa ? (
                                                                            <div className="text-muted small mt-1">{chapter.moTa}</div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex flex-wrap gap-2 mt-3 mt-lg-0">
                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary rounded-3"
                                                                        onClick={() => openCreateDocumentModal(chapter)}
                                                                    >
                                                                        <Plus size={15} className="me-1" />
                                                                        Tài liệu
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-warning rounded-3"
                                                                        onClick={() => openEditChapterModal(chapter)}
                                                                    >
                                                                        <Edit size={15} className="me-1" />
                                                                        Sửa
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-danger rounded-3"
                                                                        onClick={() => openDeleteModal('chapter', chapter)}
                                                                        disabled={deletingTargetId === chapter.maChuong}
                                                                    >
                                                                        <Trash2 size={15} className="me-1" />
                                                                        Xóa
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {chapter.taiLieu.length > 0 ? (
                                                        chapter.taiLieu.map((documentInfo) => (
                                                            <tr key={documentInfo.maTaiLieu} className="bg-white hover-row border-bottom-0">
                                                                <td className="ps-5 text-dark fw-medium py-3">
                                                                    <div className="d-flex align-items-center">
                                                                        {getFileIcon(documentInfo.loaiTaiLieu)}
                                                                        <div>
                                                                            <div>{documentInfo.tenTaiLieu}</div>
                                                                            {documentInfo.moTa ? (
                                                                                <div className="text-muted small mt-1">{documentInfo.moTa}</div>
                                                                            ) : null}
                                                                            {documentInfo.laLinkNgoai ? (
                                                                                <div className="text-muted small mt-1">
                                                                                    <Link2 size={13} className="me-1" />
                                                                                    Link ngoài
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-light text-muted border fw-normal px-2 py-1" style={{ fontSize: '11px' }}>
                                                                        {documentInfo.loaiTaiLieu}
                                                                    </span>
                                                                </td>
                                                                <td className="text-muted small">{documentInfo.ngayDangHienThi || '--/--/----'}</td>
                                                                <td className="text-center">
                                                                    <div className="d-inline-flex border rounded-3 overflow-hidden shadow-sm bg-white">
                                                                        <button
                                                                            className="btn btn-sm border-0 border-end rounded-0 px-2 text-primary hover-btn"
                                                                            onClick={() => handleViewDocument(documentInfo)}
                                                                            title="Xem"
                                                                        >
                                                                            <Eye size={16} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm border-0 border-end rounded-0 px-2 text-success hover-btn"
                                                                            onClick={() => handleDownloadDocument(documentInfo)}
                                                                            disabled={downloadingId === documentInfo.maTaiLieu}
                                                                            title="Tải về"
                                                                        >
                                                                            <Download size={16} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm border-0 border-end rounded-0 px-2 text-warning hover-btn"
                                                                            onClick={() => openEditDocumentModal({ ...documentInfo, maChuong: chapter.maChuong })}
                                                                            title="Sửa"
                                                                        >
                                                                            <Edit size={16} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm border-0 rounded-0 px-2 text-danger hover-btn"
                                                                            onClick={() => openDeleteModal('document', documentInfo)}
                                                                            disabled={deletingTargetId === documentInfo.maTaiLieu}
                                                                            title="Xóa"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="ps-5 py-4 text-muted">
                                                                Chưa có tài liệu nào trong chương này.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5 text-muted">
                                                    Chưa có chương học nào cho lớp này.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {overview.noiDungHocTap.length > 0 ? (
                                <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center">
                                    <span className="small text-muted d-none d-md-inline">
                                        Đang xem <b>{currentChapters.length}</b> / <b>{overview.noiDungHocTap.length}</b> chương, tổng <b>{totalDocuments}</b> tài liệu
                                    </span>
                                    <nav aria-label="Page navigation">
                                        <ul className="pagination pagination-sm mb-0 gap-1">
                                            <li className={`page-item ${safeCurrentPage === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link border-0 rounded-3 shadow-sm d-flex align-items-center justify-content-center"
                                                    style={{ width: '36px', height: '36px' }}
                                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                            </li>
                                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                                <li key={pageNumber} className={`page-item ${safeCurrentPage === pageNumber ? 'active' : ''}`}>
                                                    <button
                                                        className="page-link border-0 rounded-3 shadow-sm d-flex align-items-center justify-content-center fw-bold"
                                                        style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            backgroundColor: safeCurrentPage === pageNumber ? '#0d6efd' : 'white',
                                                            color: safeCurrentPage === pageNumber ? 'white' : '#6c757d'
                                                        }}
                                                        onClick={() => setCurrentPage(pageNumber)}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                </li>
                                            ))}
                                            <li className={`page-item ${safeCurrentPage === totalPages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link border-0 rounded-3 shadow-sm d-flex align-items-center justify-content-center"
                                                    style={{ width: '36px', height: '36px' }}
                                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                    <div className="d-flex align-items-center gap-2 d-none d-sm-flex">
                                        <span className="small text-muted">Trang</span>
                                        <select
                                            className="form-select form-select-sm border-light-subtle shadow-sm"
                                            style={{ width: '70px', borderRadius: '8px' }}
                                            value={safeCurrentPage}
                                            onChange={(event) => setCurrentPage(Number(event.target.value))}
                                        >
                                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                                <option key={pageNumber} value={pageNumber}>
                                                    {pageNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            )}

            {showChapterModal ? (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-primary text-white p-3 px-4 border-0">
                                <h5 className="modal-title fw-bold small text-uppercase mb-0">
                                    {currentChapter ? 'CẬP NHẬT CHƯƠNG HỌC' : 'THÊM CHƯƠNG HỌC'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={resetChapterModal} />
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Tên chương</label>
                                    <input
                                        type="text"
                                        className="form-control py-2 border-light-subtle rounded-3 shadow-sm"
                                        value={chapterForm.tenChuong}
                                        onChange={(event) => setChapterForm((prev) => ({ ...prev, tenChuong: event.target.value }))}
                                        placeholder="Nhập tên chương..."
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Thứ tự</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="form-control py-2 border-light-subtle rounded-3 shadow-sm"
                                        value={chapterForm.thuTu}
                                        onChange={(event) => setChapterForm((prev) => ({ ...prev, thuTu: event.target.value }))}
                                        placeholder="Để trống để hệ thống tự sắp xếp"
                                    />
                                </div>
                                <div className="mb-0">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Mô tả</label>
                                    <textarea
                                        rows="4"
                                        className="form-control border-light-subtle rounded-3 shadow-sm"
                                        value={chapterForm.moTa}
                                        onChange={(event) => setChapterForm((prev) => ({ ...prev, moTa: event.target.value }))}
                                        placeholder="Mô tả ngắn cho chương học..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-0 py-3 px-4">
                                <button className="btn btn-link text-muted text-decoration-none fw-bold" onClick={resetChapterModal}>
                                    Hủy
                                </button>
                                <button className="btn btn-primary px-4 py-2 rounded-3 fw-bold shadow" onClick={handleSaveChapter} disabled={savingChapter}>
                                    {savingChapter ? 'Đang lưu...' : 'Lưu chương'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {showDocumentModal ? (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-primary text-white p-3 px-4 border-0">
                                <h5 className="modal-title fw-bold small text-uppercase mb-0">
                                    {currentDocument ? 'CẬP NHẬT TÀI LIỆU' : 'THÊM TÀI LIỆU MỚI'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={resetDocumentModal} />
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Chương học</label>
                                    <select
                                        className="form-select py-2 border-light-subtle rounded-3 shadow-sm"
                                        value={documentForm.maChuongHoc}
                                        onChange={(event) => setDocumentForm((prev) => ({ ...prev, maChuongHoc: event.target.value }))}
                                        disabled={Boolean(currentDocument)}
                                    >
                                        <option value="">-- Chọn chương học --</option>
                                        {overview.noiDungHocTap.map((chapter) => (
                                            <option key={chapter.maChuong} value={chapter.maChuong}>
                                                {chapter.tenChuong}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4 text-center">
                                    <div
                                        className="border-2 border-dashed rounded-4 p-4 bg-light shadow-sm"
                                        style={{ cursor: 'pointer', borderStyle: 'dashed !important' }}
                                        onClick={() => documentFileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={documentFileInputRef}
                                            type="file"
                                            accept={DOCUMENT_FILE_ACCEPT}
                                            className="d-none"
                                            onChange={handleDocumentFileChange}
                                        />
                                        <div className="bg-white rounded-circle shadow-sm d-inline-flex p-3 mb-3 text-primary">
                                            <Upload size={30} />
                                        </div>
                                        <p className="mb-1 fw-bold text-dark">
                                            {documentForm.file ? documentForm.file.name : 'Kéo thả hoặc nhấn để chọn file'}
                                        </p>
                                        <p className="text-muted small mb-0">{DOCUMENT_FILE_HELPER_TEXT}</p>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Link ngoại</label>
                                    <input
                                        type="url"
                                        className="form-control py-2 border-light-subtle rounded-3 shadow-sm"
                                        value={documentForm.linkTaiLieu}
                                        onChange={handleDocumentLinkChange}
                                        placeholder="https://..."
                                    />
                                    <div className="form-text">Để trống nếu bạn upload file lên hệ thống.</div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Tên tài liệu hiển thị</label>
                                    <input
                                        type="text"
                                        className="form-control py-2 border-light-subtle rounded-3 shadow-sm"
                                        value={documentForm.tenTaiLieu}
                                        onChange={(event) => setDocumentForm((prev) => ({ ...prev, tenTaiLieu: event.target.value }))}
                                        placeholder="Nhập tên hiển thị..."
                                    />
                                </div>

                                <div className="mb-0">
                                    <label className="form-label fw-bold small text-muted text-uppercase">Mô tả</label>
                                    <textarea
                                        rows="4"
                                        className="form-control border-light-subtle rounded-3 shadow-sm"
                                        value={documentForm.moTa}
                                        onChange={(event) => setDocumentForm((prev) => ({ ...prev, moTa: event.target.value }))}
                                        placeholder="Bổ sung ghi chú cho tài liệu..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-0 py-3 px-4">
                                <button className="btn btn-link text-muted text-decoration-none fw-bold" onClick={resetDocumentModal}>
                                    Hủy  
                                </button>
                                <button className="btn btn-primary px-4 py-2 rounded-3 fw-bold shadow" onClick={handleSaveDocument} disabled={savingDocument}>
                                    {savingDocument ? 'Đang lưu...' : 'Lưu tài liệu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {showDeleteModal ? (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content border-0 rounded-4 overflow-hidden p-4 text-center">
                            <div className="text-danger mb-3">
                                <AlertTriangle size={52} />
                            </div>
                            <h5 className="fw-bold">Xác nhận xóa?</h5>
                            <p className="text-muted small">
                                {deleteTarget?.type === 'chapter'
                                    ? `Chương ${deleteTarget?.item?.tenChuong} và toàn bộ tài liệu bên trong sẽ bị xóa vĩnh viễn khỏi hệ thống.`
                                    : `Tài liệu ${deleteTarget?.item?.tenTaiLieu} sẽ bị xóa khỏi hệ thống.`}
                            </p>
                            <div className="d-flex gap-2 mt-4">
                                <button className="btn btn-light w-100 rounded-3 fw-bold" onClick={() => setShowDeleteModal(false)}>
                                    Đóng
                                </button>
                                <button className="btn btn-danger w-100 rounded-3 fw-bold" onClick={confirmDelete}>
                                    Xóa ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <style>{`
                .hover-row:hover { background-color: #f8f9fa !important; }
                .hover-btn:hover { background-color: #f1f3f5 !important; }
            `}</style>
        </div>
    );
};

export default TeacherStudyContent;


