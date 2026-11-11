import * as React from 'react';
const { createContext, useState, useContext, useEffect } = React || {};
import { authApi } from '../api';
import apiClient from '../api/BaseApi';

const AuthContext = createContext();

const sanitizeUserForStorage = (userData) => {
    if (!userData) {
        return null;
    }

    const { avatarPreview, ...persistedUser } = userData;
    return persistedUser;
};

export const AuthProvider = ({ children }) => {
    if (!React || typeof React.useState !== 'function') {
        console.error('AuthContext: React import is invalid or hooks not available', React);
        const fallback = {
            user: null,
            login: () => {},
            logout: () => { window.location.href = '/login'; },
            loading: false,
            refreshPermissions: async () => ({ success: false }),
            refreshAccessToken: async () => ({ success: false })
        };
        return (
            <AuthContext.Provider value={fallback}>
                {children}
            </AuthContext.Provider>
        );
    }
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const userRef = React.useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        // Kiểm tra xem đã đăng nhập trước đó chưa (trong localStorage)
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(sanitizeUserForStorage(JSON.parse(savedUser)));
        }
        // Nếu chưa có user nhưng có rememberedCredentials (chỉ token), khôi phục tạm thời
        if (!savedUser) {
            try {
                const remembered = localStorage.getItem('rememberedCredentials');
                if (remembered) {
                    const parsed = JSON.parse(remembered);
                    if (parsed?.token) {
                        const minimalUser = { token: parsed.token };
                        setUser(minimalUser);
                    }
                }
            } catch (err) {
                console.warn('AuthContext: cannot restore remembered credentials', err);
            }
        }

        setLoading(false);

        // Dang ky callback de refresh token khi gap 401
        apiClient.setRefreshTokenProvider(() => refreshAccessToken());
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(userData)));
    };

    const updateUser = (updater) => {
        setUser((prevUser) => {
            const nextUser = typeof updater === 'function'
                ? updater(prevUser)
                : { ...(prevUser || {}), ...(updater || {}) };

            if (nextUser) {
                localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(nextUser)));
            } else {
                localStorage.removeItem('user');
            }

            return nextUser;
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // - chuc nang: Gui request refresh token de cap new access token khi het han.
    // - nmkhue -31/3/2026
    const refreshAccessToken = async () => {
        const currentUser = userRef.current;
        if (!currentUser?.sessionId || !currentUser?.refreshToken) {
            return { success: false, message: 'Không tìm thấy refresh token' };
        }

        try {
            const result = await authApi.refresh(currentUser.sessionId, currentUser.refreshToken);

            if (result?.success && result?.data) {
                // Cập nhật user với token mới
                const updatedUser = {
                    ...currentUser,
                    token: result.data.accessToken,
                    refreshToken: result.data.refreshToken || currentUser.refreshToken,
                    sessionId: result.data.sessionId || currentUser.sessionId
                };
                login(updatedUser);
                return { success: true, message: 'Token đã được làm mới' };
            } else {
                return { success: false, message: result?.message || 'Không thể làm mới token' };
            }
        } catch (error) {
            return { success: false, message: 'Lỗi kết nối: ' + error.message };
        }
    };

    const refreshPermissions = async () => {
        if (!user?.id) {
            return { success: false, message: 'Không tìm thấy thông tin người dùng' };
        }

        try {
            const data = await authApi.refreshPermissions(user.id);

            if (data?.success && data?.data) {
                // Update user with new permissions
                const updatedUser = {
                    ...user,
                    permissionCodes: data.data.permissionCodes
                };
                login(updatedUser);
                return { success: true, message: 'Quyền truy cập đã được cập nhật' };
            } else {
                return { success: false, message: data?.message || 'Không thể cập nhật quyền' };
            }
        } catch (error) {
            return { success: false, message: 'Lỗi kết nối: ' + error.message };
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, updateUser, logout, loading, refreshPermissions, refreshAccessToken }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
