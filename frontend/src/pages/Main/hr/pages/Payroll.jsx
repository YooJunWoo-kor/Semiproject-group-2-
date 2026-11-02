import { Link } from "react-router-dom";
import StatisticsCard from "../../../../components/StatisticsCard";
import { getLoginUser } from "../../../../utils/authStorage";

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
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  return (
    <div className="sub-container">
      <header className="dashboard-header">
          <span className='subtitle'>급여관리 </span>
          <div className="dashboard-top">
                    {/* MASTER에게만 표시 */}
                    {isMaster && (
                        <Link
                            to="/main/hr/employees"
                            className="register-btn"
                        >
                            근태수정
                        </Link>
                    )}
                 </div>
      </header>

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
        <p>급여지금 날짜 수정기능 추가</p>
        <small>
          이 화면의 금액과 일정은 디자인 확인용 예시이며 실제 급여 데이터가 아닙니다.
        </small>
      </div>
    </div>
  );
}
