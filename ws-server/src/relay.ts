import { Server, Socket } from 'socket.io';
import { addMessage, getPendingMessages, removeMessage, countPending } from './store';
import * as memstore from './memstore';
import { isBlocked } from './blockCache';
import { hasConversation } from './membership';
import { notifyOffline } from './push';

// Map of userId → socketId for currently connected users
const connectedUsers = new Map<string, string>();

// Map of watchedUserId → Set of watcher socketIds
const presenceWatchers = new Map<string, Set<string>>();

// In-memory sliding-window rate limiter — keep in sync with next-app/src/lib/limits.ts
const MSG_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const MSG_LIMIT     = 60;               // messages per user per window
const msgTimestamps = new Map<string, number[]>();

// Cap on a single recipient's offline queue, so a sender can't flood an
// offline victim's DB rows without bound (finding H6).
const MAX_PENDING_PER_RECIPIENT = 50;

// Backstop on ciphertext payload size. The client enforces the precise limit
// (MAX_MESSAGE_CHARS = 10_000 plaintext chars, see next-app/src/lib/limits.ts);
// the relay only ever sees base64(iv || ciphertext) and can't count chars, so
// it guards a byte ceiling instead. 10_000 chars is at most ~30 KB of UTF-8,
// which encrypts+base64-encodes to ~40 KB; 64_000 leaves headroom while staying
// under the MySQL TEXT column (65_535 bytes) and Socket.io's 1 MB buffer.
const MAX_PAYLOAD_LEN = 64_000;



function checkMessageRateLimit(userId: string): boolean {
  const now   = Date.now();
  const times = (msgTimestamps.get(userId) ?? []).filter(t => now - t < MSG_WINDOW_MS);
  if (times.length >= MSG_LIMIT) {
    msgTimestamps.set(userId, times);
    return false;
  }
  times.push(now);
  msgTimestamps.set(userId, times);
  return true;
}

export function setupRelay(io: Server): void {

  io.on('connection', async (socket: Socket) => {
    const userId = (socket.data as any).userId as string;

    connectedUsers.set(userId, socket.id);

    // Notify presence watchers
    const watchersOnConnect = presenceWatchers.get(userId);
    if (watchersOnConnect) {
      for (const watcherSocketId of watchersOnConnect) {
        io.to(watcherSocketId).emit('presence_update', { userId, online: true });
      }
    }

    // Deliver pending messages from DB
    try {
      const pending = await getPendingMessages(userId);
      for (const msg of pending) {
        socket.emit('message', {
          messageId:  msg.messageId,
          fromUserId: msg.fromUserId,
          payload:    msg.payload,
          sentAt:     msg.sentAt,
        });
      }
    } catch (err) {
      console.error('Failed to fetch pending messages:', err);
    }

    // Incoming message from this user
    socket.on('message', async (data: {
      messageId: string;
      toUserId:  string;
      payload:   string;  // ciphertext — never decoded
      sentAt:    number;
    }) => {
      const { messageId, toUserId, payload, sentAt } = data;

      if (!messageId || !toUserId || !payload || !sentAt) {
        socket.emit('error', { messageId, error: 'Invalid message envelope' });
        return;
      }

      // Backstop: a well-behaved client caps plaintext at MAX_MESSAGE_CHARS, so
      // this only trips for a misbehaving/malicious client sending oversized
      // ciphertext. Reject before queueing so it can't bloat memory or the DB.
      if (payload.length > MAX_PAYLOAD_LEN) {
        socket.emit('error', { messageId, error: 'message_too_long' });
        return;
      }

      if (!checkMessageRateLimit(userId)) {
        socket.emit('error', { messageId, error: 'rate_limited' });
        return;
      }

      // Require an existing conversation between sender and recipient. The UI
      // always creates the conversation row before a chat can be opened, so this
      // only trips for a crafted client messaging an arbitrary user-id. Silent
      // ack (same model as the block below) so a sender can't probe who exists or
      // who they have a relationship with. Fail-closed on DB error.
      try {
        if (!(await hasConversation(userId, toUserId))) {
          socket.emit('message_ack', { messageId });
          return;
        }
      } catch (err) {
        console.error('Failed to check conversation membership:', err);
        socket.emit('message_ack', { messageId });
        return;
      }

      // Silent drop if recipient has blocked sender — still ack so sender can't detect the block
      try {
        if (await isBlocked(userId, toUserId)) {
          socket.emit('message_ack', { messageId });
          return;
        }
      } catch (err) {
        console.error('Failed to check block status:', err);
        // Fail-closed: on DB error, silently drop and ack — same as a real block.
        // Consistent with the block feature's privacy intent; a transient DB fault
        // should not bypass a user's block decision.
        socket.emit('message_ack', { messageId });
        return;
      }

      const msg = { messageId, fromUserId: userId, toUserId, payload, sentAt };
      const recipientSocketId = connectedUsers.get(toUserId);

      if (recipientSocketId) {
        // Recipient is online: forward over the socket and hold in memory only —
        // delivered messages never touch the DB. The in-memory hold lets a quick
        // reload re-deliver; it's dropped on delivery_ack (or flushed to the
        // offline queue if the recipient disconnects before acking).
        memstore.add(toUserId, msg);
        io.to(recipientSocketId).emit('message', {
          messageId,
          fromUserId: userId,
          payload,
          sentAt,
        });
      } else {
        // Recipient is offline: queue as ciphertext in the short-TTL offline
        // queue, subject to the per-recipient cap.
        try {
          if (await countPending(toUserId) >= MAX_PENDING_PER_RECIPIENT) {
            socket.emit('error', { messageId, error: 'queue_full' });
            return;
          }
          await addMessage(msg);
          // Wake the recipient's device(s) with a content-free push. Fire-and-
          // forget — a push failure must never block the message ack.
          notifyOffline(toUserId).catch(() => {});
        } catch (err) {
          console.error('Failed to queue offline message:', err);
          socket.emit('error', { messageId, error: 'Could not queue message' });
          return;
        }
      }

      socket.emit('message_ack', { messageId });
    });

    // Delivery ACK — recipient confirmed receipt. Drop the in-memory hold
    // (online case) and the offline-queue row (drained case); each is a no-op
    // when the message lived only in the other place.
    socket.on('delivery_ack', async (data: { messageId: string }) => {
      memstore.remove(userId, data.messageId);
      try {
        await removeMessage(userId, data.messageId);
      } catch (err) {
        console.error('Failed to remove delivered message:', err);
      }
    });

    // Presence subscription — only for a user the watcher shares a conversation
    // with, so presence (online/offline) can't be probed for arbitrary user-ids.
    socket.on('watch_presence', async (data: { userId: string }) => {
      const watchedId = data.userId;

      // Silently no-op if there's no relationship: don't register a watcher and
      // don't emit presence. Silence (not an error) avoids confirming or denying
      // the target's existence/status. Fail-closed on a DB error for the same reason.
      try {
        if (!(await hasConversation(userId, watchedId))) return;
      } catch (err) {
        console.error('Failed to check conversation membership for presence:', err);
        return;
      }

      if (!presenceWatchers.has(watchedId)) {
        presenceWatchers.set(watchedId, new Set());
      }
      presenceWatchers.get(watchedId)!.add(socket.id);
      socket.emit('presence_update', { userId: watchedId, online: connectedUsers.has(watchedId) });
    });

    socket.on('unwatch_presence', (data: { userId: string }) => {
      presenceWatchers.get(data.userId)?.delete(socket.id);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      connectedUsers.delete(userId);
      msgTimestamps.delete(userId); // evict rate-limit window so the Map doesn't grow unbounded

      // Flush any messages held in memory for this user but not yet acked, so a
      // reload/reconnect re-delivers them instead of losing them.
      const unacked = memstore.takeAll(userId);
      for (const msg of unacked) {
        try {
          await addMessage(msg);
        } catch (err) {
          console.error('Failed to flush un-acked message on disconnect:', err);
        }
      }

      const watchersOnDisconnect = presenceWatchers.get(userId);
      if (watchersOnDisconnect) {
        for (const watcherSocketId of watchersOnDisconnect) {
          io.to(watcherSocketId).emit('presence_update', { userId, online: false });
        }
      }

      for (const watcherSet of presenceWatchers.values()) {
        watcherSet.delete(socket.id);
      }
    });
  });
}
