// NEW FILE: src/services/sessionHistory.ts
// Independent session history tracker. Does not replace existing roomServices presence logic.
import {
  ref, push, set, update, get, onValue, onDisconnect, remove,
} from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { db } from './firebase';

export type SessionRecord = {
  sessionId: string;
  ip: string;
  alias: string;
  joinedAt: number;
  lastSeen: number;
  leftAt?: number;
  durationMs?: number;
  status: 'online' | 'left' | 'disconnected';
};

type SessionTracker = {
  sessionId: string;
  stop: () => Promise<void>;
  updateAlias: (alias: string) => Promise<void>;
};

const historyPath = (roomId: string) => `rooms/${roomId}/sessionHistory`;
const presencePath = (roomId: string, cleanIp: string) => `rooms/${roomId}/connectedUsers/${cleanIp}`;

export async function startSessionTracking(
  roomId: string,
  userIp: string,
  alias: string,
): Promise<SessionTracker | null> {
  if (!roomId || !userIp) return null;

  const cleanIp = userIp.replaceAll('.', '_');
  const presenceRef = ref(db, presencePath(roomId, cleanIp));
  const historyRef = ref(db, historyPath(roomId));
  const sessionRef = push(historyRef);
  const sessionId = sessionRef.key;
  if (!sessionId) return null;

  const now = Date.now();
  const presenceSnap = await get(presenceRef);
  const previous = presenceSnap.val() as { sessionId?: string } | null;

  // If this IP reconnects while an earlier session is still marked online,
  // close the stale record without touching any other room data.
  if (previous?.sessionId && previous.sessionId !== sessionId) {
    const previousRef = ref(db, `${historyPath(roomId)}/${previous.sessionId}`);
    const previousSnap = await get(previousRef);
    if (previousSnap.exists()) {
      const old = previousSnap.val() as SessionRecord;
      if (old.status === 'online') {
        const lastSeen = old.lastSeen || old.joinedAt;
        const estimatedEnd = Math.min(now, Math.max(old.joinedAt, lastSeen));
        await update(previousRef, {
          status: 'disconnected',
          leftAt: estimatedEnd,
          durationMs: Math.max(0, estimatedEnd - old.joinedAt),
        });
      }
    }
  }

  const record: SessionRecord = {
    sessionId,
    ip: userIp,
    alias: alias || 'Guest',
    joinedAt: now,
    lastSeen: now,
    status: 'online',
  };

  await set(sessionRef, record);
  await update(presenceRef, {
    ip: userIp,
    alias: alias || 'Guest',
    joinedAt: now,
    sessionId,
    status: 'online',
  });

  // If the browser/network disappears, Firebase marks this history entry
  // disconnected and removes only this session's matching presence record.
  await onDisconnect(sessionRef).update({ status: 'disconnected' });
  await onDisconnect(presenceRef).remove();

  let stopped = false;
  const heartbeat = window.setInterval(() => {
    const stamp = Date.now();
    update(sessionRef, { lastSeen: stamp, status: 'online' }).catch(() => {});
  }, 15_000);

  const updateAlias = async (newAlias: string) => {
    const cleanAlias = newAlias || 'Guest';
    await update(sessionRef, { alias: cleanAlias });
    const snap = await get(presenceRef);
    if (snap.exists() && snap.val()?.sessionId === sessionId) {
      await update(presenceRef, { alias: cleanAlias });
    }
  };

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(heartbeat);
    const leftAt = Date.now();
    try {
      await onDisconnect(sessionRef).cancel();
      await onDisconnect(presenceRef).cancel();
      await update(sessionRef, {
        status: 'left',
        leftAt,
        lastSeen: leftAt,
        durationMs: Math.max(0, leftAt - now),
      });
      const snap = await get(presenceRef);
      if (snap.exists() && snap.val()?.sessionId === sessionId) {
        await remove(presenceRef);
      }
    } catch (error) {
      console.warn('Session stop could not be fully saved:', error);
    }
  };

  return { sessionId, stop, updateAlias };
}

export function listenToSessionHistory(
  roomId: string,
  callback: (records: Record<string, SessionRecord>) => void,
): Unsubscribe {
  if (!roomId) return () => {};
  return onValue(ref(db, historyPath(roomId)), (snapshot) => {
    callback((snapshot.val() ?? {}) as Record<string, SessionRecord>);
  });
}

export function clearSessionHistory(roomId: string): Promise<void> {
  if (!roomId) return Promise.resolve();
  return remove(ref(db, historyPath(roomId)));
}