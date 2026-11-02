import { Link } from "react-router-dom";
import StatisticsCard from "../../../../components/StatisticsCard";
import { getLoginUser } from "../../../../utils/authStorage";

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
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';
  const totalEmployees = departments.reduce(
    (total, department) => total + department.count,
    0
  );

  const averageCount = departments.length
    ? (totalEmployees / departments.length).toFixed(1)
    : '0';

  return (
    <div className="sub-container">
      <header className="dashboard-header">
          <span className='subtitle'>부서관리</span>
          <span className='subtext'> 사내 부서관리 </span>
          <div className="dashboard-top">
                    {/* MASTER에게만 표시 */}
                    {isMaster && (
                        <Link
                            to="/main/hr/employees"
                            className="register-btn"
                        >
                            부서등록
                        </Link>
                    )}
                 </div>
      </header>

      <div className="dept-summary-cards">
        <StatisticsCard title={"전체부서"} count={"6"}/>
        <StatisticsCard title={"평균부서인원"} count={"21"} stiyle={1}/>
      </div>

      <div className="dept-grid">
        {departments.map((department) => (
          <DepartCard data = {department}/> 
        ))}
      </div>
    </div>
  );
}

function DepartCard({data}){
  return(
    <div className="dept-card" key={data.id}>
            <h2>{data.name}</h2>
            <p>{data.description}</p>

            <div className="dept-card-footer">
              <div>
                <span>부서장</span>
                <strong>{data.lead}</strong>
              </div>

              <div>
                <span>구성원</span>
                <strong>{data.count}명</strong>
              </div>
            </div>
          </div>
  )
}
