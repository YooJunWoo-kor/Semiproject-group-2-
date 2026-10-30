import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ScheduleModul from './ScheduleModul';
import ScheduleRoomTimetable from './pages/ScheduleRoomTimetable';
import MeetingRoomManagement from './pages/MeetingRoomManagement';
import Nav from '../../../components/Nav';


// 일정관리 진입점: 경로와 화면 연결만 담당합니다.
export default function ScheduleHome() {
  const mainUrl = '/main/schedule';
  const urlList = [
    { name: '메인', url: mainUrl },
    { name: '회의실 시간표', url: mainUrl + '/room' },
    { name: '회의실 관리', url: mainUrl + '/rooms' },
  ];

  return (
    <div className="sub-main-contain">
      <div className="sub-main-nav">
        <ul>
          <li>일정관리</li>
          <li><Link to ={mainUrl}>일정관리</Link></li>
          <li><Link to ={mainUrl}>회의실 등록</Link></li>
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
        </ul>
      </div>
      <Routes>
        <Route index element={<ScheduleModul />} />
        <Route path="room/*" element={<ScheduleRoomTimetable />} />
        <Route path="rooms" element={<MeetingRoomManagement />} />
        <Route path="*" element={<Navigate to="/main/schedule" replace />} />
      </Routes>
    </div>
  );

}
