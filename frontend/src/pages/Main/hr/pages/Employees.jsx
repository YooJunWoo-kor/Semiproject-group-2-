import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLoginUser } from '../../../../utils/authStorage';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import StatisticsCard from '../../../../components/StatisticsCard';
import {
  createHrDepartment,
  createHrEmployee,
  getHrEmployees,
  getHrOrganization,
  retireHrEmployee,
  updateHrEmployee
} from '../../../../components/HrData';

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

const emptyDepartmentForm = {
  departmentName: '',
  managerId: '',
  description: ''
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

function getEmploymentStatusClass(employmentStatus) {
  if (employmentStatus === '재직') return 'working';
  if (employmentStatus === '휴직') return 'leave';
  return 'off';
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

function DepartmentRegisterForm(props) {
  const form = props.form;
  const availableManagers = props.employees.filter(
    (employee) => employee.employmentStatus === '재직'
  );

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
          <label style={labelStyle}>부서명</label>
          <input
            name="departmentName"
            value={form.departmentName}
            onChange={changeForm}
            maxLength={50}
            placeholder="예: 플랫폼개발팀"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>부서장</label>
          <select
            name="managerId"
            value={form.managerId}
            onChange={changeForm}
            style={inputStyle}
          >
            <option value="">미지정</option>
            {availableManagers.map((employee) => (
              <option key={employee.employeeId} value={employee.employeeId}>
                {employee.name} ({employee.employeeNumber} · {employee.departmentName || '부서 미지정'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>부서 업무 설명</label>
          <textarea
            name="description"
            value={form.description}
            onChange={changeForm}
            maxLength={255}
            rows={4}
            placeholder="부서의 주요 업무를 입력해 주세요."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
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
          {props.saving ? '저장 중...' : '등록 완료'}
        </button>
      </div>
    </form>
  );
}

function EmployeeDetail({ employee }) {
  const details = [
    ['사번', employee.employeeNumber],
    ['부서', employee.departmentName || '-'],
    ['직급', employee.position],
    ['이메일', employee.email],
    ['전화번호', employee.phone || '-'],
    ['입사일', employee.hireDate],
    ['권한', employee.role || '-'],
    ['계정 상태', getAccountStatusLabel(employee.accountStatus)]
  ];

  return (
    <div className="hr-employee-detail-fields">
      {details.map((detail) => (
        <div key={detail[0]} className="hr-employee-detail-field">
          <span>{detail[0]}</span>
          <strong>{detail[1]}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Employees() {
  // 직원·부서 통합관리 화면의 조회, 등록, 수정, 퇴사 처리를 담당합니다.
  const loginUser = getLoginUser();
  // 직원 등록·수정·퇴사 처리는 MASTER 사용자에게만 노출합니다.
  const isMaster = loginUser?.role === 'MASTER';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('전체');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);

  useEffect(() => {
    let ignore = false;

    // 화면 진입 시 부서와 직원을 함께 조회해 필터와 목록을 구성합니다.
    // 화면 진입 시 직원과 부서 데이터를 함께 조회합니다.
    async function loadEmployeePage() {
      setLoading(true);
      setError('');
      setNotice('');

      try {
        const [departmentResponse, employeeResponse] =
          await getHrOrganization();

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

  // 등록·수정·퇴사 후 직원 목록과 선택 상태를 새로 고칩니다.
  async function refreshEmployees() {
    const response = await getHrEmployees();

    if (!response.data.success || !Array.isArray(response.data.data)) {
      throw new Error('직원 목록 형식이 올바르지 않습니다.');
    }

    setEmployees(response.data.data);
    return response.data.data;
  }

  // 통합검색·부서·재직상태·계정상태 조건을 동시에 적용합니다.
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
    const matchesAccountStatus =
      selectedAccountStatus === '전체' ||
      employee.accountStatus === selectedAccountStatus;
    return (
      matchesSearch &&
      matchesDepartment &&
      matchesStatus &&
      matchesAccountStatus
    );
  });

  const workingCount = employees.filter(
    (employee) => employee.employmentStatus === '재직'
  ).length;
  const averageDepartmentCount = departments.length
    ? Math.round((workingCount / departments.length) * 10) / 10
    : 0;
  const selectedDepartmentName =
    selectedDepartment === '전체'
      ? '전체 부서'
      : departments.find(
          (department) =>
            String(department.departmentId) === String(selectedDepartment)
        )?.departmentName || '부서 미선택';
  const departmentCards = departments.map((department) => ({
    ...department,
    memberCount: employees.filter(
      (employee) =>
        String(employee.departmentId) === String(department.departmentId) &&
        employee.employmentStatus === '재직'
    ).length
  }));

  useEffect(() => {
    // 필터 결과가 바뀌면 상세 패널도 현재 보이는 직원과 맞춥니다.
    if (filteredEmployees.length === 0) {
      if (selectedEmployee !== null) {
        setSelectedEmployee(null);
      }
      return;
    }

    const selectedStillVisible = filteredEmployees.some(
      (employee) => employee.employeeId === selectedEmployee?.employeeId
    );

    if (!selectedStillVisible) {
      setSelectedEmployee(filteredEmployees[0]);
    }
  }, [filteredEmployees, selectedEmployee]);

  function resetFilters() {
    setSearch('');
    setSelectedDepartment('전체');
    setSelectedStatus('전체');
    setSelectedAccountStatus('전체');
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

  function openDepartmentModal() {
    setDepartmentForm(emptyDepartmentForm);
    setError('');
    setNotice('');
    setShowDepartmentModal(true);
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

  // 직원 등록 API를 호출하고 성공 시 목록을 갱신합니다.
  async function addEmployee(event) {
    // 신규 직원 저장 후 서버 목록을 다시 조회해 화면을 동기화합니다.
    event.preventDefault();

    if (!isMaster) {
      alert('MASTER 계정만 직원을 등록할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await createHrEmployee(registerForm);

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

  // 통합관리 화면에서 부서를 등록하고 조직 데이터를 다시 조회합니다.
  async function addDepartment(event) {
    event.preventDefault();

    if (!isMaster) {
      alert('MASTER 계정만 부서를 등록할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await createHrDepartment({
        departmentName: departmentForm.departmentName.trim(),
        managerId: departmentForm.managerId,
        description: departmentForm.description.trim()
      });

      if (!response.data.success) {
        throw new Error('부서 등록 응답이 올바르지 않습니다.');
      }

      // 등록된 부서의 부서장명과 설명까지 반영하기 위해 조직 자료를 다시 조회합니다.
      const [departmentResponse, employeeResponse] =
        await getHrOrganization();

      if (
        !departmentResponse.data.success ||
        !Array.isArray(departmentResponse.data.data) ||
        !employeeResponse.data.success ||
        !Array.isArray(employeeResponse.data.data)
      ) {
        throw new Error('조직 정보 응답 형식이 올바르지 않습니다.');
      }

      setDepartments(departmentResponse.data.data);
      setEmployees(employeeResponse.data.data);
      setSelectedDepartment(
        String(response.data.data?.departmentId || '전체')
      );
      setShowDepartmentModal(false);
      setNotice(response.data.message || '부서가 등록되었습니다.');
    } catch (requestError) {
      console.error('부서 등록 오류:', requestError);
      setError(
        getApiErrorMessage(requestError, '부서를 등록하지 못했습니다.')
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 직원의 기본 정보만 수정합니다.
  async function updateEmployee(event) {
    // 선택 직원의 수정 내용을 저장하고 상세 패널까지 최신 값으로 갱신합니다.
    event.preventDefault();

    if (!isMaster) {
      alert('MASTER 계정만 직원 정보를 수정할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await updateHrEmployee(editForm.employeeId, {
        name: editForm.name,
        departmentId: editForm.departmentId,
        position: editForm.position,
        email: editForm.email,
        phone: editForm.phone,
        hireDate: editForm.hireDate,
        employmentStatus: editForm.employmentStatus
      });

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

  // 직원 삭제 대신 재직 상태를 퇴사로 변경합니다.
  async function retireEmployee(employee) {
    // 직원 자료를 삭제하지 않고 기존 퇴사 처리 API로 상태만 변경합니다.
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
      const response = await retireHrEmployee(employee.employeeId);

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

  // 기존 PaginationTable이 사용하는 content 배열 형식으로 행을 구성합니다.
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
        <strong
          className={`emp-name ${
            selectedEmployee?.employeeId === employee.employeeId
              ? 'hr-selected-employee'
              : ''
          }`}
        >
          {employee.name}
        </strong>
      </button>,
      employee.departmentName || '-',
      <span className="emp-position">{employee.position}</span>,
      employee.email,
      <span
        className={`status-tag ${getEmploymentStatusClass(
          employee.employmentStatus
        )}`}
      >
        {employee.employmentStatus}
      </span>,
      <span
        className={`status-tag account-status-tag ${
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
    <div className="border-container hr-employee-management">
      {/* 헤더 영역 */}
      <header className="dashboard-header">
        <div>
          <span className="subtitle">직원·부서 통합관리</span>
          <span className="subtext">직원 정보와 부서 구성을 한 화면에서 관리합니다.</span>
        </div>

        <div className="dashboard-top">
          {isMaster && (
            <button
              type="button"
              className="register-btn"
              onClick={openRegisterModal}
              disabled={departments.length === 0}
            >
              직원 등록
            </button>
          )}
          {isMaster && (
            <button
              type="button"
              className="hr-department-register-button"
              onClick={openDepartmentModal}
            >
              부서 등록
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

      {showDepartmentModal && (
        <ModalBase
          title="신규 부서 등록"
          onClose={() => setShowDepartmentModal(false)}
          layout={
            <DepartmentRegisterForm
              form={departmentForm}
              setForm={setDepartmentForm}
              employees={employees}
              onSubmit={addDepartment}
              onCancel={() => setShowDepartmentModal(false)}
              saving={saving}
            />
          }
        />
      )}

      <section className="stats-section">
        <StatisticsCard title="전체 직원" count={employees.length} stiyle={1} />
        <StatisticsCard title="재직 직원" count={workingCount} stiyle={1} />
        <StatisticsCard title="전체 부서" count={departments.length} stiyle={0} />
        <div className="content-card hr-average-card">
          <p>평균 부서 인원</p>
          <span>{averageDepartmentCount.toFixed(1)}</span>명
        </div>
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
      <div className="hr-filter-card">
        <div className="hr-filter-result">
          조회 직원 <strong>{filteredEmployees.length}</strong>명
        </div>

        <div className="hr-filter-controls">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="통합검색"
            placeholder="통합검색: 사번, 이름, 이메일, 직급"
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

          <select
            value={selectedAccountStatus}
            onChange={(event) => setSelectedAccountStatus(event.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="전체">전체 계정</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
            <option value="SUSPENDED">정지</option>
          </select>

          <button
            type="button"
            className="hr-filter-query-button"
            onClick={() => setNotice('현재 검색 조건으로 목록을 표시하고 있습니다.')}
          >
            조회
          </button>

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
        <div className="hr-organization-grid">
          <aside className="hr-panel department-panel">
            <div className="hr-panel-heading">
              <h2>부서 목록</h2>
              <span>{departments.length}개</span>
            </div>

            <button
              type="button"
              className={`department-item ${selectedDepartment === '전체' ? 'selected' : ''}`}
              onClick={() => setSelectedDepartment('전체')}
            >
              <strong>전체 부서</strong>
              <span>{employees.length}명</span>
            </button>

            {departmentCards.map((department) => (
              <button
                type="button"
                key={department.departmentId}
                className={`department-item ${
                  selectedDepartment === String(department.departmentId)
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  setSelectedDepartment(String(department.departmentId))
                }
              >
                <strong>{department.departmentName}</strong>
                <span>{department.memberCount}명</span>
                {department.managerName && (
                  <small>부서장: {department.managerName}</small>
                )}
                {department.description && (
                  <small>{department.description}</small>
                )}
              </button>
            ))}
          </aside>

          <section className="hr-panel employee-list-panel">
            <div className="hr-section-heading">
              <div>
                <h2>소속 직원</h2>
                <p>{selectedDepartmentName} · {filteredEmployees.length}명</p>
              </div>
              <span>전체 {filteredEmployees.length}명</span>
            </div>
            <PaginationTable
              key={
                search +
                '-' +
                selectedDepartment +
                '-' +
                selectedStatus +
                '-' +
                selectedAccountStatus +
                '-' +
                employees.length
              }
              title="선택 부서 직원 목록"
              th={tableHeaders}
              allData={tableData}
              itemsPerPage={5}
            />
          </section>

          <aside className="hr-panel employee-detail-panel">
            <div className="hr-panel-heading">
              <h2>직원 상세정보</h2>
            </div>

            {selectedEmployee ? (
              <>
                <div className="hr-detail-summary">
                  <div>
                    <h3>{selectedEmployee.name}</h3>
                    <p>
                      {selectedEmployee.employeeNumber} ·{' '}
                      {selectedEmployee.departmentName || '-'} ·{' '}
                      {selectedEmployee.position}
                    </p>
                  </div>
                  <span
                    className={`status-tag ${getEmploymentStatusClass(
                      selectedEmployee.employmentStatus
                    )}`}
                  >
                    {selectedEmployee.employmentStatus}
                  </span>
                </div>
                <EmployeeDetail employee={selectedEmployee} />
                <div className="employee-detail-actions">
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedEmployee)}
                    >
                      직원 수정
                    </button>
                  )}
                  {isMaster && selectedEmployee.employmentStatus !== '퇴사' && (
                    <button
                      type="button"
                      onClick={() => retireEmployee(selectedEmployee)}
                      disabled={saving}
                    >
                      퇴사 처리
                    </button>
                  )}
                  <Link
                    to="/main/hr/attendance"
                    className="hr-attendance-link"
                  >
                    근태 상세 보기
                  </Link>
                </div>
              </>
            ) : (
              <p className="hr-empty-state">
                직원을 선택하면 상세정보가 표시됩니다.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
