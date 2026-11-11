import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import studentService from '../api/studentService';
import teacherService from '../api/teacherService';
import parentService from '../api/parentService';

// Import tài nguyên ảnh
import anhNen1 from '../assets/avtLogin2.jpg'; 
import anhNen2 from '../assets/avtLogin3.jpg'; 
import anhNen3 from '../assets/anh3.jpg'; 
import logoApollo from '../assets/anh4.png'; 
import avtLogin from '../assets/avtLogin.jpg';
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [remember, setRemember] = useState(false);
    const { login, updateUser } = useAuth();
    const navigate = useNavigate();

    const bannerImages = [avtLogin,anhNen1, anhNen2, anhNen3];

    useEffect(() => {
        try {
            const saved = localStorage.getItem('rememberedCredentials');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.email) setEmail(parsed.email);
                // We purposely do NOT pre-fill password when storing token for security
                if (parsed?.token) setRemember(true);
            }
        } catch (err) {
            console.warn('Không thể đọc credentials đã lưu', err);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        try {
            // 1. Gọi API đăng nhập qua module authApi
            const data = await authApi.login(email, password);

            if (data?.success && data?.data) {
                const userData = data.data;

                // Nếu bật ghi nhớ, lưu credential vào localStorage (ngược lại xóa)
                try {
                    const tokenValue = userData?.token || userData?.accessToken || userData?.authToken || null;
                    if (remember && tokenValue) {
                        localStorage.setItem('rememberedCredentials', JSON.stringify({ email, token: tokenValue }));
                    } else {
                        localStorage.removeItem('rememberedCredentials');
                    }
                } catch (err) {
                    console.warn('Không thể lưu token:', err);
                }

                // 2. Lưu thông tin người dùng vào Context
                login(userData);

                // 3. Lấy dữ liệu profile theo role để cập nhật avatar
                try {
                    let profileData = null;
                    let profileService = studentService;

                    if (userData.role === 'Hoc_Sinh') {
                        // Bổ sung luồng học sinh để avatar/tên hiển thị đúng ngay sau đăng nhập.
                        profileData = await studentService.getProfile();
                        profileService = studentService;
                    } else if (userData.role === 'Giao_Vien') {
                        // Bổ sung luồng giảng viên để avatar/tên hiển thị đúng ngay sau đăng nhập.
                        profileData = await teacherService.getProfile();
                        profileService = teacherService;
                    } else if (userData.role === 'Phu_Huynh') {
                        // Bổ sung luồng phụ huynh để avatar/tên hiển thị đúng ngay sau đăng nhập.
                        profileData = await parentService.getProfile();
                        profileService = parentService;
                    }
                    
                    // Nếu lấy được profile data, cập nhật context với thông tin avatar
                    if (profileData) {
                        updateUser((prevUser) => ({
                            ...prevUser,
                            hoTen: profileData?.HoTen || profileData?.hoTen || prevUser?.hoTen,
                            fullName: profileData?.HoTen || profileData?.hoTen || prevUser?.fullName,
                            name: profileData?.HoTen || profileData?.hoTen || prevUser?.name,
                            AnhDaiDien: profileData?.AnhDaiDien || profileData?.anhDaiDien || prevUser?.AnhDaiDien,
                            anhDaiDien: profileData?.AnhDaiDien || profileData?.anhDaiDien || prevUser?.anhDaiDien,
                            avatarUrl: profileData?.AnhDaiDien || profileData?.anhDaiDien || prevUser?.avatarUrl,
                            avatar: profileService.resolveStoredFileUrl(profileData?.AnhDaiDien || profileData?.anhDaiDien) || prevUser?.avatar,
                        }));
                    }
                } catch (profileError) {
                    // Nếu lỗi khi lấy profile, vẫn tiếp tục (không block login)
                    console.error('Lỗi khi lấy profile:', profileError);
                }

                // 4. ĐIỀU HƯỚNG TỰ ĐỘNG THEO VAI TRÒ (ROLE)
                // Lưu ý: data.role trả về từ Backend phải khớp với các case bên dưới
                switch (userData.role) {
                    case 'Admin':
                        navigate('/admin');
                        break;
                    case 'Giao_Vien':
                        navigate('/teacher');
                        break;
                    case 'Phu_Huynh':
                        navigate('/parent');
                        break;
                    case 'Hoc_Sinh':
                        navigate('/student');
                        break;
                    default:
                        navigate('/'); // Quay về trang chủ nếu không xác định được vai trò
                }
            } else {
                setFormError(data.message || "Tài khoản hoặc mật khẩu không chính xác!");
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            setFormError("Không thể kết nối đến máy chủ. Hãy kiểm tra Backend!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page container-fluid vh-100 p-0 overflow-hidden" 
             style={{ backgroundColor: '#005197' }}> 
            <div className="row g-0 h-100">
                {/* BÊN TRÁI: Slideshow (Giữ nguyên giao diện đẹp của bạn) */}
                <div className="col-lg-7 d-none d-lg-flex align-items-center justify-content-center h-100">
                    <div className="brand-section text-center position-relative" style={{ width: '100%', maxWidth: '850px', padding: '0 80px' }}>
                        <button className="custom-nav-btn btn-prev" type="button" data-bs-target="#bannerCarousel" data-bs-slide="prev">
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <div className="bg-white p-1 rounded-4 shadow-lg overflow-hidden">
                            <div id="bannerCarousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
                                <div className="carousel-inner rounded-3">
                                    {bannerImages.map((imgSrc, index) => (
                                        <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                                            <img src={imgSrc} className="d-block w-100" alt={`Slide ${index + 1}`} style={{ height: '55vh', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button className="custom-nav-btn btn-next" type="button" data-bs-target="#bannerCarousel" data-bs-slide="next">
                            <i className="bi bi-chevron-right"></i>
                        </button>
                        <h2 className="fw-bold mt-4 text-white" style={{ letterSpacing: '1px' }}>WHERE THE BEST BECOME BETTER</h2>
                    </div>
                </div>

                {/* BÊN PHẢI: Form Đăng nhập */}
                <div className="col-lg-5 d-flex flex-column align-items-center justify-content-center p-4 h-100">
                    <div className="text-center mb-5">
                        <div style={{ width: '150px', height: '150px', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', padding: '20px', border: '6px solid rgba(255, 255, 255, 0.25)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                            <img src={logoApollo} alt="Apollo Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <div className="login-card shadow-lg bg-white p-5" style={{ maxWidth: '450px', width: '100%', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginTop: '-15px' }}>
                        <h2 className="fw-bold text-dark mb-1 text-center">Sign in to Active</h2>
                        <p className="text-muted small mb-4 text-center">Enter your details below</p>
                        {formError && (
                            <div className="alert alert-danger py-2" role="alert">
                                {formError}
                            </div>
                        )}
                        
                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-secondary">Email</label>
                                <div className="input-group border rounded-3 p-2 bg-light">
                                    <span className="input-group-text bg-transparent border-0 text-muted"><i className="bi bi-envelope"></i></span>
                                    <input type="email" className="form-control border-0 bg-transparent shadow-none" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="d-flex justify-content-between">
                                    <label className="form-label small fw-bold text-secondary">Password</label>
                                    <a href="#" className="small text-decoration-none fw-bold" style={{ color: '#005197' }}>Forgot?</a>
                                </div>
                                <div className="input-group border rounded-3 p-2 bg-light">
                                    <span className="input-group-text bg-transparent border-0 text-muted"><i className="bi bi-lock"></i></span>
                                    <input type={showPassword ? "text" : "password"} className="form-control border-0 bg-transparent shadow-none" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <button type="button" className="btn border-0 bg-transparent text-muted" onClick={() => setShowPassword(!showPassword)}>
                                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="form-check d-flex align-items-center justify-content-between mb-3">
                                <div>
                                    <input className="form-check-input me-2" type="checkbox" value="" id="rememberCheck" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                                    <label className="form-check-label small text-secondary" htmlFor="rememberCheck">Ghi nhớ tài khoản</label>
                                </div>
                                <a href="#" className="small text-decoration-none fw-bold" style={{ color: '#005197' }}>Quên mật khẩu?</a>
                            </div>

                            <button type="submit" className="btn w-100 py-3 rounded-pill fw-bold text-white transition-all mt-2" disabled={loading || !email || !password} style={{ backgroundColor: (email && password) ? '#ef7d00' : '#dcdcdc', boxShadow: (email && password) ? '0 6px 15px rgba(239, 125, 0, 0.4)' : 'none' }}>
                                {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</> : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
