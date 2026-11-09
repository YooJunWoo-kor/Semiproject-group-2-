import React, { useState } from "react";

// + 버튼 또는 입력한 명칭으로 버튼 생성
// 생성된 버튼 클릭시 등록된 레이아웃 출력
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
          <button type='button' onClick = {()=>{
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