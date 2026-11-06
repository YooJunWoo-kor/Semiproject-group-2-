import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { findLoginAccount, saveLoginUser } from "../utils/authStorage";


function Home() {

    const [loginId, setLoginId] = useState("master@enova.co.kr");
    const [password, setPassword] = useState("1111");

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // 1. 서버 통신 대기
            const responseData = await findLoginAccount(loginId, password);

            // 2. 서버 응답 결과 판별
            if (responseData && responseData.result === "success") {
                saveLoginUser({
                    employeeKey: responseData.user.employee_id || null,
                    name: responseData.user.name,
                    email: responseData.user.email,
                    department: responseData.user.department_id,
                    position: responseData.user.position,
                    role: responseData.user.role
                });
                
                navigate('/main');
            } else {
                alert(responseData || "로그인에 실패했습니다.");
            }
        } catch (error) {
            // 3. 입력값 누락, 401 불일치, DB 조회 오류 등 모든 예외 알림을 '여기서 단 한 번만' 띄웁니다!
            alert(error.message);
        }
    };


    const registerHendle = (e) => {
        e.preventDefault();
        navigate('/register');
    };


    return (
        <div className="login-page">
            <div className="login-border">
                <header>
                    <h2>ERP 시스템</h2>
                    <p>사내 전사적 자원관리 시스템</p>
                </header>
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
                            <input
                                id="password"
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
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
                        <button type="submit">
                            로그인
                        </button>
                    </form>
                </main>
                <footer>
                    <button onClick={registerHendle}> 회원가입 </button>
                    <br />
                    <small> 계정 분실 시 전산팀에 문의하세요. </small>
                </footer>
            </div>
        </div>
    );
}

export default Home;