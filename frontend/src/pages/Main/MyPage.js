import React, { useState } from 'react';
import "./MyPage.css";

const initialEmployee = {
    id: 'EMP001',
    name: '홍길동',
    department: '재무·회계팀',
    position: '사원',
    joinDate: '2024-03-04',
    email: 'hong@example.com',
    phone: '010-1234-5678',
};

const tasks = [
    { id: 1, title: '10월 매출 보고서 작성', module: '재무관리', dueDate: '2026-10-27', status: '진행 중' },
    { id: 2, title: '프로젝트 제출물 검토', module: '프로젝트관리', dueDate: '2026-10-29', status: '대기' },
    { id: 3, title: '부서 주간회의 자료 작성', module: '일정관리', dueDate: '2026-10-30', status: '완료' },
];

function MyPage() {
    const [employee, setEmployee] = useState(initialEmployee);
    const [form, setForm] = useState({
        email: initialEmployee.email,
        phone: initialEmployee.phone,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState('');

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((currentForm) => ({ ...currentForm, [name]: value }));
    }

    function handleSave(event) {
        event.preventDefault();
        setEmployee((currentEmployee) => ({
            ...currentEmployee,
            email: form.email.trim(),
            phone: form.phone.trim(),
        }));
        setIsEditing(false);
        setMessage('개인정보가 화면에 반영되었습니다.');
    }

    function handleCancel() {
        setForm({ email: employee.email, phone: employee.phone });
        setIsEditing(false);
        setMessage('');
    }




    return (
        <main className="my-page">
            <div className="mypage-heading">
                <h1>마이페이지</h1>
                <p>내 인사정보와 담당 업무를 확인할 수 있습니다.</p>
            </div>

            <section className="mypage-card">
                <h2>기본 인사정보</h2>
                <div className="mypage-profile">
                    <div className="mypage-avatar" aria-hidden="true">👤</div>
                    <div>
                        <h3>{employee.name}</h3>
                        <p>{employee.department} / {employee.position}</p>
                        <p>사원번호: {employee.id}</p>
                    </div>
                </div>
                <div className="mypage-info-grid">
                    <p><strong>이름 : </strong>{employee.name}</p>
                    <p><strong>사원번호 : </strong>{employee.id}</p>
                    <p><strong>부서 : </strong>{employee.department}</p>
                    <p><strong>직급 : </strong>{employee.position}</p>
                    <p><strong>입사일 : </strong>{employee.joinDate}</p>
                </div>
            </section>

            <section className="mypage-card">
                <div className="mypage-section-title">
                    <h2>개인정보</h2>
                    {!isEditing && (
                        <button type="button" onClick={() => { setIsEditing(true); setMessage(''); }}>
                            정보 수정
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <form onSubmit={handleSave} className="mypage-form">
                        <label>
                            이메일 
                            <input type="email" name="email" value={form.email} onChange={handleChange} required />
                        </label>
                        <label>
                            전화번호 
                            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                        </label>
                        <div className="mypage-actions">
                            <button type="submit">저장</button>
                            <button type="button" onClick={handleCancel}>취소</button>
                        </div>
                    </form>
                ) : (
                    <div className="mypage-info-grid">
                        <p><strong>이메일</strong>{employee.email}</p>
                        <p><strong>전화번호</strong>{employee.phone}</p>
                    </div>
                )}
                {message && <p role="status">{message}</p>}
            </section>

            <section className="mypage-card">
                <h2>담당 업무 현황</h2>
                <div className="mypage-task-summary">
                    <p>전체 업무: {tasks.length}건</p>
                    <p>진행 중: {tasks.filter((task) => task.status === '진행 중').length}건</p>
                    <p>완료: {tasks.filter((task) => task.status === '완료').length}건</p>
                </div>
                <div className="mypage-table-wrap">
                    <table className="mypage-task-table">
                        <thead>
                            <tr><th>업무명</th><th>해당 모듈</th><th>마감일</th><th>진행 상태</th></tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr key={task.id}>
                                    <td>{task.title}</td><td>{task.module}</td><td>{task.dueDate}</td>
                                    <td><span className="mypage-status">{task.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default MyPage;
