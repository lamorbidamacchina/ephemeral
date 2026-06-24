import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from './auth';
import { setupRelay } from './relay';
import { startCleanupJob } from './cleanup';

const PORT = process.env.WS_PORT || 3001;

const httpServer = createServer();

const allowedOrigins = (process.env.NEXT_APP_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim());

const io = new Server(httpServer, {
  cors: {
    origin:      allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

// JWT authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('UNAUTHORIZED'));
    const payload = verifyToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
});

setupRelay(io);
startCleanupJob();

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
