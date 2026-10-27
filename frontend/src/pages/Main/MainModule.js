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
            description: '사원 정보, 조직도, 인사발령 및 근태 관리',
            path: url + '/hr'
        },
        {
            id: 'project',
            title: '프로젝트관리',
            description: '프로젝트 생성, WBS 공정률, 투입 인력 및 산출물 관리',
            path: url + '/project'
        },
        {
            id: 'schedule',
            title: '일정관리',
            description: '전사 공통 캘린더, 부서별 주간 회의 및 업무 일정',
            path: url + '/schedule'
        },
        {
            id: 'crm',
            title: '고객관계관리',
            description: '고객사(거래처) 정보, 영업 기회 파이프라인, 상담 이력',
            path: url + '/crm'
        },
        {
            id: 'finance',
            title: '재무관리',
            description: '매출·매입 전표 처리, 전자세금계산서 발행, 손익 실적 대시보드',
            path: `${url}/finance`
        },
        {
            id: 'qa',
            title: '품질보증관리',
            description: '품질 검사 기준, 하자/이슈 추적, QA 승인 프로세스',
            path: url + '/qa'
        },
        {
            id: 'community',
            title: '커뮤니티',
            description: '사내 공지사항, 부서별 게시판, 사내 건의함 및 자료실',
            path: url + '/community'
        }
    ];

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <div>
            <main>
                <ul className="module-grid">
                    {modules.map((item) => (
                        <li
                            key={item.id}
                            className="module-card"
                        >
                            <h3> {item.title} </h3>
                            <p> {item.description} </p>

                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigate(
                                        item.path
                                    )
                                }
                            >
                                {item.title} 바로가기
                            </button>
                        </li>
                    ))}
                </ul>
            </main>
            <footer>
                <hr />
                <p> ERP 시스템 버전: v1.0.0 | 문의: 시스템운영팀 (내선 1004) </p>
            </footer>
        </div>
    );
}

export default MainModule;