import React, { useState } from 'react';
import { getLoginUser, saveEmployeeAccount } from '../../../../utils/authStorage';
import PaginationTable from '../../../../components/PaginationTable';

const initialEmployees = [
  {
    id: 'EMP-1001',
    name: '김민준',
    department: '개발팀',
    position: '팀장',
    email: 'minjun.kim@enova.co.kr',
    status: '재직'
  },
  {
    id: 'EMP-1002',
    name: '이서연',
    department: '인사팀',
    position: '대리',
    email: 'seoyeon.lee@enova.co.kr',
    status: '재직'
  },
  {
    id: 'EMP-1003',
    name: '박지호',
    department: '디자인팀',
    position: '사원',
    email: 'jiho.park@enova.co.kr',
    status: '재직'
  },
  {
    id: 'EMP-1004',
    name: '최유진',
    department: '마케팅팀',
    position: '과장',
    email: 'yujin.choi@enova.co.kr',
    status: '휴직'
  },
  {
    id: 'EMP-1005',
    name: '정도윤',
    department: '경영지원팀',
    position: '대리',
    email: 'doyun.jung@enova.co.kr',
    status: '재직'
  },
  {
    id: 'EMP-1006',
    name: '한지우',
    department: '개발팀',
    position: '사원',
    email: 'jiwoo.han@enova.co.kr',
    status: '재직'
  },
];

const departments = ['개발팀', '인사팀', '디자인팀', '마케팅팀', '경영지원팀'];
const positions = ['사원', '대리', '과장', '팀장', '부장'];

const emptyForm = {
  employeeKey: '',
  name: '',
  department: departments[0],
  position: positions[0],
  email: '',
  password: ''
};

export default function Employees() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // 검색 필터링
  const filteredEmployees = employees.filter((employee) =>
    `${employee.id} ${employee.name} ${employee.department} ${employee.email} ${employee.position}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 직원 등록
  function addEmployee(event) {
    event.preventDefault();
    if (!isMaster) {
      alert('MASTER 계정만 직원을 등록할 수 있습니다.');
      return;
    }

    const account = {
      employeeKey: form.employeeKey,
      name: form.name,
      department: form.department,
      position: form.position,
      email: form.email,
      password: form.password,
      role: 'USER'
    };

    const result = saveEmployeeAccount(account);
    if (!result.success) {
      alert(result.message);
      return;
    }

    setEmployees([
      ...employees,
      {
        id: form.employeeKey,
        name: form.name,
        department: form.department,
        position: form.position,
        email: form.email,
        status: '재직'
      }
    ]);

    alert('직원 등록이 완료되었습니다.');
    setForm(emptyForm);
    setShowForm(false);
  }

  // 직원 삭제
  function removeEmployee(id) {
    if (window.confirm('이 직원을 목록에서 삭제할까요?')) {
      setEmployees(employees.filter((employee) => employee.id !== id));
    }
  }

  // 1. PaginationTable 헤더 정의
  const tableHeaders = ['사번', '이름', '부서', '직급', '이메일', '상태', '관리'];

  // 2. PaginationTable allData 규격 ({ content: [...] }) 매핑
  const tableData = filteredEmployees.map((employee) => ({
    content: [
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{employee.id}</span>,
      <strong className="emp-name">{employee.name}</strong>,
      employee.department,
      <span className="emp-position">{employee.position}</span>,
      employee.email,
      <span className={`status-tag ${employee.status === '재직' ? 'working' : 'off'}`}>
        {employee.status}
      </span>,
      isMaster ? (
        <button
          type="button"
          className="danger-button"
          style={{
            padding: '3px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: '#fee2e2',
            color: '#ef4444',
            border: '1px solid #fca5a5',
            cursor: 'pointer'
          }}
          onClick={() => removeEmployee(employee.id)}
        >
          삭제
        </button>
      ) : (
        '-'
      )
    ]
  }));

  return (
    <div className="sub-container">
      {/* 헤더 영역 */}
      <header className="dashboard-header">
        <div>
          <span className="subtitle">직원관리</span>
          <span className="subtext">전사 임직원 명단 및 계정 권한 현황을 관리합니다.</span>
        </div>

        <div className="dashboard-top">
          {isMaster && (
            <button
              type="button"
              className="register-btn"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '닫기' : '직원등록'}
            </button>
          )}
        </div>
      </header>

      {/* 신규 직원 등록 인라인 폼 (모달 없이 토글) */}
      {isMaster && showForm && (
        <div
          className="attendance-card"
          style={{
            maxWidth: '100%',
            marginBottom: '20px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>신규 직원 등록</h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}
            >
              취소
            </button>
          </div>

          <form onSubmit={addEmployee}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  사원 Key
                </label>
                <input
                  value={form.employeeKey}
                  onChange={(e) => setForm({ ...form, employeeKey: e.target.value })}
                  placeholder="예: EMP-1007"
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  이름
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="직원 이름"
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  부서
                </label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  직급
                </label>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  발급 이메일
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.co.kr"
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  초기 비밀번호
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="초기 비밀번호"
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                className="submit-btn"
                style={{
                  padding: '7px 16px',
                  backgroundColor: 'var(--color-brand, #3b82f6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                등록 완료
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 상단 검색 툴바 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          marginBottom: '12px'
        }}
      >
        <div style={{ fontSize: '14px', color: '#475569' }}>
          전체 직원 <strong>{filteredEmployees.length}</strong>명
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="사번, 이름, 부서, 직급 검색"
            style={{
              padding: '7px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              width: '240px'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#64748b'
              }}
            >
              초기화
            </button>
          )}
          <button
            type="button"
            className="export-btn"
            style={{
              padding: '7px 12px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#334155'
            }}
            onClick={() => window.alert('내보내기 기능은 추후 연결할 수 있습니다.')}
          >
            내보내기
          </button>
        </div>
      </div>

      {/* 게시판 모듈 적용 (PaginationTable - 5개 단위 페이징) */}
      <PaginationTable
        title="전체 임직원 목록"
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={5}
      />
    </div>
  );
}