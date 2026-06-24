'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function WsTest() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toISOString()} — ${msg}`]);
  };

  useEffect(() => {
    async function connect() {
      const res = await fetch('/api/auth/token', { credentials: 'include' });
      if (!res.ok) { addLog('Not logged in'); return; }
      const { token } = await res.json();

      const socket = io('http://localhost:3001', { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        addLog(`Connected as socket ${socket.id}`);
      });

      socket.on('connect_error', (err) => {
        addLog(`Connection error: ${err.message}`);
      });

      socket.on('message', (data) => {
        addLog(`Message received from ${data.fromUserId}: ${data.payload}`);
        setMessages(prev => [...prev, data.payload]);
        // Send delivery ACK
        socket.emit('delivery_ack', { messageId: data.messageId });
        addLog(`Delivery ACK sent for ${data.messageId}`);
      });

      socket.on('message_ack', (data) => {
        addLog(`Message ACK: ${data.messageId}`);
      });

      socket.on('message_expired', (data) => {
        addLog(`Message expired: ${data.messageId}`);
      });
    }

    connect();

    return () => { socketRef.current?.disconnect(); };
  }, []);

  function sendMessage() {
    if (!socketRef.current || !toUserId) return;
    const messageId = crypto.randomUUID();
    socketRef.current.emit('message', {
      messageId,
      toUserId,
      payload: 'dGVzdGNpcGhlcnRleHQ=',
      sentAt: Date.now(),
    });
    addLog(`Sent message ${messageId} to ${toUserId}`);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>WebSocket Test</h2>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>

      <div style={{ marginBottom: 10 }}>
        <input
          value={toUserId}
          onChange={e => setToUserId(e.target.value)}
          placeholder="Recipient user ID"
          style={{ width: 350, marginRight: 8 }}
        />
        <button onClick={sendMessage}>Send test message</button>
      </div>

      <h3>Log</h3>
      <div style={{
        background: '#111',
        color: '#0f0',
        padding: 10,
        height: 400,
        overflowY: 'auto',
        fontSize: 12,
      }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}