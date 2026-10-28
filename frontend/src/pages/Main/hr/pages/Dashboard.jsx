import { Link } from 'react-router-dom';

import StatisticsCard
    from '../../../../components/StatisticsCard';

import {
    getLoginUser
} from '../../../../utils/authStorage';
import ADComp from '../../../../components/ADComp';

// 1번부서의 출퇴근 현황
const group1List = [
    { name: '김서연', position: '팀장', isWorking: true, status: '근무중', clockIn: '08:45', clockOut: null, },
    { name: '이민호', position: '과장', isWorking: true, status: '근무중', clockIn: '08:55', clockOut: null, },
    { name: '박지훈', position: '대리', isWorking: false, status: '퇴근', clockIn: '08:30', clockOut: '17:35',},
    { name: '정유진', position: '사원', isWorking: false, status: '미출근', clockIn: null, clockOut: null, },
    { name: '최현우', position: '사원', isWorking: false, status: '휴가', clockIn: null, clockOut: null, },
  ];


export default function Dashboard() {
    const loginUser = getLoginUser();
    const isMaster = loginUser?.role === 'MASTER';
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
            {/* 내 근태관리  */}
            <ADComp />

            {/* 디버깅을 위한 클레스 추가 */}
            <div style={{ backgroundColor: '#DDD' }}>
                부서 출결현황
                <div className='grouborad'>
                    <ul className='grouplist'>
                        <li><button>부서1</button></li>
                        <li><button>부서2</button></li>
                        <li><button>부서3</button></li>
                        <li><button>부서4</button></li>
                    </ul>
                    {/* 각 부서 인덱스에 맞는 사원정보와 현제 출퇴근 상태 표기*/}
                    <div className='table-shell'>
                        <table>
                        <thead>
                            <tr>
                                <th>이름</th>
                                <th>직급</th>
                                <th>출근 시간</th>
                                <th>상태</th>
                            </tr>
                            </thead>
                            <tbody>
                            {group1List.map((member) => (
                                <tr key={member.name}>
                                <td className="emp-name">{member.name}</td>
                                <td className="emp-position">{member.position}</td>
                                <td className="emp-time">{member.clockIn || '-'}</td>
                                <td>
                                    <span className={`status-tag ${member.isWorking ? 'working' : 'off'}`}>
                                    {member.status}
                                    </span>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="system-notice-banner">
                <div>
                    <strong> 시스템 안내 </strong>
                    <span>
                        직원 정보 및 급여 데이터는 권한이 있는 사용자만 확인할 수 있습니다.
                    </span>
                </div>
            </div>
        </div>
    );
}