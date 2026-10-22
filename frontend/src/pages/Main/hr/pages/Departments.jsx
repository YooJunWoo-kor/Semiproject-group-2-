const departments = [
    { name: '개발팀', lead: '김민준', count: 32, color: 'blue', desc: '서비스 개발 및 기술 운영' },
    { name: '인사팀', lead: '이서연', count: 8, color: 'purple', desc: '인사 운영 및 조직문화' },
    { name: '디자인팀', lead: '박지호', count: 14, color: 'pink', desc: '브랜드 및 제품 디자인' },
    { name: '마케팅팀', lead: '최유진', count: 21, color: 'orange', desc: '마케팅 전략 및 고객 커뮤니케이션' },
    { name: '경영지원팀', lead: '정도윤', count: 17, color: 'green', desc: '재무 및 사내 운영 지원' },
    { name: '영업팀', lead: '윤지훈', count: 36, color: 'cyan', desc: '고객 관리 및 사업 개발' }
  ];
  
  export default function Departments() {
    return (
      <div className="departments-wrapper">
        <div className="page-top-header">
          <div>
            <div className="sub-title">ORGANIZATION</div>
            <h1>부서 관리</h1>
            <p>회사 조직과 부서별 인원 현황을 확인합니다.</p>
          </div>
          <button 
            onClick={() => window.alert('부서 등록 기능은 다음 개발 단계에서 연결할 수 있습니다.')} 
            className="action-btn"
          >
            🏢 부서 등록
          </button>
        </div>
  
        <div className="dept-summary-cards">
          <div className="summary-card">
            <span className="card-icon">🏢</span>
            <div>
              <span>전체 부서</span>
              <strong>12개</strong>
            </div>
          </div>
          
          <div className="summary-card">
            <span className="card-icon">👥</span>
            <div>
              <span>전체 직원</span>
              <strong>128명</strong>
            </div>
          </div>
          
          <div className="summary-card">
            <span className="card-icon">📈</span>
            <div>
              <span>평균 부서 인원</span>
              <strong>10.7명</strong>
            </div>
          </div>
        </div>
  
        <div className="dept-grid">
          {departments.map(d => (
            <div key={d.name} className="dept-card">
              <div className="dept-card-top">
                <span className="dept-icon">🏢</span>
                <button 
                  onClick={() => window.alert(`${d.name} 상세 정보는 데모 화면입니다.`)}
                  className="detail-btn"
                >
                  ↗️
                </button>
              </div>
              
              <h2>{d.name}</h2>
              <p>{d.desc}</p>
              
              <div className="dept-card-footer">
                <div>
                  <span>부서장</span>
                  <strong>{d.lead}</strong>
                </div>
                <div>
                  <span>구성원</span>
                  <strong>{d.count}<small>명</small></strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }