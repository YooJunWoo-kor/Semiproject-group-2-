//직원관리
import { useState } from 'react';

const initialEmployees = [
  { id: 'EMP-1001', name: '김민준', department: '개발팀', position: '팀장', email: 'minjun.kim@enova.co.kr', status: '재직' },
  { id: 'EMP-1002', name: '이서연', department: '인사팀', position: '대리', email: 'seoyeon.lee@enova.co.kr', status: '재직' },
  { id: 'EMP-1003', name: '박지호', department: '디자인팀', position: '사원', email: 'jiho.park@enova.co.kr', status: '재직' },
  { id: 'EMP-1004', name: '최유진', department: '마케팅팀', position: '과장', email: 'yujin.choi@enova.co.kr', status: '휴직' },
  { id: 'EMP-1005', name: '정도윤', department: '경영지원팀', position: '대리', email: 'doyun.jung@enova.co.kr', status: '재직' },
  { id: 'EMP-1006', name: '한지우', department: '개발팀', position: '사원', email: 'jiwoo.han@enova.co.kr', status: '재직' },
];

const departments = ['개발팀', '인사팀', '디자인팀', '마케팅팀', '경영지원팀'];
const positions = ['사원', '대리', '과장', '팀장', '부장'];

const columns = [
  { key: 'id', label: '사번' },
  { key: 'name', label: '이름' },
  { key: 'department', label: '부서' },
  { key: 'position', label: '직급' },
  { key: 'email', label: '이메일' },
  { key: 'status', label: '상태' },
];

const emptyForm = {
  name: '',
  department: departments[0],
  position: positions[0],
  email: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filteredEmployees = employees.filter((employee) =>
    `${employee.id} ${employee.name} ${employee.department} ${employee.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function addEmployee(event) {
    event.preventDefault();

    const nextNumber =
      Math.max(1000, ...employees.map((employee) => Number(employee.id.slice(4)))) + 1;

    setEmployees([
      ...employees,
      {
        ...form,
        id: `EMP-${nextNumber}`,
        status: '재직',
      },
    ]);

    setForm(emptyForm);
    setShowForm(false);
  }

  function removeEmployee(id) {
    if (window.confirm('이 직원을 목록에서 삭제할까요?')) {
      setEmployees(employees.filter((employee) => employee.id !== id));
    }
  }

  return (
    <div className="employees-wrapper">
      <div className="page-top-header">
        <div>
          <h1>직원 관리</h1>
        </div>

        <button
          className="action-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '등록 취소' : '직원 등록'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addEmployee} className="employee-form">
          <div className="form-header">
            <h2>신규 직원 등록</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              닫기
            </button>
          </div>

          <div className="form-inputs">
            <label>
              이름
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="직원 이름"
                required
              />
            </label>

            <label>
              부서
              <select
                value={form.department}
                onChange={(event) =>
                  setForm({ ...form, department: event.target.value })
                }
              >
                {departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </label>

            <label>
              직급
              <select
                value={form.position}
                onChange={(event) =>
                  setForm({ ...form, position: event.target.value })
                }
              >
                {positions.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </label>

            <label>
              이메일
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="name@company.co.kr"
                required
              />
            </label>
          </div>

          <button type="submit" className="submit-btn">
            등록 완료
          </button>
        </form>
      )}

      <div className="table-container-box">
        <div className="table-toolbar">
          <div className="total-count">
            전체 직원 <strong>{employees.length}명</strong>
          </div>

          <div className="toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="이름, 부서, 이메일 검색"
            />

            <button
              className="export-btn"
              onClick={() => window.alert('내보내기 기능은 추후 연결할 수 있습니다.')}
            >
              내보내기
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{employee[column.key]}</td>
                  ))}
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => removeEmployee(employee.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="no-data">검색 결과가 없습니다.</div>
          )}
        </div>

        <div className="table-footer">
          전체 {filteredEmployees.length}명의 직원이 표시됩니다.
        </div>
      </div>
    </div>
  );
}