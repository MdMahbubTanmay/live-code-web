import { useState, useRef } from 'react';
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

  
  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
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
        onChange={(value) => {
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
        }}
      />
    </div>
  );
}
