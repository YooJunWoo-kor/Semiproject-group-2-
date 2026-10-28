import React, { useState } from 'react';
import { useSchedules } from '../ScheduleContext';
import { todayISO, addDays, dateOf } from '../utils/scheduleUtils';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export default function ScheduleCalendar() {
  // 일정관리 공통 데이터와 함수
  const schedule = useSchedules();
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [view, setView] = useState('월간');
  const [selectedDay, setSelectedDay] = useState(todayISO());
  const [showAllDay, setShowAllDay] = useState('');

  const current = dateOf(currentDate);
  const year = current.getFullYear();
  const month = current.getMonth();

  // 이번 달 1일과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 달력은 일요일부터 시작합니다.
  const startDate = view === '월간'
    ? addDays(`${year}-${String(month + 1).padStart(2, '0')}-01`, -firstDay.getDay())
    : addDays(currentDate, -current.getDay());

  // 월간은 5~6주, 주간은 1주를 표시합니다.
  const totalDays = view === '월간'
    ? Math.ceil((firstDay.getDay() + lastDay.getDate()) / 7) * 7
    : 7;

  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    dates.push(addDays(startDate, i));
  }

  // 7일씩 묶으면 table의 한 줄(tr)이 됩니다.
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  // 기존 Context의 반복 일정, 검색/부서/유형 필터를 그대로 사용합니다.
  const allEvents = schedule.events(dates[0], dates[dates.length - 1]);

  function getDayEvents(day) {
    return allEvents.filter(item => item.startDate <= day && day <= item.endDate);
  }

  function changeDate(direction) {
    let next;
    if (view === '주간') {
      next = addDays(currentDate, direction * 7);
    } else {
      const d = new Date(year, month + direction, 1);
      next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }
    setCurrentDate(next);
    setSelectedDay(next);
    setShowAllDay('');
  }

  function selectSchedule(day) {
    setSelectedDay(day);
  }

  // 선택한 날짜에 해당하는 일정들을 아래 테이블에 출력합니다.
  const selectedEvents = getDayEvents(selectedDay);

  return (
    <section className="schedule-calendar">

      <div className="schedule-calendar-toolbar">
        {/* 왼쪽: 현재 날짜가 속한 달로 이동 */}
        <div className="schedule-calendar-today">
          <button type="button" onClick={() => {
            const today = todayISO();
            setCurrentDate(today);
            setSelectedDay(today);
            setShowAllDay('');
          }}>오늘</button>
        </div>

        {/* 가운데: 이전 달 / 연월 / 다음 달 */}
        <div className="schedule-month-navigation">
          <button type="button" onClick={() => changeDate(-1)}
            aria-label={view === '월간' ? '이전 달' : '이전 주'}>〈</button>
          <h2>{year}.{String(month + 1).padStart(2, '0')}{view === '주간' ? ' (주간)' : ''}</h2>
          <button type="button" onClick={() => changeDate(1)}
            aria-label={view === '월간' ? '다음 달' : '다음 주'}>〉</button>
        </div>

        {/* 오른쪽: 보기 선택 / 신규 일정 */}
        <div className="schedule-calendar-actions">
          <select aria-label="달력 보기" value={view}
            onChange={e => { setView(e.target.value); setShowAllDay(''); }}>
            <option value="월간">월간</option>
            <option value="주간">주간</option>
          </select>
          <button type="button" onClick={() => schedule.openCreate({ startDate: selectedDay, endDate: selectedDay })}>
            신규 일정
          </button>
        </div>
      </div>

      <table className="schedule-calendar-table">
        <thead>
          <tr>
            {weekdays.map(day => <th key={day}>{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map(day => {
                const dayEvents = getDayEvents(day);
                const visibleEvents = dayEvents.slice(0, 2);
                const isOtherMonth = dateOf(day).getMonth() !== month;

                return (
                  <td
                    key={day}
                    className={[
                      isOtherMonth ? 'schedule-other-month' : '',
                      selectedDay === day ? 'schedule-selected-day' : ''
                    ].join(' ')}
                  >
                    <button
                      className="schedule-date-button"
                      onClick={() => selectSchedule(day)}
                      title="이 날짜의 일정 보기"
                    >
                      {Number(day.slice(8))}
                    </button>

                    {/* 달력에 표시되는 일정 */}
                    {visibleEvents.map(item => (
                      <div key={item.instanceKey}>
                        <button
                          type="button"
                          className="schedule-event-button"
                          style={{
                            backgroundColor: item.color || '#e8f3ff'
                          }}
                          onClick={() => {
                            // 1. 클릭한 날짜 선택
                            selectSchedule(day);

                            // 2. 클릭한 일정의 상세보기 열기
                            schedule.setSelectedId(item.id);
                          }}
                          title={`${item.department} - ${item.title}`}
                        >
                          {item.department} - {item.title}
                        </button>
                      </div>
                    ))}

                    {dayEvents.length > 2 && (
                      <button
                        type="button"
                        className="schedule-more-button"
                        onClick={() => { setSelectedDay(day); setShowAllDay(day); }}
                      >
                        +{dayEvents.length - 2}개 더보기
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="schedule-day-details">
        <h2>{selectedDay} 일정 목록 ({selectedEvents.length}건){showAllDay === selectedDay ? " · 전체 보기" : ""}</h2>
        <button onClick={() => schedule.openCreate({ startDate: selectedDay, endDate: selectedDay })}>
          + 이 날짜에 일정 등록
        </button>

        <table className="schedule-data-table">
          <thead>
            <tr>
              <th>일정명</th>
              <th>유형</th>
              <th>담당 부서</th>
              <th>담당자</th>
              <th>시간</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {selectedEvents.length === 0 ? (
              <tr><td colSpan="7">선택한 날짜에 일정이 없습니다.</td></tr>
            ) : (
              selectedEvents.map(item => (
                <tr key={item.instanceKey}>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>{item.department}</td>
                  <td>{item.manager}</td>
                  <td>{item.startTime || '종일'}{item.endTime ? ` ~ ${item.endTime}` : ''}</td>
                  <td>{item.status}</td>
                  <td>
                    <button type="button"
                      onClick={() => schedule.setSelectedId(item.id)}>상세보기
                    </button>
                    <button type="button"
                      onClick={() => schedule.openEdit(item.id)}>수정
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
