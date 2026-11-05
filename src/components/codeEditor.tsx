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
  const isUpdatingFromRemote = useRef<boolean>(false);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  // Safe Remote Sync: Maintains Cursor Position on Active Lines
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    // Sync only if remote text differs
    if (code !== currentContent) {
      isUpdatingFromRemote.current = true;

      // 1. Capture exact cursor position & selections before edit
      const position = currentEditor.getPosition();
      const selection = currentEditor.getSelection();

      // 2. Perform delta replacement without full buffer destruction
      currentEditor.executeEdits('remote-firebase-sync', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      // 3. Restore exact position & selection so cursor stays on active line
      if (position) {
        const lineCount = currentModel.getLineCount();
        const safeLine = Math.min(position.lineNumber, lineCount);
        const maxCol = currentModel.getLineMaxColumn(safeLine);
        const safeCol = Math.min(position.column, maxCol);

        currentEditor.setPosition({ lineNumber: safeLine, column: safeCol });
      }

      if (selection && position) {
        currentEditor.setSelection(selection);
      }

      isUpdatingFromRemote.current = false;
    }
  }, [code]);

  const handleContentChange = (value: string | undefined) => {
    if (isUpdatingFromRemote.current) return;

    const newCode = value || '';
    setCode(newCode);

    if (editorRef.current && editorRef.current.hasTextFocus()) {
      uploadTextOnChange(roomId, newCode);
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