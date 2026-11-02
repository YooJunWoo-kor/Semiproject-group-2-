// src/pages/Main/MainApp.js
import React from 'react';
<<<<<<< HEAD
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
=======
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
>>>>>>> origin/kds
import MainModule from './MainModule';
import FinanceHome from './finance/FinanceHom';
import HrRoutes from './hr/HrRoutes';
import QaRouter from './qualityControl/QaRouter';
<<<<<<< HEAD
import ScheduleHome from './management/ScheduleHome';
import CommunityHome from './community/CommunityHome';
import CrmRoutes from './crm/CrmRoutes';
import MyPage from './mypage/MyPage';
// 파일 상단 import 목록에 추가
import ProjectHome from './project/ProjectHome';
import HeaderNav from '../../components/HeaderNav';
import MyTeskList from './mytesk/MyTeskList';

function MainApp() {
    
    return (
        <div className="main-sell">
            <HeaderNav />
            {/* 실제 화면 라우팅 연결 영역 */}
            <Routes>
                <Route path="/" element={<MainModule />} />
                <Route path="/finance/*" element={<FinanceHome />} />
                <Route path="/hr/*" element={<HrRoutes />} />
                <Route path="/qa/*" element={<QaRouter />} />
                <Route path="/schedule/*" element={<ScheduleHome />} />
                <Route path="/community/*" element={<CommunityHome />} />
                <Route path="/crm/*" element={<CrmRoutes />} />
                <Route path="/project/*" element={<ProjectHome />} />
                <Route path="/profile" element={<MyPage />} />
                <Route path="/mytesk/*" element={<MyTeskList />} />
                <Route path="*" element={<Navigate to="/main" replace />} />
            </Routes>
            <footer>
                <hr />
                <p> ERP 시스템 버전: v1.0.0 | 문의: 시스템운영팀 (내선 1004) </p>
            </footer>
=======
import SchedulePage from './management/SchedulePage';
import CommunityHome from './community/CommunityHome';
import NoticePage from './community/NoticePage';
import FreeBoardPage from './community/FreeBoardPage';
import TechLibraryPage from './community/TechLibraryPage';
import QnAPage from './community/QnAPage';
import SuggestionPage from './community/SuggestionPage';
import CrmHome from './crm/CrmHome';
import CrmRoutes from './crm/CrmRoutes';
// 파일 상단 import 목록에 추가
import ProjectManagementPage from './project/ProjectManagementPage';

function MainApp() {
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
                    <Route path="/project/*" element={<ProjectManagementPage />} />
                    <Route path="*" element={<Navigate to="/main" replace />} />
                </Routes>
            </div>
>>>>>>> origin/kds
        </div>
    );
}

export default MainApp;
