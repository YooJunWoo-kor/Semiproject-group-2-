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
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';
  const [activeTab, setActiveTab] = useState('employee');
  const [payrollList, setPayrollList] = useState([]);
  const [selectedPayMonth, setSelectedPayMonth] = useState(getCurrentPayMonth);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadPayrolls() {
      setLoading(true);
      setError('');
      setNotice('');

      try {
        const rows = await fetchPayrollRows(selectedPayMonth);

        if (!ignore) {
          setPayrollList(rows);
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

  async function handleSavePayroll(formData) {
    if (!selectedEmp || !isMaster) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
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

  const registeredPayrolls = payrollList.filter(
    (payroll) => payroll.payrollId !== null
  );
  const unregisteredCount = payrollList.length - registeredPayrolls.length;
  const grossTotal = registeredPayrolls.reduce(
    (total, payroll) => total + toNumber(payroll.grossPay),
    0
  );
  const netTotal = registeredPayrolls.reduce(
    (total, payroll) => total + toNumber(payroll.netPay),
    0
  );

  const filteredEmployees = payrollList.filter((payroll) =>
    [
      payroll.employeeNumber,
      payroll.employeeName,
      payroll.departmentName,
      payroll.position
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')
      .includes(search.trim().toLowerCase())
  );

  const employeeHeaders = [
    '사번',
    '이름',
    '부서',
    '직급',
    '기본급',
    '수당',
    '상여금',
    '공제액',
    '세전 총액',
    '실수령액',
    '지급일',
    '상태',
    '관리'
  ];

  const employeeTableData = filteredEmployees.map((payroll) => ({
    content: [
      payroll.employeeNumber,
      <strong
        className="emp-name"
        onClick={() => handleOpenEdit(payroll)}
        style={{ cursor: isMaster ? 'pointer' : 'default' }}
      >
        {payroll.employeeName}
      </strong>,
      payroll.departmentName || '-',
      <span className="emp-position">{payroll.position}</span>,
      formatMoney(payroll.baseSalary),
      formatMoney(payroll.allowance),
      formatMoney(payroll.bonus),
      formatMoney(payroll.deduction),
      formatMoney(payroll.grossPay),
      formatMoney(payroll.netPay),
      payroll.paymentDate || '-',
      <span
        className={`status-tag ${
          payroll.paymentStatus === '급여 미등록' ? 'off' : 'working'
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

  return (
    <div className="sub-container">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">급여관리</span>
          <span className="subtext">임직원 급여 책정 내역을 확인하고 부서별 집계를 관리합니다.</span>
        </div>
      </header>

      <section className="stats-section">
        <StatisticsCard title="세전 총액" count={Math.round(grossTotal / 10000)} stiyle={2} />
        <StatisticsCard title="실수령 총액" count={Math.round(netTotal / 10000)} stiyle={2} />
        <StatisticsCard title="지급 대상" count={registeredPayrolls.length} stiyle={1} />
        <StatisticsCard title="급여 미등록" count={unregisteredCount} stiyle={1} />
      </section>

      {notice && (
        <p role="status" style={{ color: '#047857' }}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: '#b91c1c' }}>
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '20px',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: activeTab === 'employee' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'employee' ? '#3b82f6' : '#ffffff',
              color: activeTab === 'employee' ? '#ffffff' : '#475569'
            }}
          >
            직원별 급여 목록
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('department')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: activeTab === 'department' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'department' ? '#3b82f6' : '#ffffff',
              color: activeTab === 'department' ? '#ffffff' : '#475569'
            }}
          >
            부서별 급여 현황
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label>
            급여월
            <input
              type="month"
              value={selectedPayMonth}
              onChange={(event) => setSelectedPayMonth(event.target.value)}
              style={{ marginLeft: '6px', padding: '6px 8px' }}
            />
          </label>
          {activeTab === 'employee' && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="사번, 이름, 부서, 직급 검색"
              style={{ padding: '6px 12px', width: '220px' }}
            />
          )}
        </div>
      </div>

      {loading ? (
        <p role="status">급여 정보를 불러오는 중입니다.</p>
      ) : activeTab === 'employee' ? (
        <PaginationTable
          key={`${selectedPayMonth}-${search}-${payrollList.length}`}
          title="직원별 급여 세부 내역"
          th={employeeHeaders}
          allData={employeeTableData}
          itemsPerPage={5}
        />
      ) : (
        <PaginationTable
          key={`${selectedPayMonth}-department-${payrollList.length}`}
          title="부서별 급여 집계 현황"
          th={departmentHeaders}
          allData={departmentTableData}
          itemsPerPage={5}
        />
      )}
    </div>
  );
}
