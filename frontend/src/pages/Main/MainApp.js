// src/pages/Main/MainApp.js
import React from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import MainModule from './MainModule';
import FinanceHome from './finance/FinanceHom';
import HrRoutes from './hr/HrRoutes';
import QaRouter from './qualityControl/QaRouter';
import SchedulePage from './management/SchedulePage';
import CommunityHome from './community/CommunityHome';
import NoticePage from './community/NoticePage';
import FreeBoardPage from './community/FreeBoardPage';
import TechLibraryPage from './community/TechLibraryPage';
import QnAPage from './community/QnAPage';
import SuggestionPage from './community/SuggestionPage';
import CrmHome from './crm/CrmHome';
import CrmRoutes from './crm/CrmRoutes';
<<<<<<< HEAD
import MyPage from './MyPage';
=======
// 파일 상단 import 목록에 추가
import ProjectManagementPage from './project/ProjectManagementPage';
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d

function MainApp() {

    //  페이지 이동 기능 사용
    const navigate = useNavigate();

    // 로그아웃 함수 정의
    const handleLogout = () => {
        alert('로그아웃 되었습니다.');
        navigate('/');
    };



    return (
        <div className="erp-shell">
            {/* 상단 네비게이션 바 */}
            <nav className="erp-top-nav" aria-label="ERP 주 메뉴">
                <NavLink to="/main" end>대시보드</NavLink>
                <NavLink to="/main/hr">인사</NavLink>
                <NavLink to="/main/finance">재무</NavLink>
                <NavLink to="/main/qa">품질</NavLink>
                <NavLink to="/main/schedule">일정</NavLink>
                <NavLink to="/main/project">프로젝트</NavLink>
                <NavLink to="/main/crm">고객관리</NavLink>
                <NavLink to="/main/community">커뮤니티</NavLink>




                <div className="erp-nav-user">
                    {/* 접속자 클릭 시 마이페이지 이동 */}
                    <NavLink to="/main/profile" className="erp-user-link">
                        접속자: 홍길동 (재무·회계팀 / 사원)
                    </NavLink>

                    <button type="button" onClick={handleLogout}>
                        로그아웃
                    </button>
                </div>


            </nav>

            {/* 실제 화면 라우팅 연결 영역 */}
            <div className="main-content">
                <Routes>
                    <Route path="/" element={<MainModule />} />
                    <Route path="/finance/*" element={<FinanceHome />} />
                    <Route path="/hr/*" element={<HrRoutes />} />
                    <Route path="/qa/*" element={<QaRouter />} />
                    <Route path="/schedule/*" element={<SchedulePage />} />
                    <Route path="/community/*" element={<CommunityHome />} />
                    <Route path="/community/notice" element={<NoticePage />} />
                    <Route path="/community/free" element={<FreeBoardPage />} />
                    <Route path="/community/tech" element={<TechLibraryPage />} />
                    <Route path="/community/qa" element={<QnAPage />} />
                    <Route path="/community/*suggestion" element={<SuggestionPage />} />
                    <Route path="/crm/*" element={<CrmRoutes />} />
<<<<<<< HEAD
                    <Route path="/profile" element={<MyPage />} />
=======
                    <Route path="/project/*" element={<ProjectManagementPage />} />
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d
                    <Route path="*" element={<Navigate to="/main" replace />} />
                </Routes>
            </div>
        </div>
    );
}

export default MainApp;
