//근태관리 배열구조로 만들었음
const rows = [
  ['김민준', '개발팀', '08:48', '-', '정상'],
  ['이서연', '인사팀', '08:55', '-', '정상'],
  ['박지호', '디자인팀', '09:12', '-', '지각'],
  ['최유진', '마케팅팀', '-', '연차', '휴가'],
  ['정도윤', '경영지원팀', '08:51', '-', '정상'],
  ['한지우', '개발팀', '-', '-', '미출근']
];

//테이블 형식으로 만들었음
export default function Attendance() {
  const list = ["직원", "부서", "출근시간", "비고", "근태상태"];
  return (
    <div className="sub-container">
      <span className='subtitle'>근태관리</span>
      <table>
        <thead>
          <tr>
            {list.map(
              (item)=>(
                <td>{item}</td>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => ( //map방식으로 편하게 관리함
            <tr key={row[0]}>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
              <td>{row[2]}</td>
              <td>{row[3]}</td>
              <td>{row[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
