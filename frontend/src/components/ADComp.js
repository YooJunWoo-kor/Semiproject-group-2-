import React, { useEffect, useState } from "react";
import { getLoginUser } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";
import WeeklyCalendar from "../components/weeklycalendar/WeeklyCalendar.js";
import './ADComp.css';

const data = [
    // 1주차
    { title: "출근", start: "2026-10-01", end: "2026-10-01", typeId: 0 },
    { title: "재택", start: "2026-10-02", end: "2026-10-02", typeId: 6 },
  
    // 2주차
    { title: "출근", start: "2026-10-03", end: "2026-10-05", typeId: 0 },
    { title: "지각", start: "2026-10-06", end: "2026-10-06", typeId: 1 },
    { title: "외근", start: "2026-10-07", end: "2026-10-07", typeId: 5 },
    { title: "조퇴", start: "2026-10-08", end: "2026-10-08", typeId: 1 },
    { title: "연차", start: "2026-10-09", end: "2026-10-09", typeId: 3 },
  
    // 3주차
    { title: "출장", start: "2026-10-12", end: "2026-10-13", typeId: 5 },
    { title: "출근", start: "2026-10-14", end: "2026-10-14", typeId: 0 },
    { title: "반차", start: "2026-10-15", end: "2026-10-15", typeId: 3 },
    { title: "출근", start: "2026-10-16", end: "2026-10-16", typeId: 0 },
  
    // 4주차
    { title: "병가", start: "2026-10-19", end: "2026-10-19", typeId: 2 },
    { title: "출근", start: "2026-10-20", end: "2026-10-20", typeId: 0 },
    { title: "야근", start: "2026-10-21", end: "2026-10-21", typeId: 7 },
    { title: "출근", start: "2026-10-22", end: "2026-10-22", typeId: 0 },
    { title: "결근", start: "2026-10-23", end: "2026-10-23", typeId: 2 },
    { title: "출근", start: "2026-10-24", end: "2026-10-24", typeId: 8 },
  
    // 5주차
    { title: "휴가", start: "2026-10-26", end: "2026-10-27", typeId: 4 },
    { title: "출근", start: "2026-10-28", end: "2026-10-28", typeId: 0 },
    { title: "반차", start: "2026-10-29", end: "2026-10-29", typeId: 3 },
    { title: "재택", start: "2026-10-30", end: "2026-10-30", typeId: 6 }
  ];

function ADComp(){
    const user = getLoginUser();
    const userName = user?.name;
    
    const[time, setTime] = useState(new Date());
    const hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2,'0');
    const seconds = String(time.getSeconds()).padStart(2,'0');
    const timeString = hours + ":" + minutes + ":" + seconds;

    const [isCalStyile, setCalStyile] = useState(0);

    useEffect(()=>{
        const timer = setInterval(() => {
            setTime(new Date());
          }, 1000);

          return ()=>{
            clearInterval(timer);
          };
        }, []);

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '20px',                /* 달력과 출퇴근 카드 사이 간격 */
            boxSizing: 'border-box'
          }}>
            {/* 좌측: 달력 컴포넌트 */}
            <div className="attendance-card">
              <div>
                <button onClick ={()=>{
                  setCalStyile(0);
                }}>달력</button>
                <button onClick ={()=>{
                  setCalStyile(1);
                }}>리스트</button>
              </div>
              {isCalStyile == 0 ?
                (<BasicCalendar schedule={data} />)
                :(<WeeklyCalendar schedule={data}/>) }
            </div>
        
            {/* 우측: 출결 관리 카드 */}
            <div className="attendance-card">
              <div className="attendance-card-header">
                <span className="attendance-badge">근태 관리</span>
              </div>
        
              {/* 인사말(좌)과 현재시각(우)을 한 줄에 배치 */}
              <div className="attendance-info-row">
                <div className="attendance-user-info">
                  <span className="user-greeting">반갑습니다, </span>
                  <strong className="user-name">{userName}</strong>님
                </div>
        
                <div className="attendance-clock-box">
                  <span className="clock-label">현재 시각</span>
                  <span className="clock-time">{timeString}</span>
                </div>
              </div>
        
              {/* 우측 하단에 정렬되는 출근 버튼 */}
              <div className="attendance-action-group">
                <button className="btn-attendance check-in">출근하기</button>
                {/* <button className="btn-attendance check-out">퇴근하기</button> */}
              </div>
            </div>
          </div>
        );
}

export default ADComp;