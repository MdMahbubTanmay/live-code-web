import '../components/topbar.css'
import { useState , useEffect} from 'react'

type Pros = {
    setRoom : (id:string)=> void,
}

export const TopBar = ({setRoom}:Pros) => {

    const[Ip, setIp] = useState('Loading');


      useEffect(() => {
    
    fetch('https://api.ipify.org?format=json')
      .then((response) => response.json())
      .then((data) => setIp((data.ip).replaceAll('.','')))
      .catch((error) => {
        console.error('Error fetching IP:', error);
        setIp('Unavailable');
      });
  }, []); 

  const copyToClip = ()=>{
    navigator.clipboard.writeText(Ip);
    alert('ID Copied')
  }

const setId = () => {
  const inputEl = document.getElementById('room-id-html') as HTMLTextAreaElement | HTMLInputElement | null;
  
  if (inputEl && inputEl.value.trim() !== '') {
    setRoom(inputEl.value.trim());
  } else {
    alert('Enter a valid Room ID ');
  }
};


    return(
     <div className="top">
        
        <button className='copyIp' onClick={copyToClip}>Copy Your ROOM Address : {Ip}</button>

        <div className='top2'>

        <textarea className='room-id' placeholder='Enter address..' id='room-id-html'></textarea>
        <button className='joinBtn' onClick={setId}>Join</button>
        </div>
     </div>
    
    );
}