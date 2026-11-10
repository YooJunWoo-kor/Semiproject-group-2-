import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectModul from './ProjectModul';
import Nav from '../../../components/Nav';
import ProjectProgress from '../../../components/ProjectProgress';
import ColorTeg from '../../../components/ColorTeg';
import ProjectWorkDetail from './page/ProjectWorkDetail';
import ProjectDetailWorkList from './page/ProjectDetailWorkList';

function ProjectRoutes() {
  const [projectlist, setProjectlist] = useState([
    {
      id: "proj-001",
      title: "결제/정산 모듈 패치",
      typeId: 1,
      start: "2026-10-25",
      end: "2026-11-05",
      members: [
        { id: "emp-001", name: "홍길동", position: "팀장" },
        { id: "emp-002", name: "김철수", position: "차장" }
      ],
      tasks: [
        {
          id: "task-001",
          title: "PG사 연동 규격서 검토",
          content: "신규 결제 모듈 API 스펙 및 보안 키 검증",
          assignee: { id: "emp-001", name: "홍길동" },
          status: "진행 중",
          comments: [
            {
              id: "comment-001",
              author: "김철수",
              content: "테스트 키 발급 완료되었습니다.",
              createdAt: "2026-10-26"
            }
          ]
        }
      ]
    },
    {
      id: "proj-002",
      title: "UI/UX 리뉴얼",
      typeId: 2,
      start: "2026-11-01",
      end: "2026-11-20",
      members: [
        { id: "emp-003", name: "이영희", position: "대리" },
        { id: "emp-004", name: "박민수", position: "사원" }
      ],
      tasks: [
        {
          id: "task-002",
          title: "공통 테이블 컴포넌트 리팩토링",
          content: "PaginationTable 및 BasicTable CSS 표준화",
          assignee: { id: "emp-003", name: "이영희" },
          status: "대기",
          comments: []
        }
      ]
    },
    {
      id: "proj-003",
      title: "데이터 마이그레이션",
      typeId: 0,
      start: "2026-10-01",
      end: "2026-10-20",
      members: [
        { id: "emp-002", name: "김철수", position: "차장" },
        { id: "emp-005", name: "정우성", position: "과장" }
      ],
      tasks: [
        {
          id: "task-003",
          title: "레거시 DB 사원/근태 데이터 추출",
          content: "MySQL 신규 스키마 매핑 및 더미 데이터 이관",
          assignee: { id: "emp-002", name: "김철수" },
          status: "완료",
          comments: [
            {
              id: "comment-002",
              author: "정우성",
              content: "이관 검증 완료했습니다.",
              createdAt: "2026-10-19"
            }
          ]
        }
      ]
    },
    {
      id: "proj-004",
      title: "회원 데이터 동기화",
      typeId: 3,
      start: "2026-11-10",
      end: "2026-11-28",
      members: [
        { id: "emp-001", name: "홍길동", position: "팀장" },
        { id: "emp-004", name: "박민수", position: "사원" }
      ],
      tasks: [] // 할 일 없음
    },
    {
      id: "proj-005",
      title: "재고 물류 최적화",
      typeId: 4,
      start: "2026-12-01",
      end: "2026-12-30",
      members: [
        { id: "emp-003", name: "이영희", position: "대리" },
        { id: "emp-005", name: "정우성", position: "과장" }
      ],
      tasks: [] // 할 일 없음
    }
  ]);

  const mainUrl = "/main/project/";
  
  const urlList = [
    { name: "프로젝트 대시보드", url: mainUrl }
  ];

  projectlist.forEach((item) => {
    urlList.push({
      name: item.title,
      url: mainUrl + item.id
    });
  });

  // 개별 프로젝트 상태(할 일, 댓글 등) 업데이트 헬퍼
  const handleUpdateProjectTasks = (projectId, updatedTasks) => {
    setProjectlist((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, tasks: updatedTasks } : proj
      )
    );
  };

  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} title={'프로젝트'}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route index element={<ProjectModul projectlist={projectlist} />} />
          {projectlist.map((item) => (
            <Route
              key={item.id}
              path={item.id}
              element={
                <ProjectDetail
                  project={item}
                  onUpdateTasks={(newTasks) => handleUpdateProjectTasks(item.id, newTasks)}
                />
              }
            />
          ))}
        </Routes>
      </div>
    </div>
  );
}

// 프로젝트 세부
function ProjectDetail({ project, onUpdateTasks }) {
  const tasks = project.tasks || [];

  // 프로젝트 전환 시 선택된 할 일 초기화 (해당 프로젝트의 첫 할 일이 있으면 선택, 없으면 null)
  

  // 신규 할 일 등록
  const handleCreateTask = () => {
    const newTaskTitle = prompt("새로운 할 일 제목을 입력하세요:");
    if (!newTaskTitle || !newTaskTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      content: "상세 내용을 입력해 주세요.",
      assignee: project.members?.[0] || { name: "미지정" },
      status: "대기",
      comments: []
    };

    const nextTasks = [...tasks, newTask];
    onUpdateTasks(nextTasks);
    
  };

  const test = {id:0, name: '담당자명'};

  return (
    <div className="border-container">
      
      <header className="dashboard-header">
        <span className="subtitle">{project.title}</span>
        <div style={{marginRight:'50px'}}>
          <ColorTeg title={'진행사항'} count={'50'} type={'%'}/>
        </div>
        {/* 진행바 모듈 */}
        <ProjectProgress start={project.start} end={project.end}/>
      </header>

      <div style={{ display: "flex", flexFlow:'column',gap: "20px", minHeight: "480px" }}>
        
        {/* 참여인원 */}
        <section
          style={{
            display:'flex',
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div style={{display:'flex',fontSize: "15px", fontWeight:'500px'}}>
            <strong>담당자</strong>
          </div>
          <MemberLayout member={test}/>
          <div style={{display:'flex',fontSize: "15px", fontWeight:'500px'}}>
            <strong>참여자 ({project.members?.length || 0})</strong>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {project.members &&
              project.members.map((member) => (
                <MemberLayout member={member}/>
              ))}
          </div>
          <button
              type="button"
              className="register-btn"
              style={{ fontSize: "12px", marginLeft:'auto'}}
              onClick={handleCreateTask}
            >
              + 할 일 추가
            </button>
        </section>

        <section
          style={{
            display: 'flex',
            paddingRight: "16px",
            minWidth: 0,
          }}
        >
          <ProjectDetailWorkList tasks={tasks} project = {project}/>
          <ProjectWorkDetail tasks={tasks} onUpdateTasks = {onUpdateTasks}/>
        </section>

        
      </div>
    </div>
  );
}

function MemberLayout({member}){
  return(
    <div
      key={member.id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        width: "100px",
        minHeight: "auto",
        padding: "10px 12px",
        gap: '5px',
        backgroundColor:'#fff',
        borderRadius: '30px',
      }}
    >
      <strong style={{ fontSize: "14px" }}>{member.name}</strong>
      <span className="subtext" style={{ fontSize: "12px", marginTop: "2px" }}>
        {member.position}
      </span>
    </div>
  );
}

export default function ProjectHome() {
  return <ProjectRoutes />;
}
