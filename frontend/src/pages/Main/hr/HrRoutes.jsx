import { Navigate, Route, Routes } from 'react-router-dom';

import Dashboard from './Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Departments from './pages/Departments.jsx';
import Attendance from './pages/Attendance.js';
import Payroll from './pages/Payroll.jsx';
import SystemSettings from './pages/SystemSettings.jsx';
import Nav from '../../../components/Nav.js';
import '../../../css/HR.css';

export default function HrRoutes() {
  
  let mainUrl = "/main/hr";
  // HR 왼쪽 메뉴와 하위 화면 경로를 한곳에서 관리합니다.
  const urlList = [
      {name:"대시보드", url:mainUrl+"/"}
      ,{name:"근태 관리", url:mainUrl+"/attendance"}
      ,{name:"직원 관리", url:mainUrl+"/employees"}
      ,{name:"부서 관리", url:mainUrl+"/departments"}
      ,{name:"급여 관리", url:mainUrl+"/payroll"}
      ,{name:"시스템 품목관리", url:mainUrl+"/settings"}
  ];
  return (
    <div className='sub-main-contain'>
      <Nav urlist={urlList}/>
      {/* 주소에 따라 HR 대시보드와 각 관리 화면을 전환합니다. */}
      <Routes>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="departments" element={<Departments />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="settings" element={<SystemSettings />} />
      </Routes>
    </div>
  );
}
