import { Navigate, Route, Routes } from 'react-router-dom';

<<<<<<< HEAD
import Dashboard from './Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Departments from './pages/Departments.jsx';
import Attendance from './pages/Attendance.js';
=======
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Departments from './pages/Departments.jsx';
import Attendance from './pages/Attendance.jsx';
>>>>>>> origin/kds
import Payroll from './pages/Payroll.jsx';
import SystemSettings from './pages/SystemSettings.jsx';
import Nav from '../../../components/Nav.js';

export default function HrRoutes() {
<<<<<<< HEAD
  
  let mainUrl = "/main/hr/";
  const urlList = [
      {name:"대시보드", url:mainUrl+"/"}
      ,{name:"근태 관리", url:mainUrl+"/attendance"}
      ,{name:"직원 관리", url:mainUrl+"/employees"}
      ,{name:"부서 관리", url:mainUrl+"/departments"}
=======
  let mainUrl = "/main/hr/";
  const urlList = [
      {name:"대시보드", url:mainUrl+"/"}
      ,{name:"직원 관리", url:mainUrl+"/employees"}
      ,{name:"부서 관리", url:mainUrl+"/departments"}
      ,{name:"근태 관리", url:mainUrl+"/attendance"}
>>>>>>> origin/kds
      ,{name:"급여 관리", url:mainUrl+"/payroll"}
      ,{name:"시스템 품목관리", url:mainUrl+"/settings"}
  ];
  return (
    <div className='sub-main-contain'>
      <Nav urlist={urlList}/>
      <Routes>
<<<<<<< HEAD
          <Route index element={<Dashboard />} />
=======
          <Route index element={<Dashboard userName="김대성" />} />
>>>>>>> origin/kds
          <Route path="employees" element={<Employees />} />
          <Route path="departments" element={<Departments />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="settings" element={<SystemSettings />} />
      </Routes>
    </div>
  );
}
