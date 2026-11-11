
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import ModalBase from "../../../../components/ModalBase";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  decideHrLeave,
  getHrAttendance,
  getHrLeavesByYear,
  getHrLeaves,
  getHrOrganization,
  createHrAttendance,
  deleteHrAttendance,
  updateHrAttendance
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

function countDepartmentEmployees(employees, departmentId) {
  return employees.filter(
    (employee) =>
      String(employee.departmentId) === String(departmentId) &&
      employee.employmentStatus !== "퇴사"
  ).length;
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

function isApprovedLeave(leave) {
  return leave.applicationStatus === "승인완료";
}

function getLeaveStatusClass(status) {
  if (status === "승인완료") return "working";
  if (status === "반려") return "off";
  return "late";
}

function getWorkMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return null;

  const start = clockIn.split(":");
  const end = clockOut.split(":");
  const minutes =
    Number(end[0]) * 60 +
    Number(end[1]) -
    Number(start[0]) * 60 -
    Number(start[1]);

  return Number.isSafeInteger(minutes) && minutes >= 0 ? minutes : null;
}

function formatMinutes(minutes) {
  if (!Number.isSafeInteger(minutes)) return "-";

  return `${Math.floor(minutes / 60)}시간 ${String(minutes % 60).padStart(
    2,
    "0"
  )}분`;
}

function getAttendanceAnomaly(attendance) {
  if (attendance.status === "지각") return "지각";
  if (attendance.status === "미출근") return "결근";
  if (attendance.status === "출장") return "출장";

  const workMinutes = getWorkMinutes(
    attendance.clockIn,
    attendance.clockOut
  );

  return workMinutes !== null && workMinutes < 8 * 60
    ? "조기퇴근"
    : "";
}

function AttendanceAnomalies({ records }) {
  const anomalies = records
    .map((attendance) => ({
      ...attendance,
      anomalyType: getAttendanceAnomaly(attendance)
    }))
    .filter((attendance) => attendance.anomalyType);

  if (anomalies.length === 0) {
    return <p className="attendance-empty">이상 근태 기록이 없습니다.</p>;
  }

  return (
    <div className="attendance-subview">
      <div className="attendance-subview-heading">
        <div>
          <h3>이상 근태</h3>
          <p>지각·결근·조기퇴근·출장 기록을 확인합니다.</p>
        </div>
        <strong>{anomalies.length}건</strong>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>출근 시간</th>
              <th>퇴근 시간</th>
              <th>구분</th>
              <th>근무시간</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((attendance) => (
              <tr key={attendance.attendanceId}>
                <td>{attendance.attendanceDate}</td>
                <td>{attendance.clockIn || "-"}</td>
                <td>{attendance.clockOut || "-"}</td>
                <td>
                  <span className="status-tag late">
                    {attendance.anomalyType}
                  </span>
                </td>
                <td>
                  {formatMinutes(
                    getWorkMinutes(attendance.clockIn, attendance.clockOut)
                  )}
                </td>
                <td>{attendance.memo || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceProgressBar({ label, percent, value, detail, tone = "brand" }) {
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));

  return (
    <div className="attendance-progress-item">
      <div className="attendance-progress-heading">
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
        </div>
        <b>{value}</b>
      </div>
      <div
        className="attendance-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(safePercent)}
      >
        <div
          className={`attendance-progress-fill ${tone}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
      <span className="attendance-progress-percent">
        {Math.round(safePercent)}%
      </span>
    </div>
  );
}

function AttendanceStatistics({ records, month }) {
  const monthRecords = records.filter((attendance) =>
    String(attendance.attendanceDate || "").startsWith(month)
  );
  const workMinutes = monthRecords.reduce((total, attendance) => {
    const minutes = getWorkMinutes(attendance.clockIn, attendance.clockOut);
    return total + (minutes || 0);
  }, 0);
  const overtimeMinutes = monthRecords.reduce((total, attendance) => {
    const minutes = getWorkMinutes(attendance.clockIn, attendance.clockOut);
    return total + (minutes && minutes > 8 * 60 ? minutes - 8 * 60 : 0);
  }, 0);
  const recordCount = monthRecords.length;
  const clockedInCount = monthRecords.filter((item) => item.clockIn).length;
  const normalCount = monthRecords.filter((item) => item.status === "정상").length;
  const lateCount = monthRecords.filter((item) => item.status === "지각").length;
  const leaveCount = monthRecords.filter((item) => item.status === "휴가").length;
  const businessTripCount = monthRecords.filter((item) => item.status === "출장").length;
  const absenceCount = monthRecords.filter((item) => item.status === "미출근").length;
  const expectedWorkMinutes = clockedInCount * 8 * 60;
  const workTimeRate = expectedWorkMinutes
    ? (workMinutes / expectedWorkMinutes) * 100
    : 0;

  return (
    <div className="attendance-subview">
      <div className="attendance-subview-heading">
        <div>
          <h3>월별 근태 통계</h3>
          <p>{month || "기준 월 미선택"} 기준 실제 근태 기록</p>
        </div>
      </div>
      {monthRecords.length === 0 ? (
        <p className="attendance-empty">해당 월의 근태 기록이 없습니다.</p>
      ) : (
        <div className="attendance-statistics-content">
          <div className="attendance-progress-card">
            <div className="attendance-progress-card-heading">
              <div>
                <strong>월별 근태 진행 현황</strong>
                <span>기존 일정 진행률 바의 UI를 근태 데이터에 맞게 적용했습니다.</span>
              </div>
              <b>{recordCount}건</b>
            </div>

            <div className="attendance-progress-list">
              <AttendanceProgressBar
                label="정상 출근율"
                percent={recordCount ? (normalCount / recordCount) * 100 : 0}
                value={`${normalCount}건`}
                detail={`전체 근태 기록 ${recordCount}건`}
                tone="brand"
              />
              <AttendanceProgressBar
                label="출근 처리율"
                percent={recordCount ? (clockedInCount / recordCount) * 100 : 0}
                value={`${clockedInCount}건`}
                detail="출근 시간이 저장된 실제 기록"
                tone="success"
              />
              <AttendanceProgressBar
                label="지각 비율"
                percent={recordCount ? (lateCount / recordCount) * 100 : 0}
                value={`${lateCount}건`}
                detail="DB 상태값이 지각인 기록"
                tone="warning"
              />
              <AttendanceProgressBar
                label="총 근무시간 달성률"
                percent={workTimeRate}
                value={formatMinutes(workMinutes)}
                detail={`출근일 ${clockedInCount}일 × 8시간 기준 · 초과 ${formatMinutes(overtimeMinutes)}`}
                tone="info"
              />
            </div>

            <div className="attendance-progress-statuses">
              {[
                ["정상", normalCount, "brand"],
                ["지각", lateCount, "warning"],
                ["휴가", leaveCount, "info"],
                ["출장", businessTripCount, "success"],
                ["결근", absenceCount, "danger"]
              ].map(([label, count, tone]) => (
                <div className="attendance-progress-status" key={label}>
                  <span>{label}</span>
                  <strong className={tone}>{count}건</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeavePendingView({ leaves, loginEmployeeId, onDecide, saving }) {
  const pending = leaves.filter(
    (leave) => leave.applicationStatus === "승인대기"
  );

  if (pending.length === 0) {
    return <p className="attendance-empty">승인 대기 중인 휴가 신청이 없습니다.</p>;
  }

  return (
    <div className="attendance-subview">
      <div className="attendance-subview-heading">
        <div>
          <h3>승인 대기</h3>
          <p>현재 로그인한 승인자에게 배정된 신청만 처리할 수 있습니다.</p>
        </div>
        <strong>{pending.length}건</strong>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>신청 직원</th>
              <th>휴가 유형</th>
              <th>휴가 기간</th>
              <th>일수</th>
              <th>신청 사유</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((leave) => {
              const canDecide =
                Number(leave.approverId) === Number(loginEmployeeId);

              return (
                <tr key={leave.leaveId}>
                  <td>{leave.employeeName}</td>
                  <td>{leave.leaveType || "휴가"}</td>
                  <td>{leave.startDate} ~ {leave.endDate}</td>
                  <td>{leave.leaveDays ?? "-"}일</td>
                  <td>{leave.reason || "-"}</td>
                  <td>
                    {canDecide ? (
                      <div className="attendance-leave-actions">
                        <button
                          type="button"
                          className="erp-primary-button"
                          onClick={() => onDecide(leave, "approve")}
                          disabled={saving}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          className="attendance-leave-reject-button"
                          onClick={() => onDecide(leave, "reject")}
                          disabled={saving}
                        >
                          반려
                        </button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaveBalanceView({ employee, leaves, year }) {
  const employeeLeaves = leaves.filter(
    (leave) => String(leave.employeeId) === String(employee.employeeId)
  );
  const approvedLeaves = employeeLeaves.filter(isApprovedLeave);
  const pendingLeaves = employeeLeaves.filter(
    (leave) => leave.applicationStatus === "승인대기"
  );
  const usedDays = approvedLeaves.reduce(
    (total, leave) => total + Number(leave.leaveDays || 0),
    0
  );
  const pendingDays = pendingLeaves.reduce(
    (total, leave) => total + Number(leave.leaveDays || 0),
    0
  );

  return (
    <div className="attendance-subview">
      <div className="attendance-subview-heading">
        <div>
          <h3>{employee.employeeName} {year}년 연차 현황</h3>
          <p>선택 직원의 연차 부여·사용 현황입니다.</p>
        </div>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>기준 연도</th>
              <th>부여 연차</th>
              <th>이월·조정</th>
              <th>사용 일수</th>
              <th>승인 대기</th>
              <th>잔여 연차</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{year}년</td>
              <td>미등록</td>
              <td>-</td>
              <td>{usedDays}일</td>
              <td>{pendingDays}일</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>



      <div className="attendance-subview-heading attendance-leave-history-heading">
        <div>
          <h3>연차 사용 내역</h3>
          <p>승인 완료된 휴가 사용 내역입니다.</p>
        </div>
      </div>
      <div className="table-shell attendance-leave-history-table">
        <table>
          <thead>
            <tr>
              <th>휴가 유형</th>
              <th>사용 기간</th>
              <th>사용 일수</th>
              <th>신청 상태</th>
              <th>신청일</th>
              <th>승인일</th>
            </tr>
          </thead>
          <tbody>
            {approvedLeaves.length === 0 ? (
              <tr>
                <td colSpan="6" className="attendance-leave-history-empty">
                  승인 완료된 휴가 사용 내역이 없습니다.
                </td>
              </tr>
            ) : (
              approvedLeaves.map((leave) => (
                <tr key={leave.leaveId}>
                  <td>{leave.leaveType || "휴가"}</td>
                  <td>{leave.startDate} ~ {leave.endDate}</td>
                  <td>{leave.leaveDays ?? "-"}일</td>
                  <td>
                    <span className="status-tag working">
                      {leave.applicationStatus}
                    </span>
                  </td>
                  <td>{leave.applicationDate || "-"}</td>
                  <td>{leave.approvalDate || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceEmployeeHeader({
  employee,
  isAttendanceTab,
  attendanceRate,
  leaveCount,
  isLeaveBalance,
  children
}) {
  return (
    <div className={`attendance-detail-header${isLeaveBalance ? " leave-balance-header" : ""}`}>
      <div>
        <span className="attendance-badge">선택 직원</span>
        <h2>{employee.employeeName}</h2>
        <p>
          {employee.employeeNumber || "사번 미지정"} ·{" "}
          {employee.departmentName || "부서 미지정"} ·{" "}
          {employee.position || "직급 미지정"}
        </p>
      </div>
      {children}
      {!isLeaveBalance && (
        <div className="detail-attendance-rate">
          <span>{isAttendanceTab ? "출근율" : "휴가 신청"}</span>
          <strong>{isAttendanceTab ? attendanceRate : `${leaveCount}건`}</strong>
        </div>
      )}
    </div>
  );
}

function AttendanceSubTabs({
  activeTab,
  isAttendanceTab,
  isAttendanceRecords,
  setActiveTab
}) {
  return (
    <nav
      className="attendance-tabs attendance-selected-subtabs"
      aria-label={isAttendanceTab ? "근태 조회 구분" : "휴가 조회 구분"}
    >
      {isAttendanceTab ? (
        <>
          <button
            type="button"
            role="tab"
            className={isAttendanceRecords ? "active" : ""}
            aria-selected={isAttendanceRecords}
            onClick={() => setActiveTab("attendance-records")}
          >
            월별 기록
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "attendance-anomalies" ? "active" : ""}
            aria-selected={activeTab === "attendance-anomalies"}
            onClick={() => setActiveTab("attendance-anomalies")}
          >
            이상 근태
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "attendance-statistics" ? "active" : ""}
            aria-selected={activeTab === "attendance-statistics"}
            onClick={() => setActiveTab("attendance-statistics")}
          >
            월별 통계
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            role="tab"
            className={activeTab === "leave-requests" ? "active" : ""}
            aria-selected={activeTab === "leave-requests"}
            onClick={() => setActiveTab("leave-requests")}
          >
            신청 목록
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "leave-pending" ? "active" : ""}
            aria-selected={activeTab === "leave-pending"}
            onClick={() => setActiveTab("leave-pending")}
          >
            승인 대기
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "leave-balance" ? "active" : ""}
            aria-selected={activeTab === "leave-balance"}
            onClick={() => setActiveTab("leave-balance")}
          >
            연차 현황
          </button>
        </>
      )}
    </nav>
  );
}

function AttendanceEditForm({ attendance, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    workDate: attendance.attendanceDate || "",
    checkIn: attendance.clockIn || "",
    checkOut: attendance.clockOut || "",
    status: attendance.status || "정상",
    memo: attendance.memo || ""
  });

  function changeForm(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      attendanceId: attendance.attendanceId,
      employeeId: attendance.employeeId,
      workDate: form.workDate,
      checkIn: form.checkIn || null,
      checkOut: form.checkOut || null,
      status: form.status,
      memo: form.memo.trim()
    });
  }

  return (
    <form onSubmit={handleSubmit} className="attendance-edit-form">
      <div className="attendance-edit-summary">
        <div><span>직원</span><strong>{attendance.employeeName}</strong></div>
        <div>
          <span>구분</span>
          <strong>{attendance.attendanceId ? "기존 기록 수정" : "신규 기록 입력"}</strong>
        </div>
      </div>

      <label className="attendance-edit-field">
        <span>근무일</span>
        <input
          type="date"
          name="workDate"
          value={form.workDate}
          onChange={changeForm}
          required
          disabled={Boolean(attendance.attendanceId)}
        />
      </label>

      <div className="attendance-edit-time-fields">
        <label className="attendance-edit-field">
          <span>출근 시간</span>
          <input
            type="time"
            name="checkIn"
            value={form.checkIn}
            onChange={changeForm}
          />
        </label>

        <label className="attendance-edit-field">
          <span>퇴근 시간</span>
          <input
            type="time"
            name="checkOut"
            value={form.checkOut}
            onChange={changeForm}
          />
        </label>
      </div>

      <label className="attendance-edit-field">
        <span>상태</span>
        <select name="status" value={form.status} onChange={changeForm}>
          <option value="정상">정상</option>
          <option value="지각">지각</option>
          <option value="결근">결근</option>
          <option value="휴가">휴가</option>
          <option value="출장">출장</option>
          <option value="휴직">휴직</option>
          <option value="미출근">미출근</option>
        </select>
      </label>

      <label className="attendance-edit-field">
        <span>메모</span>
        <textarea
          name="memo"
          value={form.memo}
          onChange={changeForm}
          maxLength={255}
          rows={4}
          required
          placeholder="근태 관련 메모를 입력해 주세요."
        />
      </label>

      <div className="attendance-edit-actions">
        <button type="button" onClick={onCancel}>취소</button>
        <button type="submit" className="erp-primary-button" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

export default function Attendance() {
  // HR 근태 화면의 공통 상태: 조직·근태·휴가 데이터를 한 화면에서 관리합니다.
  // 근태 기록과 휴가 신청·승인 조회를 한 화면의 탭으로 제공합니다.
  const navigate = useNavigate();
  const loginUser = getLoginUser();
  const isMaster = String(loginUser?.role || "").trim().toUpperCase() === "MASTER";
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("attendance-records");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leaveData, setLeaveData] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaveYearData, setLeaveYearData] = useState([]);
  const [leaveYearLoading, setLeaveYearLoading] = useState(false);
  const [leaveYearError, setLeaveYearError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    // 직원·부서·근태 자료를 함께 조회하고 가장 최근 근태월을 기본값으로 설정합니다.
    // 조직 정보와 전체 근태 기록을 함께 조회해 직원 목록을 구성합니다.
    // 직원·부서 목록과 전체 근태 기록을 초기 조회합니다.
    async function loadAttendancePage() {
      setLoading(true);
      setError("");
      setNotice("");

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

  useEffect(() => {
    if (!selectedMonth) {
      setLeaveData([]);
      setLeaveError("");
      return undefined;
    }

    let ignore = false;

    // 선택한 기준 월의 휴가 신청 데이터를 조회합니다.
    // 기준 월이 바뀌면 해당 월의 휴가 신청 목록을 다시 조회합니다.
    async function loadLeaves() {
      setLeaveLoading(true);
      setLeaveError("");

      try {
        const response = await getHrLeaves(selectedMonth);

        if (
          !response.data.success ||
          !Array.isArray(response.data.data)
        ) {
          throw new Error("휴가 신청 응답 형식이 올바르지 않습니다.");
        }

        if (!ignore) {
          setLeaveData(response.data.data);
        }
      } catch (requestError) {
        console.error("휴가 신청 조회 오류:", requestError);

        if (!ignore) {
          setLeaveData([]);
          setLeaveError(
            requestError.response?.data?.message ||
            "휴가 신청 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!ignore) {
          setLeaveLoading(false);
        }
      }
    }

    loadLeaves();

    return () => {
      ignore = true;
    };
  }, [selectedMonth]);

  useEffect(() => {
    if (activeTab !== "leave-balance") {
      return undefined;
    }

    let ignore = false;
    const year = selectedMonth.slice(0, 4) || String(new Date().getFullYear());

    // 연차 현황 탭에서만 연도별 휴가 데이터를 조회합니다.
    async function loadLeaveYear() {
      setLeaveYearLoading(true);
      setLeaveYearError("");

      try {
        const response = await getHrLeavesByYear(year);

        if (
          !response.data.success ||
          !Array.isArray(response.data.data)
        ) {
          throw new Error("연차 현황 응답 형식이 올바르지 않습니다.");
        }

        if (!ignore) {
          setLeaveYearData(response.data.data);
        }
      } catch (requestError) {
        if (!ignore) {
          setLeaveYearData([]);
          setLeaveYearError(
            requestError.response?.data?.message ||
            "연차 현황을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!ignore) {
          setLeaveYearLoading(false);
        }
      }
    }

    loadLeaveYear();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedMonth]);

  // 부서와 검색어를 동시에 적용해 왼쪽 직원 목록을 구성합니다.
  // 필터 결과를 기준으로 페이지 목록과 현재 선택 직원을 계산합니다.
  const departmentList = createDepartmentList(departments);
  const employeeList = createEmployeeList(
    employees,
    selectedDepartment,
    keyword
  );
  const itemsPerPage = 7;
  const totalPages = Math.max(1, Math.ceil(employeeList.length / itemsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const visibleEmployeeList = employeeList.slice(
    (effectivePage - 1) * itemsPerPage,
    effectivePage * itemsPerPage
  );
  const pageNumberCount = Math.min(5, totalPages);
  const pageStart = Math.max(
    1,
    Math.min(effectivePage - 2, totalPages - pageNumberCount + 1)
  );
  const pageNumbers = Array.from(
    { length: pageNumberCount },
    (_, index) => pageStart + index
  );
  const selectedEmployee = visibleEmployeeList.find(
    (employee) => String(employee.employeeId) === String(selectedEmployeeId)
  ) || visibleEmployeeList[0] || null;
  const isAttendanceTab = activeTab.startsWith("attendance-");
  const isLeaveTab = activeTab.startsWith("leave-");
  const isAttendanceRecords = activeTab === "attendance-records";

  useEffect(() => {
    // 필터 변경으로 기존 선택이 사라지면 첫 번째 직원을 자동 선택합니다.
    // 부서·검색·페이지 변경으로 선택 직원이 목록에서 빠지면 첫 직원을 선택합니다.
    const nextId = selectedEmployee?.employeeId || null;

    if (String(selectedEmployeeId) !== String(nextId)) {
      setSelectedEmployeeId(nextId);
    }
  }, [selectedEmployee, selectedEmployeeId, visibleEmployeeList]);

  useEffect(() => {
    // 필터 결과가 줄어든 경우 존재하는 마지막 페이지로 보정합니다.
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 선택 직원의 해당 월 기록만 추려 요약 수치와 일별 표를 계산합니다.
  // 선택 직원과 기준 월에 해당하는 근태 기록만 상세 패널에 표시합니다.
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
    "메모",
    "관리"
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
      attendance.memo || "-",
      isMaster ? (
        <div className="attendance-row-actions">
          <button
            type="button"
            onClick={() => openAttendanceEdit(attendance)}
            className="attendance-row-edit-button"
            disabled={saving}
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => removeAttendance(attendance)}
            className="attendance-row-delete-button"
            disabled={saving}
          >
            삭제
          </button>
        </div>
      ) : (
        "-"
      )
    ]
  }));

  function openAttendanceEdit(attendance) {
    if (!isMaster) {
      return;
    }

    setSelectedAttendanceRecord(
      attendance || {
        employeeId: selectedEmployee?.employeeId || selectedEmployeeId,
        employeeName: selectedEmployee?.employeeName || "선택 직원",
        attendanceDate: selectedMonth ? `${selectedMonth}-01` : "",
        clockIn: "",
        clockOut: "",
        status: "정상",
        memo: ""
      }
    );
    setError("");
    setNotice("");
    setIsEditModalOpen(true);
  }

  async function saveAttendanceEdit(formData) {
    if (!isMaster) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const isNewAttendance = !formData.attendanceId;
      const response = isNewAttendance
        ? await createHrAttendance({
            employeeId: formData.employeeId,
            workDate: formData.workDate,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            status: formData.status,
            memo: formData.memo
          })
        : await updateHrAttendance(formData.attendanceId, {
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            status: formData.status,
            memo: formData.memo
          });

      if (!response.data.success) {
        throw new Error("근태 처리 응답이 올바르지 않습니다.");
      }

      const attendanceResponse = await getHrAttendance();

      if (
        !attendanceResponse.data.success ||
        !Array.isArray(attendanceResponse.data.data)
      ) {
        throw new Error("근태 목록 응답 형식이 올바르지 않습니다.");
      }

      const updatedRows = attendanceResponse.data.data;
      setAttendanceData(updatedRows);
      setSelectedAttendanceRecord(
        updatedRows.find(
          (attendance) => attendance.attendanceId === response.data.data?.attendanceId
        ) || null
      );
      setIsEditModalOpen(false);
      setNotice(response.data.message || (isNewAttendance
        ? "근태 기록이 등록되었습니다."
        : "근태 정보가 수정되었습니다."));
    } catch (requestError) {
      console.error("근태 수정 오류:", requestError);
      setError(
        requestError.response?.data?.message ||
        "근태 정보를 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAttendance(attendance) {
    if (!isMaster || saving) {
      return;
    }

    const confirmed = window.confirm(
      `${attendance.attendanceDate} 근태 기록을 삭제할까요?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await deleteHrAttendance(attendance.attendanceId);

      if (!response.data.success) {
        throw new Error("근태 삭제 응답이 올바르지 않습니다.");
      }

      const attendanceResponse = await getHrAttendance();

      if (
        !attendanceResponse.data.success ||
        !Array.isArray(attendanceResponse.data.data)
      ) {
        throw new Error("근태 목록 응답 형식이 올바르지 않습니다.");
      }

      setAttendanceData(attendanceResponse.data.data);
      setSelectedAttendanceRecord(null);
      setNotice(response.data.message || "근태 기록이 삭제되었습니다.");
    } catch (requestError) {
      console.error("근태 기록 삭제 오류:", requestError);
      setError(
        requestError.response?.data?.message ||
        "근태 기록을 삭제하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    // 조회 조건과 직원 페이지를 초기 상태로 되돌립니다.
    setSelectedMonth(getLatestMonth(attendanceData));
    setSelectedDepartment("전체");
    setKeyword("");
    setSelectedEmployeeId(null);
    setCurrentPage(1);
  }

  async function decideLeave(leave, decision) {
    const employeeId = Number(loginUser?.employeeKey);

    if (!Number.isSafeInteger(employeeId) || employeeId < 1 || saving) {
      setLeaveError("로그인 사용자 정보를 확인해 주세요.");
      return;
    }

    const actionLabel = decision === "approve" ? "승인" : "반려";

    if (!window.confirm(`${leave.employeeName}님의 휴가 신청을 ${actionLabel}할까요?`)) {
      return;
    }

    setSaving(true);
    setLeaveError("");
    setNotice("");

    try {
      const response = await decideHrLeave(leave.draftId, employeeId, decision);
      const leaveResponse = await getHrLeaves(selectedMonth);

      if (
        !leaveResponse.data.success ||
        !Array.isArray(leaveResponse.data.data)
      ) {
        throw new Error("휴가 신청 응답 형식이 올바르지 않습니다.");
      }

      setLeaveData(leaveResponse.data.data);
      setNotice(response.data.message || `휴가 신청이 ${actionLabel}되었습니다.`);
    } catch (requestError) {
      setLeaveError(
        requestError.response?.data?.message ||
        `휴가 신청을 ${actionLabel}하지 못했습니다.`
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택 직원의 휴가만 계산합니다. 직원 목록은 두 탭에서 동일합니다.
  const selectedEmployeeLeaves = leaveData
    .filter((leave) =>
      String(leave.employeeId) === String(selectedEmployeeId)
    )
    .sort((a, b) =>
      String(b.startDate || "").localeCompare(String(a.startDate || ""))
    );

  const leavePendingCount = selectedEmployeeLeaves.filter(
    (leave) => leave.applicationStatus === "승인대기"
  ).length;
  const leaveApprovedCount = selectedEmployeeLeaves.filter(isApprovedLeave).length;
  const leaveUsedDays = selectedEmployeeLeaves
    .filter(isApprovedLeave)
    .reduce((total, leave) => total + Number(leave.leaveDays || 0), 0);
  const selectedEmployeeYearLeaves = leaveYearData.filter(
    (leave) => String(leave.employeeId) === String(selectedEmployeeId)
  );
  const annualPendingDays = selectedEmployeeYearLeaves
    .filter((leave) => leave.applicationStatus === "승인대기")
    .reduce((total, leave) => total + Number(leave.leaveDays || 0), 0);
  const annualUsedDays = selectedEmployeeYearLeaves
    .filter(isApprovedLeave)
    .reduce((total, leave) => total + Number(leave.leaveDays || 0), 0);

  const leaveTableHeaders = [
    "휴가 유형", "시작일", "종료일", "일수", "신청 상태", "신청일", "사유", "승인자", "승인일", "관리"
  ];
  const leaveTableData = selectedEmployeeLeaves.map((leave) => {
    const canDecide =
      leave.applicationStatus === "승인대기" &&
      Number(leave.approverId) === Number(loginUser?.employeeKey);

    return {
      content: [
        leave.leaveType || "휴가",
        leave.startDate || "-",
        leave.endDate || "-",
        `${leave.leaveDays ?? "-"}일`,
        <span className={`status-tag ${getLeaveStatusClass(leave.applicationStatus)}`}>
          {leave.applicationStatus || "-"}
        </span>,
        leave.applicationDate || "-",
        leave.reason || "-",
        leave.approverName || "-",
        leave.approvalDate || "-",
        canDecide ? (
          <div className="attendance-leave-actions">
            <button
              type="button"
              className="erp-primary-button"
              onClick={() => decideLeave(leave, "approve")}
              disabled={saving}
            >
              승인
            </button>
            <button
              type="button"
              className="attendance-leave-reject-button"
              onClick={() => decideLeave(leave, "reject")}
              disabled={saving}
            >
              반려
            </button>
          </div>
        ) : "-"
      ]
    };
  });

  return (
    <div className="border-container hr-attendance-management">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">근태관리</span>

        </div>
        {(isAttendanceTab && isMaster) || isLeaveTab ? (
          <div className="dashboard-top">
            {isAttendanceTab && isMaster && (
              <button
                type="button"
                className="register-btn erp-primary-button"
                onClick={() => {
                  openAttendanceEdit(selectedAttendance[0] || null);
                }}
                disabled={!selectedEmployee || saving}
                title={
                  selectedAttendance.length === 0
                    ? "선택 직원의 근태 기록을 새로 입력합니다."
                    : "선택 직원의 최근 일별 근태 기록을 수정합니다."
                }
              >
                근태 상태 수정
              </button>
            )}
            {isLeaveTab && (
              <button
                type="button"
                className="register-btn erp-primary-button"
                onClick={() => navigate("/main/mytesk/draft-create?type=leave")}
              >
                휴가신청
              </button>
            )}
          </div>
        ) : null}
      </header>

      {/* 두 탭에 공통으로 적용되는 조회 조건 */}
      <section className="attendance-filter" aria-label="근태·휴가 조회 조건">
        <div className="attendance-detail-navigation">
          <div className="attendance-navigation">
            <nav
              className="attendance-tabs attendance-main-tabs"
              aria-label="근태관리 메뉴"
            >
              <button
                type="button"
                role="tab"
                className={isAttendanceTab ? "active" : ""}
                aria-selected={isAttendanceTab}
                onClick={() => setActiveTab("attendance-records")}
              >
                근태 기록
              </button>
              <button
                type="button"
                role="tab"
                className={isLeaveTab ? "active" : ""}
                aria-selected={isLeaveTab}
                onClick={() => setActiveTab("leave-requests")}
              >
                휴가 신청·승인
              </button>
            </nav>

          </div>

          <div className="attendance-filter-controls">
          <label className="attendance-filter-field">
      
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
          </label>
          <label className="attendance-filter-field">
          
          <select
            value={selectedDepartment}
            onChange={(event) => {
              setSelectedDepartment(event.target.value);
              setSelectedEmployeeId(null);
              setCurrentPage(1);
            }}
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
          
          <input
            type="text"
            placeholder="직원명 검색"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setSelectedEmployeeId(null);
              setCurrentPage(1);
            }}
          />
          </label>

          <button
            type="button"
            className="attendance-reset-button"
            onClick={resetFilters}
          >
            초기화
          </button>

          </div>
        </div>
      </section>

      {/* 본문은 근태·휴가 모두 직원 목록(왼쪽) + 상세 내용(오른쪽) 구조입니다. */}
      {loading ? (
        <p className="attendance-feedback" role="status">
          직원 및 근태자료를 불러오는 중입니다.
        </p>
      ) : error ? (
        <p className="attendance-feedback attendance-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="attendance-layout hr-organization-grid">
          {/* 부서 목록 → 직원 목록 → 선택 직원 상세의 HR 3단 레이아웃 */}
          {/* 왼쪽: 부서 목록 */}
          <aside className="hr-panel department-panel">
            <div className="hr-panel-heading">
              <h2>부서 목록</h2>
              <span>{departments.length}개</span>
            </div>

            <div>
              <button
                type="button"
                className={`department-item${selectedDepartment === "전체" ? " selected" : ""}`}
                onClick={() => {
                  setSelectedDepartment("전체");
                  setSelectedEmployeeId(null);
                  setCurrentPage(1);
                }}
              >
                <strong>전체 부서</strong>
                <span>{employees.filter((employee) => employee.employmentStatus !== "퇴사").length}명</span>
              </button>

              {departments.map((department) => (
                <button
                  key={department.departmentId}
                  type="button"
                  className={`department-item${selectedDepartment === department.departmentName ? " selected" : ""}`}
                  onClick={() => {
                    setSelectedDepartment(department.departmentName);
                    setSelectedEmployeeId(null);
                    setCurrentPage(1);
                  }}
                >
                  <strong>{department.departmentName}</strong>
                  <span>
                    {countDepartmentEmployees(employees, department.departmentId)}명
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* 가운데: 소속 직원 */}
          <section className="hr-panel employee-list-panel">
            <div className="hr-section-heading">
              <div>
                <h2>소속 직원</h2>
                <p>
                  {selectedDepartment === "전체" ? "전체 부서" : selectedDepartment}
                  {" · "}
                  {employeeList.length}명
                </p>
              </div>
            </div>

            {employeeList.length === 0 ? (
              <p className="attendance-empty">조건에 맞는 직원이 없습니다.</p>
            ) : (
              <div className="employee-list">
                {visibleEmployeeList.map((employee) => {
                  const statusClass = employee.employmentStatus === "재직"
                    ? "active"
                    : employee.employmentStatus === "휴직"
                      ? "on-leave"
                      : "retired";

                  return (
                    <button
                      key={employee.employeeId}
                      type="button"
                      className={`employee-item ${String(employee.employeeId) === String(selectedEmployeeId)
                          ? "active" : ""
                        }`}
                      onClick={() => setSelectedEmployeeId(employee.employeeId)}
                    >
                      <span className="employee-item-info">
                        <span className="employee-name-line">
                          <strong className="emp-name">{employee.employeeName}</strong>
                          <span className={`employee-status-badge ${statusClass}`}>
                            {employee.employmentStatus || "-"}
                          </span>
                        </span>
                        <span>
                          {employee.departmentName || "부서 미지정"} ·{" "}
                          <span className="emp-position">
                            {employee.position || "직급 미지정"}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div
                className="pagination-container"
                aria-label="직원 목록 페이지"
              >
                <button
                  type="button"
                  className="page-btn nav-btn"
                  onClick={() => setCurrentPage(effectivePage - 1)}
                  disabled={effectivePage === 1}
                  aria-label="이전 페이지"
                >
                  &lt;
                </button>

                <div className="page-numbers">
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`page-btn number-btn ${effectivePage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                      aria-current={effectivePage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="page-btn nav-btn"
                  onClick={() => setCurrentPage(effectivePage + 1)}
                  disabled={effectivePage === totalPages}
                  aria-label="다음 페이지"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>

          {/* 선택 직원별 상세 화면 */}
          <section className="attendance-detail-panel employee-detail-panel">
            {selectedEmployee && (
              <>
                <AttendanceEmployeeHeader
                  employee={selectedEmployee}
                  isAttendanceTab={isAttendanceTab}
                  attendanceRate={calculateAttendanceRate(
                    attendanceData,
                    selectedMonth,
                    selectedEmployee.employeeId
                  )}
                  leaveCount={selectedEmployeeLeaves.length}
                  isLeaveBalance={activeTab === "leave-balance"}
                >
                  {isAttendanceTab ? (
                    <div className="attendance-summary">
                      <div className="summary-item">
                        <span>근무일</span><strong>{selectedAttendance.length}</strong>
                      </div>
                      <div className="summary-item">
                        <span>정상</span><strong>{normalCount}</strong>
                      </div>
                      <div className="summary-item">
                        <span>지각</span><strong>{lateCount}</strong>
                      </div>
                      <div className="summary-item">
                        <span>휴가</span><strong>{leaveCount}</strong>
                      </div>
                    </div>
                  ) : activeTab === "leave-balance" ? (
                    <div className="attendance-summary">
                      <div className="summary-item">
                        <span>부여 연차</span><strong>미등록</strong>
                      </div>
                      <div className="summary-item">
                        <span>사용 일수</span><strong>{annualUsedDays}일</strong>
                      </div>
                      <div className="summary-item">
                        <span>승인 대기</span><strong>{annualPendingDays}일</strong>
                      </div>
                      <div className="summary-item">
                        <span>잔여 연차</span><strong>-</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="attendance-summary">
                      <div className="summary-item">
                        <span>전체 신청</span><strong>{selectedEmployeeLeaves.length}</strong>
                      </div>
                      <div className="summary-item">
                        <span>승인 대기</span><strong>{leavePendingCount}</strong>
                      </div>
                      <div className="summary-item">
                        <span>승인 완료</span><strong>{leaveApprovedCount}</strong>
                      </div>
                      <div className="summary-item">
                        <span>사용 일수</span><strong>{leaveUsedDays}</strong>
                      </div>
                    </div>
                  )}
                </AttendanceEmployeeHeader>
                <AttendanceSubTabs
                  activeTab={activeTab}
                  isAttendanceTab={isAttendanceTab}
                  isAttendanceRecords={isAttendanceRecords}
                  setActiveTab={setActiveTab}
                />
              </>
            )}

            {!selectedEmployee ? (
              <p className="attendance-empty">
                상세 정보를 확인할 직원을 선택해 주세요.
              </p>
            ) : isAttendanceTab ? (
              isAttendanceRecords ? (
                <>
                {tableData.length > 0 ? (
                  <PaginationTable
                    key={`attendance-${selectedEmployeeId}-${selectedMonth}`}
                    title="일별 근태 기록"
                    th={tableHeaders}
                    allData={tableData}
                    itemsPerPage={8}
                  />
                ) : (
                  <p className="attendance-empty">해당 월의 근태 기록이 없습니다.</p>
                )}
                </>
              ) : activeTab === "attendance-anomalies" ? (
                <AttendanceAnomalies records={selectedAttendance} />
              ) : (
                <AttendanceStatistics
                  records={selectedAttendance}
                  month={selectedMonth}
                />
              )
            ) :
              (activeTab === "leave-requests" ||
                activeTab === "leave-pending") &&
              leaveLoading ? (
              <p className="attendance-feedback" role="status">
                휴가 신청 내역을 불러오는 중입니다.
              </p>
            ) :
              (activeTab === "leave-requests" ||
                activeTab === "leave-pending") &&
              leaveError ? (
              <p className="attendance-feedback attendance-error" role="alert">
                {leaveError}
              </p>
            ) : activeTab === "leave-requests" ? (
              <>
                {leaveTableData.length > 0 ? (
                  <PaginationTable
                    key={`leave-${selectedEmployeeId}-${selectedMonth}`}
                    title="휴가 신청·승인 내역"
                    th={leaveTableHeaders}
                    allData={leaveTableData}
                    itemsPerPage={8}
                  />
                ) : (
                  <p className="attendance-empty">
                    선택한 기준 월의 휴가 신청 내역이 없습니다.
                  </p>
                )}
                
              </>
            ) : activeTab === "leave-pending" ? (
              <LeavePendingView
                leaves={leaveData}
                loginEmployeeId={loginUser?.employeeKey}
                onDecide={decideLeave}
                saving={saving}
              />
            ) : leaveYearLoading ? (
              <p className="attendance-feedback" role="status">
                연차 현황을 불러오는 중입니다.
              </p>
            ) : leaveYearError ? (
              <p className="attendance-feedback attendance-error" role="alert">
                {leaveYearError}
              </p>
            ) : (
              <LeaveBalanceView
                employee={selectedEmployee}
                leaves={leaveYearData}
                year={selectedMonth.slice(0, 4) || String(new Date().getFullYear())}
              />
            )}
          </section>
        </div>
      )}

      {notice && (
        <p className="attendance-feedback attendance-success" role="status">
          {notice}
        </p>
      )}

      {isEditModalOpen && selectedAttendanceRecord && (
        <ModalBase
          title={selectedAttendanceRecord.attendanceId ? "일별 근태 기록 수정" : "근태 기록 입력"}
          onClose={() => setIsEditModalOpen(false)}
          layout={
            <AttendanceEditForm
              attendance={selectedAttendanceRecord}
              onSave={saveAttendanceEdit}
              onCancel={() => setIsEditModalOpen(false)}
              saving={saving}
            />
          }
        />
      )}
    </div>
  );
}
