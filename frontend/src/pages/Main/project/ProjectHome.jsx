import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ProjectModul from './ProjectModul'

import Nav from '../../../components/Nav';

function ProjectRoutes() {
  const projectlist = [
    {
      "id": "proj-001",
      "title": "ERP 결제 및 정산 모듈 긴급 오류 패치",
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
      "title": "대시보드 메인 위젯 UI/UX 리뉴얼",
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
      "title": "부서별 근태 및 출결 데이터 마이그레이션",
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
      "title": "CRM 고객 회원 데이터 자동 동기화 기능 검증",
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
      "title": "2027 상반기 재고 물류 최적화 시스템 기획",
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
