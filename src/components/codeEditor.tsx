// src/components/codeEditor.tsx
import { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import '../components/codeEditor.css';
import { uploadTextOnChange } from '../services/roomServices';

type Props = {
  lang: string;
  code: string;
  setCode: (value: string) => void;
  roomId: string;
};

export function CodeEditor({ lang, code, setCode, roomId }: Props) {
  const [theme, setTheme] = useState<string>('vs-dark');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  // Flags to prevent infinite state update loops
  const isRemoteUpdating = useRef<boolean>(false);
  const isLocalTyping = useRef<boolean>(false);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  // 1. Handle Remote Code Changes without Losing Cursor Focus
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    // If local user is actively typing, skip incoming sync to avoid cursor jumping
    if (isLocalTyping.current) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    // Only apply update if Firebase code is strictly different from editor code
    if (code !== currentContent) {
      isRemoteUpdating.current = true;

      const selections = currentEditor.getSelections();
      const hasFocus = currentEditor.hasTextFocus();

      // Non-destructive edit execution
      currentEditor.executeEdits('remote-firebase-sync', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      // Restore Cursor Selections
      if (selections) {
        currentEditor.setSelections(selections);
      }

      // Restore Focus if active
      if (hasFocus) {
        currentEditor.focus();
      }

      isRemoteUpdating.current = false;
    }
  }, [code]);

  // 2. Handle Local Typing
  const handleContentChange = (value: string | undefined) => {
    // Ignore changes triggered by remote code injection
    if (isRemoteUpdating.current) return;

    const newCode = value || '';
    setCode(newCode);

    if (editorRef.current && editorRef.current.hasTextFocus()) {
      isLocalTyping.current = true;

      uploadTextOnChange(roomId, newCode).finally(() => {
        // Release local typing flag after upload completes
        setTimeout(() => {
          isLocalTyping.current = false;
        }, 100);
      });
    }
  };

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
        value={code}
        onMount={handleEditorMount}
        onChange={handleContentChange}
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