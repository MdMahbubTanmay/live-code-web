// Replace src/components/main_ui.tsx with this version.
import { useEffect, useState } from 'react';
import '../components/main_ui.css';
import { CodeEditor } from '../components/codeEditor';
import type { SessionRecord } from '../services/sessionHistory';

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
  sessionHistory?: Record<string, SessionRecord>;
  onUpdateAlias?: (ip: string, newAlias: string) => void;
  myAlias: string;
  setMyAlias: (alias: string) => void;
};

export const MainUI = ({
  onClick, onClickCpp, onClickJava, onClickPython,
  code, lang, setCode, roomId, inputVal, setInputVal,
  outputVal, setOutputVal, isMentor, roomPassword = '',
  onSetPassword, onClearLogs, connectedUsers = {}, sessionHistory = {}, onUpdateAlias,
  myAlias, setMyAlias,
}: Props) => {
  const [passInput, setPassInput] = useState(roomPassword);
  const [clockNow, setClockNow] = useState(Date.now());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };
  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const sessions = Object.values(sessionHistory).sort((a, b) => b.joinedAt - a.joinedAt);

  const exportSessionHistoryPDF = async () => {
    if (!isMentor || exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Live Code Web - Room Session History', 14, 16);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Room: ${roomId}`, 14, 23);
      pdf.text(`Exported: ${new Date().toLocaleString()}`, 14, 29);
      pdf.text(`Total sessions: ${sessions.length}`, 14, 35);

      const headers = ['Student / Alias', 'IP', 'Joined', 'Left', 'Duration', 'Status'];
      const colX = [14, 64, 104, 154, 204, 244];
      let y = 44;
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, i) => pdf.text(header, colX[i], y));
      pdf.setLineWidth(0.3);
      pdf.line(14, y + 2, 282, y + 2);
      pdf.setFont('helvetica', 'normal');
      y += 9;

      for (const session of sessions) {
        const leftAt = session.leftAt;
        const duration = session.durationMs ?? (leftAt ? leftAt - session.joinedAt : session.status === 'online' ? clockNow - session.joinedAt : (session.lastSeen || session.joinedAt) - session.joinedAt);
        const row = [
          (session.alias || 'Guest').slice(0, 22),
          (session.ip || '').slice(0, 18),
          formatDateTime(session.joinedAt),
          leftAt ? formatDateTime(leftAt) : session.status === 'online' ? 'Still online' : 'Approx. last seen',
          formatDuration(duration),
          session.status,
        ];
        if (y > 185) {
          pdf.addPage();
          y = 18;
          pdf.setFont('helvetica', 'bold');
          headers.forEach((header, i) => pdf.text(header, colX[i], y));
          pdf.line(14, y + 2, 282, y + 2);
          pdf.setFont('helvetica', 'normal');
          y += 9;
        }
        row.forEach((cell, i) => pdf.text(String(cell), colX[i], y, { maxWidth: i === 0 ? 45 : 38 }));
        y += 7;
      }
      pdf.save(`room-${roomId}-session-history.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="MainLayout">
      <div className="EditorColumn">
        <div className="compileTop" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <label><input type="radio" name="lang" checked={lang === 'cpp'} onClick={onClickCpp} onChange={() => {}} /> C/C++</label>
          <label><input type="radio" name="lang" checked={lang === 'java'} onClick={onClickJava} onChange={() => {}} /> Java</label>
          <label><input type="radio" name="lang" checked={lang === 'python'} onClick={onClickPython} onChange={() => {}} /> Python</label>
          <button className="compileBtn" onClick={onClick} style={{ padding: '6px 16px', background: '#89b4fa', color: '#11111b', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Compile</button>
        </div>

        <div style={{ flex: 1, background: '#1e1e2e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #313244', minHeight: '65vh' }}>
          <CodeEditor setCode={setCode} lang={lang} code={code} roomId={roomId} userName={myAlias} />
        </div>
      </div>

      <div className="HelperColumn Helper">
        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#89b4fa' }}>INPUT (Synced):</p>
          <textarea value={inputVal} onChange={(event) => setInputVal(event.target.value)} placeholder="Input dynamic code inputs..." style={{ height: '80px', resize: 'vertical' }} />
        </div>

        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#a6e3a1' }}>OUTPUT (Synced):</p>
          <textarea value={outputVal} onChange={(event) => setOutputVal(event.target.value)} placeholder="Outputs sync automatically..." style={{ height: '95px', resize: 'vertical' }} />
        </div>

        <div style={{ background: '#1e1e2e', padding: '12px', borderRadius: '8px', border: '1px solid #313244', color: '#cdd6f4' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#a6adc8' }}>Your Display Name / Alias in Room:</p>
          <input type="text" value={myAlias} onChange={(event) => setMyAlias(event.target.value)} style={{ width: '100%', background: '#181825', border: '1px solid #45475a', color: '#fff', borderRadius: '4px', padding: '6px 8px', boxSizing: 'border-box' }} />
        </div>

        {isMentor && (
          <div style={{ color: '#cdd6f4', background: '#181825', padding: '12px', borderRadius: '8px', border: '1px solid #89b4fa', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, color: '#89b4fa', fontSize: '0.95rem' }}>Mentor Authority Dashboard</h4>
            <div className="pass-container">
              <span style={{ fontSize: '0.8rem', color: '#a6adc8' }}>Pass:</span>
              <input type="text" className="pass-input" placeholder="Set protection pass" value={passInput} onChange={(event) => setPassInput(event.target.value)} />
              <button onClick={() => onSetPassword?.(passInput)} style={{ background: '#89b4fa', color: '#11111b', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <h5 style={{ margin: 0, color: '#a6adc8', fontSize: '0.85rem' }}>Active Users & Logged IPs:</h5>
              <button onClick={onClearLogs} style={{ background: '#f38ba8', color: '#11111b', border: 'none', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>Clear Logs</button>
            </div>

            <div style={{ maxHeight: '130px', overflowY: 'auto', background: '#11111b', padding: '6px', borderRadius: '4px', border: '1px solid #313244' }}>
              {Object.keys(connectedUsers).length === 0 ? (
                <div style={{ color: '#6c7086', fontSize: '0.78rem' }}>No visitors joined yet.</div>
              ) : Object.entries(connectedUsers).map(([key, user]) => (
                <div key={key} style={{ marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #1e1e2e', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#89b4fa' }}>
                    <span>IP: {user.ip}</span><span style={{ color: '#a6adc8' }}>{formatTime(user.joinedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#cdd6f4' }}>Alias:</span>
                    <input type="text" defaultValue={user.alias} onBlur={(event) => onUpdateAlias?.(user.ip, event.target.value)} style={{ background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: '4px', padding: '2px 4px', flex: 1, fontSize: '0.75rem', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* NEW: Persistent visit history */}
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <h5 style={{ margin: 0, color: '#a6adc8', fontSize: '0.85rem' }}>Room Session History ({sessions.length})</h5>
              <button onClick={exportSessionHistoryPDF} disabled={exporting} style={{ background: '#a6e3a1', color: '#11111b', border: 'none', padding: '5px 9px', borderRadius: '4px', fontWeight: 'bold', cursor: exporting ? 'wait' : 'pointer', fontSize: '0.75rem' }}>{exporting ? 'Preparing PDF…' : 'Download PDF'}</button>
            </div>
            <div style={{ maxHeight: '240px', overflow: 'auto', background: '#11111b', padding: '6px', borderRadius: '4px', border: '1px solid #313244' }}>
              {sessions.length === 0 ? <div style={{ color: '#6c7086', fontSize: '0.78rem' }}>No session history yet.</div> : sessions.map((session) => {
                const end = session.leftAt;
                const duration = session.durationMs ?? (end ? end - session.joinedAt : session.status === 'online' ? clockNow - session.joinedAt : (session.lastSeen || session.joinedAt) - session.joinedAt);
                return <div key={session.sessionId} style={{ padding: '7px 4px', borderBottom: '1px solid #313244', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '5px', color: '#89b4fa' }}><strong>{session.alias || 'Guest'}</strong><span>{session.status === 'online' ? '🟢 Online' : session.status === 'disconnected' ? '⚠ Disconnected' : 'Left'}</span></div>
                  <div style={{ color: '#a6adc8' }}>IP: {session.ip} · Joined: {formatTime(session.joinedAt)}</div>
                  <div style={{ color: '#cdd6f4' }}>Left: {end ? formatTime(end) : session.status === 'online' ? '—' : `~${formatTime(session.lastSeen)}`} · Duration: {formatDuration(duration)}</div>
                </div>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};