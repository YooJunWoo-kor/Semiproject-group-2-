const rows = [
    ['김민준', '개발팀', '08:48', '-', '정상'],
    ['이서연', '인사팀', '08:55', '-', '정상'],
    ['박지호', '디자인팀', '09:12', '-', '지각'],
    ['최유진', '마케팅팀', '-', '연차', '휴가'],
    ['정도윤', '경영지원팀', '08:51', '-', '정상'],
    ['한지우', '개발팀', '-', '-', '미출근']
  ];
  
  export default function Attendance() {
    return (
      <div className="attendance-wrapper">
        <div className="page-top-header">
          <div>
            <div className="sub-title">TIME & ATTENDANCE</div>
            <h1>근태 관리</h1>
            <p>직원들의 출퇴근 및 휴가 현황을 관리합니다.</p>
          </div>
          <button onClick={() => window.alert('데모용 근태 데이터입니다.')} className="action-btn">
            📅 오늘 현황
          </button>
        </div>
  
        <div className="attendance-stats">
          <div className="stat-box">
            <div className="stat-title">
              <span>출근 완료</span>
              <span>✅</span>
            </div>
            <div className="stat-num">112<span>명</span></div>
            <div className="stat-desc">전체 직원 기준</div>
          </div>
  
          <div className="stat-box">
            <div className="stat-title">
              <span>지각</span>
              <span>⏰</span>
            </div>
            <div className="stat-num">3<span>명</span></div>
            <div className="stat-desc">확인이 필요한 항목</div>
          </div>
  
          <div className="stat-box">
            <div className="stat-title">
              <span>휴가</span>
              <span>📅</span>
            </div>
            <div className="stat-num">8<span>명</span></div>
            <div className="stat-desc">오늘 휴가 사용</div>
          </div>
  
          <div className="stat-box">
            <div className="stat-title">
              <span>미출근</span>
              <span>❌</span>
            </div>
            <div className="stat-num">5<span>명</span></div>
            <div className="stat-desc">미입력 포함</div>
          </div>
        </div>
  
        <div className="table-container-box">
          <div className="table-toolbar">
            <div>
              <h2>오늘의 근태 현황</h2>
              <p>2026년 10월 21일 기준 · 예시 데이터</p>
            </div>
          </div>
  
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>직원</th>
                  <th>부서</th>
                  <th>출근 시간</th>
                  <th>비고</th>
                  <th>근태 상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r[0]}>
                    <td>
                      <div className="user-info-cell">
                        <span className="avatar-circle">{r[0][0]}</span>
                        <strong>{r[0]}</strong>
                      </div>
                    </td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td><span className="status-badge">{r[4]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }