// src/components/topbar.tsx
import { useState } from 'react';
import '../components/topbar.css';
import { checkRoomExists } from '../services/roomServices';

type Props = {
  currentRoomAddress: string;
  onJoinRoomRequest: (targetRoomId: string) => void;
};

export const TopBar = ({ currentRoomAddress, onJoinRoomRequest }: Props) => {
  const [inputAddress, setInputAddress] = useState('');

  const handleJoinClick = async () => {
    const target = inputAddress.trim();
    if (!target) return;

    // Check if room exists in Firebase DB
    const res = await checkRoomExists(target);
    if (!res.exists) {
      alert('Room does not exist!');
      return;
    }

    onJoinRoomRequest(target);
    setInputAddress('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentRoomAddress);
    alert(`Copied Room Address: ${currentRoomAddress}`);
  };

  return (
    <div className="topbar-container" style={{ padding: '12px 20px', background: '#181825', borderBottom: '1px solid #313244', display: 'flex', gap: '20px', alignItems: 'center' }}>
      <div style={{ flex: 1, background: '#1e1e2e', border: '1px solid #45475a', borderRadius: '8px', padding: '10px 16px', color: '#cdd6f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Copy Your ROOM Address : <strong style={{ color: '#89b4fa' }}>{currentRoomAddress}</strong></span>
        <button onClick={handleCopy} style={{ background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Copy</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
        <input
          type="text"
          placeholder="Enter address.."
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          style={{ flex: 1, background: '#1e1e2e', border: '1px solid #45475a', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
        />
        <button
          onClick={handleJoinClick}
          style={{ padding: '0 24px', background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Join
        </button>
      </div>
    </div>
  );
};