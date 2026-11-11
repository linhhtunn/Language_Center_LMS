import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getSignalRBaseUrl } from '../api/BaseApi';

// Nhan thong bao realtime (Socket.IO namespace /notification). Ban cu dung SignalR nhung server
// khong bao gio day su kien nen nguoi dung phai tai lai trang moi thay thong bao moi.
//
// Khi co "NewNotification": hien toast va phat su kien trinh duyet NEW_NOTIFICATION_EVENT de cac trang
// (chuong thong bao, dashboard) tu tai lai so chua doc:
//   useEffect(() => onNewNotification(() => fetchUnreadCount()), []);

export const NEW_NOTIFICATION_EVENT = 'lms:new-notification';

/** Dang ky nghe thong bao moi; tra ve ham huy dang ky (dung lam cleanup cua useEffect). */
export const onNewNotification = (handler) => {
  const listener = (e) => handler(e.detail);
  window.addEventListener(NEW_NOTIFICATION_EVENT, listener);
  return () => window.removeEventListener(NEW_NOTIFICATION_EVENT, listener);
};

const RealtimeNotifications = () => {
  const { user } = useAuth();
  const token = user?.token || user?.accessToken || null;

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(`${getSignalRBaseUrl()}/notification`, {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      reconnectionDelayMax: 10000,
    });

    socket.on('NewNotification', (notification) => {
      const title = notification?.title || 'Thông báo mới';
      toast(`🔔 ${title}`, { id: `notif-${notification?.id ?? Date.now()}`, duration: 6000 });
      window.dispatchEvent(new CustomEvent(NEW_NOTIFICATION_EVENT, { detail: notification }));
    });

    // Token het han / sai: dung thu lai, cho lan dang nhap / refresh token sau (token doi -> effect chay lai).
    socket.on('connect_error', (err) => {
      if (err?.message === 'AUTH_REQUIRED' || err?.message === 'AUTH_TOKEN_INVALID') socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return null;
};

export default RealtimeNotifications;
