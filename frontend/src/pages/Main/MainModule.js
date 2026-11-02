import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ADComp from '../../components/ADComp';
import Dashboard from './hr/Dashboard';

function MainModule() {
    const navigate = useNavigate();
    const url = '/main';
    const modules = [
        {
            id: 'hr',
            title: '인사',
            path: url + '/hr'
        },
        {
            id: 'finance',
            title: '재무관리',
            path: `${url}/finance`
        },
        {
            id: 'qa',
            title: '품질보증',
            path: url + '/qa'
        },
        {
            id: 'schedule',
            title: '일정',
            path: url + '/schedule'
        },
        {
            id: 'project',
            title: '프로젝트',
            path: url + '/project'
        },
        {
            id: 'crm',
            title: '고객관계',
            path: url + '/crm'
        },
        {
            id: 'community',
            title: '커뮤니티',
            path: url + '/community'
        },
        {
            id: 'mytesk',
            title: '내업무',
            path: url + '/mytesk'
        }
    ];

    const handleNavigate = (path) => {
        navigate(path);
    };

    // 유저에 따라 보드에 노출 목록 관리할 예정.
    const [index, setindex] = useState(0);
    const boardList = [
        <ADComp />,
        <Dashboard />
      ];

    return (
        <div className='main-content'>
            
            <div className="main-board">
                <div className="board-header">
                    <span className="board-title">출결관리</span>

                    <div className="board-btn-group">
                    <button
                        type="button"
                        className="board-arrow-btn"
                        onClick={() => {
                        let newindex = (index - 1) % boardList.length;
                        if (newindex < 0) newindex = boardList.length - 1;
                        setindex(newindex);
                        }}
                    >
                        &lt;
                    </button>

                    <button
                        type="button"
                        className="board-arrow-btn"
                        onClick={() => {
                        let newindex = (index + 1) % boardList.length;
                        setindex(newindex);
                        }}
                    >
                        &gt;
                    </button>
                    </div>
                </div>

                {boardList[index]}
                </div>

            <main className='nav-bord'>
                <ul className="main-grid">
                    {modules.map((item) => (
                        <li
                            key={item.id}
                            className="main-card"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigate(
                                        item.path
                                    )
                                }
                            >
                                {item.title}
                            </button>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}

export default MainModule;