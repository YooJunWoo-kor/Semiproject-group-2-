import { Link } from 'react-router-dom';

import StatisticsCard
    from '../../../../components/StatisticsCard';

import {
    getLoginUser
} from '../../../../utils/authStorage';


const activities = [
    {
        color: 'blue',
        title: '신규 직원 등록',
        detail: '박서연 · 개발팀',
        time: '09:42'
    },
    {
        color: 'green',
        title: '휴가 신청 접수',
        detail: '이준호 · 마케팅팀',
        time: '09:18'
    },
    {
        color: 'purple',
        title: '부서 정보 수정',
        detail: '경영지원팀',
        time: '어제'
    },
    {
        color: 'orange',
        title: '근태 기록 확인',
        detail: '김민지 · 디자인팀',
        time: '어제'
    },
];


export default function Dashboard() {

    const loginUser =
        getLoginUser();


    const isMaster =
        loginUser?.role === 'MASTER';


    return (

        <div className="dashboard-wrapper">

            <div className="dashboard-top">

                <div>

                    <span className="subtitle">
                        인사관리 대시보드
                    </span>

                </div>


                {/* MASTER에게만 표시 */}
                {isMaster && (

                    <Link
                        to="/main/hr/employees"
                        className="register-btn"
                    >
                        직원 등록하기
                    </Link>

                )}

            </div>


            <section className="stats-section">

                <StatisticsCard
                    title="전체직원"
                    count="128"
                    stiyle={1}
                />

                <StatisticsCard
                    title="오늘출근"
                    count="119"
                    stiyle={1}
                />

                <StatisticsCard
                    title="휴가사용"
                    count="9"
                    stiyle={1}
                />

                <StatisticsCard
                    title="운용부서"
                    count="12"
                    stiyle={0}
                />

            </section>


            <div className="recent-activity-wrapper">

                <div className="activity-header">

                    <div>

                        <h2>
                            최근 업무 활동
                        </h2>

                        <p>
                            최근 시스템 변경 내역입니다.
                        </p>

                    </div>

                </div>


                <div className="activity-list">

                    {activities.map(
                        (item, index) => (

                            <div
                                key={index}
                                className="activity-item"
                            >

                                <span className="dot" />


                                <div className="activity-info">

                                    <strong>
                                        {item.title}
                                    </strong>

                                    <span>
                                        {item.detail}
                                    </span>

                                </div>


                                <time>
                                    {item.time}
                                </time>

                            </div>

                        )
                    )}

                </div>

            </div>


            <div className="system-notice-banner">

                <div>

                    <strong>
                        시스템 안내
                    </strong>

                    <span>
                        직원 정보 및 급여 데이터는 권한이 있는 사용자만 확인할 수 있습니다.
                    </span>

                </div>

            </div>

        </div>
    );
}