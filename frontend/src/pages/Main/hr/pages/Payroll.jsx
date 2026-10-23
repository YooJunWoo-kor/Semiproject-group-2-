import StatisticsCard from "../../../../components/StatisticsCard";

//
const payrollStats = [
  {
    title: '이번 달 급여 총액',
    value: '486.2',
  },
  {
    title: '지급 완료',
    value: '0',
  },
  {
    title: '지급 예정',
    value: '128',
  },
  {
    title: '대상 직원',
    value: '128',
  },
];

export default function Payroll() {
  return (
    <div>
      <div className="page-top-header">
        <div>
          <h1>급여 관리</h1>
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

      <div className="dept-grid"
        style={{
          display: "flex"
        }}
      >
        {payrollStats.map((stat) => (
          <StatisticsCard title={stat.title} count={stat.value}/>
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
