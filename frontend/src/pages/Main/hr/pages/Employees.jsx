import { useState } from 'react';

import {
    getLoginUser,
    getEmployeeAccounts,
    saveEmployeeAccount,
    removeEmployeeAccount
} from '../../../../utils/authStorage';

const departments = [
    '개발팀',
    '인사팀',
    '디자인팀',
    '마케팅팀',
    '경영지원팀'
];

const positions = [
    '사원',
    '대리',
    '과장',
    '팀장',
    '부장'
];

const columns = [
    { key: 'id', label: '사번' },
    { key: 'name', label: '이름' },
    { key: 'department', label: '부서' },
    { key: 'position', label: '직급' },
    { key: 'email', label: '이메일' },
    { key: 'status', label: '상태' },
];

const emptyForm = {
    employeeKey: '',
    name: '',
    department: departments[0],
    position: positions[0],
    email: '',
    password: ''
};

function accountToEmployee(account) {
    return {
        id: account.employeeKey,
        name: account.name,
        department: account.department,
        position: account.position,
        email: account.email,
        status: account.status || '재직'
    };
}

export default function Employees() {
    const loginUser = getLoginUser();
    const isMaster = loginUser?.role === 'MASTER';

    const [employees, setEmployees] = useState(() =>
        getEmployeeAccounts().map(accountToEmployee)
    );
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
            role: 'USER',
            status: '재직'
        };

        const result = saveEmployeeAccount(account);

        if (!result.success) {
            alert(result.message);
            return;
        }

        setEmployees(
            getEmployeeAccounts().map(accountToEmployee)
        );

        alert('직원 등록이 완료되었습니다.');
        setForm(emptyForm);
        setShowForm(false);
    }

    function removeEmployee(id) {
        if (!isMaster) {
            alert('MASTER 계정만 직원을 삭제할 수 있습니다.');
            return;
        }

        if (window.confirm('이 직원을 목록에서 삭제할까요?')) {
            removeEmployeeAccount(id);
            setEmployees(
                getEmployeeAccounts().map(accountToEmployee)
            );
        }
    }

    return (
        <div className="employees-wrapper">
            <div className="page-top-header">
                <div>
                    <h1>직원 관리</h1>
                </div>

                {isMaster && (
                    <button
                        className="action-btn"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '등록 취소' : '직원 등록'}
                    </button>
                )}
            </div>

            {isMaster && showForm && (
                <form onSubmit={addEmployee} className="employee-form">
                    <div className="form-header">
                        <h2>신규 직원 등록</h2>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                        >
                            닫기
                        </button>
                    </div>

                    <div className="form-inputs">
                        <label>
                            사원 Key
                            <input
                                value={form.employeeKey}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        employeeKey: event.target.value
                                    })
                                }
                                placeholder="예: EMP-1007"
                                required
                            />
                        </label>

                        <label>
                            이름
                            <input
                                value={form.name}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        name: event.target.value
                                    })
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
                                    setForm({
                                        ...form,
                                        department: event.target.value
                                    })
                                }
                            >
                                {departments.map(department => (
                                    <option key={department} value={department}>
                                        {department}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            직급
                            <select
                                value={form.position}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        position: event.target.value
                                    })
                                }
                            >
                                {positions.map(position => (
                                    <option key={position} value={position}>
                                        {position}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            발급 이메일
                            <input
                                type="email"
                                value={form.email}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        email: event.target.value
                                    })
                                }
                                placeholder="name@company.co.kr"
                                required
                            />
                        </label>

                        <label>
                            비밀번호
                            <input
                                type="password"
                                value={form.password}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        password: event.target.value
                                    })
                                }
                                placeholder="초기 비밀번호"
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
                        전체 직원{' '}
                        <strong>{employees.length}명</strong>
                    </div>

                    <div className="toolbar-actions">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="이름, 부서, 이메일 검색"
                        />

                        <button
                            className="export-btn"
                            onClick={() =>
                                window.alert(
                                    '내보내기 기능은 추후 연결할 수 있습니다.'
                                )
                            }
                        >
                            내보내기
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                {columns.map(column => (
                                    <th key={column.key}>{column.label}</th>
                                ))}
                                <th>관리</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredEmployees.map(employee => (
                                <tr key={employee.id}>
                                    {columns.map(column => (
                                        <td key={column.key}>
                                            {employee[column.key]}
                                        </td>
                                    ))}

                                    <td>
                                        {isMaster ? (
                                            <button
                                                className="delete-btn"
                                                onClick={() =>
                                                    removeEmployee(employee.id)
                                                }
                                            >
                                                삭제
                                            </button>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredEmployees.length === 0 && (
                        <div className="no-data">
                            검색 결과가 없습니다.
                        </div>
                    )}
                </div>

                <div className="table-footer">
                    전체 {filteredEmployees.length}명의 직원이 표시됩니다.
                </div>
            </div>
        </div>
    );
}
