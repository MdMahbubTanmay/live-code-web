// src/components/codeEditor.tsx
import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import '../components/codeEditor.css';
import { FirebaseYjsProvider } from '../services/firebaseYjsProvider';

type Props = {
  lang: string;
  code: string;
  setCode: (value: string) => void;
  roomId: string;
  userName: string;
};

const CURSOR_COLORS = [
  '#f38ba8', '#89b4fa', '#a6e3a1', '#f9e2af', '#cba6f7',
  '#94e2d5', '#fab387', '#f2cdcd', '#74c7ec', '#b4befe',
];

function colorForUser(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function CodeEditor({ lang, code, setCode, roomId, userName }: Props) {
  const [theme, setTheme] = useState('vs-dark');
  const [dbg, setDbg] = useState('');
  const [editorInstance, setEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);
  const setCodeRef = useRef(setCode);
  const userNameRef = useRef(userName);
  const awarenessRef = useRef<Awareness | null>(null);
  const initialCodeRef = useRef(code.replace(/\r/g, ''));

  useEffect(() => { setCodeRef.current = setCode; }, [setCode]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);

  const handleEditorMount: OnMount = (instance, monaco) => {
    instance.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
    setEditorInstance(instance);
  };

  useEffect(() => {
    if (!editorInstance || !roomId) return;
    const model = editorInstance.getModel();
    if (!model) return;

    model.setEOL(0); // 0 = LF

    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;
    const sharedText = ydoc.getText('code');

    const name = userNameRef.current.trim() || 'Guest';
    const color = colorForUser(name);
    awareness.setLocalState({
      user: { name, color, colorLight: `${color}33` },
    });

    const provider = new FirebaseYjsProvider({
      roomId,
      doc: ydoc,
      awareness,
      initialCode: initialCodeRef.current,
    });

    const binding = new MonacoBinding(
      sharedText,
      model,
      new Set([editorInstance]),
      awareness
    );

    // Force LF AFTER the binding, because the binding's setValue can reset
    // EOL to CRLF on Windows. The guard re-forces LF if it ever flips back.
    model.setEOL(0);
    const eolGuard = model.onDidChangeContent(() => {
      if (model.getEOL() !== '\n') model.setEOL(0);
    });

    const publishReactValue = () => {
      setCodeRef.current(sharedText.toString());
    };
    sharedText.observe(publishReactValue);
    publishReactValue();

    // Debug line: remove once everything works.
    const hash = (s: string) => {
      let x = 0;
      for (let i = 0; i < s.length; i += 1) x = (x * 31 + s.charCodeAt(i)) | 0;
      return x;
    };
    const dbgTimer = setInterval(() => {
      const y = sharedText.toString();
      const m = model.getValue();
      setDbg(
        `os=${navigator.platform} eol=${model.getEOL() === '\n' ? 'LF' : 'CRLF'} ` +
        `yjs=${y.length}ch #${hash(y)} hasCR=${y.includes('\r')} | ` +
        `editor=${m.length}ch #${hash(m)}`
      );
    }, 1000);

    const styleElement = document.createElement('style');
    styleElement.dataset.collabRoom = roomId;
    document.head.appendChild(styleElement);

    const updateRemoteCursorStyles = () => {
      const css: string[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return;
        const user = state.user as
          | { name?: string; color?: string }
          | undefined;
        const safeColor = /^#[0-9a-fA-F]{6}$/.test(user?.color ?? '')
          ? user!.color!
          : '#89b4fa';
        const safeName = String(user?.name ?? 'Guest')
          .replace(/[\u0000-\u001f"'\\]/g, '')
          .slice(0, 32);

        css.push(`
          .yRemoteSelection-${clientId} {
            background-color: ${safeColor}40 !important;
          }
          .yRemoteSelectionHead-${clientId} {
            border-color: ${safeColor} !important;
            position: relative;
          }
          .yRemoteSelectionHead-${clientId}::after {
            content: "${safeName}";
            position: absolute;
            left: -1px;
            bottom: 100%;
            padding: 2px 6px;
            border-radius: 4px 4px 4px 0;
            background: ${safeColor};
            color: #11111b;
            font: 600 11px/1.4 sans-serif;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
          }
        `);
      });
      styleElement.textContent = css.join('\n');
    };

    awareness.on('change', updateRemoteCursorStyles);
    updateRemoteCursorStyles();

    return () => {
      awarenessRef.current = null;
      clearInterval(dbgTimer);
      awareness.off('change', updateRemoteCursorStyles);
      sharedText.unobserve(publishReactValue);
      eolGuard.dispose();
      binding.destroy();
      provider.destroy();
      styleElement.remove();
      awareness.destroy();
      ydoc.destroy();
    };
  }, [editorInstance, roomId]);

  useEffect(() => {
    const awareness = awarenessRef.current;
    if (!awareness) return;
    const current = awareness.getLocalState();
    if (!current) return;

    const name = userName.trim() || 'Guest';
    const color = colorForUser(name);
    awareness.setLocalState({
      ...current,
      user: { name, color, colorLight: `${color}33` },
    });
  }, [userName, editorInstance, roomId]);

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '8px', color: '#fff' }}>Theme: </label>
        <select
          className="theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <div style={{ color: '#a6e3a1', fontSize: 12, marginBottom: 6 }}>{dbg}</div>
      <Editor
        height="65vh"
        language={lang}
        className="editorPanel"
        defaultLanguage="cpp"
        theme={theme}
        defaultValue={initialCodeRef.current}
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
        }}
      />
    </div>
  );
}