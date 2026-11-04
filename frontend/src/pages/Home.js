import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { findLoginAccount, saveLoginUser } from "../utils/authStorage";


function Home() {

    const [loginId, setLoginId] = useState("master@enova.co.kr");
    const [password, setPassword] = useState("1111");

    const navigate = useNavigate();

    // const handleLogin = (e) => {
    //     e.preventDefault();
    //     const account = findLoginAccount(
    //         loginId,
    //         password
    //     );

    //     if (!account) {
    //         alert(
    //             "이메일 또는 비밀번호가 일치하지 않습니다."
    //         );
    //         return;
    //     }
    //     else{
    //         saveLoginUser({
    //             employeeKey: account.employeeKey || null,
    //             name: account.name,
    //             email: account.email,
    //             department: account.department,
    //             position: account.position,
    //             role: account.role
    //         });

    //         navigate('/main');
    //     }
    // };

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            // 서버의 로그인 응답을 기다립니다.
            const result = await findLoginAccount(loginId, password);

            // 로그인 성공 여부와 사원 정보 확인
            if (result?.result !== "success" || !result.user) {
                alert("이메일 또는 비밀번호가 일치하지 않습니다.");
                return;
            }

            // 서버가 보내준 사원 정보를 저장합니다.
            // employee_id, department_id, name, role 등이 포함됩니다.
            saveLoginUser(result.user);

            navigate('/main');
        } catch (error) {
            alert(error.message || "로그인 중 오류가 발생했습니다.");
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