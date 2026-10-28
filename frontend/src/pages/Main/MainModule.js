import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ADComp from '../../components/ADComp';
import Dashboard from './hr/pages/Dashboard';
import ProjectModul from './project/ProjectModul';

function MainModule() {
    const navigate = useNavigate();
    const url = '/main';
    const modules = [
        {
            id: 'hr',
            title: '인적관리',
            path: url + '/hr'
        },
        {
            id: 'project',
            title: '프로젝트관리',
            path: url + '/project'
        },
        {
            id: 'schedule',
            title: '일정관리',
            path: url + '/schedule'
        },
        {
            id: 'crm',
            title: '고객관계관리',
            path: url + '/crm'
        },
        {
            id: 'finance',
            title: '재무관리',
            path: `${url}/finance`
        },
        {
            id: 'qa',
            title: '품질보증관리',
            path: url + '/qa'
        },
        {
            id: 'community',
            title: '커뮤니티',
            path: url + '/community'
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
            
            <div className='main-bord'>
                <div className='main-bord-content'>
                    {boardList[index]}
                    {/* 화살표를 누르면, 인덱스 초기화. 해당 인덱스의 boardList의 컴포넌트 출력 */}
                    <button onClick = {()=>{
                        let newindex = (index -1) % boardList.length;
                        if(newindex < 0) newindex = boardList.length-1;
                        setindex(newindex)
                    }}>&lt;</button>
                    <button onClick = {()=>{
                        let newindex = (index + 1)  % boardList.length;
                        setindex(newindex)
                    }}>&gt;</button>
                </div>
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