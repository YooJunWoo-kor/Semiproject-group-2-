import React from "react";
import ProjectProgress from "../../../../components/ProjectProgress";
import ProjectStatusTage from "../../../../components/ProjectStatusTage";

//데시보드 프로젝트 리스트
function ProjectListModule({data, buttonClick}){
    const tageTyp1 = data.visible == 1 ? '공개' : '비공개';
    const tage1Color = tageTyp1 == "공개" ? 'tag-emerald' : 'tag-red';

    return (
      <div className='boder' style={{display:'flex', flexFlow:'column', height: '130px', padding: '20px 30px', paddingBottom: '130px', marginRight: '30px'}}>
        
        <div style={{display:'flex'}}>
          <div style={{display:'flex', flexFlow:'column', fontSize: '30px', gap:'10px'}}>
            <div style = {{display: 'flex', alignItems: 'center'}}>
              <div className={`attendance-tag ${tage1Color}`}>
                {tageTyp1}
              </div>  
              <div style = {{ display: 'flex', flex:'1', fontSize: '18px', marginLeft:'10px'}}>
                <strong>{data.schedule_name}</strong>
              </div>
            </div>
            <div style={{display:'flex', gap: '15px'}}>
              <ProjectProgress start={data.start} end={data.end}/>
            </div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', flexFlow:'column', gap:'5px'}}>
            {/* 프로젝트 상태 하단에 정의 */}
            <ProjectStatusTage start={data.start} end={data.end}/>
            <button
              style = {{fontSize:'13px'}}
              onClick={()=>{buttonClick(data.project_id)}}
            >상세보기</button>
          </div>
        </div>
      </div>
    )
  }

export default ProjectListModule;