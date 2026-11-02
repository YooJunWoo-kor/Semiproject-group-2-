import React, { useState } from "react";
import StatisticsCard from "../../../../components/StatisticsCard";
import PaginationTable from "../../../../components/PaginationTable";
import ModalBase from "../../../../components/ModalBase";
import { getLoginUser } from "../../../../utils/authStorage";

// 1. [상단 분리] 급여 수정 폼 모달 컴포넌트
function PayrollEditForm({ employee, onSave, onCancel }) {
  const [baseSalary, setBaseSalary] = useState(employee.baseSalary);
  const [mealAllowance, setMealAllowance] = useState(employee.mealAllowance);
  const [bonus, setBonus] = useState(employee.bonus);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: employee.id,
      baseSalary: Number(baseSalary) || 0,
      mealAllowance: Number(mealAllowance) || 0,
      bonus: Number(bonus) || 0,
    });
  };

  const total = (Number(baseSalary) || 0) + (Number(mealAllowance) || 0) + (Number(bonus) || 0);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
        <div>사번: <strong>{employee.id}</strong></div>
        <div style={{ marginTop: '2px' }}>직원명: <strong>{employee.name}</strong> ({employee.department} / {employee.position})</div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          기본급 (원)
        </label>
        <input
          type="number"
          step="10000"
          value={baseSalary}
          onChange={(e) => setBaseSalary(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          식대 (비과세, 원)
        </label>
        <input
          type="number"
          step="10000"
          value={mealAllowance}
          onChange={(e) => setMealAllowance(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          상여 및 성과급 (원)
        </label>
        <input
          type="number"
          step="10000"
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#475569' }}>총 지급 예정액:</span>
        <strong style={{ fontSize: '16px', color: '#2563eb' }}>{total.toLocaleString()}원</strong>
      </div>

      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '8px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}
        >
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
        >
          저장 완료
        </button>
      </div>
    </form>
  );
}

// 2. 초기 직원 급여 더미데이터
const initialPayrollList = [
  { id: 'EMP-1001', name: '김민준', department: '개발팀', position: '팀장', baseSalary: 4500000, mealAllowance: 200000, bonus: 500000, paymentStatus: '지급대기' },
  { id: 'EMP-1002', name: '이서연', department: '인사팀', position: '대리', baseSalary: 3200000, mealAllowance: 200000, bonus: 0, paymentStatus: '지급대기' },
  { id: 'EMP-1003', name: '박지호', department: '디자인팀', position: '사원', baseSalary: 2800000, mealAllowance: 200000, bonus: 100000, paymentStatus: '지급대기' },
  { id: 'EMP-1004', name: '최유진', department: '마케팅팀', position: '과장', baseSalary: 3800000, mealAllowance: 200000, bonus: 300000, paymentStatus: '지급대기' },
  { id: 'EMP-1005', name: '정도윤', department: '경영지원팀', position: '대리', baseSalary: 3300000, mealAllowance: 200000, bonus: 0, paymentStatus: '지급대기' },
  { id: 'EMP-1006', name: '한지우', department: '개발팀', position: '사원', baseSalary: 2900000, mealAllowance: 200000, bonus: 0, paymentStatus: '지급대기' },
  { id: 'EMP-1007', name: '윤지훈', department: '영업팀', position: '팀장', baseSalary: 4200000, mealAllowance: 200000, bonus: 800000, paymentStatus: '지급대기' },
];

export default function Payroll() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  const [activeTab, setActiveTab] = useState('employee'); // 'employee' | 'department'
  const [payrollList, setPayrollList] = useState(initialPayrollList);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1) 급여 수정 모달 오픈
  const handleOpenEdit = (emp) => {
    if (!isMaster) {
      alert("급여 수정 권한이 없습니다 (MASTER 권한 필요).");
      return;
    }
    setSelectedEmp(emp);
    setIsModalOpen(true);
  };

  // 2) 급여 저장 반영
  const handleSavePayroll = (updated) => {
    setPayrollList((prev) =>
      prev.map((emp) =>
        emp.id === updated.id
          ? {
              ...emp,
              baseSalary: updated.baseSalary,
              mealAllowance: updated.mealAllowance,
              bonus: updated.bonus,
            }
          : emp
      )
    );
    setIsModalOpen(false);
    alert('급여 정보가 성공적으로 반영되었습니다.');
  };

  // 3) 상단 통계 지표 자동 계산
  const totalPayout = payrollList.reduce(
    (acc, cur) => acc + cur.baseSalary + cur.mealAllowance + cur.bonus,
    0
  );
  const avgSalary = payrollList.length ? Math.round(totalPayout / payrollList.length) : 0;

  // 4) [탭 1] 직원별 급여 데이터 필터링 및 PaginationTable 규격 매핑
  const filteredEmployees = payrollList.filter((emp) =>
    `${emp.id} ${emp.name} ${emp.department} ${emp.position}`.toLowerCase().includes(search.toLowerCase())
  );

  const empTableHeaders = ['사번', '이름', '부서', '직급', '기본급', '식대', '상여/성과급', '총 지급액', '상태', '관리'];

  const empTableData = filteredEmployees.map((emp) => {
    const total = emp.baseSalary + emp.mealAllowance + emp.bonus;
    return {
      content: [
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{emp.id}</span>,
        <strong
          className="emp-name"
          onClick={() => handleOpenEdit(emp)}
          style={{ cursor: 'pointer', textDecoration: 'underline', color: '#1d4ed8' }}
          title="클릭하여 급여 수정"
        >
          {emp.name}
        </strong>,
        emp.department,
        <span className="emp-position">{emp.position}</span>,
        `${emp.baseSalary.toLocaleString()}원`,
        `${emp.mealAllowance.toLocaleString()}원`,
        `${emp.bonus.toLocaleString()}원`,
        <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString()}원</strong>,
        <span className="status-tag working">{emp.paymentStatus}</span>,
        <button
          type="button"
          onClick={() => handleOpenEdit(emp)}
          style={{
            padding: '3px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            cursor: 'pointer'
          }}
        >
          수정
        </button>
      ]
    };
  });

  // 5) [탭 2] 부서별 급여 집계 및 PaginationTable 규격 매핑
  const deptSummary = payrollList.reduce((acc, cur) => {
    if (!acc[cur.department]) {
      acc[cur.department] = { count: 0, total: 0 };
    }
    acc[cur.department].count += 1;
    acc[cur.department].total += cur.baseSalary + cur.mealAllowance + cur.bonus;
    return acc;
  }, {});

  const deptTableHeaders = ['부서명', '대상 인원', '부서 총 급여 지급액', '부서 1인 평균 급여', '지급 예정일'];

  const deptTableData = Object.keys(deptSummary).map((deptName) => {
    const dept = deptSummary[deptName];
    const deptAvg = Math.round(dept.total / dept.count);
    return {
      content: [
        <strong>{deptName}</strong>,
        `${dept.count}명`,
        <strong style={{ color: '#0f172a' }}>{dept.total.toLocaleString()}원</strong>,
        `${deptAvg.toLocaleString()}원`,
        '2026-10-25'
      ]
    };
  });

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <div>
          <span className="subtitle">급여관리</span>
          <span className="subtext">임직원 급여 책정 내역을 확인하고 부서별 집계를 관리합니다.</span>
        </div>
      </header>

      {/* 2. 통계 카드 (자동 집계) */}
      <section className="stats-section">
      <StatisticsCard 
        title="총 지급액" 
        count={Math.round(totalPayout / 10000)} 
        stiyle={2} 
      />
      <StatisticsCard 
        title="지급 대상" 
        count={payrollList.length} 
        stiyle={1} 
      />
      <StatisticsCard 
        title="평균 급여" 
        count={Math.round(avgSalary / 10000)} 
        stiyle={2} 
      />
      <StatisticsCard 
        title="지급 예정일" 
        count={25} 
        stiyle={3} 
      />
      </section>

      {/* 3. 모달 팝업 연동 */}
      {isModalOpen && selectedEmp && (
        <ModalBase
          title={`급여 정보 수정 - ${selectedEmp.name} (${selectedEmp.position})`}
          onClose={() => setIsModalOpen(false)}
          layout={
            <PayrollEditForm
              employee={selectedEmp}
              onSave={handleSavePayroll}
              onCancel={() => setIsModalOpen(false)}
            />
          }
        />
      )}

      {/* 4. 목록 탭 전환 및 검색 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '14px' }}>
        {/* 탭 버튼 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: activeTab === 'employee' ? '1px solid var(--color-brand, #3b82f6)' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'employee' ? 'var(--color-brand, #3b82f6)' : '#ffffff',
              color: activeTab === 'employee' ? '#ffffff' : '#475569',
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
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: activeTab === 'department' ? '1px solid var(--color-brand, #3b82f6)' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'department' ? 'var(--color-brand, #3b82f6)' : '#ffffff',
              color: activeTab === 'department' ? '#ffffff' : '#475569',
            }}
          >
            부서별 급여 현황
          </button>
        </div>

        {/* 직원 검색 (직원 탭 활성화 시에만 노출) */}
        {activeTab === 'employee' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사번, 이름, 부서 검색"
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                width: '200px'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ padding: '0 8px', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                초기화
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. 게시판 모듈 렌더링 (PaginationTable) */}
      {activeTab === 'employee' ? (
        <PaginationTable
          title="직원별 급여 세부 내역 (직원명을 클릭하여 수정)"
          th={empTableHeaders}
          allData={empTableData}
          itemsPerPage={5}
        />
      ) : (
        <PaginationTable
          title="부서별 급여 집계 현황"
          th={deptTableHeaders}
          allData={deptTableData}
          itemsPerPage={5}
        />
      )}
    </div>
  );
}