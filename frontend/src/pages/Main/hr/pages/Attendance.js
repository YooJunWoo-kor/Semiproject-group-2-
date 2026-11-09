
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import ModalBase from "../../../../components/ModalBase";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  getHrAttendance,
  getHrLeaves,
  getHrOrganization,
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

function AttendanceEditForm({ attendance, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
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
      status: form.status,
      memo: form.memo.trim()
    });
  }

  return (
    <form onSubmit={handleSubmit} className="attendance-edit-form">
      <div className="attendance-edit-summary">
        <div><span>직원</span><strong>{attendance.employeeName}</strong></div>
        <div><span>날짜</span><strong>{attendance.attendanceDate}</strong></div>
        <div><span>출근</span><strong>{attendance.clockIn || "-"}</strong></div>
        <div><span>퇴근</span><strong>{attendance.clockOut || "-"}</strong></div>
      </div>

      <label className="attendance-edit-field">
        <span>상태</span>
        <select name="status" value={form.status} onChange={changeForm}>
          <option value="정상">정상</option>
          <option value="지각">지각</option>
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
  // 근태 기록과 휴가 신청·승인 조회를 한 화면의 탭으로 제공합니다.
  const navigate = useNavigate();
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === "MASTER";
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("attendance");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");
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

  // 부서와 검색어를 동시에 적용해 왼쪽 직원 목록을 구성합니다.
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
    // 필터 변경으로 기존 선택이 사라지면 첫 번째 직원을 자동 선택합니다.
    if (!selectedEmployee) {
      setSelectedEmployeeId(employeeList[0]?.employeeId || null);
    }
  }, [employeeList, selectedEmployee, selectedEmployeeId]);

  // 선택 직원의 해당 월 기록만 추려 요약 수치와 일별 표를 계산합니다.
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
        <button
          type="button"
          onClick={() => openAttendanceEdit(attendance)}
          className="attendance-row-edit-button"
        >
          수정
        </button>
      ) : (
        "-"
      )
    ]
  }));

  function openAttendanceEdit(attendance) {
    if (!isMaster) {
      return;
    }

    setSelectedAttendanceRecord(attendance);
    setError("");
    setNotice("");
    setIsEditModalOpen(true);
  }

  // 출퇴근 시간은 건드리지 않고 상태와 메모만 서버에 저장합니다.
  async function saveAttendanceEdit(formData) {
    if (!isMaster) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await updateHrAttendance(formData.attendanceId, {
        status: formData.status,
        memo: formData.memo
      });

      if (!response.data.success) {
        throw new Error("근태 수정 응답이 올바르지 않습니다.");
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
          (attendance) => attendance.attendanceId === formData.attendanceId
        ) || null
      );
      setIsEditModalOpen(false);
      setNotice(response.data.message || "근태 정보가 수정되었습니다.");
    } catch (requestError) {
      console.error("근태 수정 오류:", requestError);
      setError(
        requestError.response?.data?.message ||
        "근태 정보를 수정하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setSelectedMonth(getLatestMonth(attendanceData));
    setSelectedDepartment("전체");
    setKeyword("");
    setSelectedEmployeeId(null);
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

  const leaveTableHeaders = [
    "휴가 유형", "시작일", "종료일", "일수", "신청 상태", "신청일", "사유"
  ];
  const leaveTableData = selectedEmployeeLeaves.map((leave) => ({
    content: [
      leave.leaveType || "휴가",
      leave.startDate || "-",
      leave.endDate || "-",
      `${leave.leaveDays ?? "-"}일`,
      <span className={`status-tag ${getLeaveStatusClass(leave.applicationStatus)}`}>
        {leave.applicationStatus || "-"}
      </span>,
      leave.applicationDate || "-",
      leave.reason || "-"
    ]
  }));

  return (
    <div className="border-container hr-attendance-management">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">근태관리</span>
          <span className="subtext">
            임직원의 출근 현황과 근태 상태를 조회하고 관리합니다.
          </span>
        </div>
      </header>

      {/* 두 탭에 공통으로 적용되는 조회 조건 */}
      <section className="attendance-filter" aria-label="근태·휴가 조회 조건">
        <nav className="attendance-tabs" aria-label="근태관리 메뉴">
          <button
            type="button"
            role="tab"
            className={activeTab === "attendance" ? "active" : ""}
            aria-selected={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
          >
            근태 기록
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "leave" ? "active" : ""}
            aria-selected={activeTab === "leave"}
            onClick={() => setActiveTab("leave")}
          >
            휴가 신청·승인
          </button>
        </nav>

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
              <option key={department} value={department}>{department}</option>
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
          className="attendance-reset-button"
          onClick={resetFilters}
        >
          초기화
        </button>

        {activeTab === "leave" && (
          <button
            type="button"
            className="erp-primary-button"
            onClick={() => navigate("/main/mytesk/draft-create?type=leave")}
          >
            휴가신청
          </button>
        )}

        {isMaster && activeTab === "attendance" && (
          <button
            type="button"
            className="erp-primary-button"
            onClick={() => {
              if (selectedAttendance.length > 0) {
                openAttendanceEdit(selectedAttendance[0]);
              }
            }}
            disabled={selectedAttendance.length === 0}
            title={
              selectedAttendance.length === 0
                ? "수정할 일별 근태 기록이 없습니다."
                : "선택 직원의 최근 일별 근태 기록을 수정합니다."
            }
          >
            근태수정
          </button>
        )}
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
        <div className="attendance-layout">
          {/* 공통 직원 목록 */}
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
                {employeeList.map((employee) => {
                  const leaveCountForEmployee = leaveData.filter(
                    (leave) => String(leave.employeeId) === String(employee.employeeId)
                  ).length;

                  return (
                    <button
                      key={employee.employeeId}
                      type="button"
                      className={`employee-item ${
                        String(employee.employeeId) === String(selectedEmployeeId)
                          ? "active" : ""
                      }`}
                      onClick={() => setSelectedEmployeeId(employee.employeeId)}
                    >
                      <span className="employee-item-info">
                        <strong className="emp-name">{employee.employeeName}</strong>
                        <span>
                          {employee.departmentName || "부서 미지정"} ·{" "}
                          <span className="emp-position">
                            {employee.position || "직급 미지정"}
                          </span>
                        </span>
                      </span>

                      <span className="employee-attendance-rate">
                        {activeTab === "attendance" ? (
                          <>
                            <small>출근율</small>
                            <strong>
                              {calculateAttendanceRate(
                                attendanceData, selectedMonth, employee.employeeId
                              )}
                            </strong>
                          </>
                        ) : (
                          <>
                            <small>휴가 신청</small>
                            <strong>{leaveCountForEmployee}건</strong>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 선택 직원별 상세 화면 */}
          <section className="attendance-detail-panel">
            {!selectedEmployee ? (
              <p className="attendance-empty">
                상세 정보를 확인할 직원을 선택해 주세요.
              </p>
            ) : activeTab === "attendance" ? (
              <>
                <div className="attendance-detail-header">
                  <div>
                    <span className="attendance-badge">선택 직원</span>
                    <h2>{selectedEmployee.employeeName}</h2>
                    <p>
                      {selectedEmployee.departmentName || "부서 미지정"} ·{" "}
                      {selectedEmployee.position || "직급 미지정"}
                    </p>
                  </div>
                  <div className="detail-attendance-rate">
                    <span>출근율</span>
                    <strong>
                      {calculateAttendanceRate(
                        attendanceData, selectedMonth, selectedEmployee.employeeId
                      )}
                    </strong>
                  </div>
                </div>

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
            ) : leaveLoading ? (
              <p className="attendance-feedback" role="status">
                휴가 신청 내역을 불러오는 중입니다.
              </p>
            ) : leaveError ? (
              <p className="attendance-feedback attendance-error" role="alert">
                {leaveError}
              </p>
            ) : (
              <>
                <div className="attendance-detail-header">
                  <div>
                    <span className="attendance-badge">선택 직원</span>
                    <h2>{selectedEmployee.employeeName}</h2>
                    <p>
                      {selectedEmployee.departmentName || "부서 미지정"} ·{" "}
                      {selectedEmployee.position || "직급 미지정"}
                    </p>
                  </div>
                  <div className="detail-attendance-rate">
                    <span>휴가 신청</span>
                    <strong>{selectedEmployeeLeaves.length}건</strong>
                  </div>
                </div>

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
                <p className="attendance-leave-api-notice">
                  휴가 신청은 내업무의 기안 작성 기능으로 진행합니다.
                  이 화면은 현재 승인·반려 조회만 지원합니다.
                </p>
              </>
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
          title="일별 근태 기록 수정"
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
