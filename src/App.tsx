import { useState , useEffect} from 'react'
import './App.css'
import { MainUI } from './components/main_ui'
import { TopBar } from './components/topbar'
import { executeCode } from './api/codeRunner'
import { joinRoom , listenToTextChanges} from './services/roomServices'

function App() {
  
  
  
  const [code, setCode] = useState<string>(
    
`#include <iostream> 

int main() { 
    std::cout << "Hello, World!" << std::endl; 
    return 0; 
}`
);

  const [langg, setLang] = useState<string> ('cpp');


  const[roomId, setRoomId] = useState('MAHBUB');



useEffect(() => {
  
  if (!roomId || roomId.trim() === '') return;

  let isCancelled = false;

  joinRoom(roomId, '// New Room Created')
    .then(() => {
      if (isCancelled) return;
    })
    .catch((err) => console.error('Join error:', err));

  const unsubscribe = listenToTextChanges(roomId, (remoteCode) => {
    
    if (remoteCode !== undefined && remoteCode !== code) {
      setCode(remoteCode);
    }
  });

  return () => {
    isCancelled = true;
    unsubscribe();
  };
}, [roomId]); 


  

  const compileClick = async () =>{

    
    const input:string = (document.getElementById('compiler-input') as HTMLTextAreaElement).value;

    const outputBox = (document.getElementById('compiler-output') as HTMLTextAreaElement);


    try {
      
      const result: string = await executeCode(code, input, langg);
      

    outputBox.value= result;
} catch (err) {
  
  if (err instanceof Error) {
    outputBox.value = err.message; 
  } else {
    outputBox.value = String(err); 
  }
}



  }

  const Cpp = ()=>{
    setLang('cpp');
  }

  const Java = ()=>{
    setLang('java');
    
  }

  const Python = ()=> {
    setLang('python');
    
  }




  const setRoom = (id:string) =>
  {
    setRoomId(id);

  
  }

  return (
    <>
    
  <TopBar setRoom={setRoom}/>

   <MainUI  onClick={compileClick} onClickCpp={Cpp} onClickJava={Java} onClickPython={Python} code={code} lang = {langg} setCode={setCode} roomId={roomId}/>
   </>
  )
}

export default App
