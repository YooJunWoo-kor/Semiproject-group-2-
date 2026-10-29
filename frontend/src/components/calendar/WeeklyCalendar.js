import React, { useState } from 'react';
import './Calendar.css';

// 날짜를 일정 데이터와 같은 YYYY-MM-DD 형식으로 만듭니다.
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// getDay(): 일요일 0, 월요일 1 ... 토요일 6
// 전달받은 날짜가 속한 주의 일요일을 찾습니다.
function startOfWeek(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - date.getDay()
  );
}

function WeeklyCalendar({ schedule = [] }) {
  // weekStart: 현재 보고 있는 주의 일요일
  // selectedDate: 사용자가 클릭한 날짜
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  // 일요일부터 토요일까지 7개의 날짜를 만듭니다.
  const days = weekdays.map(function (day, index) {
    return new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + index
    );
  });

  // 오른쪽 정보 영역에 표시할 선택 날짜의 일정
  const selectedSchedules = schedule.filter(function (item) {
    return item.start <= selectedDate && selectedDate <= item.end;
  });

  // 이전 주(-1) 또는 다음 주(1)로 이동합니다.
  function changeWeek(amount) {
    const nextWeek = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + amount * 7
    );

    setWeekStart(nextWeek);
    setSelectedDate(formatDate(nextWeek));
  }

  function goToday() {
    const today = new Date();

    setWeekStart(startOfWeek(today));
    setSelectedDate(formatDate(today));
  }

  return (
    <section className="weekly-calendar" aria-label="주간 달력">
      <div className="weekly-calendar-main">
        <div className="weekly-calendar-header">
          <button type="button" onClick={goToday}>
            오늘
          </button>

          <div className="weekly-calendar-navigation">
            <button
              type="button"
              aria-label="이전 주"
              onClick={() => changeWeek(-1)}
            >
              ◀
            </button>

            <h2>
              {formatDate(days[0])} ~ {formatDate(days[6])}
            </h2>

            <button
              type="button"
              aria-label="다음 주"
              onClick={() => changeWeek(1)}
            >
              ▶
            </button>
          </div>
        </div>

        <table className="weekly-calendar-table">
          <thead>
            <tr>
              {weekdays.map(function (day) {
                return (
                  <th key={day} scope="col">
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            <tr>
              {days.map(function (date) {
                const dateString = formatDate(date);

                // 이 날짜에 해당하는 일정만 찾습니다.
                const daySchedules = schedule.filter(function (item) {
                  return item.start <= dateString && dateString <= item.end;
                });

                return (
                  <td key={dateString}>
                    <button
                      type="button"
                      className="weekly-calendar-day"
                      aria-label={dateString}
                      aria-pressed={selectedDate === dateString}
                      aria-current={
                        dateString === formatDate(new Date())
                          ? 'date'
                          : undefined
                      }
                      onClick={() => setSelectedDate(dateString)}
                    >
                      <span>
                        {date.getMonth() + 1}/{date.getDate()}
                      </span>

                      {daySchedules.map(function (item, index) {
                        return (
                          <span
                            className="weekly-calendar-event"
                            key={index}
                          >
                            {item.title}
                          </span>
                        );
                      })}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <aside className="weekly-calendar-details" aria-live="polite">
        <h2>선택 날짜</h2>
        <p>{selectedDate}</p>

        <h3>일정</h3>

        {selectedSchedules.length > 0 ? (
          <ul>
            {selectedSchedules.map(function (item, index) {
              return (
                <li key={index}>
                  {item.title}
                  <span className="weekly-calendar-event">
                    {item.start} ~ {item.end}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>등록된 일정이 없습니다.</p>
        )}

        <h3>출결 정보</h3>
        <p>데이터 미연결</p>
      </aside>
    </section>
  );
}

export default WeeklyCalendar;