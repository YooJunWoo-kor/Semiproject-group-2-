import React from 'react';
import './ScheduleManagement.css';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ScheduleModul from './ScheduleModul';
import ScheduleCalendar from './pages/ScheduleCalendar';
import ScheduleList from './pages/ScheduleList';
import ScheduleDialogs from './components/ScheduleDialogs';
import ScheduleRoomTimetable from './pages/ScheduleRoomTimetable';

const menu = [
    ['', '일정 홈'],
    ['calendar', '달력'],
    ['list', '일정 목록'],
    ['rooms', '회의실 시간표']
];

export default function ScheduleHome() {
    return <div className="schedule-page">
        <nav className="schedule-sidebar" aria-label="일정관리 메뉴">
            <h2>일정관리</h2>
            {menu.map(([path, title]) => <p key={path}>
                <NavLink end={!path} to={path ? `/main/schedule/${path}` : '/main/schedule'}>{title}</NavLink>
            </p>)}
        </nav>
        <main className="schedule-content">
            <Routes>
                <Route index element={<ScheduleModul />} />
                <Route path="calendar" element={<ScheduleCalendar />} />
                <Route path="list" element={<ScheduleList />} />
                <Route path="rooms" element={<ScheduleRoomTimetable />} />
                <Route path="*" element={<Navigate to="/main/schedule" replace />} />
            </Routes>
        </main>
        <ScheduleDialogs />
    </div>
}
