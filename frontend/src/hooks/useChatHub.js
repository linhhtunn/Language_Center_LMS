import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { getSignalRBaseUrl } from '../api/BaseApi';

const SIGNALR_URL = `${getSignalRBaseUrl()}/hubs/chat`;

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

  // Kết nối đến SignalR Hub
  useEffect(() => {
    if (!token) return;
    authFailedRef.current = false;
    clearReconnectTimeout();
    let cancelled = false;

    const connectToHub = async () => {
      if (authFailedRef.current || cancelled) return;
      try {
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_URL, {
            accessTokenFactory: () => token,
            withCredentials: true
          })
          .withAutomaticReconnect([0, 0, 3000, 3000, 5000, 10000])
          .withHubProtocol(new signalR.JsonHubProtocol())
          .configureLogging(signalR.LogLevel.None)
          .build();

        // Connection event handlers
        connection.onreconnecting((error) => {
          setIsConnected(false);
          console.log('SignalR reconnecting...', error);
        });

        connection.onreconnected(() => {
          setIsConnected(true);
          setConnectionError(null);
          console.log('SignalR reconnected');
        });

        connection.onclose((error) => {
          setIsConnected(false);
          if (error) {
            setConnectionError(error);
            console.error('SignalR connection closed:', error);
          }
        });

        // Hub method: message-created
        connection.on('message-created', (message) => {
          handlersRef.current['message-created'].forEach(handler => handler(message));
        });

        // Hub method: conversation-updated
        connection.on('conversation-updated', (conversation) => {
          handlersRef.current['conversation-updated'].forEach(handler => handler(conversation));
        });

        // Hub method: message-read
        connection.on('message-read', (data) => {
          handlersRef.current['message-read'].forEach(handler => handler(data));
        });

        connectionRef.current = connection;
        await connection.start();
        if (cancelled) {
          await connection.stop().catch(() => {});
          return;
        }
        setIsConnected(true);
        setConnectionError(null);
        console.log('SignalR connected');
      } catch (error) {
        if (cancelled || authFailedRef.current) return;

        const aborted =
          error?.name === 'AbortError' ||
          error?.message?.includes('stopped during negotiation') ||
          error?.message?.includes('stopped before the hub handshake could complete');

        if (aborted) {
          setIsConnected(false);
          setConnectionError(null);
          return;
        }

        console.error('SignalR connection error:', error);
        setIsConnected(false);
        setConnectionError(error.message);
        const unauthorized =
          error?.message?.includes("Status code '401'") ||
          error?.message?.includes('Unauthorized');

        if (unauthorized) {
          authFailedRef.current = true;
          logout?.();
          return;
        }

        // Retry after 5 seconds
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(connectToHub, 5000);
      }
    };

    connectToHub();

    return () => {
      cancelled = true;
      clearReconnectTimeout();
      if (connectionRef.current) {
        const connection = connectionRef.current;
        connectionRef.current = null;
        connection.stop().catch(e => console.error('Error stopping connection:', e));
      }
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

  // Join conversation group
  const joinConversation = useCallback(async (conversationId) => {
    if (!connectionRef.current || !isConnected) {
      console.warn('SignalR not connected, cannot join conversation');
      return false;
    }
    try {
      await connectionRef.current.invoke('JoinConversation', conversationId);
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
      await connectionRef.current.invoke('LeaveConversation', conversationId);
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
