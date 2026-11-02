import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

<<<<<<< HEAD
import { findLoginAccount, saveLoginUser } from "../utils/authStorage";


function Home() {

    const [loginId, setLoginId] = useState("master");
    const [password, setPassword] = useState("1234");
=======
function Home() {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
>>>>>>> origin/kds

    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
<<<<<<< HEAD

        const account = findLoginAccount(
            loginId,
            password
        );

        if (!account) {
            alert(
                "이메일 또는 비밀번호가 일치하지 않습니다."
            );
            return;
        }

        saveLoginUser({
            employeeKey: account.employeeKey || null,
            name: account.name,
            email: account.email,
            department: account.department,
            position: account.position,
            role: account.role
        });

        navigate('/main');
    };


    const registerHendle = (e) => {
        e.preventDefault();
        navigate('/register');
    };


    return (
        <div className="login-page">
=======
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
>>>>>>> origin/kds
            <header>
                <h2>ERP 시스템</h2>
                <p>사내 전사적 자원관리 시스템</p>
            </header>
<<<<<<< HEAD
            <main>
                <form onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="loginId">
                            이메일
                        </label>
                        <input
                            id="loginId"
                            type="text"
                            placeholder="이메일을 입력하세요"
                            value={loginId}
                            onChange={(e) =>
                                setLoginId(
                                    e.target.value
                                )
                            }
                            // required
                        />
                    </div>
                    <div>
                        <label htmlFor="password">
                            비밀번호
                        </label>
=======

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
>>>>>>> origin/kds
                        <input
                            id="password"
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
<<<<<<< HEAD
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            // required
                        />
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" />
                            이메일 기억하기
                        </label>
                    </div>
=======
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label>
                            <input type="checkbox" />
                            사원번호 기억하기
                        </label>
                    </div>

>>>>>>> origin/kds
                    <button type="submit">
                        로그인
                    </button>
                </form>
            </main>
<<<<<<< HEAD
            <footer>
                <button onClick={registerHendle}> 회원가입 </button>
                <br />
                <small> 계정 분실 시 전산팀에 문의하세요. </small>
=======

            {/* 3. 하단 안내 영역 */}
            <footer>
                <button onClick={registerHendle}>회원가입</button><br/>
                <small>계정 분실 시 전산팀에 문의하세요.</small>
>>>>>>> origin/kds
            </footer>
        </div>
    );
}

export default Home;