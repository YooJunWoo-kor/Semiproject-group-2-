import React from 'react';

const priorityOrder = { '긴급': 0, '높음': 1, '보통': 2, '낮음': 3 };
const dateDiff = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date + 'T00:00:00');
  return Math.round((due - today) / 86400000);
};

export default function ProjectHome({ projects = [], tasks = [], onSelect }) {
  // 완료되지 않은 프로젝트 중 마감이 임박했거나 지연된 2건
  const activeProjects = projects.filter(p => p.status !== '완료' && p.due);
  const upcoming = activeProjects
    .map(p => ({ ...p, remaining: dateDiff(p.due) }))
    .filter(p => p.remaining <= 7)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 2);

  // 완료되지 않은 작업을 우선순위, 마감일 순으로 정렬하여 5건 표시
  const important = tasks
    .filter(t => t.status !== '완료')
    .sort((a, b) =>
      (priorityOrder[a.priority || '보통'] ?? 2) -
      (priorityOrder[b.priority || '보통'] ?? 2) ||
      (a.due || '9999').localeCompare(b.due || '9999')
    )
    .slice(0, 5);

  const projectName = id =>
    projects.find(p => p.id === id)?.name || '프로젝트 없음';

  return (
    <div className="project-home">
      <header className="project-home-header">
        <h2>프로젝트 홈</h2>
        <p>마감 일정과 우선 처리 업무를 확인하세요.</p>
      </header>
      <section className="project-home-alert" aria-label="마감일 알림">
        <div className="project-home-section-title">
          <h3>🔔 마감일 알림</h3>
          <span>{upcoming.length}건</span>
        </div>
        {upcoming.length ? upcoming.map(p =>
          <button key={p.id} className="project-home-alert-row" onClick={() => onSelect(p)}>
            <span>{p.name}</span>
            <strong>{p.remaining < 0 ? `D+${-p.remaining} 지연` : p.remaining === 0 ? 'D-Day' : `D-${p.remaining}`}</strong></button>) :
          <p className="project-home-empty">7일 이내 마감 또는 지연된 프로젝트가 없습니다.</p>}
      </section>
      <section className="project-home-tasks" aria-label="중요 업무">
        <div className="project-home-section-title">
          <h3>중요 업무 TOP 5</h3>
          <span>중요도 · 마감일순</span>
        </div>
        {important.length ? important.map(t =>
          <button key={t.id} className="project-home-task-row"
            onClick={() => { const p = projects.find(p => p.id === t.projectId); if (p) onSelect(p); }}>
            <span className={'project-home-priority priority-' + (t.priority || '보통')}>{t.priority || '보통'}</span>
            <span className="project-home-task-name">
              <strong>{t.name}</strong>
              <small>{projectName(t.projectId)}</small>
            </span>
            <span className="project-home-due">{t.due || '미정'}</span>
          </button>) : <p className="project-home-empty">진행할 업무가 없습니다.</p>}
      </section>
    </div>
  );
}
