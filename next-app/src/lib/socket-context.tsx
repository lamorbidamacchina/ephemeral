'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { showMessageNotification } from '@/lib/push';

export interface IncomingMessage {
  messageId: string;
  fromUserId: string;
  payload: string;
  sentAt: number;
}

interface SocketContextValue {
  /** The live Socket.io instance — null until authenticated and connected */
  socket: Socket | null;
  /** True when the socket is connected to the relay */
  connected: boolean;
  /** Messages that arrived while no chat page was listening for them */
  notifications: IncomingMessage[];
  dismissNotification: (messageId: string) => void;
  /**
   * Register a per-sender handler for the chat page.
   * Also drains any notifications from that sender that queued up before the handler was registered.
   */
  registerHandler: (fromUserId: string, fn: (msg: IncomingMessage) => void) => void;
  unregisterHandler: (fromUserId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  notifications: [],
  dismissNotification: () => {},
  registerHandler: () => {},
  unregisterHandler: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<IncomingMessage[]>([]);

  // Per-sender handlers registered by whichever chat page is currently open
  const handlersRef = useRef<Map<string, (msg: IncomingMessage) => void>>(new Map());

  useEffect(() => {
    let sock: Socket | null = null;

    async function connect() {
      try {
        const tokenRes = await fetch('/api/auth/token', { credentials: 'include' });
        if (!tokenRes.ok) return; // Not logged in yet — no socket

        // The handshake token is short-lived, so fetch a fresh one for every
        // (re)connection attempt rather than reusing the first. Socket.io calls
        // this callback before each attempt, including automatic reconnects.
        const auth = (cb: (data: { token?: string }) => void) => {
          fetch('/api/auth/token', { credentials: 'include' })
            .then(r => (r.ok ? r.json() : { token: undefined }))
            .then(d => cb({ token: d.token }))
            .catch(() => cb({ token: undefined }));
        };

        sock = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
          auth,
        });

        sock.on('connect', () => setConnected(true));
        sock.on('disconnect', () => setConnected(false));

        sock.on('message', (msg: IncomingMessage) => {
          // Surface a content-free OS notification when the tab is backgrounded
          // (connected but hidden) — the server push only covers the offline case.
          showMessageNotification();

          const handler = handlersRef.current.get(msg.fromUserId);
          if (handler) {
            handler(msg);
          } else {
            setNotifications(prev =>
              prev.some(n => n.messageId === msg.messageId) ? prev : [...prev, msg]
            );
          }
        });

        setSocket(sock);
      } catch {
        // Not authenticated or relay unreachable — silently skip
      }
    }

    connect();

    return () => {
      sock?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const dismissNotification = useCallback((messageId: string) => {
    setNotifications(prev => prev.filter(n => n.messageId !== messageId));
  }, []);

  const registerHandler = useCallback(
    (fromUserId: string, fn: (msg: IncomingMessage) => void) => {
      handlersRef.current.set(fromUserId, fn);

      // Drain any notifications that queued up before this handler was registered
      setNotifications(prev => {
        const pending = prev.filter(n => n.fromUserId === fromUserId);
        if (pending.length > 0) {
          pending.forEach(msg => setTimeout(() => fn(msg), 0));
          return prev.filter(n => n.fromUserId !== fromUserId);
        }
        return prev;
      });
    },
    []
  );

  const unregisterHandler = useCallback((fromUserId: string) => {
    handlersRef.current.delete(fromUserId);
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, connected, notifications, dismissNotification, registerHandler, unregisterHandler }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
