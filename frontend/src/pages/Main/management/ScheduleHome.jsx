
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from '../../../components/Nav';
import ScheduleModul from './ScheduleModul';
import ScheduleCalendar from './pages/ScheduleCalendar';
import ScheduleList from './pages/ScheduleList';
import ScheduleRoomTimetable from './pages/ScheduleRoomTimetable';
import SchedulePage from './components/SchedulePage';
import MySchedule from './pages/MySchedule';
import MeetingRoomManagement from './pages/MeetingRoomManagement';

function ScheduleHome() {

    const mainUrl = '/main/schedule';

    const urlList = [
        { name: '대시보드', url: mainUrl },
        { name: '일정 달력', url: mainUrl + '/calendar' },
        { name: '일정 목록', url: mainUrl + '/list' },
        { name: '회의실 시간표', url: mainUrl + '/room' },
        { name: '내 일정', url: mainUrl + '/my' },
        { name: '회의실 관리', url: mainUrl + '/rooms' },
    ];

    return (
        <div className="sub-main-contain">

            {/* 왼쪽 메뉴 */}
            <Nav urlist={urlList} />

            {/* 오른쪽 화면 */}
            <Routes>
                <Route element={<SchedulePage />}>
                    <Route index element={<ScheduleModul />} />
                    <Route path="calendar/*" element={<ScheduleCalendar />} />
                    <Route path="list/*" element={<ScheduleList />} />
                    <Route path="room/*" element={<ScheduleRoomTimetable />} />
                    <Route path="my" element={<MySchedule />} />
                    <Route path="rooms" element={<MeetingRoomManagement />} />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to={mainUrl} replace />}
                />
            </Routes>

        </div>

    );
}

export default ScheduleHome;
