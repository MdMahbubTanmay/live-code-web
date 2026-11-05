// src/components/main_ui.tsx
import { useState } from 'react';
import '../components/main_ui.css';
import { CodeEditor } from '../components/codeEditor';

type Props = {
  onClick: () => void;
  onClickCpp: () => void;
  onClickJava: () => void;
  onClickPython: () => void;
  code: string;
  lang: string;
  setCode: (value: string) => void;
  roomId: string;
  inputVal: string;
  setInputVal: (val: string) => void;
  outputVal: string;
  setOutputVal: (val: string) => void;
  isMentor: boolean;
  roomPassword?: string;
  onSetPassword?: (pass: string) => void;
  onClearLogs?: () => void;
  connectedUsers?: Record<string, { ip: string; alias: string; joinedAt?: number }>;
  onUpdateAlias?: (ip: string, newAlias: string) => void;
  myAlias: string;
  setMyAlias: (alias: string) => void;
};

export const MainUI = ({
  onClick,
  onClickCpp,
  onClickJava,
  onClickPython,
  code,
  lang,
  setCode,
  roomId,
  inputVal,
  setInputVal,
  outputVal,
  setOutputVal,
  isMentor,
  roomPassword = '',
  onSetPassword,
  onClearLogs,
  connectedUsers = {},
  onUpdateAlias,
  myAlias,
  setMyAlias
}: Props) => {
  const [passInput, setPassInput] = useState(roomPassword);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="MainLayout">
      {/* Code Editor Column */}
      <div className="EditorColumn">
        <div className="compileTop" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <label><input type="radio" name="lang" checked={lang === 'cpp'} onClick={onClickCpp} onChange={() => {}} /> C/C++</label>
          <label><input type="radio" name="lang" checked={lang === 'java'} onClick={onClickJava} onChange={() => {}} /> Java</label>
          <label><input type="radio" name="lang" checked={lang === 'python'} onClick={onClickPython} onChange={() => {}} /> Python</label>
          <button className="compileBtn" onClick={onClick} style={{ padding: '6px 16px', background: '#89b4fa', color: '#11111b', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Compile</button>
        </div>

        <div style={{ flex: 1, background: '#1e1e2e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #313244', minHeight: '65vh' }}>
          <CodeEditor setCode={setCode} lang={lang} code={code} roomId={roomId} />
        </div>
      </div>

      {/* Helper Sidebar Column */}
      <div className="HelperColumn Helper">
        
        {/* Input */}
        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#89b4fa' }}>INPUT (Synced):</p>
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Input dynamic code inputs..."
            style={{ height: '80px', resize: 'vertical' }}
          />
        </div>

        {/* Output */}
        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#a6e3a1' }}>OUTPUT (Synced):</p>
          <textarea
            value={outputVal}
            onChange={(e) => setOutputVal(e.target.value)}
            placeholder="Outputs sync automatically..."
            style={{ height: '95px', resize: 'vertical' }}
          />
        </div>

        {/* Display Name Input */}
        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244', color: '#cdd6f4' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#a6adc8' }}>Your Display Name / Alias in Room:</p>
          <input
            type="text"
            value={myAlias}
            onChange={(e) => setMyAlias(e.target.value)}
            style={{ width: '100%', background: '#181825', border: '1px solid #45475a', color: '#fff', borderRadius: '4px', padding: '6px 8px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Mentor Authority Dashboard */}
        {isMentor && (
          <div style={{ color: '#cdd6f4', background: '#181825', padding: '12px', borderRadius: '8px', border: '1px solid #89b4fa', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, color: '#89b4fa', fontSize: '0.95rem' }}>Mentor Authority Dashboard</h4>

            <div className="pass-container">
              <span style={{ fontSize: '0.8rem', color: '#a6adc8' }}>Pass:</span>
              <input
                type="text"
                className="pass-input"
                placeholder="Set protection pass"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
              />
              <button
                onClick={() => onSetPassword && onSetPassword(passInput)}
                style={{ background: '#89b4fa', color: '#11111b', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Save
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <h5 style={{ margin: 0, color: '#a6adc8', fontSize: '0.85rem' }}>Active Users & Logged IPs:</h5>
              <button
                onClick={onClearLogs}
                style={{ background: '#f38ba8', color: '#11111b', border: 'none', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Clear Logs
              </button>
            </div>

            <div style={{ maxHeight: '130px', overflowY: 'auto', background: '#11111b', padding: '6px', borderRadius: '4px', border: '1px solid #313244' }}>
              {Object.keys(connectedUsers).length === 0 ? (
                <div style={{ color: '#6c7086', fontSize: '0.78rem' }}>No visitors joined yet.</div>
              ) : (
                Object.entries(connectedUsers).map(([key, u]) => (
                  <div key={key} style={{ marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #1e1e2e', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#89b4fa' }}>
                      <span>IP: {u.ip}</span>
                      <span style={{ color: '#a6adc8' }}>{formatTime(u.joinedAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#cdd6f4' }}>Alias:</span>
                      <input
                        type="text"
                        defaultValue={u.alias}
                        onBlur={(e) => onUpdateAlias && onUpdateAlias(u.ip, e.target.value)}
                        style={{ background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: '4px', padding: '2px 4px', flex: 1, fontSize: '0.75rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};