// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';

function RegisterPage() {
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        email: '',
        password: '',
        passwordConfirm: '',
        department: '',
        position: '',
        phone: ''
    });

    // DB에 등록된 사원 목록 상태
    const [userList, setUserList] = useState([]);
    const [serverStatus, setServerStatus] = useState('connecting');

    // DB 사원 목록 가져오기 함수 (GET)
    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users');
            const data = await response.json();

            // 백엔드가 배열을 반환했을 때만 state에 반영
            if (Array.isArray(data)) {
                setUserList(data);
                setServerStatus('connected');
            } else {
                console.error('백엔드 응답 에러:', data.error);
                setUserList([]); // 객체나 에러가 오면 빈 배열로 처리
                setServerStatus('error');
            }
        } catch (error) {
            console.error('사원 목록 로드 실패:', error);
            setUserList([]);
            setServerStatus('offline');
        }
    };

    // 마운트 시 기존 등록 사원 목록 로드
    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // 비밀번호 일치 검증
        if (formData.password !== formData.passwordConfirm) {
            alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        try {
            // 백엔드 API 호출 (POST)
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ [${formData.name}] 사원 계정 등록 신청이 완료되었습니다.`);
                // 폼 초기화
                setFormData({
                    employeeId: '',
                    name: '',
                    email: '',
                    password: '',
                    passwordConfirm: '',
                    department: '',
                    position: '',
                    phone: ''
                });
                // DB 목록 즉시 갱신
                fetchUsers();
            } else {
                alert(`❌ 등록 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('통신 에러:', error);
            alert('백엔드 서버(localhost:5000)와 통신할 수 없습니다.');
        }
    };

    return (
        <div className="register-page">
            {/* 1. 상단 타이틀 */}
            <header>
                <h2>사원 등록 (회원가입)</h2>
                <p>ERP 시스템 신규 사용자 계정을 생성합니다.</p>
            </header>

            {/* 2. 회원가입 입력 폼 */}
            <main>
                <form onSubmit={handleRegister}>
                    {/* 사원 기본 식별 정보 */}
                    <div>
                        <label htmlFor="employeeId">사원번호 </label>
                        <input
                            id="employeeId"
                            name="employeeId"
                            type="text"
                            placeholder="예: EMP-2026001"
                            value={formData.employeeId}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <br />
                    <div>
                        <label htmlFor="name">이름 </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="성함을 입력하세요"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <br />
                    <div>
                        <label htmlFor="email">사내 이메일 </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="example@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <br />

                    {/* 비밀번호 영역 */}
                    <div>
                        <label htmlFor="password">비밀번호 </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="비밀번호 입력"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <br />
                    <div>
                        <label htmlFor="passwordConfirm">비밀번호 확인 </label>
                        <input
                            id="passwordConfirm"
                            name="passwordConfirm"
                            type="password"
                            placeholder="비밀번호 재입력"
                            value={formData.passwordConfirm}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <br />

                    {/* 소속 부서 및 직급 선택 */}
                    <div>
                        <label htmlFor="department">소속 부서 </label>
                        <select
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                        >
                            <option value="">부서 선택</option>
                            <option value="FINANCE">재무·회계팀</option>
                            <option value="SALES">영업팀</option>
                            <option value="INVENTORY">물류·재고팀</option>
                            <option value="HR">인사팀</option>
                            <option value="IT">전산·시스템팀</option>
                        </select>
                    </div>
                    <br />
                    <div>
                        <label htmlFor="position">직급 </label>
                        <select
                            id="position"
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                        >
                            <option value="">직급 선택</option>
                            <option value="STAFF">사원</option>
                            <option value="ASSISTANT_MANAGER">대리</option>
                            <option value="MANAGER">과장</option>
                            <option value="DEPUTY_GENERAL_MANAGER">차장</option>
                            <option value="GENERAL_MANAGER">부장</option>
                        </select>
                    </div>
                    <br />
                    <div>
                        <label htmlFor="phone">연락처 </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="010-0000-0000"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>
                    <br />

                    {/* 가입 및 취소 버튼 */}
                    <div>
                        <button type="submit">계정 등록 신청</button>
                        <button type="button" onClick={() => window.history.back()} >
                            취소
                        </button>
                    </div>
                </form>
            </main>

            {/* 3. 하단 안내 */}
            <footer >
                <small>가입 후 시스템 관리자의 승인이 완료되어야 로그인이 가능합니다.</small>
            </footer>

            <hr  />

            <div className={`connection-status is-${serverStatus}`} role="status">
                {serverStatus === 'connected' && '사원 데이터 서버에 연결되었습니다.'}
                {serverStatus === 'connecting' && '사원 데이터 서버 연결을 확인하고 있습니다.'}
                {serverStatus === 'offline' && '데이터 서버가 연결되지 않았습니다. 등록 기능은 서버 실행 후 사용할 수 있습니다.'}
                {serverStatus === 'error' && '데이터 서버 응답을 처리할 수 없습니다. 서버 설정을 확인해 주세요.'}
            </div>

            {/* 4. [검증 영역] DB 저장 결과 실시간 확인 테이블 */}
            <section>
                <h3>MySQL DB 등록 사원 목록 ({userList.length}명)</h3>
                <table >
                    <thead>
                        <tr >
                            <th>ID</th>
                            <th>사원번호</th>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>부서</th>
                            <th>직급</th>
                            <th>연락처</th>
                            <th>등록일시</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userList.length === 0 ? (
                            <tr>
                                <td colSpan="8" >
                                    등록된 사원이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            userList.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td><strong>{user.employee_id}</strong></td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.department}</td>
                                    <td>{user.position}</td>
                                    <td>{user.phone}</td>
                                    <td>{user.created_at}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

export default RegisterPage;
