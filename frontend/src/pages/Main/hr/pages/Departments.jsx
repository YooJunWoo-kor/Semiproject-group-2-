//json구조 i
const departments = [
  {
    id: 1,
    name: '개발팀',
    lead: '김민준',
    count: 32,
    description: '서비스 개발 및 기술 운영',
  },
  {
    id: 2,
    name: '인사팀',
    lead: '이서연',
    count: 8,
    description: '인사 운영 및 조직문화',
  },
  {
    id: 3,
    name: '디자인팀',
    lead: '박지호',
    count: 14,
    description: '브랜드 및 제품 디자인',
  },
  {
    id: 4,
    name: '마케팅팀',
    lead: '최유진',
    count: 21,
    description: '마케팅 전략 및 고객 커뮤니케이션',
  },
  {
    id: 5,
    name: '경영지원팀',
    lead: '정도윤',
    count: 17,
    description: '재무 및 사내 운영 지원',
  },
  {
    id: 6,
    name: '영업팀',
    lead: '윤지훈',
    count: 36,
    description: '고객 관리 및 사업 개발',
  },
];

export default function Departments() {
  const totalEmployees = departments.reduce(
    (total, department) => total + department.count,
    0
  );

  const averageCount = departments.length
    ? (totalEmployees / departments.length).toFixed(1)
    : '0';

  return (
    <div className="departments-wrapper">
      <div className="page-top-header">
        <div>
          <div className="sub-title">ORGANIZATION</div>
          <h1>부서 관리</h1>
          <p>회사 조직과 부서별 인원 현황을 확인합니다.</p>
        </div>

        <button
          className="action-btn"
          onClick={() => window.alert('부서 등록 기능은 추후 구현할 수 있습니다.')}
        >
          부서 등록
        </button>
      </div>

      <div className="dept-summary-cards">
        <div className="summary-card">
          <span>전체 부서</span>
          <strong>{departments.length}개</strong>
        </div>

        <div className="summary-card">
          <span>전체 직원</span>
          <strong>{totalEmployees}명</strong>
        </div>

        <div className="summary-card">
          <span>평균 부서 인원</span>
          <strong>{averageCount}명</strong>
        </div>
      </div>

      <div className="dept-grid">
        {departments.map((department) => (
          <div className="dept-card" key={department.id}>
            <h2>{department.name}</h2>
            <p>{department.description}</p>

            <div className="dept-card-footer">
              <div>
                <span>부서장</span>
                <strong>{department.lead}</strong>
              </div>

              <div>
                <span>구성원</span>
                <strong>{department.count}명</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
