import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * PrivateRoute — kiểm tra xác thực và phân quyền dựa trên ma trận chức năng.
 *
 * Cơ chế:
 *  - Yêu cầu người dùng đã đăng nhập (có user trong AuthContext).
 *  - Kiểm tra `requiredPermissions` theo danh sách permissionCodes được server cấp
 *    trong JWT (tra cứu từ bảng VaiTroQuyen theo ma trận chức năng).
 *  - KHÔNG còn kiểm tra theo `allowedRoles` nữa. Prop này bị bỏ để tránh nhầm lẫn.
 */
const PrivateRoute = ({
    children,
    requiredPermissions = [],
    requireAllPermissions = true
}) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Xác định đường dẫn redirect mặc định theo loại tài khoản để điều hướng sau khi từ chối
    const rolePath = user?.role === 'Giao_Vien'
        ? 'teacher'
        : user?.role === 'Hoc_Sinh'
            ? 'student'
            : user?.role === 'Phu_Huynh'
                ? 'parent'
                : 'admin';

    const defaultRedirect = `/${rolePath}`;

    // Kiểm tra quyền theo ma trận chức năng (permissionCodes từ JWT — server cấp)
    const userPermissions = Array.isArray(user.permissionCodes) ? user.permissionCodes : [];
    const isDenied = requiredPermissions.length > 0 && (
        requireAllPermissions
            ? !requiredPermissions.every((p) => userPermissions.includes(p))
            : !requiredPermissions.some((p) => userPermissions.includes(p))
    );

    useEffect(() => {
        if (isDenied) {
            toast.error('Bạn không có quyền truy cập tài nguyên này.', { id: '403-unauthorized' });
        }
    }, [isDenied]);

    if (isDenied) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PrivateRoute;