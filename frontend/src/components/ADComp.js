import React, { useEffect, useState } from "react";
import { getLoginUser, getAttendance } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";
import WeeklyCalendar from "../components/weeklycalendar/WeeklyCalendar.js";
import DateCount from "./DateCount.js";
import './ADComp.css';
import ADBord from "./ADBord.js";

function ADComp(){
      // 달력과 출퇴근 관리 모듈
    const [data, setData] = useState([]);
    
    useEffect(()=>{
      const dataSet = async () => {
        const getData = await getAttendance();
        setData(getData);
      };
      dataSet();

    }, []);
    
    const [isCalStyile, setCalStyile] = useState(0);
    
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
            <ADBord />
          </div>
        );
}

export default ADComp;