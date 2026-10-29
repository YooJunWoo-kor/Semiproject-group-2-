import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ADComp from '../../components/ADComp';
import Dashboard from './hr/pages/Dashboard';
import ProjectModul from './project/ProjectModul';
import { useSchedules } from './management/ScheduleContext';

function MainModule() {
    const navigate = useNavigate();
    const scheduleContext = useSchedules();

    // 원본 일정은 그대로 두고 달력에서 사용하는 속성명으로 바꿉니다.
    const schedule = scheduleContext.schedules.map(function (item) {
        return {
            id: item.id,
            title: item.title,
            start: item.startDate,
            end: item.endDate,
            description: item.description
        };
    });

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
        <ADComp schedule={schedule} showWeekly={true} />,
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
