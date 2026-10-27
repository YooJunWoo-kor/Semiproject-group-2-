import React from 'react';
import { useSchedules } from '../ScheduleContext';
import { departments, types } from '../utils/scheduleUtils';

export default function ScheduleList() {
  // 1. 일정관리 공통 데이터
  const schedule = useSchedules();

  // 2. 검색 및 필터
  function changeKeyword(event) {
    schedule.setKeyword(event.target.value);
  }

  return (
    <section>
      <h1>일정 목록</h1>
      <button onClick={() => schedule.openCreate()}>일정 등록</button>
      <button onClick={() => schedule.setAdjustmentOpen(true)}>기간 조정</button>

      <p>
        <input
          aria-label="검색"
          value={schedule.keyword}
          onChange={changeKeyword}
          placeholder="일정명·담당자 검색"
        />
        <select value={schedule.department} onChange={e => schedule.setDepartment(e.target.value)}>
          {['전체', ...departments].map(name => <option key={name}>{name}</option>)}
        </select>
        <select value={schedule.type} onChange={e => schedule.setType(e.target.value)}>
          {['전체', ...types].map(name => <option key={name}>{name}</option>)}
        </select>
      </p>

      {/* 3. 일정 목록 테이블 */}
      <p>총 {schedule.filtered.length}건</p>
      <table className="schedule-data-table">
        <thead>
          <tr>
            {['일정명', '유형', '담당 부서', '담당자', '기간', '우선순위', '상태', '상세'].map(name => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.filtered.map(item => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.type}</td>
              <td>{item.department}</td>
              <td>{item.manager}</td>
              <td>{item.startDate} ~ {item.endDate}</td>
              <td>{item.priority}</td>
              <td>{item.status}</td>
              <td><button onClick={() => schedule.setSelectedId(item.id)}>조회</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
