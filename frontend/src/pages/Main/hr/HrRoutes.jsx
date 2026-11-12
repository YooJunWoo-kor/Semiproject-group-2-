
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard.jsx";
import UnifiedEmployees from "./pages/UnifiedEmployees.jsx";
import Attendance from "./pages/Attendance.js";
import SystemSettings from "./pages/SystemSettings.jsx";
import Nav from "../../../components/Nav.js";
import "./HR.css";


export default function HrRoutes() {
  const mainUrl = "/main/hr";

  const urlList = [
    { name: "대시보드", url: mainUrl + "/" },
    { name: "근태·휴가 관리", url: mainUrl + "/attendance" },
    { name: "인사·조직 통합관리", url: mainUrl + "/employees" },
    { name: "시스템 품목관리", url: mainUrl + "/settings" }
  ];

  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} title="인사관리" />

      <Routes>
        <Route index element={<Dashboard />} />
        <Route
          path="employees"
          element={<UnifiedEmployees />}
        />
        <Route
          path="departments"
          element={
            <Navigate to="/main/hr/employees" replace />
          }
        />
        <Route
          path="payroll"
          element={
            <Navigate to="/main/hr/employees" replace />
          }
        />
        <Route
          path="attendance"
          element={<Attendance />}
        />
        <Route
          path="settings"
          element={<SystemSettings />}
        />
      </Routes>
    </div>
  );
}
