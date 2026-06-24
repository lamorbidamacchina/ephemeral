import { PendingMessage } from './store';

// In-memory hold for messages forwarded to an ONLINE recipient that have not
// yet been delivery-acked. Delivered messages never touch the DB — this map is
// the whole storage for the common (online) case. Holds are sub-second: the
// client acks immediately on decrypt. On disconnect, anything still un-acked is
// flushed to the offline queue (see relay.ts) so a reload re-delivers it.
const byUser = new Map<string, Map<string, PendingMessage>>();

export function add(toUserId: string, msg: PendingMessage): void {
  let inbox = byUser.get(toUserId);
  if (!inbox) {
    inbox = new Map();
    byUser.set(toUserId, inbox);
  }
  inbox.set(msg.messageId, msg);
}

export function remove(toUserId: string, messageId: string): void {
  const inbox = byUser.get(toUserId);
  if (!inbox) return;
  inbox.delete(messageId);
  if (inbox.size === 0) byUser.delete(toUserId); // keep the map from leaking keys
}

/** Return and clear all held messages for a user (used on disconnect to flush). */
export function takeAll(toUserId: string): PendingMessage[] {
  const inbox = byUser.get(toUserId);
  if (!inbox) return [];
  byUser.delete(toUserId);
  return Array.from(inbox.values());
}
