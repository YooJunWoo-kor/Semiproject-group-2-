
import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import { ProjectProvider, useProject } from './ProjectContext';
import ProjectWorkspace from './pages/ProjectWorkspace';
import ProjectGanttChart from './pages/ProjectGanttChart';
import ProjectResource from './pages/ProjectResource';
import ProjectDeliverables from './pages/ProjectDeliverables';
import ProjectBudget from './pages/ProjectBudget';
import ProjectRisk from './pages/ProjectRisk';
import ProjectModul, { projectMenus } from './ProjectModul';

import './ProjectManagementPage.css';

function ProjectRoutes() {

    const {
        projects,
        tasks,
        setTasks,
        resources,
        setResources,
        outputs,
        setOutputs,
        budgets,
        setBudgets,
        expenses,
        setExpenses,
        risks,
        setRisks
    } = useProject();

    return (
        <div className="project-page">
            <div className="project-shell">

                {/* 왼쪽 프로젝트 메뉴 */}
                <aside className="project-nav">
                    <h2>프로젝트 관리</h2>

                    <NavLink end to="/main/project">
                        프로젝트 홈
                    </NavLink>

                    {projectMenus.map(m => (
                        <NavLink
                            key={m.path}
                            to={'/main/project/' + m.path}
                        >
                            {m.title}
                        </NavLink>
                    ))}
                </aside>

                {/* 오른쪽 프로젝트 화면 */}
                <div className="project-main">

                    <Routes>
                        <Route index element={<ProjectModul />} />
                        <Route path="manage/*" element={<ProjectWorkspace />} />
                        <Route path="tasks/*" element={<ProjectGanttChart projects={projects} tasks={tasks} setTasks={setTasks} />} />
                        <Route path="resources/*" element={<ProjectResource projects={projects} records={resources} setRecords={setResources} />} />
                        <Route path="deliverables/*" element={<ProjectDeliverables projects={projects} outputs={outputs} setOutputs={setOutputs} />} />
                        <Route path="budget/*" element={<ProjectBudget projects={projects} budgets={budgets} setBudgets={setBudgets} expenses={expenses} setExpenses={setExpenses} />} />
                        <Route path="risk/*" element={<ProjectRisk projects={projects} risks={risks} setRisks={setRisks} />} />
                        <Route path="*" element={<Navigate to="/main/project" replace />} />
                    </Routes>

                </div>
            </div>
        </div>
    );
}

export default function ProjectHome() {
    return (
        <ProjectProvider>
            <ProjectRoutes />
        </ProjectProvider>
    );
}
