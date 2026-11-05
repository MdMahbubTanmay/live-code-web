// src/components/codeEditor.tsx
import { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebrtcProvider } from 'y-webrtc';
import '../components/codeEditor.css';

type Props = {
  lang: string;
  code: string;
  setCode: (value: string) => void;
  roomId: string;
};

export function CodeEditor({ lang, setCode, roomId }: Props) {
  const [theme, setTheme] = useState<string>('vs-dark');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor || !roomId) return;

    // 1. Yjs Shared Document Instance Setup
    const ydoc = new Y.Doc();

    // 2. Room-based Peer-to-Peer Realtime WebRTC Provider Sync Engine
    const provider = new WebrtcProvider(`live-code-room-${roomId}`, ydoc);
    const yText = ydoc.getText('monaco');

    const model = currentEditor.getModel();
    if (!model) return;

    // 3. Bind Monaco Editor Model with Yjs Shared Text State
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([currentEditor]),
      provider.awareness
    );

    // Track text changes to keep parent state updated
    yText.observe(() => {
      setCode(yText.toString());
    });

    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '8px', color: '#fff' }}>Theme: </label>
        <select
          className="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <Editor
        height="65vh"
        language={lang}
        className="editorPanel"
        defaultLanguage="cpp"
        theme={theme}
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}