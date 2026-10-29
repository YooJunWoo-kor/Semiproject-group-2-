import React, { useEffect, useState } from "react";
import { getLoginUser } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";

function ADComp({style, schedule = [], showWeekly = false}){
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
            출결현황 달력 : 주, 달<br/>
            <BasicCalendar schedule={schedule} showWeekly={showWeekly} />
            출결관리
            {userName}님
            {timeString}
            <button>출근</button>
        </div>
    )
}

export default ADComp;
