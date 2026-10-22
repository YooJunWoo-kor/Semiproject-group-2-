import { Link } from 'react-router-dom';

const activities = [
  { color: 'blue', title: '신규 직원 등록', detail: '박서연 · 개발팀', time: '09:42' },
  { color: 'green', title: '휴가 신청 접수', detail: '이준호 · 마케팅팀', time: '09:18' },
  { color: 'purple', title: '부서 정보 수정', detail: '경영지원팀', time: '어제' },
  { color: 'orange', title: '근태 기록 확인', detail: '김민지 · 디자인팀', time: '어제' },
];

export default function Dashboard({ userName }) {
  return (
    <div className="dashboard-wrapper">
      {/* 상단 타이틀 영역 */}
      <div className="dashboard-top">
        <div>
          <div className="date-badge">WEDNESDAY, OCTOBER 21, 2026</div>
          <h1>안녕하세요, {userName}님</h1>
          <p>오늘의 업무 현황을 확인하고 필요한 작업을 시작해 보세요.</p>
        </div>
        <Link to="/main/hr/employees" className="register-btn">
          직원 등록하기
        </Link>
      </div>

      {/* 통계 카드 섹션 */}
      <section className="stats-section">
        <div className="stat-card">
          <span>전체 직원</span>
          <div className="stat-value">128<span>명</span></div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>오늘 출근</span>
          </div>
          <div className="stat-value">112<span>명</span></div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>휴가 사용</span>
          </div>
          <div className="stat-value">8<span>명</span></div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>운영 부서</span>
          </div>
          <div className="stat-value">12<span>개</span></div>
        </div>
      </section>

      {/* 빠른 메뉴 및 최근 활동 섹션 */}
      <section className="content-section">
        <div className="quick-menu-wrapper">
          <div className="section-title-box">
            <div>
              <h2>빠른 메뉴</h2>
              <p>자주 사용하는 업무로 바로 이동하세요.</p>
            </div>
          </div>

          <div className="menu-grid">
            <Link to="/main/hr/employees" className="menu-card">

              <strong>직원 관리</strong>
              <small>직원 정보 조회 및 등록</small>

            </Link>

            <Link to="/main/hr/departments" className="menu-card">
           
              <strong>부서 관리</strong>
              <small>조직 및 부서 정보 관리</small>
           
            </Link>

            <Link to="/main/hr/attendance" className="menu-card">
           
              <strong>근태 관리</strong>
              <small>출퇴근 및 휴가 현황</small>
           
            </Link>

            <Link to="/main/hr/payroll" className="menu-card">
         
              <strong>급여 관리</strong>
              <small>급여 내역 및 지급 현황</small>
    
            </Link>
          </div>
        </div>

        <div className="recent-activity-wrapper">
          <div className="activity-header">
            <div>
              <h2>최근 업무 활동</h2>
              <p>최근 시스템 변경 내역입니다.</p>
            </div>
            <button className="view-all-btn">전체 보기 </button>
          </div>

          <div className="activity-list">
            {activities.map((item, index) => (
              <div key={index} className="activity-item">
                <span className="dot" />
                <div className="activity-info">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 시스템 안내 배너 */}
      <div className="system-notice-banner">
       
        <div>
          <strong>시스템 안내</strong>
          <span>직원 정보 및 급여 데이터는 권한이 있는 사용자만 확인할 수 있습니다.</span>
        </div>
        
      </div>
    </div>
  );
}
