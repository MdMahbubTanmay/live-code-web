// src/components/codeEditor.tsx
import { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import '../components/codeEditor.css';
import { uploadLineChange } from '../services/roomServices';

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

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  // Remote Line-by-Line Update Listener Sync
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    if (code !== currentContent && !currentEditor.hasTextFocus()) {
      isRemoteUpdating.current = true;

      // Preserve exact local selection & cursor
      const position = currentEditor.getPosition();
      const selection = currentEditor.getSelection();

      currentEditor.executeEdits('line-sync', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      if (position) {
        currentEditor.setPosition(position);
      }
      if (selection) {
        currentEditor.setSelection(selection);
      }

      isRemoteUpdating.current = false;
    }
  }, [code]);

  // Line Detection on Typing
  const handleContentChange = (value: string | undefined) => {
    if (isRemoteUpdating.current) return;

    const newCode = value || '';
    setCode(newCode);

    const currentEditor = editorRef.current;
    if (currentEditor && currentEditor.hasTextFocus()) {
      const position = currentEditor.getPosition();
      if (position) {
        const lineIdx = position.lineNumber - 1;
        const currentModel = currentEditor.getModel();
        if (currentModel) {
          const lineContent = currentModel.getLineContent(position.lineNumber);
          // Sync ONLY the specific line being edited
          uploadLineChange(roomId, lineIdx, lineContent);
        }
      }
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