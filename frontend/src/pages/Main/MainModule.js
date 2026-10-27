import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginUser, logoutUser } from '../../utils/authStorage';

function MainModule() {
    const navigate = useNavigate();
    const url = '/main';
    const loginUser = getLoginUser();
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

    return (
        <div className='main-content'>
            <div className='main-bord'>
                전체 데시보드
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