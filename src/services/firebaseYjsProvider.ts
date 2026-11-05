// src/services/firebaseYjsProvider.ts
// Yjs transport over Firebase Realtime Database.
// Document updates are append-only; awareness is stored per Yjs client ID.

import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import {
  child,
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { db } from './firebase';

const REMOTE_ORIGIN = 'firebase-yjs-remote';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type ProviderOptions = {
  roomId: string;
  doc: Y.Doc;
  awareness: Awareness;
  initialCode: string;
};

type AwarenessRecord = { update?: string };

export class FirebaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  readonly roomId: string;
  readonly synced: Promise<void>;

  private readonly updatesRef: DatabaseReference;
  private readonly awarenessRef: DatabaseReference;
  private readonly ownAwarenessRef: DatabaseReference;
  private readonly clientKey: string;

  private updateListeners: Unsubscribe[] = [];
  private awarenessListeners: Unsubscribe[] = [];
  private roomWaitUnsubscribe: Unsubscribe | null = null;
  private resolveRoomWait: ((code: string) => void) | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private updateFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private awarenessFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdates: Uint8Array[] = [];
  private destroyed = false;
  private resolveSynced!: () => void;

  private readonly onDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private readonly onAwarenessUpdate: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => void;

  constructor(options: ProviderOptions) {
    this.roomId = options.roomId;
    this.doc = options.doc;
    this.awareness = options.awareness;

    const collaborationRef = ref(db, `rooms/${this.roomId}/collaboration`);
    this.updatesRef = child(collaborationRef, 'updates');
    this.awarenessRef = child(collaborationRef, 'awareness');
    this.clientKey = String(this.doc.clientID);
    this.ownAwarenessRef = child(this.awarenessRef, this.clientKey);

    this.synced = new Promise<void>((resolve) => {
      this.resolveSynced = resolve;
    });

    // Existing and future Yjs updates. Yjs updates are idempotent and can
    // arrive in any order, which makes Firebase child events safe here.
    const receiveDocumentUpdate = (snapshot: {
      val: () => unknown;
    }) => {
      if (this.destroyed) return;
      const record = snapshot.val() as { update?: string } | null;
      if (!record?.update) return;
      try {
        Y.applyUpdate(this.doc, base64ToBytes(record.update), REMOTE_ORIGIN);
      } catch (error) {
        console.error('[collaboration] Could not apply remote update:', error);
      }
    };

    this.updateListeners.push(
      onChildAdded(this.updatesRef, receiveDocumentUpdate),
      onValue(this.updatesRef, () => this.resolveSyncedOnce())
    );

    const receiveAwareness = (snapshot: {
      key: string | null;
      val: () => unknown;
    }) => {
      if (this.destroyed) return;
      const clientId = Number(snapshot.key);
      const record = snapshot.val() as AwarenessRecord | null;
      if (!Number.isSafeInteger(clientId) || clientId < 0 || !record?.update) {
        return;
      }
      try {
        applyAwarenessUpdate(
          this.awareness,
          base64ToBytes(record.update),
          REMOTE_ORIGIN
        );
      } catch (error) {
        console.error('[collaboration] Could not apply remote cursor:', error);
      }
    };

    const removeAwareness = (snapshot: { key: string | null }) => {
      const clientId = Number(snapshot.key);
      if (
        !this.destroyed &&
        Number.isSafeInteger(clientId) &&
        clientId >= 0 &&
        clientId !== this.doc.clientID
      ) {
        removeAwarenessStates(this.awareness, [clientId], REMOTE_ORIGIN);
      }
    };

    this.awarenessListeners.push(
      onChildAdded(this.awarenessRef, receiveAwareness),
      onChildChanged(this.awarenessRef, receiveAwareness),
      onChildRemoved(this.awarenessRef, removeAwareness)
    );

    this.onDocUpdate = (update, origin) => {
      if (this.destroyed || origin === REMOTE_ORIGIN) return;
      this.pendingUpdates.push(update);
      if (this.updateFlushTimer) return;
      this.updateFlushTimer = setTimeout(() => {
        this.updateFlushTimer = null;
        void this.flushDocumentUpdates();
      }, 20);
    };

    this.onAwarenessUpdate = (changes, origin) => {
      if (this.destroyed || origin === REMOTE_ORIGIN) return;
      const changed = [
        ...changes.added,
        ...changes.updated,
        ...changes.removed,
      ];
      if (!changed.includes(this.doc.clientID)) return;
      if (this.awarenessFlushTimer) clearTimeout(this.awarenessFlushTimer);
      this.awarenessFlushTimer = setTimeout(() => {
        this.awarenessFlushTimer = null;
        void this.flushAwareness();
      }, 35);
    };

    this.doc.on('update', this.onDocUpdate);
    this.awareness.on('update', this.onAwarenessUpdate);

    // Publish initial user state after listeners are attached.
    const localState = this.awareness.getLocalState();
    if (localState) {
      this.awareness.setLocalState({ ...localState, lastActiveAt: Date.now() });
    }

    // Firebase removes this key automatically when this connection disconnects.
    void onDisconnect(this.ownAwarenessRef).remove().catch((error) => {
      console.error('[collaboration] Could not register disconnect cleanup:', error);
    });

    this.heartbeat = setInterval(() => {
      const state = this.awareness.getLocalState();
      if (state) {
        this.awareness.setLocalState({ ...state, lastActiveAt: Date.now() });
      }
    }, 12_000);

    void this.initializeDocument(options.initialCode);
  }

  private resolveSyncedOnce(): void {
    if (this.resolveSynced) {
      const resolve = this.resolveSynced;
      this.resolveSynced = () => {};
      resolve();
    }
  }

  private async flushDocumentUpdates(): Promise<void> {
    if (this.destroyed || this.pendingUpdates.length === 0) return;
    const updates = this.pendingUpdates;
    this.pendingUpdates = [];

    try {
      const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates);
      const updateRef = push(this.updatesRef);
      await set(updateRef, {
        update: bytesToBase64(merged),
        createdAt: Date.now(),
      });
    } catch (error) {
      // Put failed updates back so a later edit can retry them.
      this.pendingUpdates.unshift(...updates);
      console.error('[collaboration] Failed to save document update:', error);
    }
  }

  private async flushAwareness(): Promise<void> {
    if (this.destroyed) return;
    const localState = this.awareness.getLocalState();
    if (!localState) return;

    try {
      const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
      await set(this.ownAwarenessRef, { update: bytesToBase64(update) });
    } catch (error) {
      console.error('[collaboration] Failed to publish cursor state:', error);
    }
  }

  private async waitForRoomCode(initialCode: string): Promise<string> {
    const roomRef = ref(db, `rooms/${this.roomId}`);
    const existing = await get(roomRef);
    if (existing.exists()) {
      const code = existing.child('code').val();
      return typeof code === 'string' ? code : initialCode;
    }

    // App.joinRoom() creates a new room asynchronously. Wait until it exists
    // instead of creating collaboration data before joinRoom writes the room.
    return new Promise<string>((resolve) => {
      this.resolveRoomWait = resolve;
      this.roomWaitUnsubscribe = onValue(
        roomRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const code = snapshot.child('code').val();
          const result = typeof code === 'string' ? code : initialCode;
          this.roomWaitUnsubscribe?.();
          this.roomWaitUnsubscribe = null;
          this.resolveRoomWait = null;
          resolve(result);
        },
        (error) => {
          console.error('[collaboration] Could not read room:', error);
          this.roomWaitUnsubscribe?.();
          this.roomWaitUnsubscribe = null;
          this.resolveRoomWait = null;
          resolve(initialCode);
        }
      );
    });
  }

  private async initializeDocument(initialCode: string): Promise<void> {
    try {
      await this.synced;
      if (this.destroyed) return;

      const legacyCode = await this.waitForRoomCode(initialCode);
      if (this.destroyed) return;

      // Only one client migrates the room's existing code into Yjs.
      const ownerRef = ref(
        db,
        `rooms/${this.roomId}/collaboration/seedOwner`
      );
      const transaction = await runTransaction(ownerRef, (current) => {
        return current ?? this.clientKey;
      });
      if (this.destroyed) return;

      if (
        transaction.committed &&
        transaction.snapshot.val() === this.clientKey
      ) {
        const sharedText = this.doc.getText('code');
        if (sharedText.length === 0 && legacyCode.length > 0) {
          sharedText.insert(0, legacyCode);
        }
      }
    } catch (error) {
      console.error('[collaboration] Document initialization failed:', error);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.updateFlushTimer) clearTimeout(this.updateFlushTimer);
    if (this.awarenessFlushTimer) clearTimeout(this.awarenessFlushTimer);

    this.doc.off('update', this.onDocUpdate);
    this.awareness.off('update', this.onAwarenessUpdate);
    this.updateListeners.forEach((unsubscribe) => unsubscribe());
    this.awarenessListeners.forEach((unsubscribe) => unsubscribe());
    this.roomWaitUnsubscribe?.();
    this.roomWaitUnsubscribe = null;
    this.resolveRoomWait?.('');
    this.resolveRoomWait = null;

    // Best-effort final flush before the presence node is removed.
    if (this.pendingUpdates.length > 0) {
      const updates = this.pendingUpdates;
      this.pendingUpdates = [];
      const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates);
      void set(push(this.updatesRef), {
        update: bytesToBase64(merged),
        createdAt: Date.now(),
      }).catch((error) => {
        console.error('[collaboration] Final update flush failed:', error);
      });
    }

    this.awareness.setLocalState(null);
    void remove(this.ownAwarenessRef).catch((error) => {
      console.error('[collaboration] Presence cleanup failed:', error);
    });
  }
}
