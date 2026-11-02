import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScheduleManager from './components/ScheduleManager';
import ScheduleModul from './ScheduleModul';
import ScheduleNotifications from './pages/ScheduleNotifications';
import ScheduleCalendar from './pages/ScheduleCalendar';
import ScheduleList from './pages/ScheduleList';
import ScheduleRoomTimetable from './pages/ScheduleRoomTimetable';
import MeetingRoomManagement from './pages/MeetingRoomManagement';
import Nav from '../../../components/Nav';


// 일정관리 진입점: 경로와 화면 연결만 담당합니다.
export default function ScheduleHome() {
  const mainUrl = '/main/schedule';
  const urlList = [
    { name: '메인', url: mainUrl },
    { name: '일정 알림', url: mainUrl + '/notifications' },
    { name: '일정 달력', url: mainUrl + '/calendar' },
    { name: '일정 목록', url: mainUrl + '/list' },
    { name: '회의실 시간표', url: mainUrl + '/room' },
    { name: '회의실 관리', url: mainUrl + '/rooms' },
  ];

  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} />
      <Routes>
        <Route element={<ScheduleManager />}>
          <Route index element={<ScheduleModul />} />
          <Route path="notifications" element={<ScheduleNotifications />} />
          <Route path="calendar/*" element={<ScheduleCalendar />} />
          <Route path="list/*" element={<ScheduleList />} />
          <Route path="room/*" element={<ScheduleRoomTimetable />} />
          <Route path="rooms" element={<MeetingRoomManagement />} />
          <Route path="*" element={<Navigate to="/main/schedule" replace />} />
        </Route>
      </Routes>
    </div>
  );

}
