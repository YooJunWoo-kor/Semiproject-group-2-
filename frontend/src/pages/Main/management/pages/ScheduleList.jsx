import { useOutletContext } from 'react-router-dom';
import React, { useState } from 'react';
import { departments, types } from '../utils/scheduleUtils';

function ScheduleList() {
  const { schedules: scheduleList, onSelectSchedule } = useOutletContext();
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('전체');
  const [type, setType] = useState('전체');

  // 검색어, 부서, 유형을 모두 만족하는 일정만 표시
  const filteredList = scheduleList.filter(scheduleItem => {
    const searchMatch =
      String(scheduleItem.title || '').includes(keyword) ||
      String(scheduleItem.manager || '').includes(keyword);
    const departmentMatch = department === '전체' || scheduleItem.department === department;
    const typeMatch = type === '전체' || scheduleItem.type === type;
    return searchMatch && departmentMatch && typeMatch;
  });

  return (
    <section className="sub-container">
      <h2>일정 목록</h2>
      <p>
        <input aria-label="일정 검색" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="일정명·담당자 검색" />
        <select value={department} onChange={event => setDepartment(event.target.value)}>
          {['전체', ...departments].map(name => <option key={name}>{name}</option>)}
        </select>
        <select value={type} onChange={event => setType(event.target.value)}>
          {['전체', ...types].map(name => <option key={name}>{name}</option>)}
        </select>
      </p>
      <p>총 {filteredList.length}건</p>
      <div className="table-shell schedule-table-shell">
        <table className="schedule-data-table">
          <thead><tr>
            <th>일정명</th><th>유형</th><th>담당 부서</th><th>담당자</th>
            <th>기간</th><th>우선순위</th><th>상태</th><th>상세</th>
          </tr></thead>
          <tbody>
            {filteredList.map(scheduleItem => (
              <tr key={scheduleItem.id}>
                <td>{scheduleItem.title}</td><td>{scheduleItem.type}</td>
                <td>{scheduleItem.department}</td><td>{scheduleItem.manager}</td>
                <td>{scheduleItem.startDate} ~ {scheduleItem.endDate}</td>
                <td>{scheduleItem.priority}</td><td>{scheduleItem.status}</td>
                <td><button onClick={() => onSelectSchedule && onSelectSchedule(scheduleItem)}>조회</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default ScheduleList;
