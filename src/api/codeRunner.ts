interface WandboxResponse {
  status?: string;
  compiler_output?: string;
  compiler_error?: string;
  program_output?: string;
  program_error?: string;
}
//This code is Taken From AI with vibe Codeing

export async function executeCode(
  code: string,
  input: string = '',
  language: string = 'python'
): Promise<string> {
  // Real, current Wandbox compiler strings
  const compilerMap: Record<string, string> = {
    python: 'cpython-3.12.7', // Updated active Python build ID
    cpp: 'gcc-13.2.0',
    c: 'gcc-13.2.0-c',
    javascript: 'nodejs-18.13.0',
    java: 'openjdk-head',
  };

  const selectedCompiler = compilerMap[language.toLowerCase()] || 'cpython-3.12.7';

  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compiler: selectedCompiler,
        code: code,
        stdin: input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server status ${response.status}: Compiler string '${selectedCompiler}' might be invalid or offline.`);
    }

    const data: WandboxResponse = await response.json();

    if (data.program_error) {
      return data.program_error;
    }
    if (data.compiler_error) {
      return data.compiler_error;
    }

    return data.program_output || 'Code executed successfully with no output.';
  } catch (error) {
    console.error('Execution Error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
