//
const payrollStats = [
  {
    title: '이번 달 급여 총액',
    value: '₩ 486.2M',
    description: '10월 지급 예정',
  },
  {
    title: '지급 완료',
    value: '0건',
    description: '아직 지급 전입니다.',
  },
  {
    title: '지급 예정',
    value: '128건',
    description: '예정일 10월 25일',
  },
  {
    title: '대상 직원',
    value: '128명',
    description: '재직 직원 기준',
  },
];

export default function Payroll() {
  return (
    <div className="payroll-wrapper">
      <div className="page-top-header">
        <div>
          <div className="sub-title">PAYROLL</div>
          <h1>급여 관리</h1>
          <p>급여 지급 요약과 월별 급여 업무를 확인합니다.</p>
        </div>

        <button
          className="action-btn"
          onClick={() =>
            window.alert('급여 계산은 실제 급여 시스템 연결 후 사용할 수 있습니다.')
          }
        >
          급여 명세서 생성
        </button>
      </div>

      <div className="payroll-stats">
        {payrollStats.map((stat) => (
          <div className="stat-box" key={stat.title}>
            <div className="stat-title">{stat.title}</div>
            <div className="stat-num">{stat.value}</div>
            <div className="stat-desc">{stat.description}</div>
          </div>
        ))}
      </div>

      <div className="payroll-notice-card">
        <h2>급여 지급 일정</h2>
        <p>10월 급여는 2026년 10월 25일 지급 예정으로 설정되어 있습니다.</p>
        <small>
          이 화면의 금액과 일정은 디자인 확인용 예시이며 실제 급여 데이터가 아닙니다.
        </small>
      </div>
    </div>
  );
}
