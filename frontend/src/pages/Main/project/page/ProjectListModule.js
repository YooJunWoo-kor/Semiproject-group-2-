import React from "react";

function ProjectListModule({data, buttonClick}){
    return (
      <div className='boder' style={{display:'flex', flexFlow:'column', height: '130px', padding: '20px 30px', marginRight: '30px'}}>
        
        <div style={{display:'flex'}}>
          <div style={{display:'flex', flexFlow:'column', fontSize: '30px', gap:'10px'}}>
            <div style = {{display: 'flex', alignItems: 'center'}}>
              <div className='attendance-tag tag-emerald'>전체</div>  
              <div style = {{ display: 'flex', flex:'1', fontSize: '18px', marginLeft:'10px'}}>
                <strong>{data.project_name}</strong>
              </div>
            </div>
            <div style={{display:'flex', gap: '15px'}}>
              <p style = {{fontSize : '13px'}}>시작일: {data.start}</p>
              <p style = {{fontSize : '13px'}}>종료일: {data.end}</p>
            </div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', flexFlow:'column', gap:'5px'}}>
            <div className='attendance-tag tag-emerald'>상태태그</div>
            <button
              style = {{fontSize:'13px'}}
              onClick={buttonClick}
            >상세보기</button>
          </div>
        </div>
      </div>
    )
  }

export default ProjectListModule;