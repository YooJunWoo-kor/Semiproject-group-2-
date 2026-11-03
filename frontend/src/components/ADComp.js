import React, { useEffect, useState } from "react";
import { getLoginUser, getAttendance } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";
import WeeklyCalendar from "../components/weeklycalendar/WeeklyCalendar.js";
import DateCount from "./DateCount.js";
import './ADComp.css';

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

    const user = getLoginUser();
    const userName = user?.name;
    
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
                {/* 숫자카운트 */}
                <DateCount />
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