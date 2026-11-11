import React from "react";
import ProjectProgress from "../../../../components/ProjectProgress";
import ColorTeg from "../../../../components/ColorTeg";

function ProjectListModule({data, buttonClick}){
    const tageTyp1 = data.visible == 1 ? '공개' : '비공개';
    const tage1Color = tageTyp1 == "공개" ? 'tag-emerald' : 'tag-red';

    return (
      <div className='boder' style={{display:'flex', flexFlow:'column', height: '130px', padding: '20px 30px', marginRight: '30px'}}>
        
        <div style={{display:'flex'}}>
          <div style={{display:'flex', flexFlow:'column', fontSize: '30px', gap:'10px'}}>
            <div style = {{display: 'flex', alignItems: 'center'}}>
              <div className={`attendance-tag ${tage1Color}`}>
                {tageTyp1}
              </div>  
              <div style = {{ display: 'flex', flex:'1', fontSize: '18px', marginLeft:'10px'}}>
                <strong>{data.project_name}</strong>
              </div>
            </div>
            <div style={{display:'flex', gap: '15px'}}>
              <ProjectProgress start={data.start} end={data.end}/>
            </div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', flexFlow:'column', gap:'5px'}}>
            <ProjectStatusTage start={data.start} end={data.end}/>
            <button
              style = {{fontSize:'13px'}}
              onClick={buttonClick}
            >상세보기</button>
          </div>
        </div>
      </div>
    )
  }

function ProjectStatusTage({start, end}){
  const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
  
    const totalPeriod = endDate - startDate;
    const elapsedPeriod = today - startDate;
  
    let status = '진행중' //진행예정, 진행중, 완료
    let percent = 0;
    let type = 0;
  
    if (totalPeriod <= 0) {
      // 음수면
      status = '완료';
      percent = 100;
      type = 1;
    } else if (today < startDate) {
      //아직 시작일에 도달하지 않았다면
      status = '진행예정';
      percent = 0;
      type = 2;
    } else if (today > endDate) {
      //마감일이 지났다면
      status = '완료';
      percent = 100;
      type = 3;
    } else {
      //시작일과 종료일 사이라면 (총 프로젝트 기간 / 시작날짜부터 현제날짜)
      percent = Math.min(100, Math.max(0, Math.round((elapsedPeriod / totalPeriod) * 100)));
      type = 4;
    }

    const colorList = ["red", "blue", "green", "orange", "purple", "gray"];
    
  return(
      <ColorTeg title={status} count={percent} type={'%'} color={colorList[type]}/>
  )
}

export default ProjectListModule;