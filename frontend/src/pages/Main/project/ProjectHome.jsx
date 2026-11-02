import React from 'react';
<<<<<<< HEAD
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ProjectModul from './ProjectModul'

import Nav from '../../../components/Nav';

function ProjectRoutes() {
  const projectlist = [
    {
      "id": "proj-001",
      "title": "결제/정산 모듈 패치",
      "typeId": 1,
      "start": "2026-10-25",
      "end": "2026-11-05",
      "members": [
        { "id": "emp-001", "name": "홍길동", "position": "팀장" },
        { "id": "emp-002", "name": "김철수", "position": "차장" }
      ]
    },
    {
      "id": "proj-002",
      "title": "UI/UX 리뉴얼",
      "typeId": 2,
      "start": "2026-11-01",
      "end": "2026-11-20",
      "members": [
        { "id": "emp-003", "name": "이영희", "position": "대리" },
        { "id": "emp-004", "name": "박민수", "position": "사원" }
      ]
    },
    {
      "id": "proj-003",
      "title": "데이터 마이그레이션",
      "typeId": 0,
      "start": "2026-10-01",
      "end": "2026-10-20",
      "members": [
        { "id": "emp-002", "name": "김철수", "position": "차장" },
        { "id": "emp-005", "name": "정우성", "position": "과장" }
      ]
    },
    {
      "id": "proj-004",
      "title": "회원 데이터 동기화",
      "typeId": 3,
      "start": "2026-11-10",
      "end": "2026-11-28",
      "members": [
        { "id": "emp-001", "name": "홍길동", "position": "팀장" },
        { "id": "emp-004", "name": "박민수", "position": "사원" }
      ]
    },
    {
      "id": "proj-005",
      "title": "재고 물류 최적화",
      "typeId": 4,
      "start": "2026-12-01",
      "end": "2026-12-30",
      "members": [
        { "id": "emp-003", "name": "이영희", "position": "대리" },
        { "id": "emp-005", "name": "정우성", "position": "과장" }
      ]
    }
  ];

  let mainUrl = "/main/project/"
  
  const urlList = [
    {name: "프로젝트 대시보드", url: mainUrl}
  ]

  projectlist.forEach((item)=>{
    urlList.push({
      name: item.title,
      url: mainUrl + item.id
    })
  });


  let index = 0;

  return (
    <div className="sub-main-contain">
        <Nav urlist={urlList}/>
        <div className="project-main">
          <Routes>
            <Route index element={<ProjectModul projectlist={projectlist} />} />
            {
              projectlist.map((item)=>{
                return <Route path={item.id} element={<ProjectDetail projectlist={projectlist[index++]}/>}/>
              })
            }
          </Routes>
      </div>
    </div>
  );
}

function ProjectDetail({projectlist}){
  return(
    <div className="sub-container">
      <header className="dashboard-header">
          <span className='subtitle'>{projectlist.title}</span>
      </header>
    </div>
  );
}

export default function ProjectHome() {
  return (
      <ProjectRoutes />
  );
}
=======

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
>>>>>>> origin/kds
