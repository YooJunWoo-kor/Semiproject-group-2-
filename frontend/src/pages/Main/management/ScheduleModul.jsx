
import React from 'react';
import { useNavigate } from 'react-router-dom';

function ScheduleModul() {
    const navigate = useNavigate();

    // 일정관리 메뉴
    const scheduleMenus = [
        { title: '일정 알림', description: '마감이 가까운 일정과 중요한 일정을 확인합니다.', path: 'notifications' },
        {
            title: '일정 달력',
            description: '월간 달력에서 부서별 일정과 업무 일정을 확인합니다.',
            path: 'calendar'
        },
        {
            title: '일정 목록',
            description: '등록된 일정을 목록으로 조회하고 관리합니다.',
            path: 'list'
        },
        {
            title: '회의실 시간표',
            description: '회의실별 예약 현황과 사용 시간을 확인합니다.',
            path: 'room'
        },
        {
            title: '회의실 관리',
            description: '회의실 정보와 운영 상태를 관리합니다.',
            path: 'rooms'
        },
        {
            title: '내 일정',
            description: '공용 일정과 별도로 나만의 주간 일정을 관리합니다.',
            path: 'my'
        },
    ];

    return (
        <div className="sub-container">
            <header>
                <span className="subtitle">일정관리</span>
                <span className="subtext">
                    처리할 세부 일정관리 항목을 선택하세요.
                </span>
            </header>

            <main>
                <div className="module-grid">
                    {scheduleMenus.map((menu) => (
                        <div key={menu.path} className="module-card">
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

export default ScheduleModul;
