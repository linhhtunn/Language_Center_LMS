import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../api/BaseApi';
import { PERIODS as SHARED_PERIODS } from '../../constants/scheduleTime';

// Admin schedules should be assigned by individual periods (tiết) rather than sessions (ca).
// Define 12 periods per day; times can be adjusted if you have exact mappings.
const PERIODS = SHARED_PERIODS.map((period) => ({
    id: period.id,
    name: period.name,
    time: `${period.start} - ${period.end}`,
}));

const getWeekStart = (dateInWeek) => {
    const date = new Date(dateInWeek);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

const buildWeekDays = (dateInWeek) => {
    const monday = getWeekStart(dateInWeek);
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

    return Array.from({ length: 7 }, (_, index) => {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + index);
        const dd = String(currentDay.getDate()).padStart(2, '0');
        const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
        return {
            dayName: dayNames[index],
            dateLabel: `(${dd}/${mm})`,
            displayLabel: `${dayNames[index]}(${dd}/${mm})`,
        };
    });
};

const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
};

const normalizeLookupItems = (items = []) => items.map((item) => ({
    id: item.id ?? item.Id,
    name: item.name ?? item.Name ?? '',
}));

const toNumberOrNull = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const ensureApiSuccess = (result, fallbackMessage) => {
    if (result && typeof result === 'object' && result.success === false) {
        throw new Error(result.message || fallbackMessage);
    }

    return result;
};

// Safely split date-range strings like "2026-05-01 - 07:30" into two parts.
// If the input is not a string, attempt to read common object fields, otherwise fallback.
const splitDateRange = (val) => {
    try {
        if (!val && val !== 0) return ['', ''];
        if (typeof val === 'string') {
            const parts = val.split(' - ');
            return [parts[0] || '', parts[1] || ''];
        }
        if (typeof val === 'object') {
            // common shapes: { date: '...', time: '...' } or { from: '...', to: '...' }
            return [val.date || val.from || val.start || '', val.time || val.to || val.end || ''];
        }
        return [String(val), ''];
    } catch (e) {
        return [String(val), ''];
    }
};

const AdminSchedule = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ==========================================
    // 1. STATE ĐIỀU HƯỚNG & DANH MỤC
    // ==========================================
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewFilter, setViewFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [weekDays, setWeekDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Toast Notification State
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
    const showToast = (msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000);
    };

    useEffect(() => {
        const flashToast = location.state?.toast;
        if (flashToast?.show && flashToast?.msg) {
            showToast(flashToast.msg, flashToast.type || 'success');
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    // ==========================================
    // 2. STATE DỮ LIỆU & KÉO THẢ
    // ==========================================
    const [schedules, setSchedules] = useState([]);
    const [rescheduleRequests, setRescheduleRequests] = useState([]);
    const [classesList, setClassesList] = useState([]);
    const [teachersList, setTeachersList] = useState([]);
    const [roomsList, setRoomsList] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); 
    const [formData, setFormData] = useState({ id: null, classId: '', teacherId: '', roomId: '', dayIdx: 0, slotId: 1, slotEndId: 1 });
    const [inlineForm, setInlineForm] = useState({ classId: '', teacherId: '', roomId: '', dayIdx: 0, slotId: 1, slotEndId: 1 });
    const [errorMsg, setErrorMsg] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [showCellModal, setShowCellModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedCellSchedules, setSelectedCellSchedules] = useState([]);
    const [selectedCellAvailability, setSelectedCellAvailability] = useState({ rooms: [], teachers: [] });
    const [selectedCellLoading, setSelectedCellLoading] = useState(false);
    const [showQuickScheduleForm, setShowQuickScheduleForm] = useState(false);
    const [showReschedulePanel, setShowReschedulePanel] = useState(false);
    const reschedulePanelRef = useRef(null);
    const quickScheduleFormRef = useRef(null);

    // ==========================================
    // 3. LOGIC XỬ LÝ
    // ==========================================
    useEffect(() => {
        setWeekDays(buildWeekDays(currentDate));
    }, [currentDate]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!showReschedulePanel) {
                return;
            }

            if (reschedulePanelRef.current && !reschedulePanelRef.current.contains(event.target)) {
                setShowReschedulePanel(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        };
    }, [showReschedulePanel]);

        useEffect(() => {
            if (showCellModal && showQuickScheduleForm && quickScheduleFormRef.current) {
                quickScheduleFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, [showCellModal, showQuickScheduleForm, selectedCell?.dayIdx, selectedCell?.slotId]);

    const loadBoardData = async (date = currentDate) => {
        setLoading(true);
        setLoadError('');

        try {
            const weekStart = getWeekStart(date);
            const response = ensureApiSuccess(await apiClient.get(`Schedule/admin-board?weekStart=${formatDateForApi(weekStart)}`), 'Không thể tải dữ liệu lịch.');
            const payload = response?.data || response;

            const lookupClasses = normalizeLookupItems(payload?.classes || []);
            const lookupTeachers = normalizeLookupItems(payload?.teachers || []);
            const lookupRooms = normalizeLookupItems(payload?.rooms || []);
            const boardSchedules = payload?.schedules || [];
            const boardRequests = payload?.rescheduleRequests || [];

            // Normalize reschedule request display fields to avoid calling split on non-strings
            const normalizedRequests = (boardRequests || []).map((r) => {
                const [oldA, oldB] = splitDateRange(r?.oldDate);
                const [newA, newB] = splitDateRange(r?.newDate);
                return {
                    ...r,
                    oldA,
                    oldB,
                    newA,
                    newB,
                };
            });

            setClassesList(lookupClasses);
            setTeachersList(lookupTeachers);
            setRoomsList(lookupRooms);
            setSchedules(boardSchedules);
            setRescheduleRequests(normalizedRequests);

            return {
                weekStart: payload?.weekStart || null,
                schedules: boardSchedules,
                rescheduleRequests: normalizedRequests,
                classes: lookupClasses,
                teachers: lookupTeachers,
                rooms: lookupRooms,
            };
        } catch (error) {
            const message = error?.message || 'Không thể tải dữ liệu lịch.';
            setLoadError(message);
            showToast(message, 'danger');
            setSchedules([]);
            setRescheduleRequests([]);
            setClassesList([]);
            setTeachersList([]);
            setRoomsList([]);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBoardData(currentDate);
    }, [currentDate]);

    const changeWeek = (amount) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (amount * 7));
        setCurrentDate(newDate);
    };

    const getWeekDateForDayIndex = (dayIdx) => {
        const monday = getWeekStart(currentDate);
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + Number(dayIdx));
        return nextDay;
    };

    const buildSchedulePayload = (draft) => {
        const dayIdxInt = Number(draft.dayIdx);
        const slotIdInt = Number(draft.slotId);
        const slotEndIdInt = Number(draft.slotEndId || draft.slotId);
        const scheduleDate = getWeekDateForDayIndex(dayIdxInt);

        return {
            MaLopHoc: draft.classId,
            MaPhongHoc: draft.roomId || null,
            NgayHoc: formatDateForApi(scheduleDate),
            MaTietBatDau: slotIdInt,
            MaTietKetThuc: slotEndIdInt,
            TieuDe: `${getLookupLabel(classesList, draft.classId) || 'Buổi học'} - Buổi học`,
            NoiDung: ''
        };
    };

    const getLookupLabel = (list, id) => list.find(item => String(item.id) === String(id))?.name || '';

    // Return true if a schedule occupies the given dayIdx and slotId (considering slot ranges).
    const isScheduleInCell = (schedule, dayIdx, slotId) => {
        const sDay = Number(schedule.dayIdx ?? schedule.dayIdx);
        const sStart = Number(schedule.slotId ?? schedule.maTietBatDau ?? schedule.MaTietBatDau);
        const sEnd = Number(schedule.slotEndId ?? schedule.maTietKetThuc ?? schedule.MaTietKetThuc ?? sStart);
        return Number(dayIdx) === sDay && Number(slotId) >= sStart && Number(slotId) <= sEnd;
    };

    const getSelectedScheduleDate = (dayIdx) => {
        const weekStart = getWeekStart(currentDate);
        const selectedDate = new Date(weekStart);
        selectedDate.setDate(weekStart.getDate() + Number(dayIdx));
        return selectedDate;
    };

    const loadAvailability = async (draftForm = formData) => {
        if (!showModal) {
            return;
        }

        setAvailabilityLoading(true);
        const ngayHoc = getSelectedScheduleDate(draftForm.dayIdx);
        const maTietBatDau = Number(draftForm.slotId);
        const maTietKetThuc = Number(draftForm.slotEndId || draftForm.slotId);

        try {
            const [roomsResult, teachersResult] = await Promise.all([
                apiClient.get(`Schedule/available-rooms?ngayHoc=${formatDateForApi(ngayHoc)}&maTietBatDau=${maTietBatDau}&maTietKetThuc=${maTietKetThuc}`),
                apiClient.get(`Schedule/available-teachers?ngayHoc=${formatDateForApi(ngayHoc)}&maTietBatDau=${maTietBatDau}&maTietKetThuc=${maTietKetThuc}`),
            ]);

            const roomsPayload = ensureApiSuccess(roomsResult, 'Không thể tải danh sách phòng trống.');
            const teachersPayload = ensureApiSuccess(teachersResult, 'Không thể tải danh sách giảng viên rảnh.');

            const normalizedRooms = normalizeLookupItems((roomsPayload?.data || roomsPayload || []).map((room) => ({
                id: room.maPhongHoc ?? room.MaPhongHoc,
                name: room.tenPhong ?? room.TenPhong ?? '',
            })));

            const availableTeacherIds = new Set((teachersPayload?.data || teachersPayload || []).map((teacher) => String(teacher.maGiangVien ?? teacher.MaGiangVien)));
            const normalizedTeachers = teachersList.filter((teacher) => availableTeacherIds.has(String(teacher.id)));

            const currentRoom = roomsList.find((room) => String(room.id) === String(draftForm.roomId));
            const currentTeacher = teachersList.find((teacher) => String(teacher.id) === String(draftForm.teacherId));

            const roomsWithCurrentSelection = currentRoom && !normalizedRooms.some((room) => String(room.id) === String(currentRoom.id))
                ? [{ id: currentRoom.id, name: currentRoom.name }, ...normalizedRooms]
                : normalizedRooms;

            const teachersWithCurrentSelection = currentTeacher && !normalizedTeachers.some((teacher) => String(teacher.id) === String(currentTeacher.id))
                ? [{ id: currentTeacher.id, name: currentTeacher.name }, ...normalizedTeachers]
                : normalizedTeachers;

            setAvailableRooms(roomsWithCurrentSelection);
            setAvailableTeachers(teachersWithCurrentSelection);

            setFormData((previous) => {
                const nextRoomId = roomsWithCurrentSelection.some((room) => String(room.id) === String(previous.roomId))
                    ? previous.roomId
                    : roomsWithCurrentSelection[0]?.id || '';

                const nextTeacherId = teachersWithCurrentSelection.some((teacher) => String(teacher.id) === String(previous.teacherId))
                    ? previous.teacherId
                    : teachersWithCurrentSelection[0]?.id || '';

                return {
                    ...previous,
                    roomId: nextRoomId,
                    teacherId: nextTeacherId,
                };
            });
        } catch (error) {
            const message = error?.message || 'Không thể tải danh sách phòng/giảng viên trống.';
            setErrorMsg(message);
            showToast(message, 'danger');
            setAvailableRooms([]);
            setAvailableTeachers([]);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const openCellDetail = async (dayIdx, slotId) => {
        const normalizedDayIdx = toNumberOrNull(dayIdx) ?? 0;
        const normalizedSlotId = toNumberOrNull(slotId) ?? 1;
        const targetDate = getSelectedScheduleDate(normalizedDayIdx);
        const cellSchedules = schedules.filter((schedule) => isScheduleInCell(schedule, normalizedDayIdx, normalizedSlotId));

        setSelectedCell({
            dayIdx: normalizedDayIdx,
            slotId: normalizedSlotId,
            date: targetDate,
            label: weekDays[normalizedDayIdx]?.displayLabel || '',
            slotName: PERIODS.find((slot) => slot.id === normalizedSlotId)?.name || `Tiết ${normalizedSlotId}`,
            time: PERIODS.find((slot) => slot.id === normalizedSlotId)?.time || '',
        });
        setSelectedCellSchedules(cellSchedules);
        setSelectedCellAvailability({ rooms: [], teachers: [] });
        setSelectedCellLoading(true);
        setShowCellModal(true);
        setShowQuickScheduleForm(cellSchedules.length === 0);

        try {
            const [roomsResult, teachersResult] = await Promise.all([
                apiClient.get(`Schedule/available-rooms?ngayHoc=${formatDateForApi(targetDate)}&maTietBatDau=${slotId}&maTietKetThuc=${slotId}`),
                apiClient.get(`Schedule/available-teachers?ngayHoc=${formatDateForApi(targetDate)}&maTietBatDau=${slotId}&maTietKetThuc=${slotId}`),
            ]);

            const roomsPayload = ensureApiSuccess(roomsResult, 'Không thể tải danh sách phòng trống.');
            const teachersPayload = ensureApiSuccess(teachersResult, 'Không thể tải danh sách giảng viên rảnh.');

            const normalizedRooms = (roomsPayload?.data || roomsPayload || []).map((room) => ({
                id: room.maPhongHoc ?? room.MaPhongHoc,
                name: room.tenPhong ?? room.TenPhong ?? '',
            }));

            const availableTeacherIds = new Set((teachersPayload?.data || teachersPayload || []).map((teacher) => String(teacher.maGiangVien ?? teacher.MaGiangVien)));
            const normalizedTeachers = teachersList.filter((teacher) => availableTeacherIds.has(String(teacher.id)));

            setSelectedCellAvailability({ rooms: normalizedRooms, teachers: normalizedTeachers });
            // initialize inline form defaults for quick scheduling in the panel using fetched availability
            setInlineForm(prev => ({
                ...prev,
                classId: classesList[0]?.id || prev.classId || '',
                teacherId: normalizedTeachers[0]?.id || teachersList[0]?.id || prev.teacherId || '',
                roomId: normalizedRooms[0]?.id || prev.roomId || '',
                dayIdx: normalizedDayIdx,
                slotId: normalizedSlotId,
                slotEndId: normalizedSlotId
            }));
        } catch (error) {
            setSelectedCellAvailability({ rooms: [], teachers: [] });
        } finally {
            setSelectedCellLoading(false);
        }
    };

    const closeCellDetail = () => {
        setShowCellModal(false);
        setSelectedCell(null);
        setSelectedCellSchedules([]);
        setSelectedCellAvailability({ rooms: [], teachers: [] });
        setSelectedCellLoading(false);
        setShowQuickScheduleForm(false);
    };

    const openAddModal = (dayIdx = 0, slotId = 1, defaults = {}) => {
        setErrorMsg('');
        if (classesList.length === 0 || teachersList.length === 0 || roomsList.length === 0) {
            setErrorMsg('Chưa có dữ liệu lớp học / giảng viên / phòng học để xếp lịch.');
        }
        const normalizedDayIdx = toNumberOrNull(dayIdx) ?? 0;
        const normalizedSlotId = toNumberOrNull(slotId) ?? 1;
        setModalMode('add');
        setFormData({
            id: null,
            classId: defaults.classId || classesList[0]?.id || '',
            teacherId: defaults.teacherId || '',
            roomId: defaults.roomId || '',
            dayIdx: normalizedDayIdx,
            slotId: normalizedSlotId,
            slotEndId: defaults.slotEndId || normalizedSlotId,
            classCode: defaults.classCode || classesList[0]?.name || '',
            teacher: defaults.teacher || '',
            room: defaults.room || ''
        });
        setShowModal(true);
    };

    const openEditModal = (schedule) => {
        setModalMode('edit');
        setFormData({
            id: schedule.id,
            classId: schedule.maLopHoc,
            teacherId: schedule.maGiangVien || '',
            roomId: schedule.maPhongHoc || '',
            dayIdx: schedule.dayIdx,
            slotId: schedule.slotId,
            slotEndId: schedule.slotEndId || schedule.slotId,
            classCode: schedule.classCode,
            teacher: schedule.teacher,
            room: schedule.room
        });
        setErrorMsg('');
        setShowModal(true);
    };

    useEffect(() => {
        if (!showModal) {
            setAvailableRooms([]);
            setAvailableTeachers([]);
            return;
        }

        loadAvailability(formData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal, formData.dayIdx, formData.slotId, formData.slotEndId, currentDate, teachersList]);

    const handleSaveSchedule = async () => {
        try {
            if (!formData.classId) {
                setErrorMsg('Vui lòng chọn lớp học.');
                return;
            }

            const payload = buildSchedulePayload(formData);

            if (modalMode === 'add') {
                ensureApiSuccess(await apiClient.post('Schedule', payload), 'Không thể thêm lịch học.');
                showToast('Đã thêm lịch dạy mới thành công!');
            } else {
                ensureApiSuccess(await apiClient.put(`Schedule/${formData.id}`, payload), 'Không thể cập nhật lịch học.');
                showToast('Đã cập nhật thông tin lịch dạy!');
            }

            setShowModal(false);
            await loadBoardData(currentDate);
        } catch (error) {
            const message = error?.message || 'Không thể lưu lịch.';
            setErrorMsg(message);
            showToast(message, 'danger');
        }
    };

    const handleInlineSave = async () => {
        try {
            if (!inlineForm.classId) {
                showToast('Vui lòng chọn lớp học.', 'danger');
                return;
            }

            const targetDayIdx = toNumberOrNull(selectedCell?.dayIdx ?? inlineForm.dayIdx) ?? 0;
            const targetSlotId = toNumberOrNull(selectedCell?.slotId ?? inlineForm.slotId) ?? 1;
            const targetDate = selectedCell?.date || getSelectedScheduleDate(targetDayIdx);
            const selectedRoomIsAvailable = selectedCellAvailability.rooms.some((room) => String(room.id) === String(inlineForm.roomId));
            const roomIdToSubmit = inlineForm.roomId && selectedRoomIsAvailable ? inlineForm.roomId : null;

            const payload = {
                MaLopHoc: inlineForm.classId,
                MaPhongHoc: roomIdToSubmit,
                NgayHoc: formatDateForApi(targetDate),
                MaTietBatDau: targetSlotId,
                MaTietKetThuc: Number(inlineForm.slotEndId || targetSlotId),
                TieuDe: getLookupLabel(classesList, inlineForm.classId) || 'Buổi học',
                NoiDung: ''
            };

            const createResult = ensureApiSuccess(await apiClient.post('Schedule', payload), 'Không thể thêm lịch học.');
            const createdId = createResult?.data?.id || createResult?.id || createResult?.Id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
            const className = getLookupLabel(classesList, inlineForm.classId) || 'Buổi học';
            const teacherName = getLookupLabel(teachersList, inlineForm.teacherId) || 'Chưa phân công';
            const roomName = getLookupLabel(roomsList, roomIdToSubmit) || 'Chưa gán phòng';

            const createdSchedule = {
                id: createdId,
                maBuoiHoc: createdId,
                maLopHoc: inlineForm.classId,
                maGiangVien: inlineForm.teacherId || '',
                maPhongHoc: roomIdToSubmit || '',
                classCode: className,
                className,
                teacher: teacherName,
                room: roomName,
                ngayHoc: targetDate,
                dayIdx: targetDayIdx,
                slotId: targetSlotId,
                slotEndId: Number(inlineForm.slotEndId || targetSlotId),
                subject: payload.TieuDe,
                isConflict: false,
                conflictReason: null,
            };

            setSchedules((previous) => [...previous, createdSchedule]);
            if (selectedCell && selectedCell.dayIdx === targetDayIdx && selectedCell.slotId === targetSlotId) {
                setSelectedCellSchedules((previous) => [...previous, createdSchedule]);
            }

            showToast('Đã thêm lịch dạy thành công!');

            const refreshedBoard = await loadBoardData(currentDate);

            if (selectedCell && refreshedBoard?.schedules) {
                const refreshed = refreshedBoard.schedules.filter((schedule) => isScheduleInCell(schedule, selectedCell.dayIdx, selectedCell.slotId));
                setSelectedCellSchedules(refreshed);
            }

            setShowQuickScheduleForm(true);
        } catch (error) {
            const message = error?.message || 'Không thể lưu lịch.';
            showToast(message, 'danger');
        }
    };

    const handleDeleteSchedule = async () => {
        if(window.confirm("Bạn có chắc chắn muốn xóa lịch dạy này?")) {
            try {
                ensureApiSuccess(await apiClient.delete(`Schedule/${formData.id}`), 'Không thể xóa lịch học.');
                setShowModal(false);
                showToast('Đã xóa lịch dạy!', 'danger');
                await loadBoardData(currentDate);
            } catch (error) {
                const message = error?.message || 'Không thể xóa lịch học.';
                setErrorMsg(message);
                showToast(message, 'danger');
            }
        }
    };

    const handleRemoveScheduleFromCell = async (scheduleId) => {
        if (!scheduleId) {
            return;
        }

        if (!window.confirm('Xóa giảng viên/lịch học khỏi tiết này?')) {
            return;
        }

        try {
            ensureApiSuccess(await apiClient.delete(`Schedule/${scheduleId}`), 'Không thể xóa lịch học.');
            showToast('Đã xóa giảng viên khỏi tiết học này.', 'danger');

            if (showCellModal && selectedCell) {
                const refreshedSchedules = schedules.filter((schedule) => schedule.id !== scheduleId);
                setSelectedCellSchedules(refreshedSchedules.filter((schedule) => isScheduleInCell(schedule, selectedCell.dayIdx, selectedCell.slotId)));
            }

            await loadBoardData(currentDate);
        } catch (error) {
            const message = error?.message || 'Không thể xóa lịch học.';
            showToast(message, 'danger');
        }
    };

    const handleContinueScheduleFromRow = (schedule) => {
        if (!schedule || !selectedCell) {
            return;
        }

        setInlineForm({
            classId: schedule.maLopHoc || schedule.classId || '',
            teacherId: schedule.maGiangVien || '',
            roomId: '',
            dayIdx: selectedCell.dayIdx,
            slotId: selectedCell.slotId,
            slotEndId: selectedCell.slotId,
        });
        setShowQuickScheduleForm(true);
    };

    // --- HÀM DUYỆT YÊU CẦU ĐỔI LỊCH ---
    const handleApproveReq = async (reqId) => {
        if(window.confirm("Xác nhận duyệt đổi lịch? Lịch mới sẽ được tự động cập nhật lên hệ thống.")) {
            try {
                ensureApiSuccess(await apiClient.put(`Schedule/reschedule-requests/${reqId}/approve`), 'Không thể duyệt yêu cầu đổi lịch.');
                showToast('Đã duyệt yêu cầu đổi lịch thành công!', 'success');
                await loadBoardData(currentDate);
            } catch (error) {
                const message = error?.message || 'Không thể duyệt yêu cầu đổi lịch.';
                showToast(message, 'danger');
            }
        }
    };

    // --- HÀM TỪ CHỐI YÊU CẦU ĐỔI LỊCH ---
    const handleRejectReq = async (reqId) => {
        if(window.confirm("Bạn chắc chắn muốn từ chối yêu cầu đổi lịch này?")) {
            try {
                ensureApiSuccess(await apiClient.put(`Schedule/reschedule-requests/${reqId}/reject`), 'Không thể từ chối yêu cầu đổi lịch.');
                showToast('Đã từ chối yêu cầu đổi lịch.', 'danger');
                await loadBoardData(currentDate);
            } catch (error) {
                const message = error?.message || 'Không thể từ chối yêu cầu đổi lịch.';
                showToast(message, 'danger');
            }
        }
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e, scheduleItem) => {
        setDraggedItem(scheduleItem);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { e.target.classList.add('dragging-ghost'); }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging-ghost');
        setDraggedItem(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetDayIdx, targetSlotId) => {
        e.preventDefault();
        if (!draggedItem) return;

        if (draggedItem.dayIdx === targetDayIdx && draggedItem.slotId === targetSlotId) return;

        try {
            const targetDate = getWeekDateForDayIndex(targetDayIdx);
            const payload = {
                MaLopHoc: draggedItem.maLopHoc,
                MaPhongHoc: draggedItem.maPhongHoc || null,
                NgayHoc: formatDateForApi(targetDate),
                MaTietBatDau: targetSlotId,
                MaTietKetThuc: draggedItem.slotEndId || targetSlotId,
                TieuDe: draggedItem.subject || 'Buổi học',
                NoiDung: ''
            };

            ensureApiSuccess(await apiClient.put(`Schedule/${draggedItem.id}`, payload), 'Không thể di chuyển lịch.');
            showToast('Đã di chuyển lịch thành công!');
            await loadBoardData(currentDate);
        } catch (error) {
            const message = error?.message || 'Không thể di chuyển lịch.';
            showToast(message, 'danger');
        }
    };

    // ==========================================
    // 4. RENDER UI
    // ==========================================
    const renderTimeSlot = (dayIdx, slotId) => {
        const classInSlot = schedules.filter(c => isScheduleInCell(c, dayIdx, slotId));
        
        if (classInSlot.length === 0) return (
            <div onClick={() => openCellDetail(dayIdx, slotId)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayIdx, slotId)}
                 className={`h-100 w-100 p-2 text-muted text-center slot-empty d-flex align-items-center justify-content-center transition-all rounded-3 ${draggedItem ? 'bg-light border-primary border-opacity-50' : ''}`} 
                 style={{ minHeight: '85px', border: '1px dashed #dee2e6', cursor: 'pointer' }}>
                <i className="bi bi-plus-lg opacity-25 fs-5"></i>
            </div>
        );

        const isMatchingSearch = searchTerm === '' || classInSlot.some((item) => {
            const classCode = item.classCode || item.className || '';
            const teacherName = item.teacher || '';
            return classCode.toLowerCase().includes(searchTerm.toLowerCase()) || teacherName.toLowerCase().includes(searchTerm.toLowerCase());
        });

        return (
            <div onClick={() => openCellDetail(dayIdx, slotId)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayIdx, slotId)}
                title="Nhấn để xem chi tiết tiết học."
                 className={`p-2 rounded-3 shadow-sm h-100 position-relative border-start border-4 slot-filled transition-all 
                 ${classInSlot.some((item) => item.isConflict) ? 'bg-danger-subtle border-danger' : 'bg-primary-subtle border-primary'}
                 ${!isMatchingSearch ? 'opacity-25 grayscale' : ''}`} 
                 style={{ minHeight: '85px', cursor: 'grab' }}>

                {classInSlot.some((item) => item.isConflict) && (
                    <div className="position-absolute top-0 end-0 bg-danger text-white rounded-circle d-flex align-items-center justify-content-center mt-1 me-1 shadow-sm" style={{ width: '20px', height: '20px' }} title={classInSlot.find((item) => item.isConflict)?.conflictReason}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '11px' }}></i>
                    </div>
                )}

                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold text-dark text-truncate pe-2" style={{ fontSize: '13px' }}>
                        {classInSlot.length > 1 ? `${classInSlot.length} lịch` : (classInSlot[0].classCode || classInSlot[0].className || 'Lịch học')}
                    </div>
                    <span className="badge bg-white text-dark shadow-sm border border-light px-2 py-1" style={{ fontSize: '10px' }}>
                        {classInSlot.length}
                    </span>
                </div>

                <div className="d-flex flex-column gap-1">
                    {classInSlot.slice(0, 2).map((item, index) => (
                        <div
                            key={item.id || index}
                            className="d-flex justify-content-between align-items-center bg-white bg-opacity-75 rounded-3 px-2 py-1 border"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={() => setDraggedItem(item)}
                            style={{ cursor: 'grab' }}
                            role="button"
                            tabIndex={0}
                        >
                            <span className="small text-secondary fw-medium text-truncate" style={{ fontSize: '11px', maxWidth: '64%' }}>
                                <i className="bi bi-person-fill me-1 text-primary"></i>{item.teacher || 'Chưa phân công'}
                            </span>
                            <span className="small fw-bold text-dark text-truncate" style={{ fontSize: '10px', maxWidth: '34%' }}>{item.room || 'Chưa gán phòng'}</span>
                        </div>
                    ))}
                    {classInSlot.length > 2 && (
                        <div className="small text-muted fw-medium text-center mt-1">+{classInSlot.length - 2} lịch khác</div>
                    )}
                </div>
            </div>
        );
    };

    if (weekDays.length === 0) return null;

    const hasNoScheduleData = !loading && schedules.length === 0;
    const hasNoRequestData = !loading && rescheduleRequests.length === 0;
    const visibleRooms = availableRooms;
    const visibleTeachers = availableTeachers;

    return (
        <div className="p-4 animate__animated animate__fadeIn h-100 d-flex flex-column position-relative">
            
            {/* THÔNG BÁO NỔI (TOAST) GÓC DƯỚI */}
            {toast.show && (
                <div className={`position-fixed bottom-0 end-0 m-4 p-3 rounded-4 shadow-lg text-white bg-${toast.type} animate__animated animate__fadeInUp`} style={{ zIndex: 1100, minWidth: '280px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div className="d-flex align-items-center fw-bold">
                        <i className={`bi ${toast.type === 'danger' ? 'bi-exclamation-triangle-fill fs-4' : 'bi-check-circle-fill fs-5'} me-3`}></i>
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* HEADER & TÌM KIẾM */}
                        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border">
                            <div className="d-flex flex-column">
                                <h3 className="fw-bold text-dark mb-1 text-uppercase" style={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontWeight: 800, whiteSpace: 'nowrap' }}>{'Điều phối Lịch dạy &\u00A0Học'}</h3>
                                <p className="text-muted small mb-0" style={{ lineHeight: 1.2, marginTop: '6px' }}>Quản lý kéo thả lịch học, phòng học và xử lý xung đột.</p>
                            </div>
                
                            <div className="d-flex gap-3 align-items-center flex-wrap justify-content-end" ref={reschedulePanelRef}>
                                <div className="input-group shadow-sm rounded-pill overflow-hidden border border-primary border-opacity-25" style={{ width: '320px', borderRadius: '50px' }}>
                                    <span className="input-group-text bg-white border-0 px-2 text-primary" style={{ paddingLeft: '8px' }}><i className="bi bi-search"></i></span>
                                    <input type="text" className="form-control bg-white border-0 shadow-none fw-medium text-dark" placeholder="Tìm Giảng viên, Mã lớp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingTop: '8px', paddingBottom: '8px', height: '40px' }} />
                                    {searchTerm && <button className="btn btn-white border-0 text-muted" onClick={() => setSearchTerm('')}><i className="bi bi-x-circle-fill"></i></button>}
                                </div>

                                <select className="form-select rounded-pill shadow-sm bg-light border-0 fw-medium" style={{ width: '150px' }} value={viewFilter} onChange={(e) => setViewFilter(e.target.value)}>
                                    <option value="all">Tất cả lịch</option>
                                </select>

                                <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center hover-scale btn-primary-elevated" onClick={() => navigate('/admin/classes/create')} style={{ fontSize: '13px', boxShadow: '0 6px 18px rgba(13,110,253,0.12)' }}>
                                    <i className="bi bi-plus-lg me-2"></i> Xếp lịch mới
                                </button>

                                <div className="position-relative">
                                    <div className="d-flex justify-content-between align-items-center bg-white shadow-sm rounded-4 px-3 py-2 border">
                                        <button className="btn btn-link text-dark fw-bold p-0 text-decoration-none d-flex align-items-center" onClick={() => setShowReschedulePanel((prev) => !prev)}>
                                            <i className="bi bi-envelope-paper-fill text-warning me-2"></i>Duyệt đổi lịch
                                            <i className={`bi ms-2 bi-chevron-${showReschedulePanel ? 'up' : 'down'}`}></i>
                                        </button>
                                        <span className="badge bg-danger rounded-pill px-2 shadow-sm" style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{rescheduleRequests.length}</span>
                                    </div>

                                    {showReschedulePanel && (
                                        <div className="custom-scrollbar p-3 bg-white border rounded-4 shadow-lg position-absolute end-0 mt-2 review-popover" style={{ top: 'calc(100% + 8px)', zIndex: 30, maxHeight: '380px', overflowY: 'auto' }}>
                                {loading && (
                                    <div className="text-center text-muted py-4">
                                        <div className="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
                                        Đang tải yêu cầu đổi lịch...
                                    </div>
                                )}
                                {!loading && rescheduleRequests.map(req => (
                                    <div key={req.id} className="bg-white rounded-4 p-3 mb-3 border shadow-sm position-relative hover-up">
                                        <div className="fw-bold text-primary mb-1" style={{ fontSize: '14px' }}>{req.classCode || req.className || 'Chưa có mã lớp'}</div>
                                        <div className="small text-dark fw-bold mb-2"><i className="bi bi-person text-muted me-1"></i>{req.teacher || 'Chưa phân công giảng viên'}</div>
                                        <div className="d-flex align-items-center justify-content-center gap-2 mb-2 bg-light p-2 rounded-3 border" style={{ fontSize: '11px' }}>
                                            <div className="text-decoration-line-through text-muted">{req.oldA}<br/>{req.oldB}</div>
                                            <i className="bi bi-arrow-right text-primary fs-6"></i>
                                            <div className="fw-bold text-success">{req.newA}<br/>{req.newB}</div>
                                        </div>
                                        <div className="text-muted mb-3 text-center" style={{ fontSize: '11px', fontStyle: 'italic' }}>&quot;{req.reason}&quot;</div>
                                        <div className="d-flex gap-2 mt-auto">
                                            <button className="btn btn-success btn-sm flex-grow-1 rounded-pill fw-bold shadow-sm" onClick={() => handleApproveReq(req.id)} style={{ fontSize: '12px' }}>
                                                <i className="bi bi-check-lg me-1"></i> Duyệt
                                            </button>
                                            <button className="btn btn-outline-danger btn-sm flex-grow-1 rounded-pill fw-bold bg-white" onClick={() => handleRejectReq(req.id)} style={{ fontSize: '12px' }}>
                                                Từ chối
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {hasNoRequestData && <div className="text-center small text-muted mt-5"><i className="bi bi-inbox text-success fs-1 d-block mb-2"></i>Chưa có yêu cầu đổi lịch nào</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="row g-4 flex-grow-1">
                {/* LƯỚI LỊCH (GRID) */}
                <div className="col-12 d-flex flex-column">
                    <div className="card border-0 shadow-sm rounded-4 p-0 flex-grow-1 bg-white d-flex flex-column overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                            <h5 className="fw-bold mb-0 text-dark">
                                <i className="bi bi-calendar-week text-primary me-2"></i>Lịch trình hệ thống
                                {draggedItem && <span className="badge bg-warning text-dark ms-3 fs-6 animate__animated animate__pulse animate__infinite">Đang kéo: {draggedItem.classCode || draggedItem.className || 'Lịch học'}</span>}
                            </h5>
                            <div className="bg-white border rounded-pill p-1 shadow-sm d-flex align-items-center">
                                <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => setCurrentDate(new Date())} style={{ fontSize: '13px' }}>Hiện tại</button>
                                <div className="d-flex align-items-center px-2">
                                    <button className="btn btn-link text-dark shadow-none hover-scale" onClick={() => changeWeek(-1)}><i className="bi bi-chevron-left fw-bold"></i></button>
                                    <div className="vr mx-1 opacity-25" style={{ height: '20px' }}></div>
                                    <button className="btn btn-link text-dark shadow-none hover-scale" onClick={() => changeWeek(1)}><i className="bi bi-chevron-right fw-bold"></i></button>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive flex-grow-1 custom-scrollbar">
                            <table className="table table-bordered mb-0 align-middle text-center" style={{ minWidth: '900px', tableLayout: 'fixed' }}>
                                <thead className="bg-light sticky-top shadow-sm" style={{ zIndex: 10 }}>
                                    <tr className="text-muted small text-uppercase">
                                        <th style={{ width: '12.5%' }} className="border-0 bg-white py-3 shadow-sm">Tiết</th>
                                        {weekDays.map((day, idx) => (
                                            <th key={idx} style={{ width: '12.5%' }} className="border-0 bg-white py-3 shadow-sm fw-bold text-dark">
                                                <div className="d-flex flex-column align-items-center justify-content-center lh-sm">
                                                    <span>{day.dayName}</span>
                                                    <span className="text-muted" style={{ fontSize: '11px' }}>{day.dateLabel}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hasNoScheduleData && (
                                        <tr>
                                            <td colSpan={weekDays.length + 1} className="py-5 bg-white">
                                                <div className="text-center text-muted py-4">
                                                    <i className="bi bi-calendar-x display-4 d-block mb-2 text-secondary"></i>
                                                    <div className="fw-bold mb-1">Chưa có dữ liệu lịch học</div>
                                                    <div className="small">Hiện chưa có buổi học nào được sắp xếp trong tuần này.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {!hasNoScheduleData && PERIODS.map(slot => (
                                        <tr key={slot.id}>
                                            <td className="bg-light border-end py-3">
                                                <div className="fw-bold text-dark">{slot.name}</div>
                                                <div className="text-muted" style={{ fontSize: '11px' }}>{slot.time}</div>
                                            </td>
                                            {weekDays.map((_, dayIdx) => (
                                                <td key={dayIdx} 
                                                    className={`p-2 align-top bg-white hover-bg-light ${draggedItem ? 'border-dashed-hover' : ''}`}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, dayIdx, slot.id)}>
                                                    {renderTimeSlot(dayIdx, slot.id)}
                                                </td>
                                            ))}
                                        </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            {/* CHÚ THÍCH HỆ THỐNG - ĐƯA XUỐNG CUỐI TRANG */}
            <div className="mt-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-dark text-white">
                    <h6 className="fw-bold mb-4 text-warning"><i className="bi bi-info-circle-fill me-2"></i>Chú thích hệ thống</h6>
                    <div className="d-flex flex-wrap gap-4 align-items-center">
                        <div className="d-flex align-items-center">
                            <div className="bg-primary text-white rounded-3 me-3 d-flex justify-content-center align-items-center shadow-sm" style={{ width: '28px', height: '28px' }}><i className="bi bi-check2"></i></div>
                            <span className="small fw-medium">Lịch học bình thường</span>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="bg-danger text-white rounded-3 me-3 d-flex justify-content-center align-items-center shadow-sm" style={{ width: '28px', height: '28px' }}>
                                <i className="bi bi-exclamation-triangle-fill"></i>
                            </div>
                            <span className="small text-danger fw-bold">Xung đột lịch (Lỗi)</span>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="bg-light border border-dashed rounded-3 me-3 d-flex justify-content-center align-items-center text-muted" style={{ width: '28px', height: '28px' }}><i className="bi bi-plus"></i></div>
                            <span className="small fw-medium opacity-75">Kéo thả để dời lịch</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL THÊM/SỬA VỚI BÁO LỖI ĐỎ */}
            {showModal && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center animate__animated animate__fadeIn">
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '450px', zIndex: 1050 }}>
                        <div className={`p-3 px-4 d-flex justify-content-between align-items-center ${modalMode === 'add' ? 'bg-primary text-white' : 'bg-warning text-dark'}`}>
                            <h5 className="fw-bold mb-0">{modalMode === 'add' ? <><i className="bi bi-calendar-plus me-2"></i>Thêm Lịch Mới</> : <><i className="bi bi-pencil-square me-2"></i>Chỉnh Sửa Lịch</>}</h5>
                            <button className={`btn-close ${modalMode === 'add' ? 'btn-close-white' : ''}`} onClick={() => setShowModal(false)}></button>
                        </div>

                        <div className="p-4 modal-scroll-area">
                            {errorMsg && (
                                <div className="alert alert-danger py-2 px-3 small fw-bold d-flex align-items-center rounded-3 border-danger border-start border-4 shadow-sm mb-4 animate__animated animate__headShake">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label small fw-bold text-dark mb-1">Lớp học</label>
                                <select className="form-select bg-light border-0 py-2 shadow-none fw-medium" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} disabled={classesList.length === 0}>
                                    <option value="">Không chọn lớp</option>
                                    {classesList.length === 0 && <option value="">Chưa có lớp học</option>}
                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-dark mb-1">Giảng viên phụ trách</label>
                                <select className="form-select bg-light border-0 py-2 shadow-none fw-medium" value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} disabled={availabilityLoading || visibleTeachers.length === 0}>
                                    <option value="">Không chọn giảng viên</option>
                                    {availabilityLoading && <option value="">Đang tải giảng viên rảnh...</option>}
                                    {!availabilityLoading && visibleTeachers.length === 0 && <option value="">Chưa có giảng viên rảnh</option>}
                                    {visibleTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="form-text">Chỉ hiển thị giảng viên rảnh trong tiết đã chọn.</div>
                            </div>
                            <div className="row mb-4">
                                <div className="col-5">
                                    <label className="form-label small fw-bold text-dark mb-1">Phòng học</label>
                                    <select className="form-select bg-light border-0 py-2 shadow-none fw-medium" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})} disabled={availabilityLoading || visibleRooms.length === 0}>
                                        <option value="">Không gán phòng</option>
                                        {availabilityLoading && <option value="">Đang tải phòng trống...</option>}
                                        {!availabilityLoading && visibleRooms.length === 0 && <option value="">Chưa có phòng trống</option>}
                                        {visibleRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <div className="form-text">Chỉ hiển thị phòng trống trong tiết đã chọn.</div>
                                </div>
                                <div className="col-7">
                                    <label className="form-label small fw-bold text-dark mb-1">Ngày / Tiết học</label>
                                    <div className="input-group shadow-sm rounded-3 overflow-hidden">
                                        <select className="form-select bg-light border-0 py-2 fw-medium border-end" value={formData.dayIdx} onChange={e => setFormData({...formData, dayIdx: e.target.value})}>
                                            {weekDays.map((d, i) => (
                                                <option key={i} value={i}>{d.dayName || d.displayLabel || d.dateLabel}</option>
                                            ))}
                                        </select>
                                        <select className="form-select bg-light border-0 py-2 fw-medium" value={formData.slotId} onChange={e => setFormData({...formData, slotId: e.target.value, slotEndId: e.target.value})}>
                                            {PERIODS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between pt-3 border-top mt-2">
                                {modalMode === 'edit' ? (
                                    <button className="btn btn-outline-danger rounded-pill px-4 fw-bold d-flex align-items-center hover-scale" onClick={handleDeleteSchedule}>
                                        <i className="bi bi-trash-fill me-1"></i> Xóa
                                    </button>
                                ) : <div></div>}
                                
                                <div className="d-flex gap-2">
                                    <button className="btn btn-light rounded-pill px-4 fw-bold text-muted border hover-bg-gray" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm hover-scale" onClick={handleSaveSchedule}>
                                        <i className="bi bi-save2-fill me-1"></i> Lưu lịch
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT Ô LỊCH */}
            {showCellModal && selectedCell && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center animate__animated animate__fadeIn">
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '760px', maxWidth: '95vw', zIndex: 1050 }}>
                        <div className="p-3 px-4 d-flex justify-content-between align-items-center bg-dark text-white">
                                <h5 className="fw-bold mb-0">
                                <i className="bi bi-calendar2-week me-2"></i>
                                Chi tiết tiết học
                            </h5>
                            <button className="btn-close btn-close-white" onClick={closeCellDetail}></button>
                        </div>

                        <div className="p-4 modal-scroll-area">
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
                                <div>
                                    <div className="fw-bold text-dark fs-5">{selectedCell.label}</div>
                                    <div className="text-muted small">{selectedCell.slotName} • {selectedCell.time}</div>
                                </div>
                                <span className="badge bg-primary rounded-pill px-3 py-2">{selectedCellSchedules.length} lịch đã xếp</span>
                            </div>

                            <div className="row g-4">
                                <div className="col-lg-7">
                                    <div className="card border-0 shadow-sm rounded-4 h-100">
                                        <div className="card-header bg-primary text-white rounded-top-4 fw-bold">
                                            Danh sách lịch đã xếp
                                        </div>
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="fw-bold">{selectedCellSchedules.length} lịch hiện có trong ô này</div>
                                                {selectedCellSchedules.length > 0 && (
                                                    <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={() => setShowQuickScheduleForm((previous) => !previous)}>
                                                        {showQuickScheduleForm ? 'Ẩn form xếp tiếp' : 'Tiếp tục xếp lịch'}
                                                    </button>
                                                )}
                                            </div>

                                            {selectedCellSchedules.map((schedule) => (
                                                <div key={schedule.id} className="border rounded-4 p-3 mb-3 bg-light">
                                                    <div className="d-flex justify-content-between align-items-start gap-3">
                                                        <div>
                                                            <div className="fw-bold text-dark">{schedule.classCode || schedule.className || 'Chưa có mã lớp'}</div>
                                                            <div className="text-muted small">{schedule.subject || 'Buổi học'}</div>
                                                        </div>
                                                        <div className="d-flex flex-column align-items-end gap-2">
                                                            {schedule.isConflict && <span className="badge bg-danger">Xung đột</span>}
                                                            <button
                                                                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                                onClick={() => handleContinueScheduleFromRow(schedule)}
                                                            >
                                                                <i className="bi bi-plus-lg me-1"></i> Xếp tiếp
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                                                onClick={() => handleRemoveScheduleFromCell(schedule.id)}
                                                            >
                                                                <i className="bi bi-trash me-1"></i> Xóa khỏi tiết này
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="row g-2 mt-2 small">
                                                        <div className="col-md-4"><span className="text-muted">Giảng viên:</span> <span className="fw-bold">{schedule.teacher || 'Chưa phân công'}</span></div>
                                                        <div className="col-md-4"><span className="text-muted">Phòng:</span> <span className="fw-bold">{schedule.room || 'Chưa gán phòng'}</span></div>
                                                        <div className="col-md-4"><span className="text-muted">Tiết:</span> <span className="fw-bold">{PERIODS.find((slot) => slot.id === schedule.slotId)?.name || `Tiết ${schedule.slotId}`}</span></div>
                                                    </div>
                                                </div>
                                            ))}

                                            {showQuickScheduleForm && (
                                                <div ref={quickScheduleFormRef} className="p-3 border rounded-4 bg-white shadow-sm mt-2">
                                                    <div className="fw-bold mb-2">{selectedCellSchedules.length === 0 ? 'Chưa có lịch nào trong tiết này — Xếp lịch nhanh' : 'Xếp thêm lịch vào ô này'}</div>
                                                    <div className="row g-2">
                                                        <div className="col-12 mb-2">
                                                            <label className="form-label small mb-1">Lớp học</label>
                                                            <select className="form-select" value={inlineForm.classId} onChange={e => setInlineForm({...inlineForm, classId: e.target.value})}>
                                                                <option value="">Không chọn lớp</option>
                                                                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-6 mb-2">
                                                            <label className="form-label small mb-1">Giảng viên</label>
                                                            <select className="form-select" value={inlineForm.teacherId} onChange={e => setInlineForm({...inlineForm, teacherId: e.target.value})}>
                                                                <option value="">Không chọn giảng viên</option>
                                                                {(selectedCellAvailability.teachers.length ? selectedCellAvailability.teachers : teachersList).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-6 mb-2">
                                                            <label className="form-label small mb-1">Phòng</label>
                                                            <select className="form-select" value={inlineForm.roomId} onChange={e => setInlineForm({...inlineForm, roomId: e.target.value})}>
                                                                <option value="">Không gán phòng</option>
                                                                {selectedCellAvailability.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex justify-content-end gap-2 mt-3">
                                                        <button className="btn btn-light" onClick={() => { setInlineForm({...inlineForm, classId: '', teacherId: '', roomId: ''}); }}>Hủy</button>
                                                        <button className="btn btn-primary" onClick={handleInlineSave}>Lưu & Xếp</button>
                                                    </div>
                                                </div>
                                            )}

                                            {!showQuickScheduleForm && selectedCellSchedules.length > 0 && (
                                                <div className="mt-3 p-3 border rounded-4 bg-warning-subtle text-dark">
                                                    <div className="fw-bold mb-2">Bạn có thể thêm lịch khác vào cùng ô này nếu không trùng lớp, phòng hoặc giảng viên.</div>
                                                    <button className="btn btn-primary btn-sm rounded-pill px-3" onClick={() => setShowQuickScheduleForm(true)}>
                                                        Tiếp tục xếp lịch
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-5">
                                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                                        <div className="card-header bg-success text-white rounded-top-4 fw-bold">
                                            Giảng viên còn rảnh
                                        </div>
                                        <div className="card-body" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                            {selectedCellLoading ? (
                                                <div className="text-center text-muted py-4">
                                                    <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                                                    Đang tải...
                                                </div>
                                            ) : selectedCellAvailability.teachers.length === 0 ? (
                                                <div className="text-muted small text-center py-3">Không còn giảng viên trống ở tiết này.</div>
                                            ) : selectedCellAvailability.teachers.map((teacher) => (
                                                <div key={teacher.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                                    <span className="fw-medium small">{teacher.name}</span>
                                                    <span className="badge bg-light text-dark border">Rảnh</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card border-0 shadow-sm rounded-4">
                                        <div className="card-header bg-warning text-dark rounded-top-4 fw-bold">
                                            Phòng còn trống
                                        </div>
                                        <div className="card-body" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                            {selectedCellLoading ? (
                                                <div className="text-center text-muted py-4">
                                                    <div className="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
                                                    Đang tải...
                                                </div>
                                            ) : selectedCellAvailability.rooms.length === 0 ? (
                                                <div className="text-muted small text-center py-3">Không còn phòng trống ở tiết này.</div>
                                            ) : selectedCellAvailability.rooms.map((room) => (
                                                <div key={room.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                                    <span className="fw-medium small">{room.name}</span>
                                                    <span className="badge bg-light text-dark border">Trống</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button className="btn btn-outline-primary rounded-pill px-4 fw-bold me-2" onClick={() => openAddModal(selectedCell.dayIdx, selectedCell.slotId, {
                                    classId: inlineForm.classId,
                                    teacherId: inlineForm.teacherId,
                                    roomId: inlineForm.roomId,
                                    slotEndId: inlineForm.slotEndId,
                                    classCode: getLookupLabel(classesList, inlineForm.classId),
                                    teacher: getLookupLabel(teachersList, inlineForm.teacherId),
                                    room: getLookupLabel(roomsList, inlineForm.roomId),
                                })}>
                                    Mở popup xếp lịch
                                </button>
                                <button className="btn btn-dark rounded-pill px-4 fw-bold" onClick={closeCellDetail}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL XẾP LỊCH MỚI */}
            {showModal && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center animate__animated animate__fadeIn">
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__slideInUp" style={{ width: '600px', maxWidth: '95vw', zIndex: 1050 }}>
                        <div className="p-3 px-4 d-flex justify-content-between align-items-center bg-dark text-white">
                            <h5 className="fw-bold mb-0">
                                <i className="bi bi-calendar-plus me-2"></i>
                                {modalMode === 'add' ? 'Xếp lịch dạy mới' : 'Chỉnh sửa lịch dạy'}
                            </h5>
                            <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>

                        <div className="p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {errorMsg && <div className="alert alert-danger rounded-3" role="alert">{errorMsg}</div>}

                            <div className="mb-3">
                                <label className="form-label fw-bold text-dark">Lớp học <span className="text-danger">*</span></label>
                                <select className="form-select rounded-3" value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})}>
                                    <option value="">Chọn lớp học</option>
                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                                </select>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-bold text-dark">Tiết bắt đầu <span className="text-danger">*</span></label>
                                    <select className="form-select rounded-3" value={formData.slotId} onChange={(e) => setFormData({...formData, slotId: e.target.value})}>
                                        <option value="">Chọn tiết</option>
                                        {PERIODS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.time})</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-bold text-dark">Tiết kết thúc <span className="text-danger">*</span></label>
                                    <select className="form-select rounded-3" value={formData.slotEndId} onChange={(e) => setFormData({...formData, slotEndId: e.target.value})}>
                                        <option value="">Chọn tiết</option>
                                        {PERIODS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.time})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="row g-3 mt-2">
                                <div className="col-md-6">
                                    <label className="form-label fw-bold text-dark">Giảng viên <span className="text-danger">*</span></label>
                                    {availabilityLoading ? (
                                        <div className="text-muted py-2"><i className="spinner-border spinner-border-sm me-2"></i>Đang tải...</div>
                                    ) : (
                                        <select className="form-select rounded-3" value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})}>
                                            <option value="">Chọn giảng viên</option>
                                            {visibleTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-bold text-dark">
                                        Phòng học
                                        {visibleRooms.length > 0 && <span className="badge bg-success ms-2" style={{fontSize: '10px'}}>Tự động gán: {visibleRooms[0]?.name || 'N/A'}</span>}
                                    </label>
                                    {availabilityLoading ? (
                                        <div className="text-muted py-2"><i className="spinner-border spinner-border-sm me-2"></i>Đang tải...</div>
                                    ) : (
                                        <select className="form-select rounded-3" value={formData.roomId} onChange={(e) => setFormData({...formData, roomId: e.target.value})}>
                                            <option value="">Không gán phòng</option>
                                            {visibleRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="alert alert-info rounded-3 mt-3">
                                <small><i className="bi bi-info-circle me-2"></i><strong>Lưu ý:</strong> Hệ thống sẽ tự động gán phòng học trống đầu tiên nếu bạn không chọn.</small>
                            </div>
                        </div>

                        <div className="p-4 bg-light border-top d-flex justify-content-end gap-2">
                            <button className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center" onClick={handleSaveSchedule}>
                                <i className="bi bi-check-lg me-2"></i> {modalMode === 'add' ? 'Thêm lịch' : 'Cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                
                .transition-all { transition: all 0.2s ease-in-out; }
                .hover-scale:hover { transform: scale(1.05); transition: 0.2s; }
                .hover-up:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important; transition: 0.2s; }
                .hover-bg-light:hover { background-color: #f8f9fa !important; }
                .hover-bg-gray:hover { background-color: #e9ecef !important; }
                
                .slot-empty:hover { background-color: #eef2f7 !important; border-color: #0d6efd !important; }
                .slot-empty:hover i { opacity: 1 !important; color: #0d6efd; transform: scale(1.3); transition: 0.2s; }
                .slot-filled:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(13, 110, 253, 0.15) !important; filter: brightness(0.97); }
                
                /* Kéo thả CSS */
                .slot-filled:active { cursor: grabbing !important; transform: scale(0.95); opacity: 0.8; }
                .dragging-ghost { opacity: 0.4; border: 2px dashed #0d6efd !important; }
                .border-dashed-hover:hover { background-color: #e8f4ff !important; border: 2px dashed #0d6efd !important; }
                
                .grayscale { filter: grayscale(100%); opacity: 0.25; pointer-events: none; }
                .modal-backdrop-custom { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1040; backdrop-filter: blur(4px); }
                .border-dashed { border-style: dashed !important; border-width: 2px !important; }
                .review-popover { width: min(100%, 320px); }
                .modal-scroll-area { max-height: 78vh; overflow-y: auto; scroll-behavior: smooth; }
            `}</style>
        </div>
    );
};

export default AdminSchedule;
