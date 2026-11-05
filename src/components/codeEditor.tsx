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
  const isSelfTyping = useRef<boolean>(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  // Remote Firebase push update handler
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Direct skip if the change originated from local active typing
    if (isSelfTyping.current) return;

    const currentModel = editor.getModel();
    if (!currentModel) return;

    const currentContent = currentModel.getValue();

    // Perform non-destructive text replacement only if content differs
    if (code !== currentContent) {
      const selections = editor.getSelections();
      const hasFocus = editor.hasTextFocus();

      // Apply Monaco delta changes safely
      editor.executeEdits('remote-sync-system', [
        {
          range: currentModel.getFullModelRange(),
          text: code,
          forceMoveMarkers: true,
        },
      ]);

      // Preserve active line selections
      if (selections && selections.length > 0) {
        editor.setSelections(selections);
      }

      // Re-claim focus silently if editor was active
      if (hasFocus && !editor.hasTextFocus()) {
        editor.focus();
      }
    }
  }, [code]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    const editor = editorRef.current;
    if (editor && editor.hasTextFocus()) {
      isSelfTyping.current = true;

      // Debounce server upload to avoid micro-lag cursor conflicts
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        uploadTextOnChange(roomId, newCode).finally(() => {
          // Release self typing lock after sync payload settles
          setTimeout(() => {
            isSelfTyping.current = false;
          }, 150);
        });
      }, 200);
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
        onChange={handleEditorChange}
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