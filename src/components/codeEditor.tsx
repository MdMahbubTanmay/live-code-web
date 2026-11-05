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

  // Fixed Remote Sync with Strict Line-Number & Column Restoration
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    // Skip if current device user is typing locally
    if (isLocalTyping.current) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    if (code !== currentContent) {
      isRemoteUpdating.current = true;

      // 1. Capture exact Line Number & Column position before applying edit
      const currentPosition = currentEditor.getPosition();
      const currentSelection = currentEditor.getSelection();
      const hasFocus = currentEditor.hasTextFocus();

      // 2. Non-destructive Edit Operations
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

      // 3. Prevent Cursor Jumping to Last Line: Force Restore Exact Line & Column
      if (currentPosition) {
        // Validate if line position still exists in new model line count
        const totalLines = currentModel.getLineCount();
        const safeLineNumber = Math.min(currentPosition.lineNumber, totalLines);
        const maxCol = currentModel.getLineMaxColumn(safeLineNumber);
        const safeColumn = Math.min(currentPosition.column, maxCol);

        currentEditor.setPosition({
          lineNumber: safeLineNumber,
          column: safeColumn,
        });
      }

      if (currentSelection && currentPosition) {
        currentEditor.setSelection({
          startLineNumber: Math.min(currentSelection.startLineNumber, currentModel.getLineCount()),
          startColumn: currentSelection.startColumn,
          endLineNumber: Math.min(currentSelection.endLineNumber, currentModel.getLineCount()),
          endColumn: currentSelection.endColumn,
        });
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