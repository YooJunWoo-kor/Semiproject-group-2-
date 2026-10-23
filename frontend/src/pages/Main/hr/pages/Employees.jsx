<<<<<<< HEAD
//직원관리
import { useState } from 'react';
=======
import { useMemo, useState } from 'react';
>>>>>>> origin/feature/crm

const initialEmployees = [
  { id: 'EMP-1001', name: '김민준', department: '개발팀', position: '팀장', email: 'minjun.kim@enova.co.kr', status: '재직' },
  { id: 'EMP-1002', name: '이서연', department: '인사팀', position: '대리', email: 'seoyeon.lee@enova.co.kr', status: '재직' },
  { id: 'EMP-1003', name: '박지호', department: '디자인팀', position: '사원', email: 'jiho.park@enova.co.kr', status: '재직' },
  { id: 'EMP-1004', name: '최유진', department: '마케팅팀', position: '과장', email: 'yujin.choi@enova.co.kr', status: '휴직' },
  { id: 'EMP-1005', name: '정도윤', department: '경영지원팀', position: '대리', email: 'doyun.jung@enova.co.kr', status: '재직' },
  { id: 'EMP-1006', name: '한지우', department: '개발팀', position: '사원', email: 'jiwoo.han@enova.co.kr', status: '재직' },
];

<<<<<<< HEAD
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

=======
>>>>>>> origin/feature/crm
export default function Employees() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
<<<<<<< HEAD
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
=======
  const [form, setForm] = useState({ name: '', department: '개발팀', position: '사원', email: '' });

  const filtered = useMemo(() => {
    return employees.filter(e => 
      `${e.id} ${e.name} ${e.department} ${e.email}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  function addEmployee(e) { 
    e.preventDefault(); 
    if (!form.name.trim() || !form.email.trim()) return; 
    setEmployees(old => [...old, { ...form, id: `EMP-${1001 + old.length}`, status: '재직' }]); 
    setForm({ name: '', department: '개발팀', position: '사원', email: '' }); 
    setShowForm(false); 
  }

  function removeEmployee(id) { 
    if (window.confirm('이 직원을 목록에서 삭제할까요?')) {
      setEmployees(old => old.filter(e => e.id !== id)); 
>>>>>>> origin/feature/crm
    }
  }

  return (
    <div className="employees-wrapper">
<<<<<<< HEAD
=======
      {/* 상단 타이틀 및 등록 버튼 */}
>>>>>>> origin/feature/crm
      <div className="page-top-header">
        <div>
          <div className="sub-title">HUMAN RESOURCES</div>
          <h1>직원 관리</h1>
          <p>직원 정보를 조회하고 등록 및 관리할 수 있습니다.</p>
        </div>
<<<<<<< HEAD

        <button
          className="action-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '등록 취소' : '직원 등록'}
        </button>
      </div>

=======
        <button onClick={() => setShowForm(v => !v)} className="action-btn">
          ➕ {showForm ? '등록 취소' : '직원 등록'}
        </button>
      </div>

      {/* 직원 등록 폼 */}
>>>>>>> origin/feature/crm
      {showForm && (
        <form onSubmit={addEmployee} className="employee-form">
          <div className="form-header">
            <h2>신규 직원 등록</h2>
<<<<<<< HEAD
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
=======
            <button type="button" onClick={() => setShowForm(false)} className="close-btn">❌</button>
          </div>
          
          <div className="form-inputs">
            <label>
              이름
              <input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="직원 이름" 
                required 
              />
            </label>
            
            <label>
              부서
              <select 
                value={form.department} 
                onChange={e => setForm({...form, department: e.target.value})}
              >
                <option>개발팀</option>
                <option>인사팀</option>
                <option>디자인팀</option>
                <option>마케팅팀</option>
                <option>경영지원팀</option>
              </select>
            </label>
            
            <label>
              직급
              <select 
                value={form.position} 
                onChange={e => setForm({...form, position: e.target.value})}
              >
                <option>사원</option>
                <option>대리</option>
                <option>과장</option>
                <option>팀장</option>
                <option>부장</option>
              </select>
            </label>
            
            <label>
              이메일
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="name@company.co.kr" 
                required 
              />
            </label>
          </div>
          
          <button type="submit" className="submit-btn">등록 완료</button>
        </form>
      )}

      {/* 직원 목록 테이블 영역 */}
      <div className="table-container-box">
        <div className="table-toolbar">
          <div className="total-count">전체 직원 <strong>{employees.length}명</strong></div>
          <div className="toolbar-actions">
            <div className="search-box">
              <span>🔍</span>
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="이름, 부서, 이메일 검색" 
              />
            </div>
            <button onClick={() => window.alert('데모 화면에서는 엑셀 파일을 생성하지 않습니다.')} className="export-btn">
              📥 내보내기
>>>>>>> origin/feature/crm
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
<<<<<<< HEAD
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
=======
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th>직급</th>
                <th>이메일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.id}</td>
                  <td>
                    <div className="user-info-cell">
                      <span className="avatar-circle">{emp.name[0]}</span>
                      <strong>{emp.name}</strong>
                    </div>
                  </td>
                  <td>{emp.department}</td>
                  <td>{emp.position}</td>
                  <td>{emp.email}</td>
                  <td><span className="status-badge">{emp.status}</span></td>
                  <td>
                    <button title="직원 삭제" onClick={() => removeEmployee(emp.id)} className="delete-btn">
                      ⚙️
>>>>>>> origin/feature/crm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
<<<<<<< HEAD

          {filteredEmployees.length === 0 && (
=======
          
          {filtered.length === 0 && (
>>>>>>> origin/feature/crm
            <div className="no-data">검색 결과가 없습니다.</div>
          )}
        </div>

        <div className="table-footer">
<<<<<<< HEAD
          전체 {filteredEmployees.length}명의 직원이 표시됩니다.
=======
          전체 {filtered.length}명의 직원이 표시됩니다.
          <span>데모 데이터 · 실제 인사 DB 미연결</span>
>>>>>>> origin/feature/crm
        </div>
      </div>
    </div>
  );
}