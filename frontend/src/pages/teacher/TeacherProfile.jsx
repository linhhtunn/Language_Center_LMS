import React, { useEffect, useRef, useState } from 'react';
import teacherService from '../../api/teacherService';
import { useAuth } from '../../context/AuthContext';

// Màn hồ sơ giảng viên dùng API thật, có xem/sửa thông tin và quản lý avatar
// theo cùng pattern với StudentProfile và ParentProfile.
const EMPTY_PROFILE = {
    HoTen: '',
    Email: '',
    AnhDaiDien: '',
    SoDienThoai: '',
    QueQuan: '',
    TrinhDoChuyenMon: '',
    HocVi: '',
    KinhNghiemGiangDay: ''
};

const FIELD_GROUPS = [
    {
        title: 'Thông tin liên hệ',
        icon: 'bi-person-badge',
        fields: [
            { name: 'HoTen', label: 'Họ và tên', required: true, placeholder: 'Nhập họ và tên' },
            { name: 'Email', label: 'Email', disabled: true, placeholder: 'Chưa cập nhật' },
            { name: 'SoDienThoai', label: 'Số điện thoại', placeholder: 'Nhập số điện thoại' },
            { name: 'QueQuan', label: 'Quê quán', placeholder: 'Nhập quê quán' }
        ]
    },
    {
        title: 'Thông tin chuyên môn',
        icon: 'bi-mortarboard',
        fields: [
            { name: 'HocVi', label: 'Học vị', placeholder: 'Ví dụ: Thạc sĩ' },
            { name: 'TrinhDoChuyenMon', label: 'Trình độ chuyên môn', placeholder: 'Ví dụ: IELTS, TOEIC, Grammar' }
        ]
    }
];

const OPTIONAL_PROFILE_FIELDS = ['SoDienThoai', 'QueQuan', 'HocVi', 'KinhNghiemGiangDay'];

// Chuẩn hóa key PascalCase/camelCase để frontend không phụ thuộc cách backend trả field.
const normalizeProfile = (profile) => ({
    HoTen: profile?.HoTen || profile?.hoTen || '',
    Email: profile?.Email || profile?.email || '',
    AnhDaiDien: profile?.AnhDaiDien || profile?.anhDaiDien || '',
    SoDienThoai: profile?.SoDienThoai || profile?.soDienThoai || '',
    QueQuan: profile?.QueQuan || profile?.queQuan || '',
    TrinhDoChuyenMon: profile?.TrinhDoChuyenMon || profile?.trinhDoChuyenMon || '',
    HocVi: profile?.HocVi || profile?.hocVi || '',
    KinhNghiemGiangDay: profile?.KinhNghiemGiangDay || profile?.kinhNghiemGiangDay || ''
});

const TeacherProfile = () => {
    const { updateUser } = useAuth();
    const avatarInputRef = useRef(null);

    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [formData, setFormData] = useState(EMPTY_PROFILE);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
    const [isResettingOptional, setIsResettingOptional] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [selectedAvatarName, setSelectedAvatarName] = useState('');
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const setAvatarPreviewInShell = (previewUrl = '') => {
        updateUser((prevUser) => {
            if (!prevUser) {
                return prevUser;
            }

            return {
                ...prevUser,
                avatarPreview: previewUrl || undefined
            };
        });
    };

    // Đồng bộ tên/avatar lên AuthContext để sidebar và header cập nhật ngay.
    const syncAuthUser = (nextProfile) => {
        const normalizedNextProfile = normalizeProfile(nextProfile);

        updateUser((prevUser) => ({
            ...(prevUser || {}),
            hoTen: normalizedNextProfile.HoTen,
            fullName: normalizedNextProfile.HoTen,
            name: normalizedNextProfile.HoTen,
            email: normalizedNextProfile.Email || prevUser?.email || '',
            AnhDaiDien: normalizedNextProfile.AnhDaiDien,
            anhDaiDien: normalizedNextProfile.AnhDaiDien,
            avatarUrl: normalizedNextProfile.AnhDaiDien,
            avatar: teacherService.resolveStoredFileUrl(normalizedNextProfile.AnhDaiDien) || prevUser?.avatar || '',
            avatarPreview: undefined
        }));
    };

    useEffect(() => {
        let isMounted = true;

        // Tải profile thật từ backend thay cho dữ liệu tĩnh hoặc dữ liệu cục bộ.
        const fetchProfile = async () => {
            try {
                const data = normalizeProfile(await teacherService.getProfile());
                if (!isMounted) {
                    return;
                }

                setProfile(data);
                setFormData(data);
                syncAuthUser(data);
                setError('');
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'Không thể tải thông tin giảng viên.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
            setAvatarPreviewInShell('');
        };
    }, []);

    useEffect(() => {
        if (!successMessage) {
            return undefined;
        }

        const timer = window.setTimeout(() => setSuccessMessage(''), 3200);
        return () => window.clearTimeout(timer);
    }, [successMessage]);

    useEffect(() => {
        return () => {
            if (previewImage?.startsWith('blob:')) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
        setError('');
        setSaveError('');
    };

    const resetAvatarSelection = () => {
        if (previewImage?.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }

        setPreviewImage('');
        setSelectedAvatarName('');
        setAvatarPreviewInShell('');

        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(profile);
        setSaveError('');
        resetAvatarSelection();
    };

    // Lưu toàn bộ thay đổi hồ sơ; nếu đã chọn file ảnh thì upload trước rồi mới update profile.
    const handleSave = async () => {
        if (!formData.HoTen.trim()) {
            setSaveError('Họ và tên không được để trống.');
            return;
        }

        try {
            setIsSaving(true);
            setSaveError('');

            let nextFormData = { ...formData };
            const selectedAvatarFile = avatarInputRef.current?.files?.[0];

            if (selectedAvatarFile) {
                const uploadResult = await teacherService.uploadAvatar(selectedAvatarFile);
                nextFormData = {
                    ...nextFormData,
                    AnhDaiDien: uploadResult?.avatarUrl || nextFormData.AnhDaiDien
                };
            }

            const updatedProfile = normalizeProfile(await teacherService.updateProfile(nextFormData));
            setProfile(updatedProfile);
            setFormData(updatedProfile);
            syncAuthUser(updatedProfile);
            setIsEditing(false);
            resetAvatarSelection();
            setSuccessMessage('Cập nhật thông tin thành công.');
        } catch (err) {
            setSaveError(err.message || 'Không thể cập nhật thông tin.');
        } finally {
            setIsSaving(false);
        }
    };



    const handleAvatarSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSaveError('Dung lượng ảnh không vượt quá 5MB.');
            resetAvatarSelection();
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setSaveError('Chỉ chấp nhận file ảnh JPG, PNG, GIF hoặc WEBP.');
            resetAvatarSelection();
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        if (previewImage?.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }

        setPreviewImage(objectUrl);
        setSelectedAvatarName(file.name);
        setAvatarPreviewInShell(objectUrl);
        setSaveError('');
    };

    // Cho phép upload avatar riêng mà không cần chờ bấm "Lưu thay đổi".
    const handleAvatarUpload = async () => {
        const file = avatarInputRef.current?.files?.[0];
        if (!file) {
            setSaveError('Chưa chọn file ảnh.');
            return;
        }

        try {
            setIsUploadingAvatar(true);
            setSaveError('');

            const uploadResult = await teacherService.uploadAvatar(file);
            const storedPath = uploadResult?.avatarUrl || '';
            const nextProfile = {
                ...formData,
                AnhDaiDien: storedPath
            };

            setProfile(nextProfile);
            setFormData(nextProfile);
            syncAuthUser(nextProfile);
            setSuccessMessage('Ảnh đại diện đã được upload và lưu trên hệ thống.');
            resetAvatarSelection();
        } catch (err) {
            setSaveError(err.message || 'Không thể upload ảnh đại diện.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleDeleteAvatar = async () => {
        const hasStoredAvatar = Boolean(formData.AnhDaiDien);

        if (!hasStoredAvatar) {
            if (previewImage || selectedAvatarName) {
                resetAvatarSelection();
                setSuccessMessage('Đã bỏ ảnh đang chọn.');
            }
            return;
        }

        if (!window.confirm('Bạn có chắc muốn xóa ảnh đại diện hiện tại không?')) {
            return;
        }

        try {
            setIsDeletingAvatar(true);
            setSaveError('');

            await teacherService.deleteAvatar();

            const nextProfile = normalizeProfile({
                ...profile,
                ...formData,
                AnhDaiDien: ''
            });

            setProfile(nextProfile);
            setFormData(nextProfile);
            syncAuthUser(nextProfile);
            resetAvatarSelection();
            setSuccessMessage('Đã xóa ảnh đại diện.');
        } catch (err) {
            setSaveError(err.message || 'Không thể xóa ảnh đại diện.');
        } finally {
            setIsDeletingAvatar(false);
        }
    };

    // Reset nhóm thông tin mở rộng của giảng viên, vẫn giữ lại các trường cốt lõi.
    const handleResetOptionalFields = async () => {
        if (!window.confirm('Bạn có chắc muốn đặt lại toàn bộ thông tin tùy chọn không?')) {
            return;
        }

        try {
            setIsResettingOptional(true);
            setSaveError('');

            const resetData = OPTIONAL_PROFILE_FIELDS.reduce(
                (accumulator, fieldName) => ({
                    ...accumulator,
                    [fieldName]: ''
                }),
                { ...formData }
            );

            const updatedProfile = normalizeProfile(await teacherService.updateProfile(resetData));
            setProfile(updatedProfile);
            setFormData(updatedProfile);
            syncAuthUser(updatedProfile);
            setSuccessMessage('Đã đặt lại thông tin tùy chọn.');
        } catch (err) {
            setSaveError(err.message || 'Không thể đặt lại thông tin tùy chọn.');
        } finally {
            setIsResettingOptional(false);
        }
    };

    const avatarSrc =
        previewImage ||
        teacherService.resolveStoredFileUrl(formData.AnhDaiDien) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.HoTen || 'Teacher')}&background=005197&color=ffffff&bold=true&size=256`;
    const canClearAvatar = Boolean(formData.AnhDaiDien || previewImage || selectedAvatarName);
    const isMutating = isSaving || isUploadingAvatar || isDeletingAvatar || isResettingOptional;

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" />
                    <div className="text-muted fw-semibold">Đang tải thông tin giảng viên...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <div className="mx-auto" style={{ maxWidth: '1180px' }}>
                {successMessage && (
                    <div className="alert alert-success border-0 shadow-sm rounded-4 d-flex align-items-center gap-3 mb-4">
                        <i className="bi bi-check-circle-fill fs-4"></i>
                        <div className="fw-semibold">{successMessage}</div>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-center gap-3 mb-4">
                        <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                        <div className="fw-semibold">{error}</div>
                    </div>
                )}

                <div className="card border-0 rounded-5 overflow-hidden shadow-sm mb-4 profile-hero">
                    <div className="card-body p-4 p-lg-5">
                        <div className="row g-4 align-items-center">
                            <div className="col-lg-7">
                                <div className="d-flex align-items-center gap-4 flex-wrap">
                                    <div className="profile-avatar-shell">
                                        <img
                                            src={avatarSrc}
                                            alt="Ảnh đại diện giảng viên"
                                            className="rounded-4 object-fit-cover"
                                            style={{ width: '112px', height: '112px' }}
                                        />
                                    </div>

                                    <div>
                                        <div className="text-uppercase small fw-bold text-primary-emphasis mb-2 profile-letter-spacing">
                                            Hồ sơ giảng viên
                                        </div>
                                        <h1 className="mb-2 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                                            {profile.HoTen || 'Giảng viên English Education'}
                                        </h1>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            <span className="badge rounded-pill text-bg-primary px-3 py-2">
                                                {profile.HocVi || 'Giảng viên'}
                                            </span>
                                            <span className="badge rounded-pill bg-white text-dark border px-3 py-2">
                                                {profile.TrinhDoChuyenMon || 'Chưa cập nhật chuyên môn'}
                                            </span>
                                        </div>
                                        <div className="d-flex flex-wrap gap-4 text-secondary small fw-semibold">
                                            <span>
                                                <i className="bi bi-envelope me-2 text-primary"></i>
                                                {profile.Email || 'Chưa có email'}
                                            </span>
                                            <span>
                                                <i className="bi bi-telephone me-2 text-primary"></i>
                                                {profile.SoDienThoai || 'Chưa có số điện thoại'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-5">
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <div className="profile-stat-card h-100">
                                            <div className="profile-stat-icon bg-primary-subtle text-primary">
                                                <i className="bi bi-geo-alt"></i>
                                            </div>
                                            <div className="small text-uppercase text-muted fw-bold profile-letter-spacing mb-2">
                                                Quê quán
                                            </div>
                                            <div className="fw-bold text-dark">
                                                {profile.QueQuan || 'Chưa cập nhật'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-sm-6">
                                        <div className="profile-stat-card h-100">
                                            <div className="profile-stat-icon bg-success-subtle text-success">
                                                <i className="bi bi-award"></i>
                                            </div>
                                            <div className="small text-uppercase text-muted fw-bold profile-letter-spacing mb-2">
                                                Học vị
                                            </div>
                                            <div className="fw-bold text-dark">
                                                {profile.HocVi || 'Chưa cập nhật'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="card border-0 rounded-5 shadow-sm overflow-hidden">
                            <div className="card-header bg-white border-0 p-4 pb-0">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                    <div>
                                        <div className="text-uppercase small fw-bold text-muted profile-letter-spacing mb-2">
                                            Quản lý hồ sơ cá nhân
                                        </div>
                                        <h2 className="h3 fw-bold mb-0 text-dark">Thông tin cá nhân</h2>
                                    </div>

                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        {!isEditing ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
                                                onClick={handleEdit}
                                            >
                                                <i className="bi bi-pencil-square me-2"></i>
                                                Chỉnh sửa
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-light rounded-pill px-4 fw-bold border"
                                                    onClick={handleCancel}
                                                    disabled={isMutating}
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-warning rounded-pill px-4 fw-bold"
                                                    onClick={handleResetOptionalFields}
                                                    disabled={isMutating}
                                                >
                                                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                                                    {isResettingOptional ? 'Đang đặt lại...' : 'Đặt lại thông tin tùy chọn'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill px-4 fw-bold shadow-sm"
                                                    onClick={handleSave}
                                                    disabled={isMutating}
                                                >
                                                    <i className="bi bi-check2-circle me-2"></i>
                                                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card-body p-4">
                                <div className="row g-4">
                                    <div className="col-12">
                                        <div className="profile-section-card">
                                            <div className="d-flex align-items-center gap-3 mb-4">
                                                <div className="profile-stat-icon bg-info-subtle text-info">
                                                    <i className="bi bi-image"></i>
                                                </div>
                                                <div>
                                                    <h3 className="h5 fw-bold mb-1 text-dark">Ảnh đại diện hệ thống</h3>
                                                    <p className="text-muted small mb-0">
                                                        Ảnh được upload trực tiếp lên server và lưu cho tài khoản giảng viên, không cần nhập URL thủ công.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="row g-4 align-items-center">
                                                <div className="col-md-4">
                                                    <img
                                                        src={avatarSrc}
                                                        alt="Xem trước ảnh đại diện"
                                                        className="rounded-4 border object-fit-cover w-100"
                                                        style={{ maxWidth: '220px', aspectRatio: '1 / 1' }}
                                                    />
                                                </div>
                                                <div className="col-md-8">
                                                    {isEditing ? (
                                                        <>
                                                            <input
                                                                ref={avatarInputRef}
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                                className="form-control rounded-4 border-0 profile-input"
                                                                onChange={handleAvatarSelect}
                                                            />
                                                            <div className="small text-muted mt-2">
                                                                Chấp nhận JPG, PNG, GIF, WEBP. Dung lượng tối đa 5MB.
                                                            </div>

                                                            {selectedAvatarName && (
                                                                <div className="mt-3 p-3 rounded-4 bg-light border">
                                                                    <div className="fw-semibold text-dark mb-1">{selectedAvatarName}</div>
                                                                    <div className="small text-muted">Ảnh sẽ được lưu ngay trên hệ thống sau khi bấm Upload ảnh.</div>
                                                                </div>
                                                            )}

                                                            <div className="d-flex flex-wrap gap-2 mt-3">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary rounded-pill px-4 fw-bold"
                                                                    onClick={handleAvatarUpload}
                                                                    disabled={!selectedAvatarName || isMutating}
                                                                >
                                                                    <i className="bi bi-cloud-upload me-2"></i>
                                                                    {isUploadingAvatar ? 'Đang upload...' : 'Upload ảnh'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-light border rounded-pill px-4 fw-bold"
                                                                    onClick={resetAvatarSelection}
                                                                    disabled={isMutating}
                                                                >
                                                                    Bỏ chọn
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger rounded-pill px-4 fw-bold"
                                                                    onClick={handleDeleteAvatar}
                                                                    disabled={!canClearAvatar || isMutating}
                                                                >
                                                                    <i className="bi bi-trash3 me-2"></i>
                                                                    {isDeletingAvatar ? 'Đang xóa...' : 'Xóa ảnh đại diện'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="d-grid gap-3">
                                                            <div className="profile-mini-info">
                                                            <span className="text-muted small">Trạng thái ảnh đại diện</span>
                                                            <strong className="text-dark">
                                                                {formData.AnhDaiDien ? 'Đã lưu trên hệ thống' : 'Đang dùng ảnh mặc định'}
                                                            </strong>
                                                            </div>
                                                            {formData.AnhDaiDien && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger rounded-pill px-4 fw-bold"
                                                                    onClick={handleDeleteAvatar}
                                                                    disabled={isMutating}
                                                                >
                                                                    <i className="bi bi-trash3 me-2"></i>
                                                                    {isDeletingAvatar ? 'Đang xóa...' : 'Xóa ảnh đại diện'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {FIELD_GROUPS.map((group) => (
                                        <div className="col-12" key={group.title}>
                                            <div className="profile-section-card">
                                                <div className="d-flex align-items-center gap-3 mb-4">
                                                    <div className="profile-stat-icon bg-light text-primary">
                                                        <i className={`bi ${group.icon}`}></i>
                                                    </div>
                                                    <div>
                                                        <h3 className="h5 fw-bold mb-1 text-dark">{group.title}</h3>
                                                        <p className="text-muted small mb-0">Cập nhật các thông tin hiển thị trên hệ thống</p>
                                                    </div>
                                                </div>

                                                <div className="row g-3">
                                                    {group.fields.map((field) => (
                                                        <div className="col-md-6" key={field.name}>
                                                            <ProfileField
                                                                label={field.label}
                                                                name={field.name}
                                                                value={formData[field.name]}
                                                                placeholder={field.placeholder}
                                                                isEditing={isEditing}
                                                                onChange={handleInputChange}
                                                                disabled={field.disabled}
                                                                required={field.required}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="col-12">
                                        <div className="profile-section-card">
                                            <div className="d-flex align-items-center gap-3 mb-4">
                                                <div className="profile-stat-icon bg-warning-subtle text-warning">
                                                    <i className="bi bi-journal-richtext"></i>
                                                </div>
                                                <div>
                                                    <h3 className="h5 fw-bold mb-1 text-dark">Kinh nghiệm giảng dạy</h3>
                                                    <p className="text-muted small mb-0">Mô tả ngắn gọn về thế mạnh và kinh nghiệm của giảng viên</p>
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <textarea
                                                    className="form-control rounded-4 border-0 profile-textarea"
                                                    name="KinhNghiemGiangDay"
                                                    rows="6"
                                                    value={formData.KinhNghiemGiangDay}
                                                    onChange={handleInputChange}
                                                    placeholder="Nhập kinh nghiệm giảng dạy, thành tích, chứng chỉ hoặc điểm mạnh chuyên môn..."
                                                />
                                            ) : (
                                                <div className="profile-note-card">
                                                    {profile.KinhNghiemGiangDay || 'Chưa có mô tả kinh nghiệm giảng dạy.'}
                                                </div>
                                            )}

                                            {saveError && (
                                                <div className="alert alert-danger border-0 rounded-4 mt-4 mb-0">
                                                    <i className="bi bi-exclamation-circle me-2"></i>
                                                    {saveError}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card border-0 rounded-5 shadow-sm overflow-hidden mb-4">
                            <div className="card-body p-4">
                                <div className="text-uppercase small fw-bold text-muted profile-letter-spacing mb-2">
                                    Trạng thái
                                </div>
                                <h3 className="h4 fw-bold text-dark mb-3">Tài khoản đang hoạt động</h3>
                                <p className="text-muted mb-4">
                                    Hồ sơ này được sử dụng để hiển thị thông tin giảng viên trên hệ thống học tập và các màn hình nội bộ.
                                </p>

                                <div className="d-grid gap-3">
                                    <div className="profile-mini-info">
                                        <span className="text-muted small">Email hệ thống</span>
                                        <strong className="text-dark">{profile.Email || 'Chưa cập nhật'}</strong>
                                    </div>
                                    <div className="profile-mini-info">
                                        <span className="text-muted small">Ảnh đại diện</span>
                                        <strong className="text-dark">{profile.AnhDaiDien ? 'Đã lưu trên hệ thống' : 'Đang dùng ảnh mặc định'}</strong>
                                    </div>
                                    <div className="profile-mini-info">
                                        <span className="text-muted small">Số điện thoại</span>
                                        <strong className="text-dark">{profile.SoDienThoai || 'Đang bổ sung'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>



            <style>{`
                .profile-hero {
                    background:
                        radial-gradient(circle at top right, rgba(13, 110, 253, 0.16), transparent 28%),
                        linear-gradient(135deg, #ffffff 0%, #eef4ff 100%);
                }

                .profile-avatar-shell {
                    padding: 8px;
                    border-radius: 28px;
                    background: linear-gradient(135deg, rgba(13, 110, 253, 0.18), rgba(13, 202, 240, 0.14));
                    box-shadow: 0 18px 40px rgba(13, 110, 253, 0.12);
                }

                .profile-stat-card,
                .profile-section-card,
                .profile-mini-info,
                .profile-note-card {
                    border-radius: 24px;
                    background: #ffffff;
                    border: 1px solid rgba(15, 23, 42, 0.06);
                }

                .profile-stat-card {
                    padding: 20px;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
                }

                .profile-section-card {
                    padding: 24px;
                    background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
                }

                .profile-mini-info {
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    background: #f8fbff;
                }

                .profile-note-card {
                    padding: 20px 22px;
                    min-height: 160px;
                    line-height: 1.7;
                    color: #334155;
                    background:
                        linear-gradient(180deg, rgba(13, 110, 253, 0.03), rgba(255, 255, 255, 0.92)),
                        #ffffff;
                }

                .profile-textarea,
                .profile-input {
                    background: #f8fbff;
                    box-shadow: none;
                    padding: 0.9rem 1rem;
                }

                .profile-textarea:focus,
                .profile-input:focus {
                    background: #ffffff;
                    border-color: rgba(13, 110, 253, 0.2);
                    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.12);
                }

                .profile-stat-icon {
                    width: 46px;
                    height: 46px;
                    border-radius: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }

                .profile-letter-spacing {
                    letter-spacing: 0.12em;
                }

                .profile-danger-card {
                    background: linear-gradient(180deg, #fffafa 0%, #ffffff 100%);
                }

                .profile-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    z-index: 1055;
                }

                .profile-modal-card {
                    width: 100%;
                    max-width: 520px;
                }

                @media (max-width: 991.98px) {
                    .profile-hero .card-body {
                        padding: 28px 24px;
                    }
                }
            `}</style>
        </div>
    );
};

const ProfileField = ({
    label,
    name,
    value,
    placeholder,
    isEditing,
    onChange,
    disabled = false,
    required = false
}) => (
    <div>
        <label className="form-label small fw-bold text-uppercase text-muted mb-2 profile-letter-spacing">
            {label}
        </label>
        {isEditing ? (
            <input
                type="text"
                className="form-control rounded-4 border-0 profile-input"
                name={name}
                value={value || ''}
                placeholder={placeholder}
                onChange={onChange}
                disabled={disabled}
                required={required}
            />
        ) : (
            <div className="profile-mini-info">
                <strong className="text-dark">{value || 'Chưa cập nhật'}</strong>
            </div>
        )}
    </div>
);

export default TeacherProfile;
