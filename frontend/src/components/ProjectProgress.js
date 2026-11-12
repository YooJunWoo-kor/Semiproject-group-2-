import React from "react";

//진행바 모듈
function ProjectProgress({ start, end }) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
  
    const totalPeriod = endDate - startDate;
    const elapsedPeriod = today - startDate;
  
    let percent = 0;
  
    if (totalPeriod <= 0) {
      // 음수면
      percent = 100;
    } else if (today < startDate) {
      //아직 시작일에 도달하지 않았다면
      percent = 0;
    } else if (today > endDate) {
      //마감일이 지났다면
      percent = 100;
    } else {
      //시작일과 종료일 사이라면 (총 프로젝트 기간 / 시작날짜부터 현제날짜)
      percent = Math.min(100, Math.max(0, Math.round((elapsedPeriod / totalPeriod) * 100)));
    }
  
    return (
      <div className="detail-card" style={{display:'flex', flexFlow:'column', flex:'1'}}>
        <div
          style={{
            width: "100%",
            height: "10px",
            backgroundColor: "#e2e8f0",
            borderRadius: "999px",
            overflow: "hidden",
            margin: "8px 0"
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              backgroundColor: "var(--color-brand)",
              borderRadius: "999px",
              transition: "width 0.4s ease-in-out"
            }}
          />
        </div>
  
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-muted)" }}>
          <span>시작일: {start}</span>
          <span>마감일: {end}</span>
        </div>
      </div>
    );
  }

  export default ProjectProgress;