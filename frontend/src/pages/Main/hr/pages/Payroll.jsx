import React, { useEffect, useState } from 'react';
import StatisticsCard from '../../../../components/StatisticsCard';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';
import {
  createHrPayroll,
  getHrPayrolls,
  updateHrPayroll
} from '../../../../components/HrData';

/* 기존 확인용 더미데이터는 참고용으로 보존합니다.
const initialPayrollList = [
  {
    id: 'EMP-1001',
    name: '김민준',
    department: '개발팀',
    position: '팀장',
    baseSalary: 4500000,
    mealAllowance: 200000,
    bonus: 500000,
    paymentStatus: '지급대기'
  }
];
*/

function getCurrentPayMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${Number(value).toLocaleString()}원`;
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || fallbackMessage;
}

async function fetchPayrollRows(payMonth) {
  // 선택한 급여월의 실제 직원·급여 목록을 기존 조회 API에서 가져옵니다.
  const response = await getHrPayrolls(payMonth);

  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('급여 목록 응답 형식이 올바르지 않습니다.');
  }

  return response.data.data;
}

function PayrollEditForm({ employee, payMonth, onSave, onCancel, saving }) {
  const isRegister = employee.payrollId === null;
  const [form, setForm] = useState({
    baseSalary: employee.baseSalary ?? '',
    allowance: employee.allowance ?? '',
    deduction: employee.deduction ?? '',
    bonus: employee.bonus ?? '',
    paymentDate: employee.paymentDate || '',
    paymentStatus:
      employee.paymentStatus === '급여 미등록'
        ? '지급대기'
        : employee.paymentStatus || '지급대기'
  });

  function changeForm(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const amountFields = [
      form.baseSalary,
      form.allowance,
      form.deduction,
      form.bonus
    ];
    const hasInvalidAmount = amountFields.some(
      (value) =>
        value === '' ||
        !Number.isInteger(Number(value)) ||
        Number(value) < 0
    );

    if (hasInvalidAmount) {
      alert('급여 금액은 0 이상의 정수로 입력해 주세요.');
      return;
    }

    const grossPay =
      Number(form.baseSalary) + Number(form.allowance) + Number(form.bonus);
    const netPay = grossPay - Number(form.deduction);

    if (netPay < 0) {
      alert('공제액은 세전 총액보다 클 수 없습니다.');
      return;
    }

    onSave({
      employeeId: employee.employeeId,
      payrollId: employee.payrollId,
      payMonth,
      baseSalary: Number(form.baseSalary),
      allowance: Number(form.allowance),
      deduction: Number(form.deduction),
      bonus: Number(form.bonus),
      paymentDate: form.paymentDate,
      paymentStatus: form.paymentStatus,
      isRegister
    });
  }

  const grossPay =
    toNumber(form.baseSalary) +
    toNumber(form.allowance) +
    toNumber(form.bonus);
  const netPay = grossPay - toNumber(form.deduction);

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <div
        style={{
          backgroundColor: '#f8fafc',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '13px'
        }}
      >
        <div>
          사번: <strong>{employee.employeeNumber}</strong>
        </div>
        <div style={{ marginTop: '2px' }}>
          직원명: <strong>{employee.employeeName}</strong> ({employee.departmentName || '-'} / {employee.position})
        </div>
        <div style={{ marginTop: '2px' }}>급여월: {payMonth}</div>
      </div>

      <label>
        기본급 (원)
        <input
          type="number"
          min="0"
          step="1"
          name="baseSalary"
          value={form.baseSalary}
          onChange={changeForm}
          required
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        />
      </label>

      <label>
        수당 (원)
        <input
          type="number"
          min="0"
          step="1"
          name="allowance"
          value={form.allowance}
          onChange={changeForm}
          required
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        />
      </label>

      <label>
        공제액 (원)
        <input
          type="number"
          min="0"
          step="1"
          name="deduction"
          value={form.deduction}
          onChange={changeForm}
          required
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        />
      </label>

      <label>
        상여금 (원)
        <input
          type="number"
          min="0"
          step="1"
          name="bonus"
          value={form.bonus}
          onChange={changeForm}
          required
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        />
      </label>

      <label>
        지급일
        <input
          type="date"
          name="paymentDate"
          value={form.paymentDate}
          onChange={changeForm}
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        />
      </label>

      <label>
        지급 상태
        <select
          name="paymentStatus"
          value={form.paymentStatus}
          onChange={changeForm}
          style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box' }}
        >
          <option value="지급대기">지급대기</option>
          <option value="지급완료">지급완료</option>
        </select>
      </label>

      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span>세전 총액: <strong>{formatMoney(grossPay)}</strong></span>
        <span>실수령액: <strong>{formatMoney(netPay)}</strong></span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="erp-primary-button" disabled={saving}>
          {saving ? '저장 중...' : isRegister ? '급여 등록' : '수정 완료'}
        </button>
      </div>
    </form>
  );
}

export default function Payroll() {
  // 기준 월별 급여 조회와 급여 등록·수정을 담당합니다.
  const loginUser = getLoginUser();
  // 급여 등록·수정 기능은 기존 정책대로 MASTER 화면에만 노출합니다.
  const isMaster = loginUser?.role === 'MASTER';
  const [activeTab, setActiveTab] = useState('employee');
  const [payrollList, setPayrollList] = useState([]);
  const [selectedPayMonth, setSelectedPayMonth] = useState(getCurrentPayMonth);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('전체');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedPayrolls, setHasLoadedPayrolls] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;

    // 급여월이 바뀔 때 이전 선택을 비우고 해당 월 자료를 다시 조회합니다.
    // 기준 급여월이 바뀔 때 직원별 급여 목록을 다시 조회합니다.
    async function loadPayrolls() {
      setLoading(true);
      setHasLoadedPayrolls(false);
      setError('');
      setNotice('');
      setPayrollList([]);
      setSelectedEmp(null);
      setSelectedEmployeeIds([]);

      try {
        const rows = await fetchPayrollRows(selectedPayMonth);

        if (!ignore) {
          setPayrollList(rows);
          setHasLoadedPayrolls(true);
        }
      } catch (requestError) {
        console.error('급여 목록 조회 오류:', requestError);

        if (!ignore) {
          setPayrollList([]);
          setError(
            getApiErrorMessage(
              requestError,
              '급여 정보를 불러오지 못했습니다.'
            )
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPayrolls();

    return () => {
      ignore = true;
    };
  }, [selectedPayMonth]);

  function handleSelectEmployee(employee) {
    setSelectedEmp(employee);
  }

  function handleOpenEdit(employee) {
    if (!isMaster) {
      alert('급여 등록·수정 권한이 없습니다 (MASTER 권한 필요).');
      return;
    }

    setError('');
    setNotice('');
    setSelectedEmp(employee);
    setIsModalOpen(true);
  }

  function handleToggleEmployee(employeeId) {
    setSelectedEmployeeIds((currentIds) =>
      currentIds.includes(employeeId)
        ? currentIds.filter((id) => id !== employeeId)
        : [...currentIds, employeeId]
    );
  }

  function resetFilters() {
    setSearch('');
    setSelectedDepartment('전체');
    setSelectedPaymentStatus('전체');
  }

  // payrollId 유무로 신규 등록과 기존 급여 수정을 구분합니다.
  async function handleSavePayroll(formData) {
    if (!selectedEmp || !isMaster) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      // payrollId 유무로 기존 등록 API와 수정 API를 구분합니다.
      const response = formData.payrollId
        ? await updateHrPayroll(formData.payrollId, {
            baseSalary: formData.baseSalary,
            allowance: formData.allowance,
            deduction: formData.deduction,
            bonus: formData.bonus,
            paymentDate: formData.paymentDate,
            paymentStatus: formData.paymentStatus
          })
        : await createHrPayroll({
            employeeId: formData.employeeId,
            payMonth: formData.payMonth,
            baseSalary: formData.baseSalary,
            allowance: formData.allowance,
            deduction: formData.deduction,
            bonus: formData.bonus,
            paymentDate: formData.paymentDate,
            paymentStatus: formData.paymentStatus
          });

      if (!response.data.success) {
        throw new Error('급여 저장 응답 형식이 올바르지 않습니다.');
      }

      // 저장된 서버 응답을 화면에 정확히 반영하기 위해 목록을 재조회합니다.
      const rows = await fetchPayrollRows(selectedPayMonth);
      setPayrollList(rows);
      setSelectedEmp(
        rows.find((row) => row.employeeId === formData.employeeId) || null
      );
      setIsModalOpen(false);
      setNotice(response.data.message || '급여 정보가 저장되었습니다.');
    } catch (requestError) {
      console.error('급여 저장 오류:', requestError);
      setError(
        getApiErrorMessage(requestError, '급여 정보를 저장하지 못했습니다.')
      );
    } finally {
      setSaving(false);
    }
  }

  // 통계는 더미데이터 없이 선택 급여월 API 응답만으로 계산합니다.
  const registeredPayrolls = payrollList.filter(
    (payroll) => payroll.payrollId !== null
  );
  const unregisteredCount = payrollList.length - registeredPayrolls.length;
  const grossTotal = registeredPayrolls.reduce(
    (total, payroll) => total + toNumber(payroll.grossPay),
    0
  );
  const deductionTotal = registeredPayrolls.reduce(
    (total, payroll) => total + toNumber(payroll.deduction),
    0
  );
  const netTotal = registeredPayrolls.reduce(
    (total, payroll) => total + toNumber(payroll.netPay),
    0
  );

  // 부서와 지급상태 선택지는 API 응답에서 중복을 제거해 동적으로 만듭니다.
  const departments = payrollList.reduce((list, payroll) => {
    const departmentId = String(payroll.departmentId ?? 'none');
    const alreadyAdded = list.some(
      (department) => department.departmentId === departmentId
    );

    if (!alreadyAdded) {
      list.push({
        departmentId,
        departmentName: payroll.departmentName || '부서 미지정'
      });
    }

    return list;
  }, []);

  const paymentStatuses = payrollList.reduce((list, payroll) => {
    if (payroll.paymentStatus && !list.includes(payroll.paymentStatus)) {
      list.push(payroll.paymentStatus);
    }

    return list;
  }, []);

  // 검색어·부서·지급상태 조건을 한 번에 적용합니다.
  const normalizedSearch = search.trim().toLowerCase();
  const filteredEmployees = payrollList.filter((payroll) => {
    const matchesSearch = [
      payroll.employeeNumber,
      payroll.employeeName,
      payroll.departmentName,
      payroll.position
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(normalizedSearch);
    const matchesDepartment =
      selectedDepartment === '전체' ||
      String(payroll.departmentId ?? 'none') === selectedDepartment;
    const matchesPaymentStatus =
      selectedPaymentStatus === '전체' ||
      payroll.paymentStatus === selectedPaymentStatus;

    return matchesSearch && matchesDepartment && matchesPaymentStatus;
  });

  // 조회 결과로 확인할 수 있는 범위에서만 월 급여 처리 단계를 계산합니다.
  const hasPendingPayroll = registeredPayrolls.some(
    (payroll) => payroll.paymentStatus === '지급대기'
  );
  const isAllPaymentComplete =
    payrollList.length > 0 &&
    unregisteredCount === 0 &&
    registeredPayrolls.every(
      (payroll) => payroll.paymentStatus === '지급완료'
    );
  const processSteps = [
    {
      number: 1,
      label: '자료 검증',
      state: hasLoadedPayrolls ? 'complete' : 'waiting'
    },
    {
      number: 2,
      label: '급여 등록·계산',
      state: registeredPayrolls.length > 0 ? 'complete' : 'waiting'
    },
    {
      number: 3,
      label: '지급 대기',
      state: hasPendingPayroll
        ? 'current'
        : isAllPaymentComplete
          ? 'complete'
          : 'waiting'
    },
    {
      number: 4,
      label: '지급 완료',
      state: isAllPaymentComplete ? 'complete' : 'waiting'
    }
  ];

  const employeeHeaders = [
    '선택',
    '사번·이름',
    '부서·직급',
    '기본급',
    '수당·상여',
    '공제',
    '실지급액',
    '지급일',
    '상태',
    '관리'
  ];

  // 기존 PaginationTable이 요구하는 content 배열 형태로 행 데이터를 구성합니다.
  const employeeTableData = filteredEmployees.map((payroll) => ({
    content: [
      <input
        type="checkbox"
        checked={selectedEmployeeIds.includes(payroll.employeeId)}
        onChange={() => handleToggleEmployee(payroll.employeeId)}
        aria-label={`${payroll.employeeName} 선택`}
        title="화면 선택용이며 일괄 저장은 지원하지 않습니다."
      />,
      <div className="payroll-employee-cell">
        <span>{payroll.employeeNumber}</span>
        <button
          type="button"
          className={`payroll-employee-name ${
            selectedEmp?.employeeId === payroll.employeeId ? 'selected' : ''
          }`}
          onClick={() => handleSelectEmployee(payroll)}
        >
          {payroll.employeeName}
        </button>
      </div>,
      <div className="payroll-stacked-cell">
        <strong>{payroll.departmentName || '-'}</strong>
        <span>{payroll.position || '-'}</span>
      </div>,
      payroll.payrollId === null ? '-' : formatMoney(payroll.baseSalary),
      payroll.payrollId === null ? (
        '-'
      ) : (
        <div className="payroll-stacked-cell payroll-amount-breakdown">
          <span>수당 {formatMoney(payroll.allowance)}</span>
          <span>상여 {formatMoney(payroll.bonus)}</span>
        </div>
      ),
      payroll.payrollId === null ? '-' : formatMoney(payroll.deduction),
      payroll.payrollId === null ? '-' : (
        <strong>{formatMoney(payroll.netPay)}</strong>
      ),
      payroll.paymentDate || '-',
      <span
        className={`payroll-status-badge ${
          payroll.paymentStatus === '급여 미등록'
            ? 'payroll-status-unregistered'
            : payroll.paymentStatus === '지급완료'
              ? 'payroll-status-complete'
              : 'payroll-status-pending'
        }`}
      >
        {payroll.paymentStatus}
      </span>,
      isMaster ? (
        <button type="button" onClick={() => handleOpenEdit(payroll)}>
          {payroll.payrollId === null ? '급여 등록' : '수정'}
        </button>
      ) : (
        '-'
      )
    ]
  }));

  // 등록된 급여만 부서별로 묶어 실제 급여 합계와 평균을 계산합니다.
  const departmentSummary = registeredPayrolls.reduce((summary, payroll) => {
    const key = String(payroll.departmentId || 'none');

    if (!summary[key]) {
      summary[key] = {
        departmentName: payroll.departmentName || '부서 미지정',
        count: 0,
        grossTotal: 0,
        deductionTotal: 0,
        netTotal: 0
      };
    }

    summary[key].count += 1;
    summary[key].grossTotal += toNumber(payroll.grossPay);
    summary[key].deductionTotal += toNumber(payroll.deduction);
    summary[key].netTotal += toNumber(payroll.netPay);
    return summary;
  }, {});

  const departmentHeaders = [
    '부서명',
    '급여 등록 인원',
    '세전 총액',
    '공제액',
    '실수령액',
    '평균 세전 급여'
  ];
  const departmentTableData = Object.values(departmentSummary).map((summary) => ({
    content: [
      <strong>{summary.departmentName}</strong>,
      `${summary.count}명`,
      formatMoney(summary.grossTotal),
      formatMoney(summary.deductionTotal),
      formatMoney(summary.netTotal),
      formatMoney(Math.round(summary.grossTotal / summary.count))
    ]
  }));

  // 왼쪽 직원 목록과 오른쪽 급여 상세·처리 영역을 함께 렌더링합니다.
  return (
    <div className="border-container hr-payroll-management">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">급여관리</span>
          <span className="subtext">임직원 급여 책정 내역을 확인하고 부서별 집계를 관리합니다.</span>
        </div>
        {isMaster && (
          <div className="payroll-header-actions">
            <button
              type="button"
              disabled
              title="엑셀 업로드 API 연결이 필요합니다."
            >
              엑셀 업로드
            </button>
            <button
              type="button"
              disabled
              title="급여 일괄 계산 API 연결이 필요합니다."
            >
              급여 일괄 계산
            </button>
            <button
              type="button"
              disabled
              title="서버 권한 검증과 지급 확정 API 연결이 필요합니다."
            >
              지급 확정
            </button>
          </div>
        )}
      </header>

      {/* 조회된 급여 자료를 기준으로 현재 처리 단계를 표시합니다. */}
      <section className="payroll-process-card" aria-label="월 급여 처리 단계">
        <div className="payroll-process-heading">
          <div>
            <strong>{selectedPayMonth} 급여 처리</strong>
            <span>API 응답으로 확인 가능한 단계만 표시합니다.</span>
          </div>
          <span>{loading ? '조회 중' : hasLoadedPayrolls ? '조회 완료' : '확인 필요'}</span>
        </div>
        <ol className="payroll-process-steps">
          {processSteps.map((step) => (
            <li
              key={step.number}
              className={`payroll-process-step ${step.state}`}
            >
              <span className="payroll-process-number">{step.number}</span>
              <div>
                <strong>{step.label}</strong>
                <span>
                  {step.state === 'complete'
                    ? '완료'
                    : step.state === 'current'
                      ? '진행 중'
                      : '대기'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="stats-section payroll-summary-grid">
        <StatisticsCard title="지급 대상" count={payrollList.length} stiyle={1} />
        <StatisticsCard title="세전 총액" count={Math.round(grossTotal / 10000)} stiyle={2} />
        <StatisticsCard title="총 공제" count={Math.round(deductionTotal / 10000)} stiyle={2} />
        <StatisticsCard title="실지급액" count={Math.round(netTotal / 10000)} stiyle={2} />
        <div className="content-card payroll-warning-card">
          <p>미등록·오류</p>
          <span>{unregisteredCount}</span>명
        </div>
      </section>

      {unregisteredCount > 0 && hasLoadedPayrolls && (
        <div className="payroll-alert payroll-alert-warning" role="status">
          <strong>급여 미등록 {unregisteredCount}명</strong>
          <span>지급 확정 전에 급여 정보를 등록해 주세요.</span>
        </div>
      )}
      {notice && (
        <p className="payroll-alert payroll-alert-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="payroll-alert payroll-alert-error" role="alert">
          {error}
        </p>
      )}

      {isModalOpen && selectedEmp && (
        <ModalBase
          title={`${selectedEmp.payrollId === null ? '급여 등록' : '급여 정보 수정'} - ${selectedEmp.employeeName}`}
          onClose={() => setIsModalOpen(false)}
          layout={
            <PayrollEditForm
              employee={selectedEmp}
              payMonth={selectedPayMonth}
              onSave={handleSavePayroll}
              onCancel={() => setIsModalOpen(false)}
              saving={saving}
            />
          }
        />
      )}

      {/* 급여월은 API 재조회, 나머지 조건은 현재 목록에 동시에 적용됩니다. */}
      <section className="payroll-filter-card">
        <div className="payroll-tabs" role="tablist" aria-label="급여 조회 구분">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'employee'}
            className={activeTab === 'employee' ? 'active' : ''}
            onClick={() => setActiveTab('employee')}
          >
            직원별 급여 목록
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'department'}
            className={activeTab === 'department' ? 'active' : ''}
            onClick={() => setActiveTab('department')}
          >
            부서별 급여 현황
          </button>
        </div>

        <div className="payroll-filter-controls">
          <label className="payroll-filter-field">
            <span>급여월</span>
            <input
              type="month"
              value={selectedPayMonth}
              onChange={(event) => setSelectedPayMonth(event.target.value)}
            />
          </label>
          {activeTab === 'employee' && (
            <>
              <label className="payroll-filter-field">
                <span>부서</span>
                <select
                  value={selectedDepartment}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                >
                  <option value="전체">전체 부서</option>
                  {departments.map((department) => (
                    <option
                      key={department.departmentId}
                      value={department.departmentId}
                    >
                      {department.departmentName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="payroll-filter-field">
                <span>지급상태</span>
                <select
                  value={selectedPaymentStatus}
                  onChange={(event) => setSelectedPaymentStatus(event.target.value)}
                >
                  <option value="전체">전체 상태</option>
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="payroll-filter-field payroll-search-field">
                <span>통합검색</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="사번, 이름, 부서, 직급 검색"
                />
              </label>
              <button
                type="button"
                className="payroll-reset-button"
                onClick={resetFilters}
              >
                초기화
              </button>
            </>
          )}
        </div>
        {activeTab === 'employee' && (
          <div className="payroll-filter-result">
            조회 결과 <strong>{filteredEmployees.length}</strong>명
            {selectedEmployeeIds.length > 0 && (
              <span> · 화면 선택 {selectedEmployeeIds.length}명</span>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <p className="payroll-loading" role="status">급여 정보를 불러오는 중입니다.</p>
      ) : activeTab === 'employee' ? (
        <div className="payroll-workspace">
          {/* 직원명 선택은 상세만 변경하고, 등록·수정 버튼만 모달을 엽니다. */}
          <section className="payroll-list-panel">
            <PaginationTable
              key={`${selectedPayMonth}-${search}-${selectedDepartment}-${selectedPaymentStatus}-${payrollList.length}`}
              title="직원별 급여 세부 내역"
              th={employeeHeaders}
              allData={employeeTableData}
              itemsPerPage={5}
            />
          </section>
          <aside className="payroll-detail-panel">
            <div className="payroll-panel-heading">
              <div>
                <span>선택 직원</span>
                <h2>급여 상세</h2>
              </div>
              {selectedEmp && (
                <span
                  className={`payroll-status-badge ${
                    selectedEmp.paymentStatus === '급여 미등록'
                      ? 'payroll-status-unregistered'
                      : selectedEmp.paymentStatus === '지급완료'
                        ? 'payroll-status-complete'
                        : 'payroll-status-pending'
                  }`}
                >
                  {selectedEmp.paymentStatus}
                </span>
              )}
            </div>

            {selectedEmp ? (
              <>
                <dl className="payroll-detail-list">
                  <div className="payroll-detail-row">
                    <dt>기본급</dt>
                    <dd>{selectedEmp.payrollId === null ? '-' : formatMoney(selectedEmp.baseSalary)}</dd>
                  </div>
                  <div className="payroll-detail-row">
                    <dt>수당</dt>
                    <dd>{selectedEmp.payrollId === null ? '-' : formatMoney(selectedEmp.allowance)}</dd>
                  </div>
                  <div className="payroll-detail-row">
                    <dt>공제액</dt>
                    <dd>{selectedEmp.payrollId === null ? '-' : formatMoney(selectedEmp.deduction)}</dd>
                  </div>
                  <div className="payroll-detail-row payroll-detail-net">
                    <dt>실수령액</dt>
                    <dd>{selectedEmp.payrollId === null ? '-' : formatMoney(selectedEmp.netPay)}</dd>
                  </div>
                  <div className="payroll-detail-row">
                    <dt>지급일</dt>
                    <dd>{selectedEmp.paymentDate || '-'}</dd>
                  </div>
                  <div className="payroll-detail-row">
                    <dt>지급 상태</dt>
                    <dd>{selectedEmp.paymentStatus}</dd>
                  </div>
                </dl>
                {isMaster && (
                  <button
                    type="button"
                    className="erp-primary-button payroll-detail-action"
                    onClick={() => handleOpenEdit(selectedEmp)}
                  >
                    {selectedEmp.payrollId === null ? '급여 등록' : '급여 수정'}
                  </button>
                )}
              </>
            ) : (
              <p className="payroll-empty-detail">
                직원을 선택하면 급여 상세정보가 표시됩니다.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section className="payroll-department-panel">
          <PaginationTable
            key={`${selectedPayMonth}-department-${payrollList.length}`}
            title="부서별 급여 집계 현황"
            th={departmentHeaders}
            allData={departmentTableData}
            itemsPerPage={5}
          />
        </section>
      )}
    </div>
  );
}
