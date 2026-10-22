//근태관리 관련
const rows = [
  ['김민준', '개발팀', '08:48', '-', '정상'],
  ['이서연', '인사팀', '08:55', '-', '정상'],
  ['박지호', '디자인팀', '09:12', '-', '지각'],
  ['최유진', '마케팅팀', '-', '연차', '휴가'],
  ['정도윤', '경영지원팀', '08:51', '-', '정상'],
  ['한지우', '개발팀', '-', '-', '미출근']
];

//배열조합으로 관리

export default function Attendance() {
  return (
    <div className="attendance-stats">
    {stat.map((stat) => (
      <div className="stat-box" key={stat.title}>
        <div className="stat-title">
          <span>{stat.title}</span>
        </div>
  
        <div className="stat-num">
          {stat.number}<span>명</span>
        </div>
  
        <div className="stat-desc">{stat.desc}</div>
      </div>
    ))}
  </div>
  )
}