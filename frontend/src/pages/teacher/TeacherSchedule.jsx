import React, { useState, useEffect } from 'react';
import ScheduleTable from '../../components/ScheduleTable';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/BaseApi';
import { formatPeriodLabel, getAvailablePeriodRanges, getSessionLabelFromPeriod } from '../../constants/scheduleTime';

const TeacherSchedule = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [classes, setClasses] = useState([]);
    const [roomsList, setRoomsList] = useState([]);

    // ==========================================
    // DỮ LIỆU GIẢ LẬP ĐỂ TEST FORM
    // ==========================================
    const mockRooms = ['P.101', 'P.102', 'P.201', 'P.202', 'P.301', 'P.302', 'P.405', 'Lab 1', 'Lab 2', 'Hội trường A'];
    
    // Danh sách lớp học CỐ ĐỊNH để Dropdown luôn có dữ liệu đẹp
    const classOptions = [
        { id: 'IELTS-102', name: 'IELTS 6.5+ Target' },
        { id: 'HNI-PRI4-0065', name: 'Tiếng Anh Trẻ Em' },
        { id: 'TOEIC-500', name: 'TOEIC Căn bản' },
        { id: 'KIDS-STARTER', name: 'Tiếng Anh Mầm non' }
    ];

    // ==========================================
    // STATE CHO TÍNH NĂNG ĐỀ XUẤT ĐỔI LỊCH
    // ==========================================
    const [showModal, setShowModal] = useState(false);
    const [requestType, setRequestType] = useState('time'); // 'time' (đổi giờ) | 'room' (đổi phòng)
    const [formData, setFormData] = useState({ 
        classId: '', // Để trống, người dùng phải chọn
        newDay: '', // Ngày chuyển sang (YYYY-MM-DD)
        newSlots: [], // Mảng các tiết được chọn
        newRoom: '', 
        reason: 'Có việc gia đình đột xuất'
    });
    const [selectedSlotCount, setSelectedSlotCount] = useState(1); // Số tiết của tiết được chọn
    
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

    // Định nghĩa chi tiết các tiết theo yêu cầu (id, tên, giờ bắt đầu/kết thúc)
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const reasons = [
        'Có việc gia đình đột xuất', 'Trùng lịch họp chuyên môn', 'Vấn đề sức khỏe (Ốm/Bệnh)', 
        'Phòng học bị hỏng thiết bị (Máy chiếu/Điều hòa)', 'Học viên yêu cầu học bù', 'Lý do khác...'
    ];

    // Hàm để lấy số tiết từ period (ví dụ: "Tiết 1" = 1, "Tiết 1-2" = 2)
    const getSlotCountFromPeriod = (period) => {
        if (!period) return 1;
        const match = period.match(/(\d+)(?:-(\d+))?/);
        if (match && match[2]) {
            return parseInt(match[2]) - parseInt(match[1]) + 1;
        }
        return 1;
    };

    // Hàm để lấy danh sách ngày hợp lệ (>= hôm nay) để hiển thị trong select
    const getAvailableDates = (daysAhead = 14) => {
        const results = [];
        const today = new Date();
        for (let i = 0; i < daysAhead; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const iso = d.toISOString().split('T')[0];
            const dayNames = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
            const label = `${dayNames[d.getDay()]} (${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()})`;
            results.push({ value: iso, label });
        }
        return results;
    };

    // Hàm toggle cho checkbox tiết
    const toggleSlot = (slotId) => {
        setFormData(prev => {
            const exists = prev.newSlots.includes(slotId);
            return { ...prev, newSlots: exists ? prev.newSlots.filter(s => s !== slotId) : [...prev.newSlots, slotId] };
        });
    };

    // Hàm để filter timeSlots dựa trên số tiết được chọn - trả về objects {id,label}
    const getAvailableSlots = (slotCount) => getAvailablePeriodRanges(slotCount);

    const formatDateForApi = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // DateOnly format expected by backend
    };

    const ensureApiSuccess = (result, fallbackMessage) => {
        if (result && typeof result === 'object' && result.success === false) {
            throw new Error(result.message || fallbackMessage);
        }
        return result;
    };

    // Handler khi chọn tiết học từ dropdown
    const handleSelectSchedule = (scheduleId) => {
        const selectedClass = classes.find(c => String(c.buoiHocId) === String(scheduleId));
        if (selectedClass) {
            const slotCount = getSlotCountFromPeriod(selectedClass.period);
            setSelectedSlotCount(slotCount);
            setFormData(prev => ({
                ...prev,
                classId: String(scheduleId),
                newDay: '', // reset selected newDay
                newSlots: [] // reset selected newSlots
            }));
        }
    };

    useEffect(() => {
        const fetchTeacherSchedule = async () => {
            try {
                const weekStartDate = new Date(currentDate);
                const dayOfWeek = weekStartDate.getDay();
                const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                weekStartDate.setDate(diff);
                weekStartDate.setHours(0, 0, 0, 0);
                
                // Lấy teacher ID từ multiple sources
                const teacherId = user?.profileId || user?.teacherId || user?.id || user?.userId || user?.sub;
                
                console.log('User:', user);
                console.log('TeacherId:', teacherId);
                
                const query = new URLSearchParams({
                    weekStart: formatDateForApi(weekStartDate),
                });
                if (teacherId) {
                    query.set('teacherId', teacherId);
                }
                
                console.log('Params:', Object.fromEntries(query.entries()));
                
                const response = await apiClient.get(`Schedule/teacher-board?${query.toString()}`);

// In thẳng response ra để xem (không chấm data nữa)
console.log('API response gốc:', response);

// Xử lý an toàn: Nếu response có chứa .data thì lấy .data, nếu không thì lấy chính nó
const responseData = response.data ? response.data : response;

                if (responseData && responseData.schedules) {
            const normalizedRooms = (responseData.rooms || []).map((room) => ({
            id: room.id ?? room.maPhongHoc,
            name: room.name ?? room.tenPhong,
            }));
            setRoomsList(normalizedRooms);

    // Sửa chữ response.data thành responseData
    const transformed = responseData.schedules.map(schedule => {
        const slot = getSessionLabelFromPeriod(schedule.slotId);
            // Ensure every class has a code: prefer API's classCode, else try to map by class name
            let code = schedule.classCode;
            if (!code) {
                const match = classOptions.find(c => c.name === schedule.className || c.id === schedule.className);
                code = match ? match.id : (schedule.classId || schedule.className || '');
            }

            const teacherNameFallback = user?.hoTen || user?.fullName || user?.name || user?.displayName || user?.teacherName || user?.ten || 'Đặng Xuân Trường';

            return {
                buoiHocId: schedule.maBuoiHoc || schedule.id,
                code: code,
                subject: schedule.subject,
                teacher: (schedule.teacher && schedule.teacher !== 'Giáo viên') ? schedule.teacher : teacherNameFallback,
                maPhongHoc: schedule.maPhongHoc || null,
                room: schedule.room,
                period: formatPeriodLabel(schedule.slotId, schedule.slotEndId),
                time: `${schedule.slotId}:00`,
                date: schedule.ngayHoc,
                slot: slot,
                teacherId: schedule.maGiangVien
            };
    });
    
    console.log('Transformed data:', transformed);
    setClasses(transformed);
} else {
    setClasses([]);
    setRoomsList([]);
}
            } catch (error) {
                console.error('Lỗi khi tải lịch dạy:', error);
                setClasses([]);
                setRoomsList([]);
            }
        };
        
        // Lấy dữ liệu ngay lập tức
        fetchTeacherSchedule();
        
        // Tự động refresh mỗi 10 giây để hiển thị lịch mới từ admin
        const pollInterval = setInterval(() => {
            fetchTeacherSchedule();
        }, 10000); // 10 seconds
        
        return () => clearInterval(pollInterval);
    }, [currentDate, user]);

    const changeWeek = (amount) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (amount * 7));
        setCurrentDate(newDate);
    };

    const showToastMsg = (msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3500);
    };

    const parseSlotRange = (slotKey) => {
        const key = String(slotKey || '');
        if (!key) return null;
        if (key.includes('-')) {
            const [a, b] = key.split('-').map(Number);
            if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
            return { start: a, end: b };
        }
        const value = Number(key);
        if (!Number.isFinite(value)) return null;
        return { start: value, end: value };
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();

        if (!formData.classId || !formData.classId.trim()) {
            showToastMsg('Vui lòng chọn tiết học cần thay đổi!', 'danger');
            return;
        }

        if (!formData.reason || !formData.reason.trim()) {
            showToastMsg('Vui lòng nhập lý do đề xuất!', 'danger');
            return;
        }

        if (requestType === 'time') {
            if (!formData.newDay) {
                showToastMsg('Vui lòng chọn ngày chuyển sang!', 'danger');
                return;
            }
            const todayIso = new Date().toISOString().split('T')[0];
            if (formData.newDay < todayIso) {
                showToastMsg('Ngày chuyển phải là ngày hôm nay hoặc ngày tương lai!', 'danger');
                return;
            }
            if (!formData.newSlots || formData.newSlots.length === 0) {
                showToastMsg('Vui lòng chọn ít nhất một tiết để chuyển!', 'danger');
                return;
            }
        }

        try {
            const selectedClass = classes.find(c => String(c.buoiHocId) === String(formData.classId));
            if (!selectedClass?.buoiHocId) {
                showToastMsg('Không xác định được buổi học cần đổi. Vui lòng chọn lại!', 'danger');
                return;
            }

            if (requestType === 'room') {
                if (!formData.newRoom) {
                    showToastMsg('Vui lòng chọn phòng mới!', 'danger');
                    return;
                }

                const payload = {
                    MaBuoiHoc: selectedClass.buoiHocId,
                    LoaiYeuCau: 2,
                    MaPhongHocDeXuat: formData.newRoom,
                    LyDo: formData.reason
                };

                ensureApiSuccess(await apiClient.post('Schedule/change-request', payload), 'Gửi yêu cầu đổi lịch thất bại.');
            } else {
                for (const slotKey of formData.newSlots) {
                    const range = parseSlotRange(slotKey);
                    if (!range) {
                        throw new Error('Khung tiết đề xuất không hợp lệ.');
                    }

                    const payload = {
                        MaBuoiHoc: selectedClass.buoiHocId,
                        LoaiYeuCau: 1,
                        NgayHocDeXuat: formatDateForApi(new Date(formData.newDay)),
                        MaTietBatDauDeXuat: range.start,
                        MaTietKetThucDeXuat: range.end,
                        LyDo: formData.reason
                    };

                    ensureApiSuccess(await apiClient.post('Schedule/change-request', payload), 'Gửi yêu cầu đổi lịch thất bại.');
                }
            }

            const requestCount = requestType === 'time' ? formData.newSlots.length : 1;
            showToastMsg(`Đã gửi ${requestCount} yêu cầu thành công! Vui lòng chờ Admin phê duyệt.`, 'success');
            setShowModal(false);
        } catch (error) {
            const message = error?.message || 'Gửi yêu cầu đổi lịch thất bại.';
            showToastMsg(message, 'danger');
        }
    };

    const teacherDisplayName = user?.hoTen || user?.fullName || user?.name || user?.displayName || user?.teacherName || user?.ten || 'Nguyễn Thị Lan Anh';

    return (
        <div className="p-4 animate__animated animate__fadeIn position-relative h-100">
            
            {/* THÔNG BÁO NỔI */}
            {toast.show && (
                <div className={`position-fixed bottom-0 end-0 m-4 p-3 rounded-4 shadow-lg text-white bg-${toast.type} animate__animated animate__fadeInUp`} style={{ zIndex: 1100, minWidth: '280px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div className="d-flex align-items-center fw-bold">
                        <i className={`bi ${toast.type === 'danger' ? 'bi-exclamation-triangle-fill fs-4' : 'bi-check-circle-fill fs-5'} me-3`}></i>
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1 text-uppercase" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>
                        Lịch dạy cá nhân
                    </h2>
                    <div className="d-flex align-items-center gap-2 mt-2">
                        <p className="text-muted mb-0 small">
                            Giảng viên: <span className="fw-bold text-dark">{teacherDisplayName}</span>
                        </p>
                    </div>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                    {/* NÚT REFRESH LẠI LỊch */}
                    <button className="btn btn-outline-secondary rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center hover-scale"
                            onClick={() => window.location.reload()} style={{ height: '40px' }} title="Tải lại dữ liệu lịch dạy">
                        <i className="bi bi-arrow-clockwise me-2"></i> Cập nhật
                    </button>

                    {/* NÚT YÊU CẦU ĐỔI LỊCH */}
                    <button className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center text-dark hover-scale"
                            onClick={() => setShowModal(true)} style={{ height: '40px' }}>
                        <i className="bi bi-send-plus-fill me-2"></i> Đề xuất đổi lịch
                    </button>

                    <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm hover-scale" 
                            onClick={() => setCurrentDate(new Date())} style={{ height: '40px' }}>
                        Hiện tại
                    </button>
                    
                    <div className="d-flex align-items-center border rounded-pill bg-white px-2 shadow-sm" style={{ height: '40px' }}>
                        <button className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium hover-scale" onClick={() => changeWeek(-1)}>
                            <i className="bi bi-chevron-left small fw-bold"></i> Trở về
                        </button>
                        <div className="vr mx-1 my-2" style={{ opacity: 0.2 }}></div>
                        <button className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium hover-scale" onClick={() => changeWeek(1)}>
                            Tiếp <i className="bi bi-chevron-right small fw-bold"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* BẢNG LỊCH DẠY */}
            <div className="card border-0 shadow-sm rounded-5 overflow-hidden bg-white">
                <div className="card-body p-0">
                    <ScheduleTable data={classes} currentViewDate={currentDate} />
                </div>
            </div>

            {/* GHI CHÚ */}
            <div className="mt-4 p-3 bg-light rounded-4 border-start border-primary border-4 shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-info-circle-fill text-primary"></i>
                    <small className="text-muted fw-bold text-uppercase">Lưu ý:</small>
                </div>
                <span className="small text-dark fst-italic">
                    * Thầy/Cô vui lòng thực hiện điểm danh trong vòng 15 phút đầu giờ học. Nếu có sự cố trùng lịch hoặc phòng học có vấn đề, vui lòng sử dụng chức năng <b>"Đề xuất đổi lịch"</b> phía trên.
                </span>
            </div>

            {/* ========================================== */}
            {/* MODAL ĐỀ XUẤT ĐỔI LỊCH / PHÒNG (ĐÃ FIX DROPDOWN LỚP) */}
            {/* ========================================== */}
            {showModal && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center animate__animated animate__fadeIn">
                    <div className="bg-white rounded-4 shadow-lg" style={{ width: '560px', zIndex: 1050 }}>
                        
                        <div className="p-3 px-4 bg-warning d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 text-dark">
                                <i className="bi bi-envelope-paper-fill me-2"></i> Phiếu yêu cầu thay đổi
                            </h5>
                            <button className="btn-close" onClick={() => setShowModal(false)}></button>
                        </div>

                        <form onSubmit={handleSubmitRequest}>
                            <div className="p-4 modal-scroll-area">
                            
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-dark mb-2">1. Chọn tiết học cần thay đổi:</label>
                                {/* Hiển thị danh sách các tiết được xếp cho giáo viên */}
                                <select className="form-select bg-light border-0 py-2 shadow-sm fw-medium text-primary" 
                                        value={formData.classId} onChange={e => handleSelectSchedule(e.target.value)}>
                                    <option value="" disabled>-- Chọn tiết học --</option>
                                    {classes.length > 0 ? (
                                        classes.map((c, idx) => (
                                            <option key={idx} value={String(c.buoiHocId)}>
                                                {c.code} - {c.subject || 'N/A'} | {c.period} | {c.room}{c.date ? (' | ' + new Date(c.date).toLocaleDateString()) : ''}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Không có tiết học nào được xếp</option>
                                    )}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-bold text-dark mb-2">2. Bạn muốn thay đổi gì?</label>
                                <div className="d-flex gap-3">
                                    <div className={`border rounded-3 p-2 flex-grow-1 text-center cursor-pointer transition-all ${requestType === 'time' ? 'bg-primary-subtle border-primary text-primary fw-bold shadow-sm' : 'bg-light text-muted border-light hover-bg-gray'}`}
                                         onClick={() => setRequestType('time')}>
                                        <i className="bi bi-clock-history d-block fs-4 mb-1"></i> Đổi Ngày / Tiết học
                                    </div>
                                    <div className={`border rounded-3 p-2 flex-grow-1 text-center cursor-pointer transition-all ${requestType === 'room' ? 'bg-success-subtle border-success text-success fw-bold shadow-sm' : 'bg-light text-muted border-light hover-bg-gray'}`}
                                         onClick={() => setRequestType('room')}>
                                        <i className="bi bi-door-open-fill d-block fs-4 mb-1"></i> Đổi Phòng học
                                    </div>
                                </div>
                            </div>

                            {/* THÔNG TIN CHI TIẾT */}
                            <div className="p-3 bg-light rounded-4 mb-4 border">
                                {requestType === 'time' ? (
                                    <div className="row g-3 animate__animated animate__fadeIn">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted mb-1">Chuyển sang Ngày mới:</label>
                                            <select className="form-select border-0 py-2 shadow-sm fw-medium" value={formData.newDay} onChange={e => setFormData({...formData, newDay: e.target.value})}>
                                                <option value="" disabled>-- Chọn ngày --</option>
                                                {getAvailableDates().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted mb-1">
                                                Chuyển sang Tiết mới: 
                                                <span className="text-danger small ms-1">({selectedSlotCount} tiết)</span>
                                            </label>
                                            <div className="d-flex flex-column">
                                                {getAvailableSlots(selectedSlotCount).map(s => (
                                                    <div className="form-check" key={s.id}>
                                                        <input className="form-check-input" type="checkbox" id={`slot-${s.id}`} checked={formData.newSlots.includes(s.id)} onChange={() => toggleSlot(s.id)} />
                                                        <label className="form-check-label ms-2" htmlFor={`slot-${s.id}`}>{s.label}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate__animated animate__fadeIn">
                                        <label className="form-label small fw-bold text-muted mb-1">Đề xuất chuyển sang Phòng mới:</label>
                                        <select className="form-select border-0 py-2 shadow-sm fw-medium" value={formData.newRoom} onChange={e => setFormData({...formData, newRoom: e.target.value})}>
                                            <option value="" disabled>-- Hãy chọn phòng trống --</option>
                                            {roomsList.length > 0 ? (
                                                roomsList.map(room => (
                                                    <option key={room.id} value={String(room.id)}>{room.name}</option>
                                                ))
                                            ) : (
                                                mockRooms.map(room => (
                                                    <option key={room} value="">{room}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-bold text-dark mb-2">3. Lý do đề xuất <span className="text-danger">*</span></label>
                                <select className="form-select bg-light border-0 py-2 shadow-sm mb-2 fw-medium" 
                                        value={formData.reason} 
                                        onChange={e => setFormData({...formData, reason: e.target.value})}>
                                    {reasons.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                </select>
                                {formData.reason === 'Lý do khác...' && (
                                    <textarea className="form-control bg-light border-0 p-3 shadow-sm custom-scrollbar animate__animated animate__fadeIn" rows="2" 
                                              placeholder="Vui lòng nhập rõ lý do chi tiết..."
                                              onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
                                )}
                            </div>

                            <div className="d-flex gap-2 justify-content-end pt-3 border-top">
                                <button type="button" className="btn btn-light rounded-pill px-4 fw-bold text-muted border hover-bg-gray" onClick={() => setShowModal(false)}>Hủy thao tác</button>
                                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm hover-scale">
                                    <i className="bi bi-send-fill me-1"></i> Gửi yêu cầu
                                </button>
                            </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.2s ease-in-out; }
                .hover-scale:hover { transform: scale(1.05); transition: 0.2s; }
                .hover-bg-gray:hover { background-color: #e9ecef !important; }
                .modal-backdrop-custom { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1040; backdrop-filter: blur(4px); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .modal-scroll-area { max-height: 75vh; overflow-y: auto; scroll-behavior: smooth; }
            `}</style>
        </div>
    );
};

export default TeacherSchedule;
