//codeRunner.ts

interface OneCompilerResponse {
  status: string;
  exception?: string;
  stdout?: string;
  stderr?: string;
  executionTime?: number;
}

export async function executeCode(
  code: string,
  input: string = '',
  language: string = 'python'
): Promise<string> {
  // OneCompiler uses simple string identifiers for languages
  const compilerMap: Record<string, string> = {
    python: 'python',
    cpp: 'cpp',
    c: 'c',
    javascript: 'nodejs',
    java: 'java',
  };

  const selectedCompiler = compilerMap[language.toLowerCase()] || 'python';

  try {
    const response = await fetch('https://onecompiler-apis.p.rapidapi.com/api/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // IMPORTANT: Replace with your actual RapidAPI Key
      'X-RapidAPI-Key': import.meta.env.VITE_XRAPID_API, 
        'X-RapidAPI-Host': 'onecompiler-apis.p.rapidapi.com'
      },
      body: JSON.stringify({
        language: selectedCompiler,
        stdin: input,
        files: [
          {
            name: `main.${selectedCompiler === 'python' ? 'py' : selectedCompiler}`,
            content: code
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Server status ${response.status}: RapidAPI request failed.`);
    }

    const data: OneCompilerResponse = await response.json();

    if (data.stderr || data.exception) {
      return `Error: ${data.stderr || data.exception}`;
    }

    return data.stdout || 'Code executed successfully with no output.';
  } catch (error) {
    console.error('Execution Error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}