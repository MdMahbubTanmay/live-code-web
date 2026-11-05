// src/App.tsx
import { useState, useEffect } from 'react';
import './App.css';
import { MainUI } from './components/main_ui';
import { TopBar } from './components/topbar';
import { AuthModal } from './components/AuthModal';
import { executeCode } from './api/codeRunner';
import {
  joinRoom,
  listenToRoomChanges,
  uploadIOOnChange,
  updateUserAlias,
  checkRoomExists,
  setRoomPassword,
  clearRoomLogs
} from './services/roomServices';
import { Intro } from './components/introduction';

function App() {
  const [code, setCode] = useState<string>(
`#include <iostream> 

int main() { 
    std::cout << "Hello, World!" << std::endl; 
    return 0; 
}`
  );

  const [langg, setLang] = useState<string>('cpp');
  const [userIp, setUserIp] = useState<string>('127001');
  const [username, setUsername] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [myAlias, setMyAlias] = useState<string>('Guest');

  const [inputVal, setInputVal] = useState<string>('');
  const [outputVal, setOutputVal] = useState<string>('');
  const [roomPassword, setRoomPasswordState] = useState<string>('');
  const [connectedUsers, setConnectedUsers] = useState<Record<string, { ip: string; alias: string }>>({});
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // 1. Initial IP Detection & Default Public Room Setup
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        const cleanIp = data.ip.replaceAll('.', '');
        setUserIp(cleanIp);
        if (!username) {
          setRoomId(cleanIp);
        }
      })
      .catch(() => {
        const fallback = '10312921041';
        setUserIp(fallback);
        if (!username) setRoomId(fallback);
      });
  }, [username]);

  // 2. Real-time Firebase Synchronization Listener
  useEffect(() => {
    if (!roomId) return;

    const currentAlias = username ? username : myAlias;

    joinRoom(roomId, userIp, currentAlias, code).catch((err) =>
      console.error('Join error:', err)
    );

    const unsubscribe = listenToRoomChanges(roomId, (roomData) => {
      if (roomData.code !== undefined && roomData.code !== code) setCode(roomData.code);
      if (roomData.input !== undefined) setInputVal(roomData.input);
      if (roomData.output !== undefined) setOutputVal(roomData.output);
      if (roomData.password !== undefined) setRoomPasswordState(roomData.password);
      if (roomData.connectedUsers) {
        setConnectedUsers(roomData.connectedUsers);
      } else {
        setConnectedUsers({});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, userIp, username, myAlias]);

  // FIX: Explicit Password Validation for Protected Rooms
  const handleJoinRoomRequest = async (targetRoomId: string) => {
    const roomInfo = await checkRoomExists(targetRoomId);

    if (!roomInfo.exists) {
      alert('Room does not exist!');
      return;
    }

    // Password validation for protected mentor rooms
    if (roomInfo.isProtected && username !== targetRoomId) {
      const enteredPass = window.prompt(`Room "${targetRoomId}" is password protected. Enter Password:`);
      
      if (enteredPass === null) return; // User cancelled prompt

      if (enteredPass.trim() !== roomInfo.password?.trim()) {
        alert('Incorrect Room Password! Access Denied.');
        return; // BLOCK JOIN ON WRONG PASSWORD
      }
    }

    setRoomId(targetRoomId);
  };

  const handleInputChange = (newVal: string) => {
    setInputVal(newVal);
    uploadIOOnChange(roomId, newVal, outputVal);
  };

  const compileClick = async () => {
    try {
      const result: string = await executeCode(code, inputVal, langg);
      setOutputVal(result);
      uploadIOOnChange(roomId, inputVal, result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setOutputVal(errorMsg);
      uploadIOOnChange(roomId, inputVal, errorMsg);
    }
  };

  const handleLoginSuccess = (loggedUser: string) => {
    setUsername(loggedUser);
    setMyAlias(loggedUser);
    setRoomId(loggedUser);
  };

  const isMentor = Boolean(username && username === roomId);

  return (
    <>
      <TopBar
        currentRoomAddress={isMentor ? username : roomId}
        onJoinRoomRequest={handleJoinRoomRequest}
      />

      <div style={{
        padding: '8px 20px', background: '#11111b', color: '#cdd6f4',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #313244', fontSize: '0.9rem'
      }}>
        <div>
          <strong>Active Room:</strong> <span style={{ color: '#89b4fa' }}>{roomId}</span>
          <span style={{ marginLeft: '15px' }}>
            <strong>Status:</strong> {username ? `Mentor (${username})` : `Guest (${myAlias})`}
          </span>
        </div>

        <button
          onClick={() => setIsAuthOpen(true)}
          style={{
            padding: '6px 14px', background: '#89b4fa', color: '#11111b',
            border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          {username ? `Account: ${username}` : 'Account Login / Register'}
        </button>
      </div>

      <MainUI
        onClick={compileClick}
        onClickCpp={() => setLang('cpp')}
        onClickJava={() => setLang('java')}
        onClickPython={() => setLang('python')}
        code={code}
        lang={langg}
        setCode={setCode}
        roomId={roomId}
        inputVal={inputVal}
        setInputVal={handleInputChange}
        outputVal={outputVal}
        setOutputVal={setOutputVal}
        isMentor={isMentor}
        roomPassword={roomPassword}
        onSetPassword={(pass) => setRoomPassword(roomId, pass)}
        onClearLogs={() => clearRoomLogs(roomId)}
        connectedUsers={connectedUsers}
        onUpdateAlias={(ip, newAlias) => updateUserAlias(roomId, ip, newAlias)}
        myAlias={myAlias}
        setMyAlias={setMyAlias}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <Intro />
    </>
  );
}

export default App;