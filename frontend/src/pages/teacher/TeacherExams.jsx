import React, { useState } from 'react';
import {
    BookOpen, FileText, Plus, Edit, Trash2, Settings,
    Search, Send, Clock, Users, UserCheck, ChevronRight, ChevronLeft, CheckCircle
} from 'lucide-react';

const TeacherExams = () => {
    // --- STATE QUẢN LÝ TAB ---
    const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'history' | 'manage'
    const [searchTerm, setSearchTerm] = useState('');

    // --- MOCK DATA: LỚP & HỌC SINH ---
    const classes = [
        { id: "L01", ten: "IELTS_Sáng_T246" },
        { id: "L02", ten: "TOEIC_Tối_T357" }
    ];

    const studentsByClass = {
        "L01": [
            { id: "HS01", ten: "Nguyễn Văn A" },
            { id: "HS02", ten: "Trần Thị B" },
            { id: "HS03", ten: "Lê Văn C" }
        ],
        "L02": [
            { id: "HS04", ten: "Phạm Văn D" },
            { id: "HS05", ten: "Hoàng Thị E" }
        ]
    };

    // --- MOCK DATA: KHO BÀI TẬP ---
    const [exams, setExams] = useState([
        { id: 1, ten: "Bài Test Unit 1 - Reading", loai: "Trắc nghiệm", soCau: 40, thoiGian: 60, date: "20/03/2026" },
        { id: 2, ten: "Bài tập Writing Task 1", loai: "Tự luận", soCau: 1, thoiGian: 40, date: "22/03/2026" }
    ]);

    // --- MOCK DATA: LỊCH SỬ GIAO BÀI ---
    const [assignedExams, setAssignedExams] = useState([
        { id: 101, examId: 1, tenDe: "Bài Test Unit 1 - Reading", classId: "L01", tenLop: "IELTS_Sáng_T246", doiTuong: "Cả lớp", hanNop: "2026-03-25T23:59", status: "Đang mở" },
        { id: 102, examId: 2, tenDe: "Bài tập Writing Task 1", classId: "L02", tenLop: "TOEIC_Tối_T357", doiTuong: "Cả lớp", hanNop: "2026-02-28T23:59", status: "Kết thúc" }
    ]);

    // --- STATE MODAL ---
    const [showExamModal, setShowExamModal] = useState(false);
    const [editExamData, setEditExamData] = useState(null);
    const [showEditAssignModal, setShowEditAssignModal] = useState(false);
    const [editAssignData, setEditAssignData] = useState(null);

    // --- STATE GIAO BÀI (WIZARD 4 BƯỚC) ---
    const [assignStep, setAssignStep] = useState(1);
    const [assignExamId, setAssignExamId] = useState(null);
    const [assignSelectedClasses, setAssignSelectedClasses] = useState([]);
    const [activeTargetClassId, setActiveTargetClassId] = useState(null);
    const [assignTargets, setAssignTargets] = useState({}); // { classId: { type: 'all' | 'specific', students: [] } }
    const [assignDeadlines, setAssignDeadlines] = useState({}); // { classId: 'YYYY-MM-DDTHH:mm' }
    const [examSearchTerm, setExamSearchTerm] = useState('');

    // --- HANDLER: KHO BÀI TẬP ---
    const handleOpenExamModal = (exam = null) => {
        setEditExamData(exam);
        setShowExamModal(true);
    };

    const handleDeleteExam = (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) {
            setExams(exams.filter(e => e.id !== id));
        }
    };

    const handleSaveExam = (newExam) => {
        if (newExam.id) {
            setExams(exams.map(e => e.id === newExam.id ? newExam : e));
        } else {
            setExams([{ ...newExam, id: Date.now(), date: new Date().toLocaleDateString('en-GB') }, ...exams]);
        }
        setShowExamModal(false);
    };

    // --- HANDLER: SỬA LỊCH SỬ GIAO BÀI ---
    const handleOpenEditAssign = (assign) => {
        setEditAssignData(assign);
        setShowEditAssignModal(true);
    };

    const handleSaveEditAssign = (updatedAssign) => {
        setAssignedExams(assignedExams.map(a => a.id === updatedAssign.id ? updatedAssign : a));
        setShowEditAssignModal(false);
    };

    const handleDeleteAssign = (id) => {
        const assign = assignedExams.find(a => a.id === id);
        if (assign && assign.status !== 'Đang mở') {
            alert("Không thể xóa bài tập đã kết thúc!");
            return;
        }
        if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử giao bài này? Học sinh sẽ không thể làm bài này nữa.")) {
            setAssignedExams(assignedExams.filter(a => a.id !== id));
        }
    };

    // --- HANDLER: WIZARD GIAO BÀI ---
    const handleNextStep = () => {
        if (assignStep === 1 && !assignExamId) return alert("Vui lòng chọn bài tập!");
        if (assignStep === 2 && assignSelectedClasses.length === 0) return alert("Vui lòng chọn ít nhất một lớp!");

        // Khởi tạo dữ liệu mặc định khi sang Bước 3
        if (assignStep === 2) {
            setActiveTargetClassId(assignSelectedClasses[0]);
            setAssignTargets(prev => {
                const newTargets = { ...prev };
                assignSelectedClasses.forEach(cId => {
                    if (!newTargets[cId]) newTargets[cId] = { type: 'all', students: [] };
                });
                return newTargets;
            });
        }

        if (assignStep === 3) {
            const missingStudents = assignSelectedClasses.some(cId => assignTargets[cId]?.type === 'specific' && assignTargets[cId]?.students.length === 0);
            if (missingStudents) return alert("Vui lòng chọn ít nhất 1 học sinh cho những lớp được cấu hình 'Chỉ giao một số bạn'!");
        }

        setAssignStep(prev => prev + 1);
    };

    const handlePrevStep = () => setAssignStep(prev => prev - 1);

    const handleToggleAssignClass = (classId) => {
        setAssignSelectedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
    };

    const handleTargetTypeChange = (classId, type) => {
        setAssignTargets(prev => ({ ...prev, [classId]: { ...prev[classId], type: type } }));
    };

    const handleToggleTargetStudent = (classId, studentId) => {
        setAssignTargets(prev => {
            const classTarget = prev[classId];
            const students = classTarget.students.includes(studentId)
                ? classTarget.students.filter(id => id !== studentId)
                : [...classTarget.students, studentId];
            return { ...prev, [classId]: { ...classTarget, students } };
        });
    };

    const handleFinalAssign = () => {
        // Validate Deadlines
        const missingDeadline = assignSelectedClasses.some(cId => !assignDeadlines[cId]);
        if (missingDeadline) return alert("Vui lòng cài đặt Hạn nộp cho tất cả các lớp đã chọn!");

        // Validate Specific Students
        const missingStudents = assignSelectedClasses.some(cId => assignTargets[cId].type === 'specific' && assignTargets[cId].students.length === 0);
        if (missingStudents) return alert("Vui lòng chọn ít nhất 1 học sinh cho những lớp được cấu hình 'Chỉ giao một số bạn'!");

        const selectedExam = exams.find(e => e.id === assignExamId);

        const newAssignments = assignSelectedClasses.map((classId, index) => {
            const target = assignTargets[classId];
            return {
                id: Date.now() + index,
                examId: selectedExam.id,
                tenDe: selectedExam.ten,
                classId: classId,
                tenLop: classes.find(c => c.id === classId)?.ten,
                doiTuong: target.type === 'all' ? "Cả lớp" : `${target.students.length} học sinh`,
                hanNop: assignDeadlines[classId],
                status: "Đang mở"
            };
        });

        setAssignedExams(prev => [...newAssignments, ...prev]);
        alert("Phát hành bài tập thành công!");
        setActiveTab('history');

        // Reset form
        setAssignStep(1);
        setAssignExamId(null);
        setAssignSelectedClasses([]);
        setActiveTargetClassId(null);
        setAssignTargets({});
        setAssignDeadlines({});
        setExamSearchTerm('');
    };

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">
            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm border">
                <div>
                    <h4 className="fw-bold text-primary mb-1"><BookOpen className="me-2" size={24} />QUẢN LÝ BÀI TẬP & ĐỀ THI</h4>
                    <p className="text-muted mb-0 small text-uppercase">Phát hành, quản lý tiến độ và kho bài tập</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="card shadow-sm border-0 mb-4 p-2 bg-white rounded-4">
                <div className="d-flex gap-2">
                    <button className={`btn rounded-pill px-4 fw-bold ${activeTab === 'assign' ? 'btn-primary' : 'btn-light text-muted'}`} onClick={() => setActiveTab('assign')}>
                        <Send size={18} className="me-2" /> Giao Bài Tập
                    </button>
                    <button className={`btn rounded-pill px-4 fw-bold ${activeTab === 'history' ? 'btn-success' : 'btn-light text-muted'}`} onClick={() => setActiveTab('history')}>
                        <Clock size={18} className="me-2" /> Lịch sử Giao bài
                    </button>
                    <button className={`btn rounded-pill px-4 fw-bold ${activeTab === 'manage' ? 'btn-warning text-dark' : 'btn-light text-muted'}`} onClick={() => setActiveTab('manage')}>
                        <Settings size={18} className="me-2" /> Quản lý Đề thi (Sửa/Xóa)
                    </button>
                </div>
            </div>

            {/* NỘI DUNG CHÍNH */}
            {activeTab === 'assign' && (
                <div className="assign-wizard-container">
                    {assignStep === 1 && (
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white mb-4">
                            <div className="card-header bg-primary text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 fw-bold">Bước 1: Chọn bài tập / Đề thi</h6>
                                <span className="badge bg-white text-primary rounded-pill">1 / 4</span>
                            </div>
                            <div className="card-body p-4" style={{ minHeight: '400px' }}>
                                <div className="input-group mb-4" style={{ maxWidth: '400px' }}>
                                    <span className="input-group-text bg-light border-0"><Search size={16} /></span>
                                    <input type="text" className="form-control bg-light border-0 shadow-none" placeholder="Tìm kiếm bài tập..." value={examSearchTerm} onChange={e => setExamSearchTerm(e.target.value)} />
                                </div>
                                <div className="list-group">
                                    {exams.filter(e => e.ten.toLowerCase().includes(examSearchTerm.toLowerCase())).map(exam => (
                                        <button
                                            key={exam.id}
                                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 border rounded shadow-sm ${assignExamId === exam.id ? 'bg-primary-subtle border-primary' : ''}`}
                                            onClick={() => setAssignExamId(exam.id)}
                                        >
                                            <div>
                                                <h6 className="fw-bold mb-1">{exam.ten}</h6>
                                                <small className="text-muted">{exam.loai} • {exam.soCau} câu • {exam.thoiGian} phút</small>
                                            </div>
                                            {assignExamId === exam.id && <CheckCircle className="text-primary" size={24} />}
                                        </button>
                                    ))}
                                    {exams.filter(e => e.ten.toLowerCase().includes(examSearchTerm.toLowerCase())).length === 0 && (
                                        <div className="text-center text-muted mt-4">Không tìm thấy bài tập phù hợp</div>
                                    )}
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top p-3 d-flex justify-content-end">
                                <button className="btn btn-primary px-4 fw-bold" onClick={handleNextStep} disabled={!assignExamId}>Tiếp theo <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {assignStep === 2 && (
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white mb-4">
                            <div className="card-header bg-primary text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 fw-bold">Bước 2: Chọn lớp nhận bài</h6>
                                <span className="badge bg-white text-primary rounded-pill">2 / 4</span>
                            </div>
                            <div className="card-body p-4" style={{ minHeight: '400px' }}>
                                <div className="row g-3">
                                    {classes.map(c => (
                                        <div className="col-md-6" key={c.id}>
                                            <div
                                                className={`p-3 border rounded shadow-sm cursor-pointer d-flex align-items-center gap-3 ${assignSelectedClasses.includes(c.id) ? 'bg-primary-subtle border-primary' : 'hover-bg-light'}`}
                                                onClick={() => handleToggleAssignClass(c.id)}
                                            >
                                                <input type="checkbox" className="form-check-input fs-5 m-0 cursor-pointer" checked={assignSelectedClasses.includes(c.id)} readOnly />
                                                <div>
                                                    <h6 className="fw-bold mb-0">{c.ten}</h6>
                                                    <small className="text-muted">Mã lớp: {c.id}</small>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top p-3 d-flex justify-content-between">
                                <button className="btn btn-light border px-4 fw-bold text-muted" onClick={handlePrevStep}><ChevronLeft size={18} /> Quay lại</button>
                                <button className="btn btn-primary px-4 fw-bold" onClick={handleNextStep} disabled={assignSelectedClasses.length === 0}>Tiếp theo <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {assignStep === 3 && (
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white mb-4">
                            <div className="card-header bg-primary text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 fw-bold">Bước 3: Tùy chỉnh học sinh nhận bài</h6>
                                <span className="badge bg-white text-primary rounded-pill">3 / 4</span>
                            </div>
                            <div className="card-body p-0 d-flex flex-column flex-md-row" style={{ minHeight: '400px' }}>
                                <div className="col-12 col-md-4 border-end bg-light p-3">
                                    <h6 className="fw-bold mb-3 text-muted">Lớp đã chọn</h6>
                                    <div className="list-group">
                                        {assignSelectedClasses.map(cId => {
                                            const c = classes.find(cls => cls.id === cId);
                                            const target = assignTargets[cId];
                                            const isSpecific = target?.type === 'specific';
                                            const selectedCount = target?.students?.length || 0;
                                            return (
                                                <button
                                                    key={cId}
                                                    className={`list-group-item list-group-item-action border-0 rounded mb-2 shadow-sm ${activeTargetClassId === cId ? 'bg-primary text-white' : 'bg-white'}`}
                                                    onClick={() => setActiveTargetClassId(cId)}
                                                >
                                                    <div className="fw-bold">{c?.ten}</div>
                                                    <small className={activeTargetClassId === cId ? 'text-white-50' : 'text-muted'}>
                                                        {isSpecific ? `Chỉ giao ${selectedCount} học sinh` : 'Giao toàn bộ lớp'}
                                                    </small>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="col-12 col-md-8 p-4 bg-white">
                                    {activeTargetClassId && (
                                        <>
                                            <h6 className="fw-bold mb-4">Cài đặt cho lớp: <span className="text-primary">{classes.find(c => c.id === activeTargetClassId)?.ten}</span></h6>
                                            <div className="d-flex gap-4 mb-4 pb-3 border-bottom">
                                                <div className="form-check">
                                                    <input className="form-check-input cursor-pointer" type="radio" name={`targetType-${activeTargetClassId}`} id="tAll"
                                                        checked={assignTargets[activeTargetClassId]?.type === 'all' || !assignTargets[activeTargetClassId]}
                                                        onChange={() => handleTargetTypeChange(activeTargetClassId, 'all')} />
                                                    <label className="form-check-label fw-bold text-primary cursor-pointer" htmlFor="tAll">Giao cho toàn bộ học sinh</label>
                                                </div>
                                                <div className="form-check">
                                                    <input className="form-check-input cursor-pointer" type="radio" name={`targetType-${activeTargetClassId}`} id="tSpec"
                                                        checked={assignTargets[activeTargetClassId]?.type === 'specific'}
                                                        onChange={() => handleTargetTypeChange(activeTargetClassId, 'specific')} />
                                                    <label className="form-check-label fw-bold text-warning cursor-pointer" htmlFor="tSpec">Chỉ giao cho một số bạn</label>
                                                </div>
                                            </div>

                                            <div className={`overflow-y-auto custom-scrollbar ${assignTargets[activeTargetClassId]?.type === 'all' || !assignTargets[activeTargetClassId] ? 'opacity-50 pointer-events-none' : ''}`} style={{ maxHeight: '250px' }}>
                                                {studentsByClass[activeTargetClassId]?.map(student => (
                                                    <div
                                                        key={student.id}
                                                        className="d-flex align-items-center justify-content-between p-3 mb-2 border rounded shadow-sm hover-bg-light cursor-pointer"
                                                        onClick={() => assignTargets[activeTargetClassId]?.type === 'specific' && handleToggleTargetStudent(activeTargetClassId, student.id)}
                                                    >
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                                                                {student.ten.split(' ').pop().charAt(0)}
                                                            </div>
                                                            <div>
                                                                <span className="fw-bold text-dark d-block">{student.ten}</span>
                                                                <span className="small text-muted">{student.id}</span>
                                                            </div>
                                                        </div>
                                                        <div className="form-check m-0">
                                                            <input
                                                                className="form-check-input fs-4 cursor-pointer"
                                                                type="checkbox"
                                                                checked={assignTargets[activeTargetClassId]?.students?.includes(student.id) || assignTargets[activeTargetClassId]?.type === 'all' || !assignTargets[activeTargetClassId]}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top p-3 d-flex justify-content-between">
                                <button className="btn btn-light border px-4 fw-bold text-muted" onClick={handlePrevStep}><ChevronLeft size={18} /> Quay lại</button>
                                <button className="btn btn-primary px-4 fw-bold" onClick={handleNextStep}>Tiếp theo <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {assignStep === 4 && (
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white mb-4">
                            <div className="card-header bg-primary text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 fw-bold">Bước 4: Xác nhận và Cài đặt Hạn nộp</h6>
                                <span className="badge bg-white text-primary rounded-pill">4 / 4</span>
                            </div>
                            <div className="card-body p-4" style={{ minHeight: '400px' }}>
                                <div className="alert alert-info mb-4 border-0 shadow-sm">
                                    <h6 className="fw-bold mb-1">Đề thi đã chọn: <span className="text-primary">{exams.find(e => e.id === assignExamId)?.ten}</span></h6>
                                    <small>Vui lòng cài đặt hạn nộp cho từng lớp trước khi phát hành.</small>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-bordered align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Lớp nhận</th>
                                                <th>Đối tượng</th>
                                                <th style={{ width: '250px' }}>Hạn nộp <span className="text-danger">*</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignSelectedClasses.map(cId => {
                                                const cls = classes.find(c => c.id === cId);
                                                const target = assignTargets[cId];
                                                const isAll = target?.type === 'all' || !target;
                                                const targetText = isAll ? "Cả lớp" : `${target?.students?.length} học sinh`;
                                                return (
                                                    <tr key={cId}>
                                                        <td className="fw-bold text-dark">{cls?.ten}</td>
                                                        <td>
                                                            <span className={`badge ${isAll ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border`}>
                                                                {targetText}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="datetime-local"
                                                                className="form-control shadow-none border-2"
                                                                value={assignDeadlines[cId] || ''}
                                                                onChange={(e) => setAssignDeadlines(prev => ({ ...prev, [cId]: e.target.value }))}
                                                                required
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top p-3 d-flex justify-content-between">
                                <button className="btn btn-light border px-4 fw-bold text-muted" onClick={handlePrevStep}><ChevronLeft size={18} /> Quay lại</button>
                                <button className="btn btn-success px-5 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm" onClick={handleFinalAssign}><Send size={18} /> Giao bài tập</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'manage' && (
                // --- TAB 3: QUẢN LÝ ĐỀ THI (SỬA/XÓA) ---
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold">Danh sách Đề thi gốc</h6>
                        <div className="d-flex gap-2">
                            <div className="input-group w-auto">
                                <span className="input-group-text bg-light border-0"><Search size={16} /></span>
                                <input type="text" className="form-control bg-light border-0 shadow-none" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => handleOpenExamModal()}>
                                <Plus size={16} /> Thêm đề
                            </button>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light text-muted small">
                                <tr>
                                    <th className="ps-4">Tên bài tập / Đề thi</th>
                                    <th>Loại</th>
                                    <th className="text-center">Số câu</th>
                                    <th className="text-center">Thời gian</th>
                                    <th className="text-center">Ngày tạo</th>
                                    <th className="text-center pe-4">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.filter(e => e.ten.toLowerCase().includes(searchTerm.toLowerCase())).map(exam => (
                                    <tr key={exam.id}>
                                        <td className="ps-4 fw-bold text-dark">{exam.ten}</td>
                                        <td><span className="badge bg-secondary-subtle text-secondary border">{exam.loai}</span></td>
                                        <td className="text-center">{exam.soCau}</td>
                                        <td className="text-center text-primary fw-medium">{exam.thoiGian} phút</td>
                                        <td className="text-center text-muted small">{exam.date}</td>
                                        <td className="text-center pe-4">
                                            <div className="btn-group shadow-sm border rounded">
                                                <button className="btn btn-sm btn-light border-end text-primary" onClick={() => handleOpenExamModal(exam)} title="Sửa">
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn btn-sm btn-light text-danger" onClick={() => handleDeleteExam(exam.id)} title="Xóa">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                // --- TAB 2: LỊCH SỬ GIAO BÀI ---
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold">Danh sách Bài đã giao</h6>
                        <div className="input-group w-auto">
                            <span className="input-group-text bg-light border-0"><Search size={16} /></span>
                            <input type="text" className="form-control bg-light border-0 shadow-none" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light text-muted small">
                                <tr>
                                    <th className="ps-4">Tên đề đã giao</th>
                                    <th>Lớp nhận</th>
                                    <th>Đối tượng</th>
                                    <th className="text-center">Hạn nộp</th>
                                    <th className="text-center">Trạng thái</th>
                                    <th className="text-center pe-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedExams.filter(a => a.tenDe.toLowerCase().includes(searchTerm.toLowerCase())).map(assign => (
                                    <tr key={assign.id}>
                                        <td className="ps-4 fw-bold text-dark">{assign.tenDe}</td>
                                        <td><span className="badge bg-info-subtle text-info border">{assign.tenLop}</span></td>
                                        <td>
                                            <div className="d-flex align-items-center text-secondary small">
                                                {assign.doiTuong === 'Cả lớp' ? <Users size={14} className="me-1" /> : <UserCheck size={14} className="me-1" />}
                                                {assign.doiTuong}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="text-danger fw-bold small"><Clock size={12} className="me-1" />{new Date(assign.hanNop).toLocaleString('vi-VN')}</div>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge rounded-pill px-3 py-2 ${assign.status === 'Đang mở' ? 'bg-success' : 'bg-secondary'}`}>{assign.status}</span>
                                        </td>
                                        <td className="text-center pe-4">
                                            <div className="btn-group shadow-sm border rounded">
                                                <button
                                                    className={`btn btn-sm btn-light border-end fw-medium d-flex align-items-center gap-1 ${assign.status === 'Đang mở' ? 'text-danger' : 'text-muted'}`}
                                                    onClick={() => assign.status === 'Đang mở' && handleDeleteAssign(assign.id)}
                                                    disabled={assign.status !== 'Đang mở'}
                                                    title={assign.status === 'Đang mở' ? "Xóa" : "Không thể xóa bài đã kết thúc"}
                                                >
                                                    <Trash2 size={14} /> Xóa
                                                </button>
                                                <button className="btn btn-sm btn-light text-warning fw-medium d-flex align-items-center gap-1" onClick={() => handleOpenEditAssign(assign)} title="Sửa hạn nộp / đối tượng">
                                                    <Edit size={14} /> Sửa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {assignedExams.length === 0 && <tr><td colSpan="6" className="text-center py-4 text-muted">Chưa có lịch sử giao bài nào.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL 1: TẠO / SỬA ĐỀ THI GỐC */}
            {showExamModal && <ExamModal initialData={editExamData} onClose={() => setShowExamModal(false)} onSave={handleSaveExam} />}
            {showEditAssignModal && <EditAssignModal initialData={editAssignData} studentsByClass={studentsByClass} onClose={() => setShowEditAssignModal(false)} onSave={handleSaveEditAssign} />}

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .pointer-events-none { pointer-events: none; }
            `}</style>
        </div>
    );
};

// =========================================================================
// COMPONENT: MODAL TẠO/SỬA ĐỀ THI GỐC
// =========================================================================
const ExamModal = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState(initialData || { ten: "", loai: "Trắc nghiệm", soCau: 10, thoiGian: 45 });

    const handleSubmit = () => {
        if (!formData.ten) return alert("Vui lòng nhập tên bài tập!");
        onSave(formData);
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered shadow-lg">
                <div className="modal-content border-0 rounded-4">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title fw-bold"><FileText size={20} className="me-2" />{initialData ? 'Sửa Đề Thi' : 'Tạo Đề Thi Mới'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Tên Đề thi / Bài tập</label>
                            <input type="text" className="form-control" placeholder="VD: Bài kiểm tra 15 phút Unit 2..." value={formData.ten} onChange={(e) => setFormData({ ...formData, ten: e.target.value })} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Hình thức</label>
                            <select className="form-select" value={formData.loai} onChange={(e) => setFormData({ ...formData, loai: e.target.value })}>
                                <option value="Trắc nghiệm">Trắc nghiệm</option>
                                <option value="Tự luận">Tự luận</option>
                                <option value="Hỗn hợp">Hỗn hợp</option>
                            </select>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">Số câu hỏi</label>
                                <input type="number" className="form-control" value={formData.soCau} onChange={(e) => setFormData({ ...formData, soCau: e.target.value })} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small">Thời gian làm (Phút)</label>
                                <input type="number" className="form-control" value={formData.thoiGian} onChange={(e) => setFormData({ ...formData, thoiGian: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-light border border-dashed rounded text-center text-muted">
                            <FileText size={24} className="mb-2 opacity-50" />
                            <p className="small mb-0">Tính năng upload file Word/PDF trích xuất câu hỏi tự động sẽ được tích hợp tại đây.</p>
                        </div>
                    </div>
                    <div className="modal-footer border-0 bg-light rounded-bottom-4">
                        <button className="btn btn-light border" onClick={onClose}>Hủy</button>
                        <button className="btn btn-primary px-4 fw-bold" onClick={handleSubmit}>Lưu thông tin</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// COMPONENT: MODAL SỬA LỊCH SỬ GIAO BÀI
// =========================================================================
const EditAssignModal = ({ initialData, studentsByClass, onClose, onSave }) => {
    const [hanNop, setHanNop] = useState(initialData?.hanNop || '');
    const [targetType, setTargetType] = useState(initialData?.doiTuong === 'Cả lớp' ? 'all' : 'specific');
    const [selectedStudents, setSelectedStudents] = useState([]);

    const classStudents = studentsByClass[initialData?.classId] || [];

    const handleToggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSubmit = () => {
        if (!hanNop) return alert("Vui lòng chọn hạn nộp!");
        if (targetType === 'specific' && selectedStudents.length === 0) return alert("Vui lòng chọn ít nhất 1 học sinh!");

        onSave({
            ...initialData,
            hanNop,
            doiTuong: targetType === 'all' ? 'Cả lớp' : `${selectedStudents.length} học sinh`
        });
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered shadow-lg">
                <div className="modal-content border-0 rounded-4">
                    <div className="modal-header bg-warning text-dark border-0">
                        <h5 className="modal-title fw-bold"><Edit size={20} className="me-2" />Cập nhật Giao bài</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Đề thi / Bài tập</label>
                            <input type="text" className="form-control bg-light" value={initialData?.tenDe} readOnly />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Lớp nhận bài</label>
                            <input type="text" className="form-control bg-light" value={initialData?.tenLop} readOnly />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Hạn nộp mới <span className="text-danger">*</span></label>
                            <input type="datetime-local" className="form-control" value={hanNop} onChange={(e) => setHanNop(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Đối tượng</label>
                            <div className="d-flex gap-4 mb-2">
                                <div className="form-check">
                                    <input className="form-check-input cursor-pointer" type="radio" name="editTarget" id="eAll" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                                    <label className="form-check-label cursor-pointer" htmlFor="eAll">Cả lớp</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input cursor-pointer" type="radio" name="editTarget" id="eSpec" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} />
                                    <label className="form-check-label cursor-pointer" htmlFor="eSpec">Tùy chỉnh một số học sinh</label>
                                </div>
                            </div>
                            {targetType === 'specific' && (
                                <div className="border rounded p-2 overflow-y-auto custom-scrollbar bg-light" style={{ maxHeight: '150px' }}>
                                    {classStudents.map(student => (
                                        <div key={student.id} className="form-check mb-1">
                                            <input className="form-check-input cursor-pointer" type="checkbox" id={`chk-${student.id}`} checked={selectedStudents.includes(student.id)} onChange={() => handleToggleStudent(student.id)} />
                                            <label className="form-check-label cursor-pointer" htmlFor={`chk-${student.id}`}>{student.ten} - <span className="text-muted small">{student.id}</span></label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer border-0 bg-light rounded-bottom-4">
                        <button className="btn btn-light border" onClick={onClose}>Hủy</button>
                        <button className="btn btn-warning fw-bold text-dark" onClick={handleSubmit}>Cập nhật</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherExams;