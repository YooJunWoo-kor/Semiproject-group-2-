import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import ProjectWorkspace from './pages/ProjectWorkspace';
import ProjectGanttChart from './pages/ProjectGanttChart';
import ProjectResource from './pages/ProjectResource';
import ProjectDeliverables from './pages/ProjectDeliverables';
import ProjectBudget from './pages/ProjectBudget';
import ProjectRisk from './pages/ProjectRisk';
import ProjectModul, { projectMenus } from './ProjectModul';

import './ProjectManagementPage.css';

function ProjectRoutes() {
  return (
    <div className="project-page">
      <div className="project-shell">
        <aside className="project-nav">
          <h2>프로젝트 관리</h2>

          <NavLink end to="/main/project">
            프로젝트 홈
          </NavLink>

        </aside>

        <div className="project-main">
          <Routes>
            <Route index element={<ProjectModul />} />
            <Route path="manage/*" element={<ProjectWorkspace />} />
            <Route path="tasks/*" element={<ProjectGanttChart />} />
            <Route path="resources/*" element={<ProjectResource />} />
            <Route path="deliverables/*" element={<ProjectDeliverables />} />
            <Route path="budget/*" element={<ProjectBudget />} />
            <Route path="risk/*" element={<ProjectRisk />} />
            <Route path="*" element={<Navigate to="/main/project" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function ProjectHome() {
  return (
    <div>
      <ProjectRoutes />
    </div>
  );
}
