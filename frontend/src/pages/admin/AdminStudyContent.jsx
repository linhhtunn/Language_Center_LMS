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
    Music,
    Presentation,
    Search,
    ShieldCheck,
    Video
} from 'lucide-react';
import adminStudyContentService from '../../api/adminStudyContentService';
import { useAuth } from '../../context/AuthContext';

const ITEMS_PER_PAGE = 5;

const EMPTY_OVERVIEW = {
    maKhoaHoc: '',
    tenKhoaHoc: '',
    maLopHoc: '',
    tenLớp: '',
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
    tenLớp: chapter?.TenLop || chapter?.tenLop || '',
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
    tenLớp: overview?.TenLop || overview?.tenLop || '',
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
            return <FileText size={18} className="text-danger me-2" />;
        case 'Video':
            return <Video size={18} className="text-info me-2" />;
        case 'Word':
            return <FileCode size={18} className="text-primary me-2" />;
        case 'Excel':
            return <FileSpreadsheet size={18} className="text-success me-2" />;
        case 'Audio':
            return <Music size={18} className="text-warning me-2" />;
        case 'PowerPoint':
            return <Presentation size={18} className="text-warning me-2" />;
        case 'Archive':
            return <FileArchive size={18} className="text-secondary me-2" />;
        default:
            return <File size={18} className="text-secondary me-2" />;
    }
};

const AdminStudyContent = () => {
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

    useEffect(() => {
        let isMounted = true;

        const fetchCourses = async () => {
            try {
                const courseOptions = await adminStudyContentService.getCourses();
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
            return () => {
                isMounted = false;
            };
        }

        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                const classOptions = await adminStudyContentService.getClassesByCourse(selectedCourse);
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
                const contentOverview = await adminStudyContentService.getContents(selectedCourse, selectedClass);
                if (!isMounted) {
                    return;
                }

                setOverview(contentOverview ? normalizeOverview(contentOverview) : EMPTY_OVERVIEW);
                setCurrentPage(1);
                setError('');
            } catch (err) {
                if (isMounted) {
                    setOverview(EMPTY_OVERVIEW);
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
    };

    const handleClassChange = (event) => {
        setSelectedClass(event.target.value);
        setCurrentPage(1);
        setError('');
    };

    const handleView = (documentInfo) => {
        try {
            adminStudyContentService.viewDocument(documentInfo);
        } catch (err) {
            setError(err.message || 'Không thể mở tài liệu.');
        }
    };

    const handleDownload = async (documentInfo) => {
        try {
            setDownloadingId(documentInfo.maTaiLieu);
            setError('');
            await adminStudyContentService.downloadDocument(documentInfo);
        } catch (err) {
            setError(err.message || 'Không thể tải tài liệu.');
        } finally {
            setDownloadingId('');
        }
    };

    const isLoading = loadingCourses || loadingClasses || loadingContents;

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold text-primary mb-0 text-uppercase">Giám sát học liệu</h3>
                    <p className="text-muted small mb-0">HỆ THỐNG HỌC LIỆU TRỰC TUYẾN</p>
                    <div className="mt-2 small fw-bold text-secondary">
                        <ShieldCheck size={14} className="me-1 text-success" />
                        Admin: {user?.name || 'Admin'}
                    </div>
                </div>
                <div className="badge bg-primary text-white px-3 py-2 rounded shadow-sm">
                    CHẾ ĐỘ CHỈ XEM
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
                                {course.ten} ({course.soChuongHoc} chương, {course.soLopHoc} lớp)
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
                        <option value="">-- Tất cả lớp của khóa học --</option>
                        {classes.map((classInfo) => (
                            <option key={classInfo.id} value={classInfo.id}>
                                {classInfo.ten}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedCourse ? (
                <div className="text-center py-5 bg-white rounded border border-dashed shadow-sm">
                    <Search size={48} className="text-primary opacity-25 mb-3" />
                    <h5 className="text-muted">Vui lòng chọn khóa học để xem học liệu</h5>
                    <p className="text-muted small mb-0">Bạn có thể chọn thêm lớp học nếu muốn đối chiếu theo từng lớp cụ thể.</p>
                </div>
            ) : (
                <div className="card shadow-sm border-0">
                    <div className="border-bottom px-4 py-3 bg-white">
                        <div className="fw-semibold text-dark">{overview.tenKhoaHoc || 'Nội dung học tập'}</div>
                        <div className="small text-muted">
                            {overview.tenLop
                                ? `Lớp: ${overview.tenLop}`
                                : 'Đang hiển thị nội dung học tập của tất cả lớp trong khóa học đã chọn'}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status" />
                            <div className="text-muted small">Đang tải nội dung học tập...</div>
                        </div>
                    ) : overview.noiDungHocTap.length === 0 ? (
                        <div className="text-center py-5 bg-white">
                            <Search size={42} className="text-secondary opacity-25 mb-3" />
                            <h5 className="text-muted">Chưa có chương học nào cho lựa chọn này</h5>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-white">
                                        <tr className="text-uppercase small fw-bold border-bottom">
                                            <th className="ps-4 py-3">Nội dung</th>
                                            <th>Định dạng</th>
                                            <th>Ngày đăng</th>
                                            <th className="text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentChapters.map((chapter) => (
                                            <React.Fragment key={chapter.maChuong}>
                                                <tr className="bg-info-subtle border-0">
                                                    <td colSpan="4" className="ps-4 py-3">
                                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                                            <div className="fw-bold text-dark small">
                                                                <Folder size={16} className="me-2 text-primary" />
                                                                {chapter.tenChuong}
                                                            </div>
                                                            {!selectedClass && chapter.tenLop ? (
                                                                <span className="badge bg-white text-primary border">
                                                                    {chapter.tenLop}
                                                                </span>
                                                            ) : null}
                                                            {chapter.thuTu ? (
                                                                <span className="badge bg-light text-dark border">
                                                                    Thứ tự {chapter.thuTu}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {chapter.moTa ? (
                                                            <div className="small text-muted mt-1 ps-4">{chapter.moTa}</div>
                                                        ) : null}
                                                    </td>
                                                </tr>

                                                {chapter.taiLieu.length > 0 ? (
                                                    chapter.taiLieu.map((documentInfo) => (
                                                        <tr key={documentInfo.maTaiLieu} className="border-bottom">
                                                            <td className="ps-5 py-3 fw-medium text-dark">
                                                                <div className="d-flex align-items-center">
                                                                    {getFileIcon(documentInfo.loaiTaiLieu)}
                                                                    <div>
                                                                        <div>{documentInfo.tenTaiLieu}</div>
                                                                        {documentInfo.moTa ? (
                                                                            <div className="text-muted small mt-1">{documentInfo.moTa}</div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="badge bg-light text-dark border fw-normal">
                                                                    {documentInfo.loaiTaiLieu}
                                                                </span>
                                                            </td>
                                                            <td className="text-muted small">
                                                                {documentInfo.ngayDangHienThi || '--/--/----'}
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="btn-group border rounded shadow-sm">
                                                                    <button
                                                                        className="btn btn-sm btn-white border-end px-3"
                                                                        onClick={() => handleView(documentInfo)}
                                                                        title="Xem tài liệu"
                                                                    >
                                                                        <Eye size={16} className="text-primary" />
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-white px-3"
                                                                        onClick={() => handleDownload(documentInfo)}
                                                                        disabled={downloadingId === documentInfo.maTaiLieu}
                                                                        title="Tải xuống"
                                                                    >
                                                                        <Download size={16} className="text-success" />
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex justify-content-between align-items-center p-3 bg-white border-top">
                                <div className="small text-muted d-none d-md-block">
                                    Đang xem <b>{currentChapters.length}</b> / <b>{overview.noiDungHocTap.length}</b> chương, tổng <b>{totalDocuments}</b> tài liệu
                                </div>

                                <nav aria-label="Page navigation">
                                    <ul className="pagination pagination-sm mb-0 gap-1">
                                        <li className={`page-item ${safeCurrentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link border-0 shadow-sm rounded-3 d-flex align-items-center justify-content-center bg-light text-dark"
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                        </li>

                                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                            <li key={pageNumber} className={`page-item ${safeCurrentPage === pageNumber ? 'active' : ''}`}>
                                                <button
                                                    className="page-link border-0 shadow-sm rounded-3 d-flex align-items-center justify-content-center fw-bold ms-1"
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        backgroundColor: safeCurrentPage === pageNumber ? '#0d6efd' : '#f8f9fa',
                                                        color: safeCurrentPage === pageNumber ? 'white' : '#495057'
                                                    }}
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                >
                                                    {pageNumber}
                                                </button>
                                            </li>
                                        ))}

                                        <li className={`page-item ${safeCurrentPage === totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link border-0 shadow-sm rounded-3 d-flex align-items-center justify-content-center bg-light text-dark ms-1"
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </li>
                                    </ul>
                                </nav>

                                <div className="d-flex align-items-center gap-2">
                                    <span className="small text-muted d-none d-sm-inline">Đi đến</span>
                                    <select
                                        className="form-select form-select-sm border-light-subtle shadow-sm"
                                        style={{ width: '65px', borderRadius: '6px' }}
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
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminStudyContent;


