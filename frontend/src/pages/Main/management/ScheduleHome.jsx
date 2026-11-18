import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ScheduleModul from './ScheduleModul';
import MeetingRoomPage from "./pages/MeetingRoomPage";


// 일정관리 진입점: 경로와 화면 연결만 담당합니다.
export default function ScheduleHome() {
  const mainUrl = '/main/schedule';
  const cabinetUrl = mainUrl + '/cabinet'
  const [dataType, setDataType] = useState('1');
  const [currontLink, setCurrontLink] = useState('1');

  return (
    <div className="sub-main-contain">
      <div className="sub-border">
          <p>일정관리</p>
          <nav className="sub-main-nav">
            <NavLink key={mainUrl} to ={mainUrl} onClick = {()=>{setCurrontLink(1)}} end>일정관리</NavLink>
            <NavLink key={cabinetUrl} to ={cabinetUrl} onClick = {()=>{setCurrontLink(2)}} end>회의실 등록</NavLink>
          </nav>

        {currontLink == '1' ? (
            <div>

              <hr style = {{
                marginLeft:"40px",
                marginRight:"40px",
                marginTop: "30px"
              }}/>
  
              <form className="schedule-nav">
                <label>
                  <input
                    type="radio"
                    value="1"
                    name="scheduleFilter"
                    checked={Number(dataType) === 1}
                    onChange={(e) => setDataType(Number(e.target.value))}
                  />
                  전체보기
                </label>
                <label>
                  <input
                    type="radio"
                    value="2"
                    name="scheduleFilter"
                    checked={Number(dataType) === 2}
                    onChange={(e) => setDataType(Number(e.target.value))}
                  />
                  내 일정
                </label>
                <label>
                  <input
                    type="radio"
                    value="3"
                    name="scheduleFilter"
                    checked={Number(dataType) === 3}
                    onChange={(e) => setDataType(Number(e.target.value))}
                  />
                  마감임박
                </label>
                <label>
                  <input
                    type="radio"
                    value="4"
                    name="scheduleFilter"
                    checked={Number(dataType) === 4}
                    onChange={(e) => setDataType(Number(e.target.value))}
                  />
                  주요일정
                </label>
              </form>
            </div>)
        : null
        }
      </div>
      <Routes>
        <Route path='/' element={<ScheduleModul dataType={dataType}/>} />
        <Route path='/cabinet' element={<MeetingRoomPage/>} />
      </Routes>
    </div>
  );

}
