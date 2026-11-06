import React, { useState } from "react";

function GetPopover({value, layout}){
    value = value == null ? '+' : value;
  
    const [isClick, setIsClick] = useState(false);
  
    return(
      <div>
        <div
        className="btn-cancel"
        style={{
          position: 'relative',
          
        }}
        >
          <button onClick = {()=>{
              if(isClick == true){
                setIsClick(false);
              }else{
                setIsClick(true);
              }
            }}
            style={{fontSize: '12px'}}
            >
            {value}
          </button>
  
          {isClick ?
            <div className='boder' style={{
              left: 'calc(100% + 5px)',
              top: '0',
              minWidth: '300px',
              position: 'absolute',
            }} >
            <div style={{display:'flex', width:'100%'}}>
              <button
              style={{
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                marginLeft: 'auto',
                fontSize: '13px' }}
                onClick = {()=>{setIsClick(false)}}
              >
                ✕
              </button>
            </div>
              {layout == null ? <div>레이아웃 등록</div>:layout}
            </div>
            :<div></div>
          }
          
        </div>
      </div>
    )
  }

  export default GetPopover;