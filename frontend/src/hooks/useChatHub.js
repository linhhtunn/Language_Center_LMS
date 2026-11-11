import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getSignalRBaseUrl } from '../api/BaseApi';

// Realtime chat qua Socket.IO (namespace /chat) - thay cho SignalR hub /hubs/chat cu.
const CHAT_URL = `${getSignalRBaseUrl()}/chat`;

// Giong withAutomaticReconnect([0, 0, 3000, 3000, 5000, 10000]) cua SignalR: sau khi mat ket noi
// thu lai 6 lan theo lich nay roi dung; lan ket noi dau that bai thi thu lai moi 5 giay.
const RECONNECT_DELAYS = [0, 0, 3000, 3000, 5000, 10000];
const INITIAL_RETRY_MS = 5000;
const INVOKE_TIMEOUT_MS = 10000;
const AUTH_ERRORS = ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID'];

export const useChatHub = () => {
  const { user, logout } = useAuth();
  const token = user?.token || user?.accessToken || null;
  const connectionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const authFailedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Event handlers store
  const handlersRef = useRef({
    'message-created': [],
    'conversation-updated': [],
    'message-read': []
  });

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Ket noi toi Socket.IO namespace /chat
  useEffect(() => {
    if (!token) return;
    authFailedRef.current = false;
    clearReconnectTimeout();
    let cancelled = false;
    let everConnected = false;
    let reconnecting = false;
    let reconnectAttempt = 0;

    const socket = io(CHAT_URL, {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      autoConnect: false,
      // Tu dieu khien lich ket noi lai (giong SignalR) thay vi de Socket.IO tu backoff.
      reconnection: false
    });
    connectionRef.current = socket;

    const scheduleConnect = (delay) => {
      clearReconnectTimeout();
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (!cancelled && !authFailedRef.current) socket.connect();
      }, delay);
    };

    // Thu ket noi lai sau khi da tung ket noi; het luot -> dong han (nhu onclose cua SignalR).
    const tryReconnect = (error) => {
      if (reconnectAttempt >= RECONNECT_DELAYS.length) {
        reconnecting = false;
        setIsConnected(false);
        if (error) {
          setConnectionError(error);
          console.error('Socket.IO connection closed:', error);
        }
        return;
      }
      scheduleConnect(RECONNECT_DELAYS[reconnectAttempt]);
      reconnectAttempt += 1;
    };

    socket.on('connect', () => {
      if (cancelled) return;
      setIsConnected(true);
      setConnectionError(null);
      if (reconnecting) {
        console.log('Socket.IO reconnected');
      } else {
        console.log('Socket.IO connected');
      }
      everConnected = true;
      reconnecting = false;
      reconnectAttempt = 0;
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (cancelled || reason === 'io client disconnect') return;
      // Tuong duong onreconnecting
      console.log('Socket.IO reconnecting...', reason);
      reconnecting = true;
      reconnectAttempt = 0;
      tryReconnect(null);
    });

    socket.on('connect_error', (error) => {
      if (cancelled || authFailedRef.current) return;
      setIsConnected(false);

      if (reconnecting) {
        tryReconnect(error);
        return;
      }

      console.error('Socket.IO connection error:', error);
      setConnectionError(error?.message);
      const unauthorized = AUTH_ERRORS.includes(error?.message);
      if (unauthorized && !everConnected) {
        authFailedRef.current = true;
        logout?.();
        return;
      }

      // Retry after 5 seconds
      scheduleConnect(INITIAL_RETRY_MS);
    });

    // Su kien tu server
    socket.on('message-created', (message) => {
      handlersRef.current['message-created'].forEach(handler => handler(message));
    });

    socket.on('conversation-updated', (conversation) => {
      handlersRef.current['conversation-updated'].forEach(handler => handler(conversation));
    });

    socket.on('message-read', (data) => {
      handlersRef.current['message-read'].forEach(handler => handler(data));
    });

    socket.connect();

    return () => {
      cancelled = true;
      clearReconnectTimeout();
      if (connectionRef.current === socket) connectionRef.current = null;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, clearReconnectTimeout, logout]);

  // Subscribe để nhận event
  const on = useCallback((event, handler) => {
    if (handlersRef.current[event]) {
      handlersRef.current[event].push(handler);
      return () => {
        handlersRef.current[event] = handlersRef.current[event].filter(h => h !== handler);
      };
    }
  }, []);

  // Goi "hub method" tren server, cho ack { ok, error }.
  const invoke = async (method, ...args) => {
    const response = await connectionRef.current.timeout(INVOKE_TIMEOUT_MS).emitWithAck(method, ...args);
    if (!response?.ok) throw new Error(response?.error || `${method} failed`);
    return response.data;
  };

  // Join conversation group
  const joinConversation = useCallback(async (conversationId) => {
    if (!connectionRef.current || !isConnected) {
      console.warn('Socket.IO not connected, cannot join conversation');
      return false;
    }
    try {
      await invoke('JoinConversation', conversationId);
      return true;
    } catch (error) {
      console.error('Error joining conversation:', error);
      return false;
    }
  }, [isConnected]);

  // Leave conversation group
  const leaveConversation = useCallback(async (conversationId) => {
    if (!connectionRef.current || !isConnected) return false;
    try {
      await invoke('LeaveConversation', conversationId);
      return true;
    } catch (error) {
      console.error('Error leaving conversation:', error);
      return false;
    }
  }, [isConnected]);

  return {
    isConnected,
    connectionError,
    on,
    joinConversation,
    leaveConversation
  };
};
