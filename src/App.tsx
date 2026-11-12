// src/App.tsx
import { useState, useEffect, useRef } from 'react';
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

const DEFAULT_CODE = `#include <iostream> 

int main() { 
    std::cout << "Hello, World!" << std::endl; 
    return 0; 
}`;

function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);

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

  // alias ref: alias type korle effect restart hobe na
  const aliasRef = useRef(myAlias);
  useEffect(() => { aliasRef.current = myAlias; }, [myAlias]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        const cleanIp = data.ip.replaceAll('.', '');
        setUserIp(cleanIp);
        if (!username) setRoomId(cleanIp);
      })
      .catch(() => {
        const fallback = '10312921041';
        setUserIp(fallback);
        if (!username) setRoomId(fallback);
      });
  }, [username]);

  // Room join + listen (myAlias dependency nei)
  useEffect(() => {
    if (!roomId) return;

    const currentAlias = username ? username : aliasRef.current;

    joinRoom(roomId, userIp, currentAlias, DEFAULT_CODE).catch((err) =>
      console.error('Join error:', err)
    );

    const unsubscribe = listenToRoomChanges(roomId, (roomData) => {
      // code ekhane set hobe na, Yjs (codeEditor) eta handle kore
      if (roomData.input !== undefined) setInputVal(roomData.input);
      if (roomData.output !== undefined) setOutputVal(roomData.output);
      if (roomData.password !== undefined) setRoomPasswordState(roomData.password);
      if (roomData.connectedUsers) setConnectedUsers(roomData.connectedUsers);
    });

    return () => unsubscribe();
  }, [roomId, userIp, username]);

  // Alias change hole shudhu alias update hobe
  useEffect(() => {
    if (!roomId || !userIp) return;
    const t = setTimeout(() => {
      updateUserAlias(roomId, userIp, username || myAlias).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [myAlias, roomId, userIp, username]);

  const handleJoinRoomRequest = async (targetRoomId: string) => {
    try {
      const roomInfo = await checkRoomExists(targetRoomId);

      if (!roomInfo.exists) {
        alert('Room does not exist!');
        return;
      }

      if (roomInfo.isProtected && username !== targetRoomId) {
        const enteredPass = window.prompt(
          `Room "${targetRoomId}" is password protected. Enter Password:`
        );
        if (enteredPass === null) return;
        if (enteredPass !== roomInfo.password) {
          alert('Incorrect room password!');
          return;
        }
      }

      setRoomId(targetRoomId);
    } catch (error) {
      console.error('Room join error:', error);
      alert('Unable to join room. Please try again.');
    }
  };

  const handleInputChange = (newVal: string) => {
    setInputVal(newVal);
    uploadIOOnChange(roomId, newVal, outputVal);
  };

  const compileClick = async () => {
    try {
      const result: string = await executeCode(codeRef.current, inputVal, langg);
      setOutputVal(result);
      uploadIOOnChange(roomId, inputVal, result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setOutputVal(errorMsg);
      uploadIOOnChange(roomId, inputVal, errorMsg);
    }
  };

  const isMentor = Boolean(username && username === roomId);

  const handleClearLogs = async () => {
    if (!isMentor) return;
    if (!window.confirm('Are you sure you want to clear all connected users logs?')) return;

    try {
      await clearRoomLogs(roomId);
      setConnectedUsers({});
      alert('All logs cleared successfully!');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      alert('Failed to clear logs. Please try again.');
    }
  };

  const handleLoginSuccess = (loggedUser: string) => {
    setUsername(loggedUser);
    setMyAlias(loggedUser);
    setRoomId(loggedUser);
  };

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
        connectedUsers={connectedUsers}
        onUpdateAlias={(ip, newAlias) => updateUserAlias(roomId, ip, newAlias)}
        myAlias={myAlias}
        setMyAlias={setMyAlias}
        onClearLogs={handleClearLogs}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

export default App;