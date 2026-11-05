// src/services/roomServices.ts
import { ref, set, get, onValue, update, remove } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { db } from './firebase';

export interface RoomData {
  code: string;
  lines?: Record<string, string>;
  input: string;
  output: string;
  password?: string;
  isProtected?: boolean;
  connectedUsers?: Record<string, { ip: string; alias: string; joinedAt: number }>;
}

export interface UserAccount {
  username: string;
  email: string;
  pass: string;
}

// Register User
export async function registerUser(username: string, email: string, pass: string): Promise<boolean> {
  const userRef = ref(db, `users/${username}`);
  const snap = await get(userRef);
  if (snap.exists()) {
    throw new Error('Username already exists!');
  }
  await set(userRef, { username, email, pass });

  const roomRef = ref(db, `rooms/${username}`);
  await set(roomRef, {
    code: '// Welcome to mentor room',
    input: '',
    output: '',
    isProtected: false,
    password: ''
  });
  return true;
}

// Login User
export async function loginUser(username: string, pass: string): Promise<boolean> {
  const userRef = ref(db, `users/${username}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    throw new Error('User not found!');
  }
  const userData = snap.val() as UserAccount;
  if (userData.pass !== pass) {
    throw new Error('Incorrect Password!');
  }
  return true;
}

// Check Room Existence and Password Details
export async function checkRoomExists(roomId: string): Promise<{ exists: boolean; isProtected?: boolean; password?: string }> {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) {
    return { exists: false };
  }
  const data = snap.val();
  return { 
    exists: true, 
    isProtected: !!data.isProtected && String(data.password).trim().length > 0,
    password: data.password ?? ''
  };
}

// Join Room - Unique IP Key Node
export async function joinRoom(
  roomId: string,
  userIp: string,
  alias: string = 'Guest',
  defaultCode: string = ''
): Promise<void> {
  if (!roomId || !userIp) return;
  const roomRef = ref(db, `rooms/${roomId}`);

  try {
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      await set(roomRef, {
        code: defaultCode,
        input: '',
        output: '',
        isProtected: false,
        password: ''
      });
    }

    const cleanKey = userIp.replaceAll('.', '_');
    const userPresenceRef = ref(db, `rooms/${roomId}/connectedUsers/${cleanKey}`);
    const userSnap = await get(userPresenceRef);

    if (!userSnap.exists()) {
      await set(userPresenceRef, {
        ip: userIp,
        alias: alias,
        joinedAt: Date.now()
      });
    } else {
      await update(userPresenceRef, { alias: alias });
    }
  } catch (error) {
    console.error(`Failed to join room ${roomId}:`, error);
  }
}

// Single Line Sync Function
export async function uploadLineChange(roomId: string, lineIndex: number, lineContent: string): Promise<void> {
  if (!roomId) return;
  const lineRef = ref(db, `rooms/${roomId}/lines/line_${lineIndex}`);
  await set(lineRef, lineContent);
}

// Full Code Upload Sync
export async function uploadTextOnChange(roomId: string, code: string): Promise<void> {
  if (!roomId) return;
  const codeRef = ref(db, `rooms/${roomId}/code`);
  await set(codeRef, code);
}

// Input Output Realtime Sync
export async function uploadIOOnChange(roomId: string, input: string, output: string): Promise<void> {
  if (!roomId) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, { input, output });
}

// Set Room Password
export async function setRoomPassword(roomId: string, pass: string): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, {
    password: pass,
    isProtected: pass.trim().length > 0
  });
}

// Clear Connected Users Logs
export async function clearRoomLogs(roomId: string): Promise<void> {
  if (!roomId) return;
  const connectedUsersRef = ref(db, `rooms/${roomId}/connectedUsers`);
  await remove(connectedUsersRef);
}

// Update User Alias in Room
export async function updateUserAlias(roomId: string, userIp: string, newAlias: string): Promise<void> {
  if (!roomId || !userIp) return;
  const cleanKey = userIp.replaceAll('.', '_');
  const aliasRef = ref(db, `rooms/${roomId}/connectedUsers/${cleanKey}/alias`);
  await set(aliasRef, newAlias);
}

// Listen to Full Room Real-time Changes
export function listenToRoomChanges(
  roomId: string,
  onRoomDataReceived: (data: RoomData) => void
): Unsubscribe {
  const roomRef = ref(db, `rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      onRoomDataReceived({
        code: data.code ?? '',
        lines: data.lines,
        input: data.input ?? '',
        output: data.output ?? '',
        password: data.password ?? '',
        isProtected: !!data.isProtected,
        connectedUsers: data.connectedUsers ?? {}
      });
    }
  });
}