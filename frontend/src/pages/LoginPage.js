import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { findLoginAccount, saveLoginUser } from "../utils/authStorage";

const SAVED_ID_KEY = "NMD_ERP_LOGIN_KEY";

function Home() {
    const [loginId, setLoginId] = useState("master@enova.co.kr");
    const [password, setPassword] = useState("");
    const [rememberId, setRememberId] = useState(false);

    useEffect(() => {
        const savedId = localStorage.getItem(SAVED_ID_KEY);
        if (savedId) {
            setLoginId(savedId);
            setRememberId(true);
        }
    }, []);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // 1. 서버 통신 대기
            const responseData = await findLoginAccount(loginId, password);

            // 2. 서버 응답 결과 판별
            if (responseData && responseData.result === "success") {
                // 이메일 기억하기 체크 여부에 따라 localStorage 저장 또는 삭제
                if (rememberId) {
                    localStorage.setItem(SAVED_ID_KEY, loginId);
                } else {
                    localStorage.removeItem(SAVED_ID_KEY);
                }

                saveLoginUser({
                    employeeKey: responseData.user.employee_id || null,
                    name: responseData.user.name,
                    email: responseData.user.email,
                    departmentName: responseData.user.department_name,
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

    return (
        <div className="login-page" data-theme='light'>
            <div className="login-border">
                <header>
                    <h2>ERP 시스템</h2>
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
                                onChange={(e) => setLoginId(e.target.value)}
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
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={rememberId}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setRememberId(checked);
                                        if (!checked) {
                                            localStorage.removeItem(SAVED_ID_KEY);
                                        }
                                    }}
                                />
                                이메일 기억하기
                            </label>
                        </div>
                        <button type="submit">
                            로그인
                        </button>
                    </form>
                </main>
                <footer>
                    <br />
                    <small> 계정 분실 시 전산팀에 문의하세요. </small>
                </footer>
            </div>
        </div>
    );
}

export default Home;