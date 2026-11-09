import React from 'react';
import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom';
import ScheduleModul from './ScheduleModul';
import MeetingRoomPage from "./pages/MeetingRoomPage";


// 일정관리 진입점: 경로와 화면 연결만 담당합니다.
export default function ScheduleHome() {
  const mainUrl = '/main/schedule';
  const cabinetUrl = mainUrl + '/cabinet'

  return (
    <div className="sub-main-contain">
      <div className="sub-border">
          <p>일정관리</p>
          <nav className="sub-main-nav">
            <NavLink key={mainUrl} to ={mainUrl} end>일정관리</NavLink>
            <NavLink key={cabinetUrl} to ={cabinetUrl} end>회의실 등록</NavLink>
          </nav>

          {/* 가운데줄 */}
          <hr style = {{
            marginLeft:"40px",
            marginRight:"40px",
            marginTop: "30px"
          }}/>

          {/* 버튼 클릭하면, 들어온 데이터들 필터링 */}
          <form onSubmit={(e)=>{e.preventDefault()}}className='schedule-nav'>
            <label>
              <input type="radio" value="1" name="scheduleFilter" defaultChecked />
              전체보기
            </label>
            <label>
              <input type='radio' value="2" name="scheduleFilter"/>
              마감임박
            </label>
            <label>
              <input type='radio' value="3" name="scheduleFilter"/>
              주요일정
            </label>
          </form>
      </div>
      <Routes>
        <Route path='/' element={<ScheduleModul />} />
        <Route path='cabinet' element={<MeetingRoomPage/>}/>
        <Route path="*" element={<Navigate to="/main/schedule" replace />} />
      </Routes>
    </div>
  );

}
