import React, { useEffect, useState } from "react";

//현제 시각 카운트 모듈.
function DateCount(){
    //숫자만 리렌더링 할 수 있도록 따로 컴포넌트를 분리했습니다.
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
        <div className="attendance-clock-box">
            <span className="clock-label">현재 시각</span>
            <span className="clock-time">{timeString}</span>
        </div>
    )
}

export default DateCount;