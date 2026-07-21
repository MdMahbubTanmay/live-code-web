import '../components/main_ui.css'
import '../components/codeEditor'
import { CodeEditor } from '../components/codeEditor'


type Pros = {
    onClick : ()=> void,
    onClickCpp : ()=> void,
    onClickJava : ()=> void,
    onClickPython : ()=> void,
    code:string,
    lang:string,
    setCode : (value:string)=>void,
    roomId : string;
    

}
export const MainUI = ({onClick, onClickCpp, onClickJava, onClickPython, code, lang, setCode, roomId}:Pros) => {


    return (
        <div className="MainLayout">

            <div className='Editor'>
                <div className='compileTop' >
<label>
            <input 
              type="radio" 
              name="lang"  

              checked = {lang == 'cpp'}

              onClick={onClickCpp}
              
              onChange={() => {}

              
              
            } 

            /> C/C++
          </label>

          <label style={{ marginLeft: '10px' }}>
            <input 
              type="radio" 
              name="lang" 
              onClick={onClickJava}
              onChange={() => {}} 
            /> Java
          </label>

          <label style={{ marginLeft: '10px' }}>
            <input 
              type="radio" 
              name="lang" 
              onClick={onClickPython}
              onChange={() => {}} 
            /> Python
          </label>


                <button className='compileBtn' onClick={onClick}>Compile</button>
                    
                </div><br></br>

              <div className='codeTxt'><CodeEditor setCode={setCode} lang={lang} code = {code} roomId={roomId}/></div>

            </div>




            <div className='Helper'>

                <div className='help1'>
                <p>INPUT:</p>
                <textarea className='Input'  id="compiler-input" placeholder=" " required />
                </div>
                
                <div className='help2'>
                 <p>OUTPUT:</p>
                 <textarea className='Output'  id="compiler-output" placeholder=" " required />
                 </div>

            </div>

        </div>
    )
}