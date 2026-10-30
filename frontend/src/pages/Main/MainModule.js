import React, { useState } from 'react';
import ADComp from '../../components/ADComp';
import Dashboard from './hr/Dashboard';
import MainLinkButton from '../../components/MainLinkButton';

import { 
  Users, 
  Wallet, 
  ShieldCheck, 
  CalendarDays, 
  Kanban, 
  ContactRound, 
  MessagesSquare, 
  CheckSquare 
} from 'lucide-react';

function MainModule() {
  const url = '/main';

  // 메뉴 정보, 이동 경로, Lucide 아이콘을 단일 배열로 정의
  const modules = [
    {
      id: 'hr',
      title: '인사관리',
      path: `${url}/hr`,
      icon: <Users size={28} />
    },
    {
      id: 'finance',
      title: '재무관리',
      path: `${url}/finance`,
      icon: <Wallet size={28} />
    },
    {
      id: 'qa',
      title: '품질보증',
      path: `${url}/qa`,
      icon: <ShieldCheck size={28} />
    },
    {
      id: 'schedule',
      title: '일정',
      path: `${url}/schedule`,
      icon: <CalendarDays size={28} />
    },
    {
      id: 'project',
      title: '프로젝트관리',
      path: `${url}/project`,
      icon: <Kanban size={28} />
    },
    {
      id: 'crm',
      title: '고객관리',
      path: `${url}/crm`,
      icon: <ContactRound size={28} />
    },
    {
      id: 'community',
      title: '커뮤니티',
      path: `${url}/community`,
      icon: <MessagesSquare size={28} />
    },
    {
      id: 'mytask',
      title: '내업무',
      path: `${url}/mytesk`,
      icon: <CheckSquare size={28} />
    }
  ];

  // 상단 슬라이드 보드 목록 관리
  const [index, setIndex] = useState(0);
  const boardList = [
    <ADComp key="ad" />,
    <Dashboard key="dashboard" />
  ];

  const prevBoard = () => {
    setIndex((prev) => (prev - 1 + boardList.length) % boardList.length);
  };

  const nextBoard = () => {
    setIndex((prev) => (prev + 1) % boardList.length);
  };

  return (
    <div className="main-content">
      {/* 1. 상단 보드 영역 */}
      <div className="main-board">
        <div className="board-header">
          <span className="board-title">
            {index === 0 ? "공지 및 안내" : "출결 대시보드"}
          </span>

          <div className="board-btn-group">
            <button
              type="button"
              className="board-arrow-btn"
              onClick={prevBoard}
            >
              &lt;
            </button>
            <button
              type="button"
              className="board-arrow-btn"
              onClick={nextBoard}
            >
              &gt;
            </button>
          </div>
        </div>

        {boardList[index]}
      </div>

      {/* 2. 하단 메뉴 그리드 링크 버튼 영역 */}
      <main className="nav-bord">
        <ul className="main-grid">
          {modules.map((item) => (
            
              <MainLinkButton 
                icon={item.icon} 
                text={item.title} 
                link={item.path} 
              />
            
          ))}
        </ul>
      </main>
    </div>
  );
}

export default MainModule;