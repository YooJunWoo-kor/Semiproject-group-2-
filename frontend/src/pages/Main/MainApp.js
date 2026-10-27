// src/pages/Main/MainApp.js
import React from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import MainModule from './MainModule';
import FinanceHome from './finance/FinanceHom';
import HrRoutes from './hr/HrRoutes';
import QaRouter from './qualityControl/QaRouter';
import ScheduleHome from './management/ScheduleHome';
import CommunityHome from './community/CommunityHome';
import CrmRoutes from './crm/CrmRoutes';
import MyPage from './mypage/MyPage';
// 파일 상단 import 목록에 추가
import ProjectHome from './project/ProjectHome';
import HeaderNav from '../../components/HeaderNav';

function MainApp() {
    
    return (
        <div className="erp-shell">
            <HeaderNav />
            {/* 실제 화면 라우팅 연결 영역 */}
            <div className="main-content">
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
                    <Route path="*" element={<Navigate to="/main" replace />} />
                </Routes>
            </div>
        </div>
    );
}

export default MainApp;
