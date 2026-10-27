import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from './ProjectContext';
import ProjectDashboard from './components/ProjectDashboard';

export const projectMenus = [
    { title: '프로젝트 관리', path: 'manage', description: '프로젝트 등록, 수정 및 진행 현황' },
    { title: '작업 분류 구조', path: 'tasks', description: '세부 작업과 공정률 관리' },
    { title: '인력·공수', path: 'resources', description: '투입 인력과 가용 공수 관리' },
    { title: '산출물 관리', path: 'deliverables', description: '프로젝트 산출물과 목표일 관리' },
    { title: '예산·비용', path: 'budget', description: '프로젝트 예산과 지출 내역' },
    { title: '리스크·이슈', path: 'risk', description: '위험 요소 및 이슈 관리' }
];
export default function ProjectModul() {

    const navigate = useNavigate();
    const { projects, tasks } = useProject();

    return (
        <div className="sub-container project-module">
            <header>
                <span className="subtitle">프로젝트 대시보드</span>
                <span className="subtext">프로젝트 업무를 선택하세요.</span>
            </header>
            <main>
                <ProjectDashboard projects={projects} tasks={tasks} onSelect={p => navigate('manage', { state: { selectedId: p.id } })} />
                <div className="module-grid">{projectMenus.map(menu =>
                    <div className="module-card" key={menu.path}>
                        <h3>{menu.title}</h3>
                        <p>{menu.description}</p>
                        <button type="button" onClick={() => navigate(menu.path)}>{menu.title} 이동</button>
                    </div>)}
                </div>
            </main>
        </div>
    )
}
