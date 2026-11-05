import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  getHrAttendance,
  getHrOrganization
} from "../../../../components/HrData";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function getLatestMonth(data) {
  const months = data
    .map((item) => (item.attendanceDate || "").slice(0, 7))
    .filter(Boolean)
    .sort();

  return months.length > 0 ? months[months.length - 1] : "";
}

function createDepartmentList(data) {
  return data.reduce((list, item) => {
    if (item.departmentName && !list.includes(item.departmentName)) {
      list.push(item.departmentName);
    }
    return list;
  }, []);
}

function createEmployeeList(data, department, searchKeyword) {
  const keyword = searchKeyword.trim().toLowerCase();

  return data.filter((employee) => {
    if (department !== "전체" && employee.departmentName !== department) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      employee.employeeNumber,
      employee.employeeName,
      employee.email,
      employee.position,
      employee.departmentName
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ")
      .includes(keyword);
  });
}

function calculateAttendanceRate(data, month, employeeId) {
  const records = data.filter(
    (item) =>
      String(item.employeeId) === String(employeeId) &&
      String(item.attendanceDate || "").startsWith(month)
  );

  if (records.length === 0) {
    return "-";
  }

  const normalCount = records.filter((item) => item.status === "정상").length;
  return `${Math.round((normalCount / records.length) * 100)}%`;
}

function getWeekday(value) {
  if (!value) return "-";
  const parts = value.split("-");
  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
  return Number.isNaN(date.getTime()) ? "-" : weekdays[date.getDay()];
}

function calculateWorkTime(clockIn, clockOut) {
  if (!clockIn || !clockOut) return "-";
  const start = clockIn.split(":");
  const end = clockOut.split(":");
  const minutes =
    Number(end[0]) * 60 +
    Number(end[1]) -
    Number(start[0]) * 60 -
    Number(start[1]);

  if (Number.isNaN(minutes) || minutes < 0) return "-";
  return `${Math.floor(minutes / 60)}시간 ${String(minutes % 60).padStart(
    2,
    "0"
  )}분`;
}

function getStatusClass(status) {
  if (status === "정상") return "working";
  if (status === "지각") return "late";
  if (status === "휴가") return "leave";
  return "off";
}

export default function Attendance() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === "MASTER";
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAttendancePage() {
      setLoading(true);
      setError("");

      try {
        const [departmentResponse, employeeResponse] =
          await getHrOrganization();
        const attendanceResponse = await getHrAttendance();

        if (
          !employeeResponse.data.success ||
          !Array.isArray(employeeResponse.data.data) ||
          !departmentResponse.data.success ||
          !Array.isArray(departmentResponse.data.data) ||
          !attendanceResponse.data.success ||
          !Array.isArray(attendanceResponse.data.data)
        ) {
          throw new Error("근태관리 자료 형식이 올바르지 않습니다.");
        }

        if (!ignore) {
          const employeeRows = employeeResponse.data.data.map((employee) => ({
            ...employee,
            employeeName: employee.employeeName || employee.name
          }));
          const attendanceRows = attendanceResponse.data.data;

          setEmployees(employeeRows);
          setDepartments(departmentResponse.data.data);
          setAttendanceData(attendanceRows);
          setSelectedMonth(getLatestMonth(attendanceRows));
        }
      } catch (requestError) {
        console.error("근태관리 자료 조회 오류:", requestError);

        if (!ignore) {
          setEmployees([]);
          setDepartments([]);
          setAttendanceData([]);
          setError("근태관리 자료를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAttendancePage();

    return () => {
      ignore = true;
    };
  }, []);

  const departmentList = createDepartmentList(departments);
  const employeeList = createEmployeeList(
    employees,
    selectedDepartment,
    keyword
  );
  const selectedEmployee = employeeList.find(
    (employee) => String(employee.employeeId) === String(selectedEmployeeId)
  );

  useEffect(() => {
    if (!selectedEmployee) {
      setSelectedEmployeeId(employeeList[0]?.employeeId || null);
    }
  }, [employeeList, selectedEmployee, selectedEmployeeId]);

  const selectedAttendance = attendanceData
    .filter(
      (item) =>
        String(item.employeeId) === String(selectedEmployeeId) &&
        String(item.attendanceDate || "").startsWith(selectedMonth)
    )
    .sort((first, second) =>
      String(second.attendanceDate || "").localeCompare(
        String(first.attendanceDate || "")
      )
    );
  const normalCount = selectedAttendance.filter(
    (item) => item.status === "정상"
  ).length;
  const lateCount = selectedAttendance.filter(
    (item) => item.status === "지각"
  ).length;
  const leaveCount = selectedAttendance.filter(
    (item) => item.status === "휴가"
  ).length;
  const tableHeaders = [
    "날짜",
    "요일",
    "출근",
    "퇴근",
    "근무시간",
    "상태",
    "메모"
  ];
  const tableData = selectedAttendance.map((attendance) => ({
    content: [
      attendance.attendanceDate,
      getWeekday(attendance.attendanceDate),
      <span className="emp-time" key={`${attendance.attendanceId}-in`}>
        {attendance.clockIn || "-"}
      </span>,
      <span className="emp-time" key={`${attendance.attendanceId}-out`}>
        {attendance.clockOut || "-"}
      </span>,
      calculateWorkTime(attendance.clockIn, attendance.clockOut),
      <span
        className={`status-tag ${getStatusClass(attendance.status)}`}
        key={`${attendance.attendanceId}-status`}
      >
        {attendance.status || "-"}
      </span>,
      attendance.memo || "-"
    ]
  }));

  function resetFilters() {
    setSelectedMonth(getLatestMonth(attendanceData));
    setSelectedDepartment("전체");
    setKeyword("");
    setSelectedEmployeeId(null);
  }

  return (
    <div className="sub-container hr-attendance-management">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">근태관리</span>
          <span className="subtext">
            직원별 월간 근태 현황과 일별 기록을 확인합니다.
          </span>
        </div>
        <div className="dashboard-top">
          {isMaster && (
            <Link to="/main/hr/employees" className="register-btn">
              근태수정
            </Link>
          )}
        </div>
      </header>

      <section className="attendance-filter" aria-label="근태 조회 조건">
        <label className="attendance-filter-field">
          <span>기준 월</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
        <label className="attendance-filter-field">
          <span>부서</span>
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
          >
            <option value="전체">전체</option>
            {departmentList.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>
        <label className="attendance-filter-field attendance-keyword-field">
          <span>직원명</span>
          <input
            type="text"
            placeholder="직원명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="register-btn attendance-reset-button"
          onClick={resetFilters}
        >
          초기화
        </button>
      </section>

      {loading ? (
        <p className="attendance-feedback" role="status">
          근태자료를 불러오는 중입니다.
        </p>
      ) : error ? (
        <p className="attendance-feedback attendance-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="attendance-layout">
          <section className="attendance-card employee-list-panel">
            <div className="employee-list-header">
              <div>
                <h2>직원 목록</h2>
                <p>{selectedMonth || "기준 월 미선택"}</p>
              </div>
              <strong>{employeeList.length}명</strong>
            </div>
            {employeeList.length === 0 ? (
              <p className="attendance-empty">조건에 맞는 직원이 없습니다.</p>
            ) : (
              <div className="employee-list">
                {employeeList.map((employee) => (
                  <button
                    key={employee.employeeId}
                    type="button"
                    className={`employee-item ${
                      String(employee.employeeId) ===
                      String(selectedEmployeeId)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setSelectedEmployeeId(employee.employeeId)}
                  >
                    <span className="employee-item-info">
                      <strong className="emp-name">
                        {employee.employeeName}
                      </strong>
                      <span>
                        {employee.departmentName} ·{" "}
                        <span className="emp-position">
                          {employee.position}
                        </span>
                      </span>
                    </span>
                    <span className="employee-attendance-rate">
                      <small>출근율</small>
                      <strong>
                        {calculateAttendanceRate(
                          attendanceData,
                          selectedMonth,
                          employee.employeeId
                        )}
                      </strong>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="attendance-detail-panel">
            {selectedEmployee ? (
              <>
                <div className="attendance-detail-header">
                  <div>
                    <span className="attendance-badge">선택 직원</span>
                    <h2>{selectedEmployee.employeeName}</h2>
                    <p>
                      {selectedEmployee.departmentName} ·{" "}
                      {selectedEmployee.position}
                    </p>
                  </div>
                  <div className="detail-attendance-rate">
                    <span>출근율</span>
                    <strong>
                      {calculateAttendanceRate(
                        attendanceData,
                        selectedMonth,
                        selectedEmployee.employeeId
                      )}
                    </strong>
                  </div>
                </div>
                <div className="attendance-summary">
                  <div className="summary-item">
                    <span>근무일</span>
                    <strong>{selectedAttendance.length}</strong>
                  </div>
                  <div className="summary-item">
                    <span>정상</span>
                    <strong>{normalCount}</strong>
                  </div>
                  <div className="summary-item">
                    <span>지각</span>
                    <strong>{lateCount}</strong>
                  </div>
                  <div className="summary-item">
                    <span>휴가</span>
                    <strong>{leaveCount}</strong>
                  </div>
                </div>
                {tableData.length > 0 ? (
                  <PaginationTable
                    key={`${selectedEmployeeId}-${selectedMonth}`}
                    title="일별 근태 기록"
                    th={tableHeaders}
                    allData={tableData}
                    itemsPerPage={8}
                  />
                ) : (
                  <p className="attendance-empty">
                    해당 월의 근태 기록이 없습니다.
                  </p>
                )}
              </>
            ) : (
              <p className="attendance-empty">
                상세 근태를 확인할 직원을 선택해 주세요.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
