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

  // Cursor focus loss prevention on remote change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentModel = editor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    // Only sync if remote content is actually different
    if (code !== currentContent) {
      isUpdatingFromRemote.current = true;

      // Preserve cursor position & selection before remote code update
      const selection = editor.getSelection();
      const position = editor.getPosition();
      const hasFocus = editor.hasTextFocus();

      // Execute edits smoothly without triggering full value re-render focus loss
      editor.executeEdits('remote-sync', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      // Restore position & selection
      if (position) {
        editor.setPosition(position);
      }
      if (selection) {
        editor.setSelection(selection);
      }

      // Re-focus if user was typing actively
      if (hasFocus) {
        editor.focus();
      }

      isUpdatingFromRemote.current = false;
    }
  }, [code]);

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
        onChange={(value) => {
          // Ignore triggering change upload when content was pushed from remote
          if (isUpdatingFromRemote.current) return;

          const newCode = value || '';
          setCode(newCode);

          if (editorRef.current && editorRef.current.hasTextFocus()) {
            uploadTextOnChange(roomId, newCode);
          }
        }}
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