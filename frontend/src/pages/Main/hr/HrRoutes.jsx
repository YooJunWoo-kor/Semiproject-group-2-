
import React from "react";
import {
  Navigate,
  Route,
  Routes,
  useSearchParams
} from "react-router-dom";

import Dashboard from "./Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import Attendance from "./pages/Attendance.js";
import Payroll from "./pages/Payroll.jsx";
import SystemSettings from "./pages/SystemSettings.jsx";
import Nav from "../../../components/Nav.js";

import "./HR.css";
import "./HRUnified.css";

/* =========================================
   인사 · 조직 · 급여 통합 컴포넌트
   ========================================= */

function HrManagement() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab =
    searchParams.get("tab") === "payroll"
      ? "payroll"
      : "employees";

  function changeTab(nextTab) {
    if (nextTab === "payroll") {
      setSearchParams({ tab: "payroll" });
    } else {
      setSearchParams({});
    }
  }

  return (
    <main className="hr-unified-page">

      {/* 통합 페이지 제목 */}
      <header className="hr-unified-header">
        <div>
          <h1>인사·조직·급여 통합관리</h1>
          <p>
            직원 정보, 부서 구성 및 급여 현황을
            한 화면에서 관리합니다.
          </p>
        </div>
      </header>

      {/* 관리 메뉴 탭 */}
      <nav
        className="hr-unified-tabs"
        role="tablist"
        aria-label="인사 통합관리 메뉴"
      >
        <button
          type="button"
          role="tab"
          id="hr-tab-employees"
          aria-controls="hr-unified-panel"
          aria-selected={activeTab === "employees"}
          className={
            activeTab === "employees" ? "active" : ""
          }
          onClick={() => changeTab("employees")}
        >
          직원·부서 관리
        </button>

        <button
          type="button"
          role="tab"
          id="hr-tab-payroll"
          aria-controls="hr-unified-panel"
          aria-selected={activeTab === "payroll"}
          className={
            activeTab === "payroll" ? "active" : ""
          }
          onClick={() => changeTab("payroll")}
        >
          급여 관리
        </button>
      </nav>

      {/* 선택한 탭의 화면 표시 */}
      <div
        id="hr-unified-panel"
        className="hr-unified-content"
        role="tabpanel"
        aria-labelledby={
          activeTab === "employees"
            ? "hr-tab-employees"
            : "hr-tab-payroll"
        }
      >
        {activeTab === "employees" ? (
          <Employees />
        ) : (
          <Payroll />
        )}
      </div>

    </main>
  );
}

/* =========================================
   인사관리 전체 라우터
   ========================================= */

export default function HrRoutes() {
  const mainUrl = "/main/hr";

  const urlList = [
    {
      name: "대시보드",
      url: mainUrl + "/"
    },
    {
      name: "근태·휴가 관리",
      url: mainUrl + "/attendance"
    },
    {
      name: "인사·조직·급여 관리",
      url: mainUrl + "/employees"
    },
    {
      name: "시스템 품목관리",
      url: mainUrl + "/settings"
    }
  ];

  return (
    <div className="sub-main-contain">

      <Nav
        urlist={urlList}
        title="인사관리"
      />

      <Routes>

        <Route
          index
          element={<Dashboard />}
        />

        <Route
          path="employees"
          element={<HrManagement />}
        />

        <Route
          path="departments"
          element={
            <Navigate
              to="/main/hr/employees"
              replace
            />
          }
        />

        <Route
          path="attendance"
          element={<Attendance />}
        />

        <Route
          path="payroll"
          element={
            <Navigate
              to="/main/hr/employees?tab=payroll"
              replace
            />
          }
        />

        <Route
          path="settings"
          element={<SystemSettings />}
        />

      </Routes>

    </div>
  );
}

