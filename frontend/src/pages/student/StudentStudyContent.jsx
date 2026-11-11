import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Download,
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
    Presentation,
    Search,
    Video
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import studentStudyContentService from '../../api/studentStudyContentService';
import { useAuth } from '../../context/AuthContext';

const ITEMS_PER_PAGE = 5;

const EMPTY_OVERVIEW = {
    maKhoaHoc: '',
    tenKhoaHoc: '',
    maLopHoc: '',
    tenLop: '',
    noiDungHocTap: []
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
    ngayKetThuc: classInfo?.NgayKetThuc || classInfo?.ngayKetThuc || '',
    laLopHienTai: Boolean(classInfo?.LaLopHienTai ?? classInfo?.laLopHienTai)
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

const StudentStudyContent = () => {
    const { user } = useAuth();

    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [overview, setOverview] = useState(EMPTY_OVERVIEW);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingContents, setLoadingContents] = useState(false);
    const [downloadingId, setDownloadingId] = useState('');
    const [error, setError] = useState('');
    const [contextNotice, setContextNotice] = useState('');

    useEffect(() => {
        let isMounted = true;

        const bootstrapStudyContent = async () => {
            setLoadingCourses(true);
            setLoadingContents(true);

            try {
                const [coursesResult, currentResult] = await Promise.allSettled([
                    studentStudyContentService.getCourses(),
                    studentStudyContentService.getCurrentContent()
                ]);

                if (!isMounted) {
                    return;
                }

                let nextError = '';

                if (coursesResult.status === 'fulfilled') {
                    setCourses(Array.isArray(coursesResult.value) ? coursesResult.value.map(normalizeCourse) : []);
                } else {
                    setCourses([]);
                    nextError = coursesResult.reason?.message || 'Không thể tải danh sách khóa học.';
                }

                if (currentResult.status === 'fulfilled') {
                    const currentOverview = currentResult.value
                        ? normalizeOverview(currentResult.value)
                        : EMPTY_OVERVIEW;

                    setOverview(currentOverview);
                    setSelectedCourse(currentOverview.maKhoaHoc || '');
                    setSelectedClass(currentOverview.maLopHoc || '');
                    setContextNotice('');
                } else {
                    setOverview(EMPTY_OVERVIEW);
                    setSelectedCourse('');
                    setSelectedClass('');
                    setContextNotice(
                        currentResult.reason?.message
                        || 'Chọn khóa học và lớp học bạn đang học hoặc đã học để xem học liệu.'
                    );
                }

                setError(nextError);
            } finally {
                if (isMounted) {
                    setLoadingCourses(false);
                    setLoadingContents(false);
                }
            }
        };

        bootstrapStudyContent();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!selectedCourse) {
            setClasses([]);
            setSelectedClass('');

            return () => {
                isMounted = false;
            };
        }

        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                const classOptions = await studentStudyContentService.getClassesByCourse(selectedCourse);
                if (!isMounted) {
                    return;
                }

                const normalizedClasses = Array.isArray(classOptions)
                    ? classOptions.map(normalizeClass)
                    : [];

                setClasses(normalizedClasses);

                if (selectedClass && !normalizedClasses.some((classInfo) => classInfo.id === selectedClass)) {
                    setSelectedClass('');
                }
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
        let isMounted = true;

        if (!selectedCourse) {
            setOverview(EMPTY_OVERVIEW);
            setCurrentPage(1);

            return () => {
                isMounted = false;
            };
        }

        const fetchContents = async () => {
            try {
                setLoadingContents(true);
                const contentOverview = await studentStudyContentService.getContents(selectedCourse, selectedClass);
                if (!isMounted) {
                    return;
                }

                setOverview(contentOverview ? normalizeOverview(contentOverview) : EMPTY_OVERVIEW);
                setCurrentPage(1);
                setError('');
            } catch (err) {
                if (isMounted) {
                    setOverview(EMPTY_OVERVIEW);
                    setCurrentPage(1);
                    setError(err.message || 'Không thể tải nội dung học tập.');
                }
            } finally {
                if (isMounted) {
                    setLoadingContents(false);
                }
            }
        };

        fetchContents();

        return () => {
            isMounted = false;
        };
    }, [selectedCourse, selectedClass]);

    const totalPages = Math.max(1, Math.ceil(overview.noiDungHocTap.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const currentChapters = overview.noiDungHocTap.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
    const totalDocuments = overview.noiDungHocTap.reduce((sum, chapter) => sum + chapter.taiLieu.length, 0);
    const isLoading = loadingCourses || loadingClasses || loadingContents;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleViewDocument = (documentInfo) => {
        try {
            studentStudyContentService.viewDocument(documentInfo);
        } catch (err) {
            toast.error(err.message || 'Không thể mở tài liệu.');
        }
    };

    const handleDownloadDocument = async (documentInfo) => {
        try {
            setDownloadingId(documentInfo.maTaiLieu);
            await studentStudyContentService.downloadDocument(documentInfo, selectedClass || overview.maLopHoc || '');
        } catch (err) {
            toast.error(err.message || 'Không thể tải tài liệu.');
        } finally {
            setDownloadingId('');
        }
    };

    const handleCourseChange = (event) => {
        setSelectedCourse(event.target.value);
        setSelectedClass('');
        setOverview(EMPTY_OVERVIEW);
        setCurrentPage(1);
        setContextNotice('');
        setError('');
    };

    const handleClassChange = (event) => {
        setSelectedClass(event.target.value);
        setCurrentPage(1);
        setError('');
    };

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">
            <Toaster position="top-right" />

            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold text-primary mb-0" style={{ letterSpacing: '-0.5px' }}>HỌC CHỦ ĐỘNG</h2>
                    <p className="text-muted mb-0 small">Học sinh: <b>{user?.hoTen || user?.fullName || user?.name || 'Học sinh'}</b></p>
                </div>
                <div className="d-flex gap-3 flex-wrap">
                    <div className="bg-white rounded-4 shadow-sm border px-4 py-3">
                        <div className="text-muted small text-uppercase fw-bold">Chương học</div>
                        <div className="h4 mb-0 fw-bold text-dark">{overview.noiDungHocTap.length}</div>
                    </div>
                    <div className="bg-white rounded-4 shadow-sm border px-4 py-3">
                        <div className="text-muted small text-uppercase fw-bold">Tài liệu</div>
                        <div className="h4 mb-0 fw-bold text-dark">{totalDocuments}</div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-start gap-3 mb-4">
                    <AlertCircle className="flex-shrink-0 mt-1" size={20} />
                    <div>
                        <div className="fw-bold">Không thể tải dữ liệu</div>
                        <div className="small">{error}</div>
                    </div>
                </div>
            ) : null}

            {contextNotice ? (
                <div className="alert alert-info border-0 shadow-sm rounded-4 d-flex align-items-start gap-3 mb-4">
                    <Info className="flex-shrink-0 mt-1" size={20} />
                    <div>
                        <div className="fw-bold">Thông tin truy cập học liệu</div>
                        <div className="small">{contextNotice}</div>
                    </div>
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
                        <option value="">-- Tất cả lớp bạn đã/đang học trong khóa này --</option>
                        {classes.map((classInfo) => (
                            <option key={classInfo.id} value={classInfo.id}>
                                {classInfo.ten}{classInfo.laLopHienTai ? ' (đang học)' : ' (đã học)'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedCourse ? (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="p-5 text-center text-muted">
                        {isLoading ? (
                            <>
                                <div className="spinner-border text-primary mb-3" role="status" />
                                <div>Đang tải học liệu của học sinh...</div>
                            </>
                        ) : courses.length > 0 ? (
                            <>
                                <Search size={42} className="mx-auto mb-3 opacity-25" />
                                <div className="fw-semibold">Chọn khóa học để xem tài liệu học chủ động</div>
                                <div className="small mt-2">Bạn có thể xem tài liệu của lớp hiện tại và các lớp đã học trước đó.</div>
                            </>
                        ) : (
                            <>
                                <Info size={42} className="mx-auto mb-3 opacity-25" />
                                <div className="fw-semibold">Hiện chưa có khóa học nào khả dụng</div>
                                <div className="small mt-2">Khi được xếp lớp hoặc có lịch sử học, tài liệu sẽ xuất hiện tại đây.</div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="p-4 border-bottom bg-white">
                        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                            <div>
                                <div className="small text-muted text-uppercase fw-bold">Khóa học đang xem</div>
                                <h4 className="mb-1 fw-bold text-dark">{overview.tenKhoaHoc || 'Nội dung học tập'}</h4>
                                <p className="mb-0 text-muted">
                                    {overview.tenLop
                                        ? `Lớp: ${overview.tenLop}`
                                        : 'Đang hiển thị tài liệu của tất cả lớp bạn đã/đang học trong khóa học này.'}
                                </p>
                            </div>
                            <div className="text-lg-end">
                                <div className="small text-muted">Bạn có thể chuyển giữa lớp đang học và các lớp đã học để xem lại tài liệu.</div>
                                <div className="small text-muted">Tài liệu có thể mở trực tiếp hoặc tải xuống để học chủ động.</div>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-5 text-center text-muted">
                            <div className="spinner-border text-primary mb-3" role="status" />
                            <div>Đang tải nội dung học tập...</div>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead className="bg-white border-bottom">
                                        <tr className="text-muted small fw-bold">
                                            <th className="ps-4 py-3" style={{ width: '50%' }}>NỘI DUNG TÀI LIỆU</th>
                                            <th style={{ width: '15%' }}>ĐỊNH DẠNG</th>
                                            <th style={{ width: '15%' }}>NGÀY ĐĂNG</th>
                                            <th style={{ width: '20%' }} className="text-center">THAO TÁC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentChapters.length > 0 ? (
                                            currentChapters.map((chapter) => (
                                                <React.Fragment key={chapter.maChuong}>
                                                    <tr style={{ border: 'none' }}>
                                                        <td colSpan="4" className="p-0" style={{ border: 'none', backgroundColor: 'transparent' }}>
                                                            <div
                                                                className="d-flex flex-column flex-lg-row align-items-lg-start justify-content-between gap-2 py-3 px-4 border-top border-bottom"
                                                                style={{ backgroundColor: '#f1f5f9', width: '100%', marginTop: '8px', marginBottom: '2px' }}
                                                            >
                                                                <div className="d-flex align-items-start">
                                                                    <Folder size={18} className="text-primary me-2 mt-1" strokeWidth={2.5} />
                                                                    <div>
                                                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                                                            <div className="fw-bold text-primary" style={{ fontSize: '15px' }}>
                                                                                {chapter.tenChuong}
                                                                            </div>
                                                                            {!selectedClass && chapter.tenLop ? (
                                                                                <span className="badge bg-white text-primary border fw-normal">
                                                                                    {chapter.tenLop}
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        {chapter.moTa ? (
                                                                            <div className="small text-muted mt-1">{chapter.moTa}</div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                                <span className="badge bg-white text-secondary border fw-normal align-self-start">
                                                                    {chapter.taiLieu.length} tài liệu
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {chapter.taiLieu.length > 0 ? (
                                                        chapter.taiLieu.map((documentInfo) => (
                                                            <tr key={documentInfo.maTaiLieu} className="bg-white hover-row">
                                                                <td className="ps-5 text-dark fw-medium py-3">
                                                                    <div className="d-flex align-items-start">
                                                                        {getFileIcon(documentInfo.loaiTaiLieu)}
                                                                        <div>
                                                                            <div className="d-flex flex-wrap align-items-center gap-2">
                                                                                <span>{documentInfo.tenTaiLieu}</span>
                                                                                {documentInfo.laLinkNgoai ? (
                                                                                    <span className="badge bg-light text-info border fw-normal">
                                                                                        <Link2 size={12} className="me-1" />
                                                                                        Link ngoài
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>
                                                                            {documentInfo.moTa ? (
                                                                                <div className="small text-muted mt-1">{documentInfo.moTa}</div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-light text-muted border fw-normal px-2 py-1" style={{ fontSize: '11px' }}>
                                                                        {documentInfo.loaiTaiLieu}
                                                                    </span>
                                                                </td>
                                                                <td className="text-muted small">{documentInfo.ngayDangHienThi || '--'}</td>
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
                                                                            className="btn btn-sm border-0 rounded-0 px-2 text-success hover-btn"
                                                                            onClick={() => handleDownloadDocument(documentInfo)}
                                                                            disabled={downloadingId === documentInfo.maTaiLieu}
                                                                            title="Tải về"
                                                                        >
                                                                            <Download size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="ps-5 py-4 text-muted">
                                                                Chương này chưa có tài liệu nào.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5 text-muted">
                                                    {selectedClass
                                                        ? 'Lớp học này chưa có nội dung học tập.'
                                                        : 'Chưa có nội dung học tập cho lựa chọn hiện tại.'}
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

            <style>{`
                .hover-row:hover { background-color: #f8f9fa !important; }
                .hover-btn:hover { background-color: #f1f3f5 !important; }
            `}</style>
        </div>
    );
};

export default StudentStudyContent;
