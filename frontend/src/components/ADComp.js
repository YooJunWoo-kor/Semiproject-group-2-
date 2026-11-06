import React, { useEffect, useState } from "react";
import { getAttendance } from "../utils/authStorage";
import BasicCalendar from "../components/calendar/BasicCalendar.js";
import WeeklyCalendar from "../components/weeklycalendar/WeeklyCalendar.js";
import DateCount from "./DateCount.js";
import './ADComp.css';
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
      console.log(getData);
      setData(getData);
      getData.map((item)=>{
        if(item.start == currontDay){
          if(item.title == '근무중'){
            resetAttendBtnStl = 1;
          }
          else{
            resetAttendBtnStl = 2;
          }

          console.log("출근버튼 처리 완료");
          setAttendBtnStl(resetAttendBtnStl);
        }});
    };

    //출근버튼을 눌렀을때 최신상태 갱신
    const resetData = ()=>{
      dataSet();
    };

    //최초 데이터 실행
    useEffect(()=>{
      dataSet();
    }, []);

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
            <ADBord dataSet={resetData} btnStl = {attendBtnStl}/>
          </div>
        );
}

export default ADComp;
