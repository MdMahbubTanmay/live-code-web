import { ref, set, get, onValue } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import { db } from './firebase';




export async function joinRoom(roomId: string, defaultCode: string = ''): Promise<void> {
  if (!roomId) return;

  const codeRef = ref(db, `rooms/${roomId}/code`);

  try {
    
    const snapshot = await get(codeRef);

    
    if (!snapshot.exists()) {
      await set(codeRef, defaultCode);
    }
  } catch (error) {
    console.error(`Failed to initialize room ${roomId}:`, error);
    throw error;
  }
}

export async function uploadTextOnChange(roomId: string, code: string): Promise<void> {
  if (!roomId) return;
  
  const codeRef = ref(db, `rooms/${roomId}/code`);
  try {
    await set(codeRef, code);
    
  } catch (error) {
    console.error('Failed to sync code update to Firebase:', error);
    alert(error)
  }
}


export function listenToTextChanges(
  roomId: string, 
  onCodeReceived: (newCode: string) => void
): Unsubscribe {
  const codeRef = ref(db, `rooms/${roomId}/code`);

  const unsubscribe = onValue(codeRef, (snapshot) => {
    const data = snapshot.val();
    if (data !== null && data !== undefined) {
      onCodeReceived(String(data));
    }
  });

  return unsubscribe;
}
