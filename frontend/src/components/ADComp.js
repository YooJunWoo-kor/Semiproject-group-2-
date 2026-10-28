import React, { useEffect, useState } from "react";
import { getLoginUser } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";

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

function ADComp({style}){
    const user = getLoginUser();
    const userName = user?.name;
    
    const[time, setTime] = useState(new Date());
    const hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2,'0');
    const seconds = String(time.getSeconds()).padStart(2,'0');
    const timeString = hours + ":" + minutes + ":" + seconds;

    useEffect(()=>{
        const timer = setInterval(() => {
            setTime(new Date());
          }, 1000);

          return ()=>{
            clearInterval(timer);
          };
        }, []);

    return(
        <div style={style}>
            <BasicCalendar schedule={data}/>
            출결관리
            {userName}님
            {timeString}
            <button>출근</button>
        </div>
    )
}

export default ADComp;