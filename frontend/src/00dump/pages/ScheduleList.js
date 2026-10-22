import React from "react";

function StatusBadge({ status }) {
  const classes = { "진행 중": "badge-blue", "예정": "badge-gray", "지연": "badge-red", "완료": "badge-green" };
  return <span className={`badge ${classes[status] || "badge-gray"}`}>{status}</span>;
}

export default function ScheduleList({ schedules, keyword, setKeyword, department, setDepartment, onSelect }) {
  return <div className="list-card">
    <div className="list-toolbar">
      <div className="filter-group">
        <label className="search-box">
          <span>⌕</span>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="일정명 또는 담당자 검색" />
        </label>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="부서 필터">
          <option>전체</option>
          <option>개발팀</option>
          <option>기획팀</option>
          <option>인사팀</option>
          <option>영업팀</option>
          <option>마케팅팀</option>
          <option>디자인팀</option>
          <option>상품기획팀</option>
          <option>연구개발팀</option>
          <option>품질관리팀</option>
        </select>
      </div>
      <span className="result-count">총 <strong>{schedules.length}</strong>건</span>
    </div>
    <div className="table-wrap"><table>
      <thead>
        <tr>
          <th>일정명</th>
          <th>담당 부서</th>
          <th>담당자</th>
          <th>기간</th>
          <th>우선순위</th>
          <th>상태</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {schedules.map((item) => <tr key={item.id} onClick={() => onSelect(item)} className="clickable-row">
          <td>
            <div className="schedule-title-cell">
              <span className="row-mark" />
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </div>
          </td>
          <td>{item.department}{item.collaboratingDepartment && <small className="collab-dept">협업: {item.collaboratingDepartment}</small>}</td>
          <td>{item.manager}</td>
          <td className="date-cell">{item.startDate}{item.endDate !== item.startDate ? ` ~ ${item.endDate}` : ""}</td>
          <td>
            <span className={`priority priority-${item.priority}`}>{item.priority}</span></td>
          <td>
            <StatusBadge status={item.status} /></td>
          <td>
            <button className="row-arrow" onClick={(e) => { e.stopPropagation(); onSelect(item); }}>›</button>
          </td>
        </tr>)}
        {schedules.length === 0 && <tr><td colSpan="7" className="empty-state">검색 결과가 없습니다.</td></tr>}
      </tbody>
    </table>
    </div>
  </div>
}