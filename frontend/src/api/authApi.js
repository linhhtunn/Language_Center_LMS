// Nguoi thuc hien: nmkhue - Ngay 29/3
import apiClient from './BaseApi';


export const authApi = {
    // - chuc nang: Gui thong tin dang nhap va nhan ket qua xac thuc.
    // - nmkhue -29/2/2026
    login: (email, password) => {
        return apiClient.post('Auth/login', {
            data: {
                email,
                password,
            },
        });
    },

    // - chuc nang: Lam moi bo quyen cua nguoi dung theo userId.
    // - nmkhue -29/2/2026
    refreshPermissions: (userId) => {
        return apiClient.post(`Auth/refresh-permissions/${userId}`);
    },

    // - chuc nang: Gui refresh token de cap new access token.
    // - nmkhue -31/3/2026
    refresh: (sessionId, refreshToken) => {
        return apiClient.post('Auth/refresh', {
            data: {
                sessionId,
                refreshToken,
            },
        });
    },

    // - chuc nang: Dang xuat va vô hieu hoa session.
    // - nmkhue -31/3/2026
    logout: (sessionId) => {
        return apiClient.post('Auth/logout', {
            data: {
                sessionId,
            },
        });
    },
};

export default authApi;