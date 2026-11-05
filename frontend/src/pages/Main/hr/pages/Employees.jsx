import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getLoginUser } from '../../../../utils/authStorage';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import StatisticsCard from '../../../../components/StatisticsCard';

/* 기존 화면 확인용 더미데이터
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
*/

const positions = ['사원', '대리', '과장', '팀장', '부장'];

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

const emptyRegisterForm = {
  employeeNumber: '',
  name: '',
  departmentId: '',
  position: positions[0],
  email: '',
  phone: '',
  hireDate: '',
  password: ''
};

const emptyEditForm = {
  employeeId: '',
  employeeNumber: '',
  name: '',
  departmentId: '',
  position: positions[0],
  email: '',
  phone: '',
  hireDate: '',
  employmentStatus: '재직'
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
  gap: '12px'
};

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  color: '#64748b',
  fontSize: '12px'
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  boxSizing: 'border-box'
};

function getApiErrorMessage(error, fallbackMessage) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }

  return fallbackMessage;
}

function getAccountStatusLabel(accountStatus) {
  if (accountStatus === 'ACTIVE') return '활성';
  if (accountStatus === 'INACTIVE') return '비활성';
  if (accountStatus === 'SUSPENDED') return '정지';
  return '-';
}

function EmployeeForm(props) {
  const form = props.form;

  function changeForm(event) {
    props.setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  return (
    <form onSubmit={props.onSubmit}>
      <div style={formGridStyle}>
        <div>
          <label style={labelStyle}>사번</label>
          <input
            name="employeeNumber"
            value={form.employeeNumber}
            onChange={changeForm}
            disabled={props.isEdit}
            placeholder="예: EMP-1001"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>이름</label>
          <input
            name="name"
            value={form.name}
            onChange={changeForm}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>부서</label>
          <select
            name="departmentId"
            value={form.departmentId}
            onChange={changeForm}
            required
            style={inputStyle}
          >
            <option value="">부서 선택</option>
            {props.departments.map((department) => (
              <option
                key={department.departmentId}
                value={department.departmentId}
              >
                {department.departmentName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>직급</label>
          <select
            name="position"
            value={form.position}
            onChange={changeForm}
            required
            style={inputStyle}
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>이메일</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={changeForm}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>전화번호</label>
          <input
            name="phone"
            value={form.phone}
            onChange={changeForm}
            placeholder="선택 입력"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>입사일</label>
          <input
            type="date"
            name="hireDate"
            value={form.hireDate}
            onChange={changeForm}
            required
            style={inputStyle}
          />
        </div>

        {props.isEdit ? (
          <div>
            <label style={labelStyle}>재직 상태</label>
            <select
              name="employmentStatus"
              value={form.employmentStatus}
              onChange={changeForm}
              required
              style={inputStyle}
            >
              <option value="재직">재직</option>
              <option value="휴직">휴직</option>
              {form.employmentStatus === '퇴사' && (
                <option value="퇴사">퇴사</option>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>초기 비밀번호</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={changeForm}
              required
              style={inputStyle}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
        <button type="button" onClick={props.onCancel}>
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          disabled={props.saving}
        >
          {props.saving ? '저장 중...' : props.submitLabel}
        </button>
      </div>
    </form>
  );
}

function EmployeeDetail({ employee }) {
  const details = [
    ['사번', employee.employeeNumber],
    ['이름', employee.name],
    ['부서', employee.departmentName || '-'],
    ['직급', employee.position],
    ['이메일', employee.email],
    ['전화번호', employee.phone || '-'],
    ['입사일', employee.hireDate],
    ['재직 상태', employee.employmentStatus],
    ['권한', employee.role || '-'],
    ['계정 상태', getAccountStatusLabel(employee.accountStatus)]
  ];

  return (
    <div style={formGridStyle}>
      {details.map((detail) => (
        <div
          key={detail[0]}
          style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        >
          <span style={labelStyle}>{detail[0]}</span>
          <strong style={{ color: '#1e293b', fontSize: '14px' }}>
            {detail[1]}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function Employees() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [editForm, setEditForm] = useState(emptyEditForm);

  useEffect(() => {
    let ignore = false;

    async function loadEmployeePage() {
      setLoading(true);
      setError('');
      setNotice('');

      try {
        const responses = await Promise.all([
          axios.get(API_BASE_URL + '/hr/employees'),
          axios.get(API_BASE_URL + '/hr/departments')
        ]);
        const employeeResponse = responses[0];
        const departmentResponse = responses[1];

        if (
          !employeeResponse.data.success ||
          !Array.isArray(employeeResponse.data.data) ||
          !departmentResponse.data.success ||
          !Array.isArray(departmentResponse.data.data)
        ) {
          throw new Error('직원관리 자료 형식이 올바르지 않습니다.');
        }

        if (!ignore) {
          setEmployees(employeeResponse.data.data);
          setDepartments(departmentResponse.data.data);
          setNotice('직원 및 부서 정보를 불러왔습니다.');
        }
      } catch (requestError) {
        console.error('직원관리 자료 조회 오류:', requestError);

        if (!ignore) {
          setEmployees([]);
          setDepartments([]);
          setError(
            getApiErrorMessage(
              requestError,
              '직원관리 자료를 불러오지 못했습니다.'
            )
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadEmployeePage();

    return () => {
      ignore = true;
    };
  }, []);

  async function refreshEmployees() {
    const response = await axios.get(API_BASE_URL + '/hr/employees');

    if (!response.data.success || !Array.isArray(response.data.data)) {
      throw new Error('직원 목록 형식이 올바르지 않습니다.');
    }

    setEmployees(response.data.data);
    return response.data.data;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredEmployees = employees.filter((employee) => {
    const searchText = [
      employee.employeeNumber,
      employee.name,
      employee.email,
      employee.position
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesSearch =
      !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesDepartment =
      selectedDepartment === '전체' ||
      String(employee.departmentId) === selectedDepartment;
    const matchesStatus =
      selectedStatus === '전체' ||
      employee.employmentStatus === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const workingCount = employees.filter(
    (employee) => employee.employmentStatus === '재직'
  ).length;
  const leaveCount = employees.filter(
    (employee) => employee.employmentStatus === '휴직'
  ).length;
  const retiredCount = employees.filter(
    (employee) => employee.employmentStatus === '퇴사'
  ).length;

  function resetFilters() {
    setSearch('');
    setSelectedDepartment('전체');
    setSelectedStatus('전체');
  }

  function openRegisterModal() {
    setRegisterForm({
      ...emptyRegisterForm,
      departmentId:
        departments.length > 0 ? String(departments[0].departmentId) : ''
    });
    setError('');
    setNotice('');
    setShowRegisterModal(true);
  }

  function openEditModal(employee) {
    setEditForm({
      employeeId: employee.employeeId,
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      departmentId: String(employee.departmentId || ''),
      position: employee.position,
      email: employee.email,
      phone: employee.phone || '',
      hireDate: employee.hireDate,
      employmentStatus: employee.employmentStatus
    });
    setError('');
    setNotice('');
    setShowEditModal(true);
  }

  async function addEmployee(event) {
    event.preventDefault();

    if (!isMaster) {
      alert('MASTER 계정만 직원을 등록할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await axios.post(
        API_BASE_URL + '/hr/employees',
        registerForm
      );

      if (!response.data.success) {
        throw new Error('직원 등록 응답이 올바르지 않습니다.');
      }

      await refreshEmployees();
      setShowRegisterModal(false);
      setRegisterForm(emptyRegisterForm);
      setNotice(response.data.message || '직원 등록이 완료되었습니다.');
    } catch (requestError) {
      console.error('직원 등록 오류:', requestError);
      setError(
        getApiErrorMessage(requestError, '직원을 등록하지 못했습니다.')
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateEmployee(event) {
    event.preventDefault();

    if (!isMaster) {
      alert('MASTER 계정만 직원 정보를 수정할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await axios.put(
        API_BASE_URL + '/hr/employees/' + editForm.employeeId,
        {
          name: editForm.name,
          departmentId: editForm.departmentId,
          position: editForm.position,
          email: editForm.email,
          phone: editForm.phone,
          hireDate: editForm.hireDate,
          employmentStatus: editForm.employmentStatus
        }
      );

      if (!response.data.success) {
        throw new Error('직원 수정 응답이 올바르지 않습니다.');
      }

      const updatedEmployees = await refreshEmployees();
      const updatedEmployee = updatedEmployees.find(
        (employee) => employee.employeeId === editForm.employeeId
      );

      if (
        selectedEmployee &&
        selectedEmployee.employeeId === editForm.employeeId
      ) {
        setSelectedEmployee(updatedEmployee || null);
      }

      setShowEditModal(false);
      setNotice(response.data.message || '직원 정보가 수정되었습니다.');
    } catch (requestError) {
      console.error('직원 수정 오류:', requestError);
      setError(
        getApiErrorMessage(requestError, '직원 정보를 수정하지 못했습니다.')
      );
    } finally {
      setSaving(false);
    }
  }

  async function retireEmployee(employee) {
    if (!isMaster) {
      alert('MASTER 계정만 퇴사 처리할 수 있습니다.');
      return;
    }

    const confirmed = window.confirm(
      `${employee.name} 직원을 퇴사 처리할까요? 직원 자료는 삭제되지 않습니다.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await axios.patch(
        API_BASE_URL + '/hr/employees/' + employee.employeeId + '/status'
      );

      if (!response.data.success) {
        throw new Error('퇴사 처리 응답이 올바르지 않습니다.');
      }

      await refreshEmployees();
      setSelectedEmployee(null);
      setNotice(response.data.message || '퇴사 처리가 완료되었습니다.');
    } catch (requestError) {
      console.error('퇴사 처리 오류:', requestError);
      setError(
        getApiErrorMessage(requestError, '퇴사 처리에 실패했습니다.')
      );
    } finally {
      setSaving(false);
    }
  }

  const tableHeaders = [
    '사번',
    '이름',
    '부서',
    '직급',
    '이메일',
    '재직 상태',
    '계정 상태',
    '관리'
  ];

  const tableData = filteredEmployees.map((employee) => ({
    content: [
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
        {employee.employeeNumber}
      </span>,
      <button
        type="button"
        onClick={() => setSelectedEmployee(employee)}
        style={{ padding: 0, color: '#1d4ed8', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}
      >
        <strong className="emp-name">{employee.name}</strong>
      </button>,
      employee.departmentName || '-',
      <span className="emp-position">{employee.position}</span>,
      employee.email,
      <span
        className={`status-tag ${
          employee.employmentStatus === '재직' ? 'working' : 'off'
        }`}
      >
        {employee.employmentStatus}
      </span>,
      <span
        className={`status-tag ${
          employee.accountStatus === 'ACTIVE' ? 'working' : 'off'
        }`}
      >
        {getAccountStatusLabel(employee.accountStatus)}
      </span>,
      <div style={{ display: 'flex', gap: '4px', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          onClick={() => setSelectedEmployee(employee)}
          style={{ padding: '3px 7px', fontSize: '11px' }}
        >
          상세
        </button>
        {isMaster && (
          <button
            type="button"
            onClick={() => openEditModal(employee)}
            style={{ padding: '3px 7px', fontSize: '11px' }}
          >
            수정
          </button>
        )}
        {isMaster && employee.employmentStatus !== '퇴사' && (
          <button
            type="button"
            onClick={() => retireEmployee(employee)}
            disabled={saving}
            style={{ padding: '3px 7px', color: '#b91c1c', fontSize: '11px' }}
          >
            퇴사
          </button>
        )}
      </div>
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
              onClick={openRegisterModal}
              disabled={departments.length === 0}
            >
              직원등록
            </button>
          )}
        </div>
      </header>

      {showRegisterModal && (
        <ModalBase
          title="신규 직원 등록"
          onClose={() => setShowRegisterModal(false)}
          layout={
            <EmployeeForm
              form={registerForm}
              setForm={setRegisterForm}
              departments={departments}
              isEdit={false}
              onSubmit={addEmployee}
              onCancel={() => setShowRegisterModal(false)}
              saving={saving}
              submitLabel="등록 완료"
            />
          }
        />
      )}

      {showEditModal && (
        <ModalBase
          title="직원 정보 수정"
          onClose={() => setShowEditModal(false)}
          layout={
            <EmployeeForm
              form={editForm}
              setForm={setEditForm}
              departments={departments}
              isEdit={true}
              onSubmit={updateEmployee}
              onCancel={() => setShowEditModal(false)}
              saving={saving}
              submitLabel="수정 완료"
            />
          }
        />
      )}

      {selectedEmployee && (
        <ModalBase
          title={`${selectedEmployee.name} 직원 상세정보`}
          onClose={() => setSelectedEmployee(null)}
          layout={<EmployeeDetail employee={selectedEmployee} />}
        />
      )}

      <section className="stats-section">
        <StatisticsCard title="전체 직원" count={employees.length} stiyle={1} />
        <StatisticsCard title="재직" count={workingCount} stiyle={1} />
        <StatisticsCard title="휴직" count={leaveCount} stiyle={1} />
        <StatisticsCard title="퇴사" count={retiredCount} stiyle={1} />
      </section>

      {notice && (
        <p role="status" style={{ margin: '0 0 12px', color: '#047857' }}>
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {/* 검색 및 필터 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '16px',
          marginBottom: '12px'
        }}
      >
        <div style={{ fontSize: '14px', color: '#475569' }}>
          조회 직원 <strong>{filteredEmployees.length}</strong>명
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="사번, 이름, 이메일, 직급 검색"
            style={{
              padding: '7px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              width: '240px'
            }}
          />

          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="전체">전체 부서</option>
            {departments.map((department) => (
              <option
                key={department.departmentId}
                value={String(department.departmentId)}
              >
                {department.departmentName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="전체">전체 상태</option>
            <option value="재직">재직</option>
            <option value="휴직">휴직</option>
            <option value="퇴사">퇴사</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            style={{
              padding: '7px 12px',
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
        </div>
      </div>

      {loading ? (
        <p role="status">직원 목록을 불러오는 중입니다.</p>
      ) : (
        <PaginationTable
          key={`${search}-${selectedDepartment}-${selectedStatus}-${employees.length}`}
          title="전체 임직원 목록"
          th={tableHeaders}
          allData={tableData}
          itemsPerPage={5}
        />
      )}
    </div>
  );
}
