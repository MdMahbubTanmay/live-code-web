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
  
  const isRemoteUpdating = useRef<boolean>(false);
  const isLocalTyping = useRef<boolean>(false);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  // Safe Remote Sync using pushEditOperations for precise delta preservation
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    // Local typing actove thakle incoming remote event suppress
    if (isLocalTyping.current) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    if (code !== currentContent) {
      isRemoteUpdating.current = true;

      // 1. Exact Cursor Position + Selection Range capture
      const currentSelection = currentEditor.getSelection();
      const currentPosition = currentEditor.getPosition();
      const hasFocus = currentEditor.hasTextFocus();

      // 2. Push Line-by-Line Delta Edits without wiping cursor stack
      currentEditor.pushUndoStop();
      currentModel.pushEditOperations(
        [],
        [
          {
            range: currentModel.getFullModelRange(),
            text: code,
          },
        ],
        () => null
      );
      currentEditor.pushUndoStop();

      // 3. Force restore exact local line position & column index
      if (currentPosition) {
        currentEditor.setPosition(currentPosition);
      }

      if (currentSelection) {
        currentEditor.setSelection(currentSelection);
      }

      if (hasFocus) {
        currentEditor.focus();
      }

      isRemoteUpdating.current = false;
    }
  }, [code]);

  const handleContentChange = (value: string | undefined) => {
    if (isRemoteUpdating.current) return;

    const newCode = value || '';
    setCode(newCode);

    if (editorRef.current && editorRef.current.hasTextFocus()) {
      isLocalTyping.current = true;

      uploadTextOnChange(roomId, newCode).finally(() => {
        setTimeout(() => {
          isLocalTyping.current = false;
        }, 120);
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