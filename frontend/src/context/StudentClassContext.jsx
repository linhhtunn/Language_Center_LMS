import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/BaseApi';

const StudentClassContext = createContext();

export const StudentClassProvider = ({ children }) => {
    const [classes, setClasses] = useState([]);
    const [currentClass, setCurrentClass] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load danh sách lớp từ API
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            loadStudentClasses();
            return;
        }

        setLoading(false);
    }, []);

    const getStudentId = () => {
        const userData = localStorage.getItem('user');
        if (!userData) return null;
        try {
            const parsed = JSON.parse(userData);
            return parsed?.profileId || parsed?.id || null;
        } catch {
            return null;
        }
    };

    const loadStudentClasses = async () => {
        setLoading(true);
        setError('');
        try {
            const studentId = getStudentId();
            const url = studentId 
                ? `Schedule/student-classes?studentId=${studentId}`
                : 'Schedule/student-classes';
            const response = await apiClient.get(url);
            const data = response?.data || response;
            const classList = data?.classes || [];
            setClasses(classList);

            // Set lớp đầu tiên làm lớp hiện tại (nếu có)
            if (classList.length > 0) {
                const savedClassId = localStorage.getItem('currentStudentClassId');
                const classToSet = classList.find(c => c.id === savedClassId) || classList[0];
                setCurrentClass(classToSet);
                localStorage.setItem('currentStudentClassId', classToSet.id);
            } else {
                setCurrentClass(null);
                localStorage.removeItem('currentStudentClassId');
                setError('Bạn hiện chưa được gán vào lớp nào trong hệ thống. Vui lòng liên hệ quản trị viên hoặc giáo viên phụ trách.');
            }
        } catch (err) {
            const message = err?.message || 'Không thể tải danh sách lớp.';
            setError(message);
            setClasses([]);
            setCurrentClass(null);
        } finally {
            setLoading(false);
        }
    };

    const selectClass = (classId) => {
        const selected = classes.find(c => c.id === classId);
        if (selected) {
            setCurrentClass(selected);
            localStorage.setItem('currentStudentClassId', classId);
        }
    };

    const value = {
        classes,
        currentClass,
        loading,
        error,
        selectClass,
        reload: loadStudentClasses
    };

    return (
        <StudentClassContext.Provider value={value}>
            {children}
        </StudentClassContext.Provider>
    );
};

export const useStudentClass = () => {
    const context = useContext(StudentClassContext);
    if (!context) {
        throw new Error('useStudentClass must be used within StudentClassProvider');
    }
    return context;
};
