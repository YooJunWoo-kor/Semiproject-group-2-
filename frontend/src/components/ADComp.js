import React, { useEffect, useState } from "react";
import { getAttendance } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";
import WeeklyCalendar from "../components/weeklycalendar/WeeklyCalendar.js";
import '../css/ADComp.css';
import ADBord from "./ADBord.js";

function ADComp(){
    // 달력과 출퇴근 관리 모듈
    const [data, setData] = useState([]);
    //출결버튼 관리
    let resetAttendBtnStl = 0;
    let [attendBtnStl, setAttendBtnStl] = useState(0);

    //오늘 날짜 계산
    const newDay = new Date();
    const year = newDay.getFullYear();
    const month = String(newDay.getMonth() + 1).padStart(2, '0');
    const day = String(newDay.getDate()).padStart(2, '0');
    let currontDay = year + '-' + month + '-' + day;

    //근테관련 데이터 get
    const dataSet = async () => {
      const getData = await getAttendance();
  
      setData(getData);
  
      const todayRecord = getData.find(
          (item) => item.start === currontDay
      );
  
      if (!todayRecord) {
          setAttendBtnStl(0);
      } else if (todayRecord.title === '근무중') {
          setAttendBtnStl(1);
      } else {
          setAttendBtnStl(2);
      }
  };

    //출근버튼을 눌렀을때 최신상태 갱신
    const resetData = ()=>{
      return dataSet();
    };

    //최초 데이터 실행
    useEffect(()=>{
      dataSet();
    }, []);

    const [isCalStyile, setCalStyile] = useState(0);
    
    return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: '20px',                /* 달력과 출퇴근 카드 사이 간격 */
            boxSizing: 'border-box',
            flex: '1'
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
            <ADBord dataSet={resetData} btnStl = {attendBtnStl}/>
          </div>
        );
}

export default ADComp;