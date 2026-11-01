import React, { useState } from "react";
import BasicCalendar from "./calendar/BasicCalendar";
import WeeklyCalendar from "./weeklycalendar/WeeklyCalendar";

//스케쥬ㄹ관련 보드

function ScheduleBoard(){

    const[isCalStyile, setCalStyile] = useState(0);
    const data = [];

    return(
        <div className="attendance-card" >
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
        );
}

export default ScheduleBoard;