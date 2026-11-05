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

  // Remote Firebase Change Handler with Exact Selection Preservation
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const currentModel = currentEditor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    // Only apply remote edit if content actually changed
    if (code !== currentContent && !currentEditor.hasTextFocus()) {
      isUpdatingFromRemote.current = true;

      // Save exact cursor position before edit
      const position = currentEditor.getPosition();
      const selection = currentEditor.getSelection();

      // Delta Edit execution
      currentEditor.executeEdits('remote-sync', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      // Restore exact position & selection so it doesn't jump to last line
      if (position) {
        currentEditor.setPosition(position);
      }
      if (selection) {
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
        defaultValue={code} // Uncontrolled mode to prevent automatic re-renders
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