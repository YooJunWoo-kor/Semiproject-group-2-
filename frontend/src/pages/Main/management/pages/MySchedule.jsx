import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { todayISO } from '../utils/scheduleUtils';

// 오늘이 포함된 월요일~일요일 날짜를 구합니다.
function getThisWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  const monday = new Date(today);
  const daysFromMonday = (dayOfWeek + 6) % 7;
  monday.setDate(today.getDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  };
}

export default function MySchedule() {
  const { schedules, onSelectSchedule } = useOutletContext();

  const [selectedManager, setSelectedManager] = useState('');
  const [period, setPeriod] = useState('전체');

  const today = todayISO();
  const week = getThisWeek();

  // 일정에 등록된 담당자 이름을 중복 없이 모읍니다.
  const managers = [
    ...new Set(schedules.map(item => item.manager).filter(Boolean))
  ];

  // 선택한 담당자의 일정
  const mySchedules = schedules.filter(item => {
    return selectedManager && item.manager === selectedManager;
  });

  // 오늘과 이번 주에 포함되는 일정
  const todaySchedules = mySchedules.filter(item => {
    return item.startDate <= today && today <= item.endDate;
  });

  const weekSchedules = mySchedules.filter(item => {
    return (
      item.startDate <= week.endDate &&
      item.endDate >= week.startDate
    );
  });

  const delayedSchedules = mySchedules.filter(item => {
    return item.status === '지연';
  });

  // 선택한 기간에 따라 표시할 목록을 정합니다.
  let visibleSchedules = mySchedules;

  if (period === '오늘') {
    visibleSchedules = todaySchedules;
  } else if (period === '이번 주') {
    visibleSchedules = weekSchedules;
  }

  return (
    <section className="sub-container">
      <h2>내 일정</h2>
      <p>담당자를 선택하면 해당 담당자의 일정을 확인할 수 있습니다.</p>

      {/* 담당자 선택 */}
      <label>
        담당자
        <select
          value={selectedManager}
          onChange={event => setSelectedManager(event.target.value)}
        >
          <option value="">담당자 선택</option>

          {managers.map(manager => (
            <option key={manager} value={manager}>
              {manager}
            </option>
          ))}
        </select>
      </label>

      {!selectedManager ? (
        <p>조회할 담당자를 선택해 주세요.</p>
      ) : (
        <>
          {/* 일정 요약 */}
          <p>
            오늘 {todaySchedules.length}건 /{' '}
            이번 주 {weekSchedules.length}건 /{' '}
            지연 {delayedSchedules.length}건
          </p>

          {/* 기간 선택 */}
          <label>
            조회 기간
            <select
              value={period}
              onChange={event => setPeriod(event.target.value)}
            >
              <option value="전체">전체</option>
              <option value="오늘">오늘</option>
              <option value="이번 주">이번 주</option>
            </select>
          </label>

          <p>총 {visibleSchedules.length}건</p>

          {/* 일정 목록 */}
          <div className="table-shell schedule-table-shell">
            <table className="schedule-data-table">
              <thead>
                <tr>
                  <th>일정명</th>
                  <th>유형</th>
                  <th>기간</th>
                  <th>우선순위</th>
                  <th>상태</th>
                  <th>상세</th>
                </tr>
              </thead>

              <tbody>
                {visibleSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6}>해당 기간에 일정이 없습니다.</td>
                  </tr>
                ) : (
                  visibleSchedules.map(item => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.type || '-'}</td>
                      <td>
                        {item.startDate} ~ {item.endDate}
                      </td>
                      <td>{item.priority}</td>
                      <td>{item.status}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onSelectSchedule(item)}
                        >
                          조회
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}