import React from 'react';
import { useNavigate } from 'react-router-dom';

export const projectMenus = [
  { title: '프로젝트 관리', path: 'manage', description: '프로젝트 등록, 수정 및 진행 현황' },
  { title: '작업 분류 구조', path: 'tasks', description: '세부 작업과 공정률 관리' },
  { title: '인력·공수', path: 'resources', description: '투입 인력과 가용 공수 관리' },
  { title: '산출물 관리', path: 'deliverables', description: '프로젝트 산출물과 목표일 관리' },
  { title: '예산·비용', path: 'budget', description: '프로젝트 예산과 지출 내역' },
  { title: '리스크·이슈', path: 'risk', description: '위험 요소 및 이슈 관리' }
];

function getDaysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}

function ProjectDashboard({ projects, tasks, onSelect }) {
  const activeProjects = projects;

  const upcoming = activeProjects;

  const importantTasks = tasks;

  function getProjectName(projectId) {
    const project = projects;

    return project ? project.name : '프로젝트 없음';
  }

  return (
    <div className="project-home">
      <header className="project-home-header">
        <h2>프로젝트 홈</h2>
        <p>마감 일정과 진행 중인 작업을 확인하세요.</p>
      </header>

      <section className="project-home-alert">
        <div className="project-home-section-title">
          <h3>🔔 마감일 알림</h3>
          <span>{upcoming.length}건</span>
        </div>

        {upcoming.length === 0 ? (
          <p className="project-home-empty">7일 이내 마감 또는 지연된 프로젝트가 없습니다.</p>
        ) : ( <div>p</div> )}
      </section>

      <section className="project-home-tasks">
        <div className="project-home-section-title">
          <h3>진행할 작업 TOP 5</h3>
          <span>마감일순</span>
        </div>

        {importantTasks.length === 0 ? (
          <p className="project-home-empty">진행할 작업이 없습니다.</p>
        ) : ( <div>p</div> )}
      </section>
    </div>
  );
}

export default function ProjectModul() {
  const navigate = useNavigate();
  const projects = "projects";
  const tasks = "tasks";

  return (
    <div className="sub-container project-module">
      <header>
        <span className="subtitle">프로젝트 대시보드</span>
        <span className="subtext">프로젝트 업무를 선택하세요.</span>
      </header>

      <main>
        <ProjectDashboard
          projects={projects}
          tasks={tasks}
          onSelect={project =>
            navigate('manage', { state: { selectedId: project.id } })
          }
        />

        <div className="module-grid">
          {projectMenus.map(menu => (
            <div className="module-card" key={menu.path}>
              <h3>{menu.title}</h3>
              <p>{menu.description}</p>
              <button
                type="button"
                onClick={() => navigate(menu.path)}
              >
                {menu.title} 이동
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
