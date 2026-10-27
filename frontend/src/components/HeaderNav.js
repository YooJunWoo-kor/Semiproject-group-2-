import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

function HeaderNav(){
    //  페이지 이동 기능 사용
    const navigate = useNavigate();
    // 로그아웃 함수 정의
    const handleLogout = () => {
        localStorage.clear();
        alert('로그아웃 되었습니다.');
        navigate('/');
    };

    //유저데이터 겟
    function getLoginUser() {
        const LOGIN_USER_KEY = "loginUser";
        const savedUser = localStorage.getItem(LOGIN_USER_KEY);
        // 저장된 데이터가 없으면 null 반환, 있으면 파싱해서 객체로 반환
        if (!savedUser) {
            return null;
        }
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            console.error("로그인 정보 파싱 실패:", error);
            return null;
        }
    }

    // 위의 함수로 유저정보를 받아옴
    const user = getLoginUser();
    // 유저의 전체 이름 저장
    const userName = user?.name || user?.userName || "사용자";
    // 유저의 첫글자 저장
    const userFName = userName[0];

    // 디버깅용 consol창
    console.log(localStorage.getItem("loginUser"));

    return(
        <div>
            <nav className="erp-top-nav" aria-label="ERP 주 메뉴">
                <NavLink to="/main" end>대시보드</NavLink>
                <NavLink to="/main/hr">인사</NavLink>
                <NavLink to="/main/finance">재무</NavLink>
                <NavLink to="/main/qa">품질</NavLink>
                <NavLink to="/main/schedule">일정</NavLink>
                <NavLink to="/main/project">프로젝트</NavLink>
                <NavLink to="/main/crm">고객관리</NavLink>
                <NavLink to="/main/community">커뮤니티</NavLink>

                <div className="erp-header-user">
                    {/* 접속자 클릭 시 마이페이지 이동 */}
                    <NavLink to="/main/profile">
                        {userFName}
                    </NavLink>

                    <div className="hoverList">
                        <ul>
                            <li>1</li>
                            <li>2</li>
                            <li>
                                <button type="button" onClick={handleLogout}>
                                    로그아웃
                                </button>
                            </li>
                        </ul>
                        
                    </div>
                </div>
            </nav>
        </div>
    )
}

export default HeaderNav;