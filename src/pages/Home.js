import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        console.log('입력 데이터 확인:', { employeeId, password });
        // 화면 확인용 이동 처리 또는 테스트 alert
        navigate('/main');
    };

    const registerHendle = function (e){
        e.preventDefault();
        navigate('/register');
    }

    return (
        <div className="login-page">
            {/* 1. 상단 타이틀 영역 */}
            <header>
                <h2>ERP 시스템</h2>
                <p>사내 전사적 자원관리 시스템</p>
            </header>

            {/* 2. 입력 폼 영역 */}
            <main>
                <form onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="employeeId">사원번호</label>
                        <input
                            id="employeeId"
                            type="text"
                            placeholder="사원번호를 입력하세요"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="password">비밀번호</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label>
                            <input type="checkbox" />
                            사원번호 기억하기
                        </label>
                    </div>

                    <button type="submit">
                        로그인
                    </button>
                </form>
            </main>

            {/* 3. 하단 안내 영역 */}
            <footer>
                <button onClick={registerHendle}>회원가입</button><br/>
                <small>계정 분실 시 전산팀에 문의하세요.</small>
            </footer>
        </div>
    );
}

export default Home;