import StatisticsCard
    from '../../../components/StatisticsCard';

import {
    getLoginUser
} from '../../../utils/authStorage';
import ADComp from '../../../components/ADComp';
import { useState } from 'react';
import ModalBase from '../../../components/ModalBase';

// 1번부서의 출퇴근 현황
const group1List = [
    { name: '김서연', position: '팀장', isWorking: true, status: '근무중', clockIn: '08:45', clockOut: null, },
    { name: '이민호', position: '과장', isWorking: true, status: '근무중', clockIn: '08:55', clockOut: null, },
    { name: '박지훈', position: '대리', isWorking: false, status: '퇴근', clockIn: '08:30', clockOut: '17:35',},
    { name: '정유진', position: '사원', isWorking: false, status: '미출근', clockIn: null, clockOut: null, },
    { name: '최현우', position: '사원', isWorking: false, status: '휴가', clockIn: null, clockOut: null, },
  ];

function TestModal(){
    return(
        <div>
            테스트용 모달
            <div style={{height:'500px'}}> 테스트용 모달 </div>
        </div>
    )
}

export default function Dashboard() {
    const loginUser = getLoginUser();
    const isMaster = loginUser?.role === 'MASTER';

    //모달팝업용
    const [isModal, setisModal] = useState(false);
    const openModal = ()=> setisModal(true);
    const closeModal = ()=> setisModal(false);

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>인사관리 대시보드</span>
                <span className='subtext'> 처리할 세부 재무 항목을 선택하세요. </span>
                <div className="dashboard-top">
                    {/* MASTER에게만 표시 */}
                    {isMaster && (
                        <button onClick ={openModal} className="register-btn">
                            직원 등록하기
                        </button>
                    )}
                 </div>
            </header>
            
            {/*인자를 전달할 때, 닫기버튼이 자동할 함수와, 작동할 레이아웃 전달*/}
            {isModal && <ModalBase onClose={closeModal} layout={<TestModal/>} />}

            <section className="stats-section">
                <StatisticsCard title="전체직원" count="128" stiyle={1} />
                <StatisticsCard title="오늘출근" count="119" stiyle={1} />
                <StatisticsCard title="휴가사용" count="9"   stiyle={1} />
                <StatisticsCard title="운용부서" count="12"  stiyle={0} />
            </section>

            <div className="stats-section">
                {/* 내 근태관리  */}
                <ADComp />
                <div className="attendance-card">
                    <h2>부서 출결현황</h2>
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
            </div>
        </div>
    );
}

