import React from "react";
import ColorTeg from "./ColorTeg";

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

  export default ProjectStatusTage;