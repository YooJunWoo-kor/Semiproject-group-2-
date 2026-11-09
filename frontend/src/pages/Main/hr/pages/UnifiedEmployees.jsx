
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ModalBase from "../../../../components/ModalBase";
import StatisticsCard from "../../../../components/StatisticsCard";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  createHrDepartment,
  createHrEmployee,
  createHrPayroll,
  deleteHrDepartment,
  getHrOrganization,
  getHrPayrolls,
  retireHrEmployee,
  updateHrEmployee,
  updateHrPayroll
} from "../../../../components/HrData";

const positions = ["사원", "대리", "과장", "팀장", "부장"];

const emptyEmployee = {
  name: "",
  departmentId: "",
  position: "사원",
  email: "",
  phone: "",
  password: "",
  hireDate: "",
  employmentStatus: "재직"
};

const emptyDepartment = {
  departmentName: "",
  managerId: "",
  description: ""
};

const emptyPay = {
  baseSalary: "0",
  allowance: "0",
  bonus: "0",
  deduction: "0",
  paymentDate: "",
  paymentStatus: "지급대기"
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function money(value) {
  return value == null || value === ""
    ? "-"
    : `${Number(value).toLocaleString("ko-KR")}원`;
}

function apiError(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
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

function PayrollForm({
  form,
  setForm,
  employee,
  month,
  saving,
  onSave,
  onClose
}) {
  const change = (event) =>
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));

  const gross =
    Number(form.baseSalary || 0) +
    Number(form.allowance || 0) +
    Number(form.bonus || 0);

  const net = gross - Number(form.deduction || 0);

  return (
    <form className="hr-unified-form" onSubmit={onSave}>
      <p className="hr-form-context">
        {employee.name} · {employee.employeeNumber} · {month}
      </p>

      {[
        ["기본급", "baseSalary"],
        ["수당", "allowance"],
        ["상여금", "bonus"],
        ["공제액", "deduction"]
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

      <label>
        지급일
        <input
          type="date"
          name="paymentDate"
          value={form.paymentDate}
          onChange={change}
        />
      </label>

      <label>
        지급 상태
        <select
          name="paymentStatus"
          value={form.paymentStatus}
          onChange={change}
        >
          <option value="지급대기">지급대기</option>
          <option value="지급완료">지급완료</option>
        </select>
      </label>

      <div className="hr-form-totals">
        <span>세전 {money(gross)}</span>
        <strong>실지급 {money(net)}</strong>
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

export default function UnifiedEmployees() {
  const user = getLoginUser();
  const isMaster = user?.role === "MASTER";

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("전체");
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("전체");
  const [accountStatus, setAccountStatus] = useState("전체");
  const [detailTab, setDetailTab] = useState("info");
  const [payMonth, setPayMonth] = useState(currentMonth);
  const [payrolls, setPayrolls] = useState([]);
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

  async function refreshOrganization() {
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

    setDepartments(departmentResponse.data.data);
    setEmployees(employeeResponse.data.data);

    return employeeResponse.data.data;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [departmentResponse, employeeResponse] =
          await getHrOrganization();

        if (
          !departmentResponse.data.success ||
          !employeeResponse.data.success ||
          !Array.isArray(departmentResponse.data.data) ||
          !Array.isArray(employeeResponse.data.data)
        ) {
          throw new Error("직원·부서 자료 형식이 올바르지 않습니다.");
        }

        if (active) {
          setDepartments(departmentResponse.data.data);
          setEmployees(employeeResponse.data.data);
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
    if (detailTab !== "payroll" || !isMaster) {
      return undefined;
    }

    let active = true;

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

        if (active) {
          setPayrolls(response.data.data);
        }
      } catch (e) {
        if (active) {
          setPayrolls([]);
          setPayError(apiError(e, "급여 조회에 실패했습니다."));
        }
      } finally {
        if (active) {
          setPayLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [detailTab, isMaster, payMonth]);

  const filtered = useMemo(
    () =>
      employees.filter((emp) => {
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
      employees,
      search,
      selectedDept,
      employmentStatus,
      accountStatus
    ]
  );


  // 직원 목록 페이지네이션
  const itemsPerPage = 7;

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
    const nextId = selected?.employeeId ?? null;

    if (String(selectedId) !== String(nextId)) {
      setSelectedId(nextId);
    }
  }, [selectedId, selected?.employeeId]);

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

  const working = employees.filter(
    (emp) => emp.employmentStatus === "재직"
  ).length;

  const payroll = payrolls.find(
    (row) =>
      String(row.employeeId) === String(selected?.employeeId)
  );

  const canEditPay =
    isMaster &&
    selected &&
    selected.employmentStatus !== "퇴사" &&
    !!payroll &&
    !payLoading &&
    !payError;

  function chooseDept(value) {
    setSelectedDept(value);
    setSelectedId(null);
    setCurrentPage(1);
    setDetailTab("info");
  }

  function chooseEmployee(emp) {
    setSelectedId(emp.employeeId);
    setDetailTab("info");
  }

  function reset() {
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
          employmentStatus: employeeForm.employmentStatus
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
          baseSalary: String(payroll.baseSalary ?? 0),
          allowance: String(payroll.allowance ?? 0),
          bonus: String(payroll.bonus ?? 0),
          deduction: String(payroll.deduction ?? 0),
          paymentDate: payroll.paymentDate || "",
          paymentStatus:
            payroll.paymentStatus === "급여 미등록"
              ? "지급대기"
              : payroll.paymentStatus || "지급대기"
        }
        : { ...emptyPay }
    );

    setModal("payroll");
  }

  async function savePayroll(event) {
    event.preventDefault();

    if (!canEditPay || modal !== "payroll") {
      return;
    }

    const names = [
      "baseSalary",
      "allowance",
      "bonus",
      "deduction"
    ];

    const amounts = names.map((name) =>
      Number(payForm[name])
    );

    if (
      amounts.some(
        (amount, i) =>
          payForm[names[i]] === "" ||
          !Number.isSafeInteger(amount) ||
          amount < 0
      )
    ) {
      setError("급여 금액은 0 이상의 정수로 입력해 주세요.");
      return;
    }

    if (
      amounts[3] >
      amounts[0] + amounts[1] + amounts[2]
    ) {
      setError("공제액은 세전 총액보다 클 수 없습니다.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const values = {
      baseSalary: amounts[0],
      allowance: amounts[1],
      bonus: amounts[2],
      deduction: amounts[3],
      paymentDate: payForm.paymentDate,
      paymentStatus: payForm.paymentStatus
    };

    try {
      const response =
        payroll.payrollId !== null
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
        throw new Error("급여 저장 응답이 올바르지 않습니다.");
      }

      const next = await getHrPayrolls(payMonth);

      if (
        !next.data.success ||
        !Array.isArray(next.data.data)
      ) {
        throw new Error("급여 재조회에 실패했습니다.");
      }

      setPayrolls(next.data.data);
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
      <header className="dashboard-header hr-single-header">
        <div>
          <span className="subtitle">
            인사·조직 통합관리
          </span>
          <span className="subtext">
            부서를 선택하고 직원 상세정보와 급여를 한 화면에서 관리합니다.
          </span>
        </div>
      </header>

      <section className="stats-section">
        <StatisticsCard
          title="전체 직원"
          count={employees.length}
          stiyle={1}
        />
        <StatisticsCard
          title="재직 직원"
          count={working}
          stiyle={1}
        />
        <StatisticsCard
          title="전체 부서"
          count={departments.length}
          stiyle={0}
        />
        <div className="content-card hr-average-card">
          <p>평균 부서 인원</p>
          <span>
            {departments.length
              ? (working / departments.length).toFixed(1)
              : "0.0"}
          </span>
          명
        </div>
      </section>

      <section className="hr-filter-card">
        <div className="hr-filter-result">
          조회 직원 <strong>{filtered.length}</strong>명
        </div>

        <div className="hr-single-filters">
          <input
            aria-label="통합검색"
            placeholder="사번, 이름, 이메일, 직급 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

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

          <button type="button" onClick={reset}>
            초기화
          </button>

          {isMaster && (
            <button
              type="button"
              className="erp-primary-button"
              onClick={() => openEmployeeModal(false)}
              disabled={!departments.length}
            >
              직원 등록
            </button>
          )}

          {isMaster && (
            <button
              type="button"
              className="erp-primary-button"
              onClick={() => {
                setDepartmentForm(emptyDepartment);
                setModal("department");
              }}
            >
              부서 등록
            </button>
          )}
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
              <span>{employees.length}명</span>
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

              <small>
                {!selectedDepartment
                  ? "부서를 선택해 주세요."
                  : deptMembers.length > 0
                    ? "소속 직원이 있어 삭제할 수 없습니다."
                    : "삭제 전 확인창이 표시됩니다."}
              </small>
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

            <div className="hr-single-employee-list">
              {visibleEmployees.length === 0 ? (
                <p className="hr-empty-state">
                  조건에 맞는 직원이 없습니다.
                </p>
              ) : (
                visibleEmployees.map((emp) => (
                  <button
                    key={emp.employeeId}
                    type="button"
                    className={`hr-single-employee${String(selected?.employeeId) === String(emp.employeeId)
                      ? " selected"
                      : ""
                      }`}
                    onClick={() => chooseEmployee(emp)}
                    title={`${emp.employeeNumber || "-"} · ${emp.name}`}
                  >
                    <strong>{emp.name}</strong>
                    <span>{emp.employeeNumber || "-"}</span>
                    <small>{emp.position || "-"}</small>
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

              {isMaster && (
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
              )}
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
                ) : !isMaster ? null : (
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

                    {selected.employmentStatus === "퇴사" ? (
                      <p className="hr-empty-state">
                        현재 급여 API는 재직·휴직 직원만 조회할 수 있습니다.
                      </p>
                    ) : payLoading ? (
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
                            title="공제액"
                            value={
                              payroll.payrollId === null
                                ? "-"
                                : money(payroll.deduction)
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

                        <div className="employee-detail-actions">
                          <button
                            type="button"
                            className="erp-primary-button"
                            onClick={openPayrollModal}
                            disabled={!canEditPay || saving}
                          >
                            {payroll.payrollId === null
                              ? "급여 등록"
                              : "급여 수정"}
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
          title={`${selected.name} · ${payMonth} 급여 관리`}
          onClose={() => setModal("")}
          layout={
            <PayrollForm
              form={payForm}
              setForm={setPayForm}
              employee={selected}
              month={payMonth}
              saving={saving}
              onSave={savePayroll}
              onClose={() => setModal("")}
            />
          }
        />
      )}
    </div>
  );
}
