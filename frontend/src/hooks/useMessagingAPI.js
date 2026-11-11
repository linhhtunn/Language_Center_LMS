import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/BaseApi';

export const useMessagingAPI = () => {
  const { user, logout } = useAuth();
  const token = user?.token || user?.accessToken || null;

  const handleUnauthorized = (message, fallbackValue) => {
    console.warn(message);
    logout?.();
    return fallbackValue;
  };

  const normalizeListResponse = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload?.data && typeof payload.data === 'object') return [payload.data];
    return [];
  };

  const normalizeSingleResponse = (payload) => {
    if (payload && typeof payload === 'object') return payload;
    return null;
  };

  // Lấy danh sách người dùng có thể nhắn tin (Admin, Giáo viên, Phụ huynh, Học sinh)
  const getUsers = useCallback(async () => {
    try {
      if (!token) return [];

      const response = await apiClient.get('messages/users');
      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi lấy danh sách người dùng', []);
      }

      if (!response?.success) {
        console.error('Lỗi lấy danh sách người dùng:', response?.message || 'Không thể tải danh sách người dùng');
        return [];
      }

      return normalizeListResponse(response.data || response).map((u) => ({
        id: u?.id || u?.userId,
        name: u?.name || u?.fullName,
        role: u?.role,
        avatarUrl: u?.avatarUrl || null
      }));
    } catch (error) {
      console.error('Lỗi kết nối lấy danh sách người dùng:', error);
      return [];
    }
  }, [token, logout]);

  // Lấy danh sách cuộc trò chuyện
  const getConversations = useCallback(async () => {
    try {
      if (!token) return [];

      const response = await apiClient.get('messages/conversations');
      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi lấy cuộc trò chuyện', []);
      }

      if (!response?.success) {
        console.error('Lỗi lấy danh sách cuộc trò chuyện:', response?.message || 'Không thể tải danh sách cuộc trò chuyện');
        return [];
      }

      return normalizeListResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối lấy cuộc trò chuyện:', error);
      return [];
    }
  }, [token, logout]);

  // Lấy tin nhắn của một cuộc trò chuyện
  const getMessages = useCallback(async (conversationId, take = 50) => {
    try {
      if (!token) return [];

      const response = await apiClient.get(`messages/conversations/${conversationId}/messages?take=${take}`);
      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi lấy tin nhắn', []);
      }

      if (!response?.success) {
        console.error('Lỗi lấy tin nhắn:', response?.message || 'Không thể tải tin nhắn');
        return [];
      }

      return normalizeListResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối lấy tin nhắn:', error);
      return [];
    }
  }, [token, logout]);

  // Gửi tin nhắn
  const sendMessage = useCallback(async (conversationId, content, attachmentUrls = []) => {
    try {
      if (!token) return null;

      const response = await apiClient.post(`messages/conversations/${conversationId}/messages`, {
        content,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined
      });

      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi gửi tin nhắn', null);
      }

      if (!response?.success) {
        console.error('Lỗi gửi tin nhắn:', response?.message || 'Không thể gửi tin nhắn');
        return null;
      }

      return normalizeSingleResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối gửi tin nhắn:', error);
      return null;
    }
  }, [token, logout]);

  const uploadAttachments = useCallback(async (files) => {
    try {
      if (!token) return [];
      if (!files || files.length === 0) return [];

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.postForm('messages/attachments', formData);
      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi upload tệp đính kèm', []);
      }

      if (!response?.success) {
        console.error('Lỗi upload tệp đính kèm:', response?.message || 'Không thể upload tệp đính kèm');
        return [];
      }

      return normalizeListResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối upload tệp đính kèm:', error);
      return [];
    }
  }, [token, logout]);

  // Tạo cuộc trò chuyện 1-1
  const createDirectConversation = useCallback(async (recipientId, initialMessage = null) => {
    try {
      if (!token) return null;

      const response = await apiClient.post('messages/direct', {
        recipientUserId: recipientId,
        initialMessage
      });

      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi tạo cuộc trò chuyện', null);
      }

      if (!response?.success) {
        console.error('Lỗi tạo cuộc trò chuyện:', response?.message || 'Không thể tạo cuộc trò chuyện');
        return null;
      }

      return normalizeSingleResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối tạo cuộc trò chuyện:', error);
      return null;
    }
  }, [token, logout]);

  // Tạo nhóm chat
  const createGroupConversation = useCallback(async (title, memberIds, initialMessage = null) => {
    try {
      if (!token) return null;

      const response = await apiClient.post('messages/groups', {
        title,
        memberUserIds: memberIds,
        initialMessage
      });

      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi tạo nhóm chat', null);
      }

      if (!response?.success) {
        console.error('Lỗi tạo nhóm chat:', response?.message || 'Không thể tạo nhóm chat');
        return null;
      }

      return normalizeSingleResponse(response.data || response);
    } catch (error) {
      console.error('Lỗi kết nối tạo nhóm chat:', error);
      return null;
    }
  }, [token, logout]);

  // Đánh dấu cuộc trò chuyện đã đọc
  const markAsRead = useCallback(async (conversationId) => {
    try {
      if (!token) return false;

      const response = await apiClient.post(`messages/conversations/${conversationId}/read`);
      if (response?.status === 401) {
        // Không tự động logout ở đây, chỉ log
        console.warn('Token hết hạn khi đánh dấu đã đọc');
        return false;
      }

      if (!response?.success) {
        console.warn('Lỗi đánh dấu đã đọc:', response?.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Lỗi kết nối đánh dấu đã đọc:', error);
      return false;
    }
  }, [token]);

  // Đăng ký device token cho push notifications
  const registerDeviceToken = useCallback(async (deviceToken) => {
    try {
      if (!token) return false;

      const response = await apiClient.post('messages/device-token', {
        deviceToken
      });

      if (response?.status === 401) {
        return handleUnauthorized('Chưa đăng nhập hoặc token hết hạn khi đăng ký device token', false);
      }

      if (!response?.success) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Lỗi kết nối đăng ký device token:', error);
      return false;
    }
  }, [token, logout]);

  return {
    getUsers,
    getConversations,
    getMessages,
    sendMessage,
    uploadAttachments,
    createDirectConversation,
    createGroupConversation,
    markAsRead,
    registerDeviceToken
  };
};
