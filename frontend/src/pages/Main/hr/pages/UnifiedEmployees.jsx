
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ModalBase from "../../../../components/ModalBase";
import ColorTeg from "../../../../components/ColorTeg";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  createHrDepartment,
  createHrEmployee,
  createHrPayroll,
  deleteHrDepartment,
  getHrOrganization,
  getHrPayrollHistory,
  getHrPayrolls,
  retireHrEmployee,
  updateHrEmployee,
  updateHrPayroll,
  updateHrPayrollStatus
} from "../../../../components/HrData";

const positions = ["사원", "대리", "과장", "차장", "부장"];
const payrollFinalStatuses = ["확정", "지급완료"];

const emptyEmployee = {
  name: "",
  departmentId: "",
  position: "사원",
  email: "",
  phone: "",
  password: "",
  hireDate: "",
  employmentStatus: "재직",
  initialAnnualSalary: ""
};

const emptyDepartment = {
  departmentName: "",
  managerId: "",
  description: ""
};

const emptyPay = {
  annualSalary: "0",
  baseSalary: "0",
  allowance: "0",
  bonus: "0",
  otherPayment: "0"
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyBaseSalary(annualSalary) {
  const amount = Number(annualSalary);

  return Number.isSafeInteger(amount) && amount >= 0
    ? Math.floor(amount / 12)
    : 0;
}

function isVisibleEmployee(employee) {
  if (
    employee.employmentStatus !== "퇴사" ||
    !employee.resignationDate
  ) {
    return true;
  }

  const resignationDate = new Date(
    `${employee.resignationDate}T00:00:00`
  );

  if (Number.isNaN(resignationDate.getTime())) {
    return true;
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setHours(0, 0, 0, 0);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return resignationDate >= oneMonthAgo;
}

function money(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : `${Number(value).toLocaleString("ko-KR")}원`;
}

function apiError(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

async function fetchOrganization() {
  const [departmentResponse, employeeResponse] =
    await getHrOrganization();

  if (
    !departmentResponse.data.success ||
    !Array.isArray(departmentResponse.data.data) ||
    !employeeResponse.data.success ||
    !Array.isArray(employeeResponse.data.data)
  ) {
    throw new Error("직원·부서 응답 형식이 올바르지 않습니다.");
  }

  return {
    departments: departmentResponse.data.data,
    employees: employeeResponse.data.data
  };
}

function DetailRow({ title, value, emphasis = false }) {
  return (
    <div
      className={`hr-employee-detail-field${emphasis ? " hr-pay-emphasis" : ""
        }`}
    >
      <span>{title}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

function EmployeeForm({
  form,
  setForm,
  departments,
  isEdit,
  saving,
  onSave,
  onClose
}) {
  const change = (event) =>
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));

  return (
    <form className="hr-unified-form" onSubmit={onSave}>
      {isEdit && (
        <label>
          사번
          <input value={form.employeeNumber || ""} disabled />
        </label>
      )}

      <label>
        이름
        <input
          name="name"
          value={form.name}
          onChange={change}
          required
        />
      </label>

      <label>
        부서
        <select
          name="departmentId"
          value={form.departmentId}
          onChange={change}
          required
        >
          <option value="">부서 선택</option>
          {departments.map((item) => (
            <option
              key={item.departmentId}
              value={item.departmentId}
            >
              {item.departmentName}
            </option>
          ))}
        </select>
      </label>

      <label>
        직급
        <select
          name="position"
          value={form.position}
          onChange={change}
          required
        >
          {positions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        연봉 (원)
        <input
          name="initialAnnualSalary"
          type="number"
          min="0"
          step="1"
          value={form.initialAnnualSalary}
          onChange={change}
          required
        />
      </label>

      <label>
        이메일
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={change}
          required
        />
      </label>

      <label>
        연락처
        <input
          name="phone"
          value={form.phone}
          onChange={change}
        />
      </label>

      {isEdit ? (
        <>
          <label>
            입사일
            <input
              name="hireDate"
              type="date"
              value={form.hireDate || ""}
              onChange={change}
              required
            />
          </label>

          <label>
            재직 상태
            <select
              name="employmentStatus"
              value={form.employmentStatus}
              onChange={change}
            >
              <option value="재직">재직</option>
              <option value="휴직">휴직</option>
              {form.employmentStatus === "퇴사" && (
                <option value="퇴사">퇴사</option>
              )}
            </select>
          </label>
        </>
      ) : (
        <label>
          초기 비밀번호
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            required
          />
        </label>
      )}

      <div className="hr-modal-actions">
        <button type="button" onClick={onClose}>
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          disabled={saving}
        >
          {saving
            ? "저장 중..."
            : isEdit
              ? "직원 수정"
              : "직원 등록"}
        </button>
      </div>
    </form>
  );
}

function DepartmentForm({
  form,
  setForm,
  employees,
  saving,
  onSave,
  onClose
}) {
  const change = (event) =>
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));

  return (
    <form className="hr-unified-form" onSubmit={onSave}>
      <label>
        부서명
        <input
          name="departmentName"
          value={form.departmentName}
          onChange={change}
          required
          maxLength={50}
        />
      </label>

      <label>
        부서장
        <select
          name="managerId"
          value={form.managerId}
          onChange={change}
        >
          <option value="">미지정</option>
          {employees
            .filter((item) => item.employmentStatus === "재직")
            .map((item) => (
              <option
                key={item.employeeId}
                value={item.employeeId}
              >
                {item.name} ({item.employeeNumber})
              </option>
            ))}
        </select>
      </label>

      <label>
        부서 업무 설명
        <textarea
          name="description"
          rows={3}
          maxLength={255}
          value={form.description}
          onChange={change}
        />
      </label>

      <div className="hr-modal-actions">
        <button type="button" onClick={onClose}>
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          disabled={saving}
        >
          {saving ? "저장 중..." : "부서 등록"}
        </button>
      </div>
    </form>
  );
}


/* 급여 계산 공통 함수 */
function calculatePayroll(data) {
  if (!data) return null;

  const names = ["baseSalary", "allowance", "bonus", "otherPayment"];

  const amounts = names.map((name) => Number(data[name]));

  const invalid = amounts.some((amount, index) => {
    return (
      (data[names[index]] === null || data[names[index]] === undefined) ||
      data[names[index]] === "" ||
      !Number.isSafeInteger(amount) ||
      amount < 0
    );
  });

  if (invalid) return null;

  const grossPay = amounts[0] + amounts[1] + amounts[2] + amounts[3];
  const incomeTax = Math.floor(grossPay * 3 / 100);
  const localIncomeTax = Math.floor(incomeTax * 10 / 100);
  const totalDeduction = incomeTax + localIncomeTax;
  const netPay = grossPay - totalDeduction;

  if (
    !Number.isSafeInteger(grossPay) ||
    !Number.isSafeInteger(netPay) ||
    netPay < 0
  ) {
    return null;
  }

  return {
    grossPay,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay
  };
}

function PayrollForm({
  form,
  setForm,
  employee,
  month,
  payroll,
  saving,
  onSave,
  onClose
}) {
  const change = (event) =>
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));

  const annualSalary = form.annualSalary;
  const calculatedMonthlySalary = monthlyBaseSalary(annualSalary);
  const calculation = calculatePayroll({
    ...form,
    baseSalary: calculatedMonthlySalary
  });

  const gross = calculation?.grossPay ?? 0;
  const incomeTax = calculation?.incomeTax ?? 0;
  const localIncomeTax = calculation?.localIncomeTax ?? 0;
  const totalDeduction = calculation?.totalDeduction ?? 0;
  const net = calculation?.netPay ?? 0;

  return (
    <form className="hr-unified-form hr-payroll-form" onSubmit={onSave}>
      <p className="hr-form-context">
        {employee.name} · {employee.employeeNumber} · {month}
      </p>

      <label>
        연봉 (원)
        <input
          type="number"
          name="annualSalary"
          min="0"
          step="1"
          value={form.annualSalary}
          onChange={change}
          required
        />
      </label>

      <div className="hr-employee-detail-fields">
        <DetailRow
          title="월 기본급"
          value={money(calculatedMonthlySalary)}
        />
        <DetailRow
          title="소득세 (3%)"
          value={money(incomeTax)}
        />
        <DetailRow
          title="지방소득세 (0.3%)"
          value={money(localIncomeTax)}
        />
        <DetailRow
          title="총공제액 (3.3%)"
          value={money(totalDeduction)}
        />
      </div>

      {[
        ["수당", "allowance"],
        ["상여금", "bonus"],
        ["기타 지급액", "otherPayment"],
      ].map(([label, name]) => (
        <label key={name}>
          {label} (원)
          <input
            type="number"
            name={name}
            min="0"
            step="1"
            value={form[name]}
            onChange={change}
            required
          />
        </label>
      ))}

      <div className="hr-form-totals">
        <span>총지급액 {money(gross)}</span>
        <strong>실지급 {money(net)}</strong>
      </div>

      <div className="hr-employee-detail-fields">
        <DetailRow
          title="지급일"
          value={payroll?.paymentDate || "-"}
        />
        <DetailRow
          title="지급 상태"
          value={payroll?.paymentStatus || "지급대기"}
        />
      </div>

      <div className="hr-modal-actions">
        <button type="button" onClick={onClose}>
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          disabled={saving}
        >
          {saving ? "저장 중..." : "급여 저장"}
        </button>
      </div>
    </form>
  );
}

function PayrollHistoryModal({
  employee,
  history,
  loading,
  error,
  onClose
}) {
  let content = null;

  if (loading) {
    content = (
      <p className="hr-payroll-modal-message" role="status">
        급여 이력을 불러오는 중입니다.
      </p>
    );
  } else if (error) {
    content = (
      <p className="hr-single-error" role="alert">
        {error}
      </p>
    );
  } else if (history.length === 0) {
    content = (
      <p className="hr-payroll-modal-message">
        조회된 급여 이력이 없습니다.
      </p>
    );
  } else {
    content = (
      <div className="hr-payroll-history-scroll">
        <table className="hr-payroll-history-table">
          <thead>
            <tr>
              <th>지급 월</th>
              <th>기본급</th>
              <th>수당</th>
              <th>상여금</th>
              <th>기타 지급액</th>
              <th>총공제액</th>
              <th>실수령액</th>
              <th>지급 상태</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.payrollId}>
                <td>{item.payMonth}</td>
                <td>{money(item.baseSalary)}</td>
                <td>{money(item.allowance)}</td>
                <td>{money(item.bonus)}</td>
                <td>{money(item.otherPayment)}</td>
                <td>{money(item.totalDeduction ?? item.deduction)}</td>
                <td>{money(item.netPay)}</td>
                <td>{item.paymentStatus || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ModalBase
      title={`${employee.name} 급여 내역`}
      onClose={onClose}
      layout={
        <section className="hr-payroll-history-modal">
          <p className="hr-payroll-modal-context">
            {employee.employeeNumber} · 월별 급여 이력
          </p>
          {content}
        </section>
      }
    />
  );
}

function PayrollStatementModal({ employee, payroll, onClose }) {
  return (
    <ModalBase
      title={`${employee.name} 급여명세서`}
      onClose={onClose}
      layout={
        <section className="hr-payroll-statement">
          <div className="hr-payroll-statement-heading">
            <div>
              <strong>{employee.name}</strong>
              <span>{employee.employeeNumber}</span>
            </div>
            <span>{payroll.payMonth} 급여 기준월</span>
          </div>

          <div className="hr-payroll-statement-employee">
            <DetailRow title="부서" value={employee.departmentName || "-"} />
            <DetailRow title="직급" value={employee.position || "-"} />
          </div>

          <div className="hr-payroll-statement-fields">
            <DetailRow title="기본급" value={money(payroll.baseSalary)} />
            <DetailRow title="수당" value={money(payroll.allowance)} />
            <DetailRow title="상여금" value={money(payroll.bonus)} />
            <DetailRow title="기타 지급액" value={money(payroll.otherPayment)} />
            <DetailRow title="소득세 (3%)" value={money(payroll.incomeTax)} />
            <DetailRow
              title="지방소득세 (0.3%)"
              value={money(payroll.localIncomeTax)}
            />
            <DetailRow
              title="총공제액 (3.3%)"
              value={money(payroll.totalDeduction ?? payroll.deduction)}
            />
            <DetailRow title="지급일" value={payroll.paymentDate || "-"} />
            <DetailRow
              title="지급 상태"
              value={payroll.paymentStatus || "-"}
            />
          </div>

          <div className="hr-payroll-statement-summary">
            <DetailRow title="세전 총액" value={money(payroll.grossPay)} />
            <DetailRow
              title="실수령액"
              value={money(payroll.netPay)}
              emphasis
            />
          </div>
        </section>
      }
    />
  );
}

export default function UnifiedEmployees() {
  const user = getLoginUser();
  const isMaster = String(user?.role || "").trim().toUpperCase() === "MASTER";

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("전체");
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("전체");
  const [accountStatus, setAccountStatus] = useState("전체");
  const [detailTab, setDetailTab] = useState("info");
  const initialPayMonthRef = useRef(currentMonth());
  const [payMonth, setPayMonth] = useState(() => currentMonth());
  const [payrolls, setPayrolls] = useState([]);
  const payrollRequestRef = useRef(0);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState("");
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartment);
  const [payForm, setPayForm] = useState(emptyPay);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequestRef = useRef(0);

  // 페이지를 오래 열어 둔 상태에서 월이 바뀌면 현재월을 자동 반영합니다.
  // 사용자가 과거 월을 직접 선택한 경우에는 그 선택을 유지합니다.
  useEffect(() => {
    function syncCurrentPayMonth() {
      const nextMonth = currentMonth();

      setPayMonth((previousMonth) =>
        previousMonth === initialPayMonthRef.current
          ? nextMonth
          : previousMonth
      );
    }

    syncCurrentPayMonth();
    window.addEventListener("focus", syncCurrentPayMonth);
    document.addEventListener("visibilitychange", syncCurrentPayMonth);

    return () => {
      window.removeEventListener("focus", syncCurrentPayMonth);
      document.removeEventListener("visibilitychange", syncCurrentPayMonth);
    };
  }, []);

  async function refreshOrganization() {
    const organization = await fetchOrganization();

    setDepartments(organization.departments);
    setEmployees(organization.employees);

    return organization.employees;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const organization = await fetchOrganization();

        if (active) {
          setDepartments(organization.departments);
          setEmployees(organization.employees);
        }
      } catch (e) {
        if (active) {
          setError(apiError(e, "직원·부서 조회에 실패했습니다."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (detailTab !== "payroll") {
      return undefined;
    }

    let active = true;
    const requestId = ++payrollRequestRef.current;

    async function load() {
      setPayLoading(true);
      setPayError("");

      try {
        const response = await getHrPayrolls(payMonth);

        if (
          !response.data.success ||
          !Array.isArray(response.data.data)
        ) {
          throw new Error("급여 목록 응답 형식이 올바르지 않습니다.");
        }

        if (active && requestId === payrollRequestRef.current) {
          setPayrolls(response.data.data);
        }
      } catch (e) {
        if (active && requestId === payrollRequestRef.current) {
          setPayrolls([]);
          setPayError(apiError(e, "급여 조회에 실패했습니다."));
        }
      } finally {
        if (active && requestId === payrollRequestRef.current) {
          setPayLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [detailTab, payMonth]);

  // 검색·부서·재직·계정 상태를 모두 반영한 직원 목록입니다.
  const employeeDirectory = useMemo(
    () => employees.filter(isVisibleEmployee),
    [employees]
  );

  const filtered = useMemo(
    () =>
      employeeDirectory.filter((emp) => {
        const keyword = search.trim().toLowerCase();
        const text = [
          emp.employeeNumber,
          emp.name,
          emp.email,
          emp.position
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!keyword || text.includes(keyword)) &&
          (selectedDept === "전체" ||
            String(emp.departmentId) === selectedDept) &&
          (employmentStatus === "전체" ||
            emp.employmentStatus === employmentStatus) &&
          (accountStatus === "전체" ||
            emp.accountStatus === accountStatus)
        );
      }),
    [
      employeeDirectory,
      search,
      selectedDept,
      employmentStatus,
      accountStatus
    ]
  );


  // 직원 목록 페이지네이션
  // 직원 목록은 페이지당 5명씩 표시합니다.
  const itemsPerPage = 5;

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / itemsPerPage)
  );

  const effectivePage = Math.min(currentPage, totalPages);

  const startIndex = (effectivePage - 1) * itemsPerPage;

  const visibleEmployees = filtered.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // 페이지 번호는 최대 5개씩 표시
  const pageNumberCount = Math.min(5, totalPages);

  const pageStart = Math.max(
    1,
    Math.min(
      effectivePage - 2,
      totalPages - pageNumberCount + 1
    )
  );

  const pageNumbers = Array.from(
    { length: pageNumberCount },
    (_, index) => pageStart + index
  );

  // 현재 페이지 안에서 선택한 직원 유지
  const selected =
    visibleEmployees.find(
      (emp) => String(emp.employeeId) === String(selectedId)
    ) ||
    visibleEmployees[0] ||
    null;

  // 페이지 변경 또는 필터 변경으로 선택 직원이 사라지면
  // 현재 페이지의 첫 번째 직원 자동 선택
  useEffect(() => {
    // 필터·페이지 변경 시 현재 페이지의 첫 직원을 상세 대상으로 유지합니다.
    const nextId = selected?.employeeId ?? null;

    if (String(selectedId) !== String(nextId)) {
      setSelectedId(nextId);
    }
  }, [selectedId, selected?.employeeId]);

  useEffect(() => {
    // 직원 삭제·필터 변경으로 페이지 수가 줄어들면 마지막 페이지로 보정합니다.
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedDepartment = departments.find(
    (item) => String(item.departmentId) === selectedDept
  );

  const selectedName =
    selectedDepartment?.departmentName || "전체 부서";

  const deptMembers =
    selectedDept === "전체"
      ? []
      : employees.filter(
        (emp) => String(emp.departmentId) === selectedDept
      );

  const working = employeeDirectory.filter(
    (emp) => emp.employmentStatus === "재직"
  ).length;
  const averageDepartmentSize = departments.length
    ? (working / departments.length).toFixed(1)
    : "0.0";

  const payroll = payrolls.find(
    (row) =>
      String(row.employeeId) === String(selected?.employeeId)
  );

  /* 등록·수정 가능 여부 */
  const canEditPay =
    isMaster &&
    !!selected &&
    selected.employmentStatus !== "퇴사" &&
    !!payroll &&
    !payLoading &&
    !payError &&
    !payrollFinalStatuses.includes(payroll.paymentStatus);

  const canRegisterPay = canEditPay && payroll.payrollId === null;
  const canUpdatePay = canEditPay && payroll.payrollId !== null;
  const canViewPay =
    !!selected &&
    !!payroll &&
    !payLoading &&
    !payError;
  const canViewStatement = canViewPay && payroll.payrollId !== null;
  const canConfirmPay =
    isMaster &&
    canViewPay &&
    payroll.payrollId !== null &&
    !payrollFinalStatuses.includes(payroll.paymentStatus);
  const canMarkPayPaid =
    isMaster &&
    canViewPay &&
    payroll.payrollId !== null &&
    payroll.paymentStatus === "확정";

  function clearPayrollHistory() {
    historyRequestRef.current += 1;
    setPayrollHistory([]);
    setHistoryLoading(false);
    setHistoryError("");
  }

  function chooseDept(value) {
    // 부서 변경 시 직원 선택, 상세 탭, 급여 이력을 함께 초기화합니다.
    clearPayrollHistory();
    setModal("");
    setSelectedDept(value);
    setSelectedId(null);
    setCurrentPage(1);
    setDetailTab("info");
  }

  function chooseEmployee(emp) {
    clearPayrollHistory();
    setModal("");
    setSelectedId(emp.employeeId);
    setDetailTab("info");
  }

  function reset() {
    clearPayrollHistory();
    setModal("");
    setSearch("");
    setSelectedDept("전체");
    setEmploymentStatus("전체");
    setAccountStatus("전체");
    setSelectedId(null);
    setCurrentPage(1);
    setDetailTab("info");
  }

  function openEmployeeModal(edit = false) {
    if (!isMaster) {
      return;
    }

    if (edit && selected) {
      setEmployeeForm({
        ...selected,
        departmentId: String(selected.departmentId || ""),
        phone: selected.phone || "",
        hireDate: selected.hireDate || "",
        initialAnnualSalary: String(
          selected.initialAnnualSalary ?? ""
        ),
        password: ""
      });
    } else {
      setEmployeeForm({
        ...emptyEmployee,
        departmentId: String(
          departments[0]?.departmentId || ""
        )
      });
    }

    setModal(edit ? "employee-edit" : "employee-add");
  }

  async function saveEmployee(event) {
    event.preventDefault();

    if (!isMaster) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const edit = modal === "employee-edit";

      const response = edit
        ? await updateHrEmployee(employeeForm.employeeId, {
          name: employeeForm.name,
          departmentId: employeeForm.departmentId,
          position: employeeForm.position,
          email: employeeForm.email,
          phone: employeeForm.phone,
          hireDate: employeeForm.hireDate,
          employmentStatus: employeeForm.employmentStatus,
          initialAnnualSalary: Number(
            employeeForm.initialAnnualSalary
          )
        })
        : await createHrEmployee(employeeForm);

      if (!response.data.success) {
        throw new Error("직원 저장 응답이 올바르지 않습니다.");
      }

      await refreshOrganization();
      setModal("");
      setNotice(
        response.data.message || "직원 정보가 저장되었습니다."
      );
    } catch (e) {
      setError(apiError(e, "직원 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function saveDepartment(event) {
    event.preventDefault();

    if (!isMaster) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await createHrDepartment({
        departmentName: departmentForm.departmentName.trim(),
        managerId: departmentForm.managerId,
        description: departmentForm.description.trim()
      });

      if (!response.data.success) {
        throw new Error("부서 등록 응답이 올바르지 않습니다.");
      }

      await refreshOrganization();

      setSelectedDept(
        String(response.data.data?.departmentId || "전체")
      );
      setSelectedId(null);
      setModal("");

      setNotice(
        response.data.message || "부서가 등록되었습니다."
      );
    } catch (e) {
      setError(apiError(e, "부서 등록에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function removeDepartment() {
    if (
      !isMaster ||
      !selectedDepartment ||
      deptMembers.length > 0 ||
      saving
    ) {
      return;
    }

    if (
      !window.confirm(
        `${selectedDepartment.departmentName} 부서를 삭제할까요?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await deleteHrDepartment(
        selectedDepartment.departmentId
      );

      if (!response.data.success) {
        throw new Error("부서 삭제 응답이 올바르지 않습니다.");
      }

      await refreshOrganization();
      chooseDept("전체");

      setNotice(
        response.data.message || "부서가 삭제되었습니다."
      );
    } catch (e) {
      setError(apiError(e, "부서 삭제에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function retire() {
    if (!isMaster || !selected || saving) {
      return;
    }

    if (
      !window.confirm(
        `${selected.name} 직원을 퇴사 처리할까요? 기존 자료는 삭제되지 않습니다.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await retireHrEmployee(
        selected.employeeId
      );

      if (!response.data.success) {
        throw new Error("퇴사 처리 응답이 올바르지 않습니다.");
      }

      await refreshOrganization();

      setNotice(
        response.data.message || "퇴사 처리되었습니다."
      );
    } catch (e) {
      setError(apiError(e, "퇴사 처리에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  function openPayrollModal() {
    if (!canEditPay) {
      return;
    }

    const existed = payroll.payrollId !== null;

    setPayForm(
      existed
        ? {
          annualSalary: String(selected.initialAnnualSalary ?? 0),
          baseSalary: String(payroll.baseSalary ?? 0),
          allowance: String(payroll.allowance ?? 0),
          bonus: String(payroll.bonus ?? 0),
          otherPayment: String(payroll.otherPayment ?? 0)
        }
        : {
          ...emptyPay,
          annualSalary: String(selected.initialAnnualSalary ?? 0),
          baseSalary: String(
            monthlyBaseSalary(selected.initialAnnualSalary)
          )
        }
    );

     setModal("payroll");
  }

  async function openPayrollHistory() {
    if (!canViewPay || !selected) {
      return;
    }

    const employeeId = selected.employeeId;
    const requestId = historyRequestRef.current + 1;

    historyRequestRef.current = requestId;
    setPayrollHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    setModal("payroll-history");

    try {
      const response = await getHrPayrollHistory(employeeId);

      if (
        !response.data.success ||
        !Array.isArray(response.data.data)
      ) {
        throw new Error("급여 이력 응답 형식이 올바르지 않습니다.");
      }

      if (requestId === historyRequestRef.current) {
        setPayrollHistory(response.data.data);
      }
    } catch (e) {
      if (requestId === historyRequestRef.current) {
        setHistoryError(apiError(e, "급여 이력 조회에 실패했습니다."));
      }
    } finally {
      if (requestId === historyRequestRef.current) {
        setHistoryLoading(false);
      }
    }
  }

  function openPayrollStatement() {
    if (!canViewStatement) {
      return;
    }

    setModal("payroll-statement");
  }

  async function changePayrollStatus(status) {
    if (
      !isMaster ||
      !payroll ||
      payroll.payrollId === null ||
      saving
    ) {
      return;
    }

    const label = status === "확정" ? "급여 확정" : "지급완료";

    if (!window.confirm(`${label} 처리하시겠습니까?`)) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await updateHrPayrollStatus(
        payroll.payrollId,
        {
          status,
          actorEmployeeId: user?.employeeKey,
          actorRole: user?.role,
          reason: `${label} 처리`
        }
      );

      if (!response.data.success) {
        throw new Error(`${label} 처리 응답이 올바르지 않습니다.`);
      }

      await reloadPayrolls();
      setNotice(response.data.message || `${label} 처리되었습니다.`);
    } catch (e) {
      setError(apiError(e, `${label} 처리에 실패했습니다.`));
    } finally {
      setSaving(false);
    }
  }

  // 급여 목록 다시 조회
  async function reloadPayrolls() {
    const requestId = ++payrollRequestRef.current;
    const response = await getHrPayrolls(payMonth);

    if (
      !response.data.success ||
      !Array.isArray(response.data.data)
    ) {
      throw new Error("급여 재조회에 실패했습니다.");
    }

    if (requestId === payrollRequestRef.current) {
      setPayrolls(response.data.data);
      setPayError("");
    }

    return response.data.data;
  }

  async function savePayroll(event) {
    // 급여 ID가 있으면 수정, 없으면 등록 API를 호출합니다.
    event.preventDefault();

    if (!canEditPay || modal !== "payroll" || saving) {
      return;
    }

    const annualSalary = Number(payForm.annualSalary);
    const calculation = calculatePayroll({
      ...payForm,
      baseSalary: monthlyBaseSalary(payForm.annualSalary)
    });

    if (
      !Number.isSafeInteger(annualSalary) ||
      annualSalary < 0 ||
      !calculation
    ) {
      setError(
        "연봉·지급 항목은 0 이상의 정수로 입력해야 합니다."
      );
      return;
    }

    const values = {
      annualSalary,
      allowance: Number(payForm.allowance),
      bonus: Number(payForm.bonus),
      otherPayment: Number(payForm.otherPayment)
    };

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response =
        payroll.payrollId !== null && payroll.payrollId !== undefined
          ? await updateHrPayroll(
            payroll.payrollId,
            values
          )
          : await createHrPayroll({
            employeeId: selected.employeeId,
            payMonth,
            ...values
          });

      if (!response.data.success) {
        throw new Error("급여 저장에 실패했습니다.");
      }

      await reloadPayrolls();

      setModal("");

      setNotice(
        response.data.message || "급여 정보가 저장되었습니다."
      );
    } catch (e) {
      setError(apiError(e, "급여 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="border-container hr-employee-management hr-single-management">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">
            인사·조직 통합관리
          </span>
        </div>
        <ColorTeg
          title="전체 직원"
          count={employeeDirectory.length}
          type="명"
          color="green"
        />
        <ColorTeg
          title="재직 직원"
          count={working}
          type="명"
          color="green"
        />
        <ColorTeg
          title="전체 부서"
          count={departments.length}
          type="개"
          color="blue"
        />
        <ColorTeg
          title="평균 부서 인원"
          count={averageDepartmentSize}
          type="명"
          color="blue"
        />
        {isMaster && (
          <div className="dashboard-top">
            <button
              type="button"
              className="register-btn"
              onClick={() => openEmployeeModal(false)}
              disabled={!departments.length}
            >
              직원 등록
            </button>
            <button
              type="button"
              className="register-btn"
              onClick={() => {
                setDepartmentForm(emptyDepartment);
                setModal("department");
              }}
            >
              부서 등록
            </button>
          </div>
        )}
      </header>

      <section className="hr-filter-card">
        <div className="hr-filter-result">
          조회 직원 <strong>{filtered.length}</strong>명
        </div>

        <div className="hr-single-filters">
          <select
            aria-label="부서"
            value={selectedDept}
            onChange={(e) => chooseDept(e.target.value)}
          >
            <option value="전체">전체 부서</option>
            {departments.map((item) => (
              <option
                key={item.departmentId}
                value={String(item.departmentId)}
              >
                {item.departmentName}
              </option>
            ))}
          </select>

          <select
            aria-label="재직 상태"
            value={employmentStatus}
            // 재직 상태 select
            onChange={(e) => {
              setEmploymentStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="전체">전체 재직상태</option>
            <option value="재직">재직</option>
            <option value="휴직">휴직</option>
            <option value="퇴사">퇴사</option>
          </select>

          <select
            aria-label="계정 상태"
            value={accountStatus}
            onChange={(e) => {
              setAccountStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="전체">전체 계정</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
            <option value="SUSPENDED">정지</option>
          </select>

          <input
            aria-label="통합검색"
            placeholder="사번, 이름, 이메일, 직급 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

          <button type="button" onClick={reset}>
            초기화
          </button>

        </div>
      </section>

      {error && (
        <p
          className="hr-single-alert hr-single-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          className="hr-single-alert hr-single-success"
          role="status"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <p role="status">
          직원·부서 자료를 불러오는 중입니다.
        </p>
      ) : (
        <div className="hr-organization-grid">
          {/* 왼쪽: 부서 목록 */}
          <aside className="hr-panel department-panel">
            <div className="hr-panel-heading">
              <h2>부서 목록</h2>
              <span>{departments.length}개</span>
            </div>

            <button
              type="button"
              className={`department-item${selectedDept === "전체" ? " selected" : ""
                }`}
              onClick={() => chooseDept("전체")}
            >
              <strong>전체 부서</strong>
              <span>{employeeDirectory.length}명</span>
            </button>

            {departments.map((dept) => {
              const members = employees.filter(
                (emp) =>
                  String(emp.departmentId) ===
                  String(dept.departmentId) &&
                  emp.employmentStatus === "재직"
              ).length;

              return (
                <button
                  key={dept.departmentId}
                  type="button"
                  className={`department-item${selectedDept === String(dept.departmentId)
                    ? " selected"
                    : ""
                    }`}
                  onClick={() =>
                    chooseDept(String(dept.departmentId))
                  }
                >
                  <strong>{dept.departmentName}</strong>
                  <span>{members}명</span>

                  {dept.managerName && (
                    <small>
                      부서장: {dept.managerName}
                    </small>
                  )}

                  {dept.description && (
                    <small>{dept.description}</small>
                  )}
                </button>
              );
            })}

            {/* 부서 삭제는 패널 하단 */}
            <div className="hr-single-dept-actions">
              <strong>선택 부서 관리</strong>
              <span>{selectedName}</span>

              {isMaster && (
                <button
                  type="button"
                  className="hr-single-delete"
                  onClick={removeDepartment}
                  disabled={
                    !selectedDepartment ||
                    deptMembers.length > 0 ||
                    saving
                  }
                >
                  부서 삭제
                </button>
              )}

              
            </div>
          </aside>

          {/* 가운데: 소속 직원 */}
          <section className="hr-panel employee-list-panel">
            <div className="hr-section-heading">
              <div>
                <h2>소속 직원</h2>
                <p>
                  {selectedName} · {filtered.length}명
                </p>
              </div>
            </div>

            <div className="employee-list">
              {visibleEmployees.length === 0 ? (
                <p className="hr-empty-state">
                  조건에 맞는 직원이 없습니다.
                </p>
              ) : (
                visibleEmployees.map((emp) => (
                  <button
                    key={emp.employeeId}
                    type="button"
                    className={`employee-item${String(selected?.employeeId) === String(emp.employeeId)
                      ? " active"
                      : ""
                      }`}
                    onClick={() => chooseEmployee(emp)}
                    title={emp.name}
                  >
                    <span className="employee-item-info">
                      <span className="employee-name-line">
                        <strong className="emp-name">{emp.name}</strong>
                        <span
                          className={`employee-status-badge ${emp.employmentStatus === "재직"
                            ? "active"
                            : emp.employmentStatus === "휴직"
                              ? "on-leave"
                              : "retired"
                            }`}
                        >
                          {emp.employmentStatus || "-"}
                        </span>
                      </span>
                      <span>
                        {emp.departmentName || "부서 미지정"} ·{" "}
                        <span className="emp-position">
                          {emp.position || "직급 미지정"}
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

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
                      className={`page-btn number-btn ${effectivePage === page ? "active" : ""
                        }`}
                      onClick={() => setCurrentPage(page)}
                      aria-current={
                        effectivePage === page ? "page" : undefined
                      }
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

          {/* 오른쪽: 직원 상세정보 / 급여관리 */}
          <aside className="hr-panel employee-detail-panel">
            <div className="hr-panel-heading">
              <h2>직원 상세정보</h2>
            </div>

            <div
              className="hr-single-detail-tabs"
              role="tablist"
              aria-label="선택 직원 정보 종류"
            >
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === "info"}
                className={
                  detailTab === "info" ? "active" : ""
                }
                onClick={() => setDetailTab("info")}
              >
                직원 상세정보
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={detailTab === "payroll"}
                className={
                  detailTab === "payroll" ? "active" : ""
                }
                onClick={() => setDetailTab("payroll")}
              >
                급여관리
              </button>
            </div>

            {!selected ? (
              <p className="hr-empty-state">
                직원을 선택하면 상세정보가 표시됩니다.
              </p>
            ) : (
              <>
                <div className="hr-detail-summary">
                  <div>
                    <h3>{selected.name}</h3>
                    <p>
                      {selected.employeeNumber} ·{" "}
                      {selected.departmentName || "-"} ·{" "}
                      {selected.position}
                    </p>
                  </div>

                  <span
                    className={`status-tag ${selected.employmentStatus === "재직"
                      ? "working"
                      : selected.employmentStatus === "휴직"
                        ? "leave"
                        : "off"
                      }`}
                  >
                    {selected.employmentStatus}
                  </span>
                </div>

                {detailTab === "info" ? (
                  <>
                    <div className="hr-employee-detail-fields">
                      <DetailRow
                        title="사번"
                        value={selected.employeeNumber}
                      />
                      <DetailRow
                        title="부서"
                        value={selected.departmentName || "-"}
                      />
                      <DetailRow
                        title="직급"
                        value={selected.position}
                      />
                      <DetailRow
                        title="이메일"
                        value={selected.email}
                      />
                      <DetailRow
                        title="전화번호"
                        value={selected.phone || "-"}
                      />
                      <DetailRow
                        title="입사일"
                        value={selected.hireDate}
                      />
                      <DetailRow
                        title="권한"
                        value={selected.role || "-"}
                      />
                      <DetailRow
                        title="계정 상태"
                        value={
                          {
                            ACTIVE: "활성",
                            INACTIVE: "비활성",
                            SUSPENDED: "정지"
                          }[selected.accountStatus] || "-"
                        }
                      />
                    </div>

                    <div className="employee-detail-actions">
                      {isMaster && (
                        <button
                          type="button"
                          onClick={() => openEmployeeModal(true)}
                        >
                          직원 수정
                        </button>
                      )}

                      {isMaster &&
                        selected.employmentStatus !== "퇴사" && (
                          <button
                            type="button"
                            onClick={retire}
                            disabled={saving}
                          >
                            퇴사 처리
                          </button>
                        )}

                      <Link
                        className="hr-attendance-link"
                        to="/main/hr/attendance"
                      >
                        근태 상세 보기
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="hr-single-month">
                      급여 기준월
                      <input
                        type="month"
                        value={payMonth}
                        onChange={(e) =>
                          setPayMonth(e.target.value)
                        }
                      />
                    </label>

                    {payLoading ? (
                      <p role="status">
                        급여 정보를 불러오는 중입니다.
                      </p>
                    ) : payError ? (
                      <p
                        className="hr-single-error"
                        role="alert"
                      >
                        {payError}
                      </p>
                    ) : payroll ? (
                      <>
                        <div className="hr-employee-detail-fields">
                          <DetailRow
                            title="급여 상태"
                            value={payroll.paymentStatus}
                          />
                          <DetailRow
                            title="기본급"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.baseSalary)
                            }
                          />
                          <DetailRow
                            title="수당"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.allowance)
                            }
                          />
                          <DetailRow
                            title="상여금"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.bonus)
                            }
                          />
                          <DetailRow
                            title="기타 지급액"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.otherPayment)
                            }
                          />
                          <DetailRow
                            title="소득세 (3%)"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.incomeTax)
                            }
                          />
                          <DetailRow
                            title="지방소득세 (0.3%)"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.localIncomeTax)
                            }
                          />
                          <DetailRow
                            title="총공제액 (3.3%)"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.totalDeduction ?? payroll.deduction)
                            }
                          />
                          <DetailRow
                            title="세전 총액"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.grossPay)
                            }
                          />
                          <DetailRow
                            title="실수령액"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.netPay)
                            }
                            emphasis
                          />
                          <DetailRow
                            title="지급일"
                            value={payroll.paymentDate || "-"}
                          />
                        </div>

                        <div className="employee-detail-actions hr-payroll-actions">
                          <button
                            type="button"
                            className="erp-primary-button"
                            onClick={openPayrollModal}
                            disabled={!canRegisterPay || saving}
                          >
                            급여 등록
                          </button>
                          <button
                            type="button"
                            onClick={openPayrollModal}
                            disabled={!canUpdatePay || saving}
                          >
                            급여 수정
                          </button>
                          <button
                            type="button"
                            onClick={openPayrollHistory}
                            disabled={!canViewPay || saving}
                          >
                            급여 내역 조회
                          </button>
                          <button
                            type="button"
                            className="erp-primary-button"
                            onClick={() => changePayrollStatus("확정")}
                            disabled={!canConfirmPay || saving}
                          >
                            급여 확정
                          </button>
                          <button
                            type="button"
                            onClick={() => changePayrollStatus("지급완료")}
                            disabled={!canMarkPayPaid || saving}
                          >
                            지급완료
                          </button>
                          <button
                            type="button"
                            onClick={openPayrollStatement}
                            disabled={!canViewStatement || saving}
                          >
                            급여명세서
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="hr-empty-state">
                        해당 직원의 급여 조회 결과가 없습니다.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      {/* 직원 등록·수정 모달 */}
      {(modal === "employee-add" ||
        modal === "employee-edit") && (
          <ModalBase
            title={
              modal === "employee-edit"
                ? "직원 정보 수정"
                : "신규 직원 등록"
            }
            className="hr-form-modal"
            onClose={() => setModal("")}
            layout={
              <EmployeeForm
                form={employeeForm}
                setForm={setEmployeeForm}
                departments={departments}
                isEdit={modal === "employee-edit"}
                saving={saving}
                onSave={saveEmployee}
                onClose={() => setModal("")}
              />
            }
          />
        )}

      {/* 부서 등록 모달 */}
      {modal === "department" && (
        <ModalBase
          title="신규 부서 등록"
          className="hr-form-modal"
          onClose={() => setModal("")}
          layout={
            <DepartmentForm
              form={departmentForm}
              setForm={setDepartmentForm}
              employees={employees}
              saving={saving}
              onSave={saveDepartment}
              onClose={() => setModal("")}
            />
          }
        />
      )}

      {/* 급여 등록·수정 모달 */}
      {modal === "payroll" && selected && (
        <ModalBase
          title={`${selected.name} · ${payMonth} ${
            payroll?.payrollId === null ? "급여 등록" : "급여 수정"
          }`}
          className="hr-form-modal hr-payroll-edit-modal"
          onClose={() => setModal("")}
          layout={
            <PayrollForm
              form={payForm}
              setForm={setPayForm}
              employee={selected}
              month={payMonth}
              payroll={payroll}
              saving={saving}
              onSave={savePayroll}
              onClose={() => setModal("")}
            />
          }
        />
      )}

      {modal === "payroll-history" && selected && (
        <PayrollHistoryModal
          employee={selected}
          history={payrollHistory}
          loading={historyLoading}
          error={historyError}
          onClose={() => setModal("")}
        />
      )}

      {modal === "payroll-statement" &&
        selected &&
        payroll &&
        payroll.payrollId !== null && (
          <PayrollStatementModal
            employee={selected}
            payroll={payroll}
            onClose={() => setModal("")}
          />
        )}
    </div>
  );
}
