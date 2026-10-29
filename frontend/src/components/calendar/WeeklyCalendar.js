import React, { useState } from 'react';
import './Calendar.css';
import './WeeklyCalendar.css';

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

function WeeklyCalendar(props) {
  const schedule = props.schedule || [];
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

  // 이번 주 날짜 중에서 선택 날짜를 찾아 요일을 표시합니다.
  const selectedDay = days.filter(function (date) {
    return formatDate(date) === selectedDate;
  })[0];

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

      <div className="weekly-calendar-body">
        <div className="weekly-calendar-main">
          <h2>주간 달력</h2>
          <ul className="weekly-calendar-list">
            {days.map(function (date) {
              const dateString = formatDate(date);

              // 이 날짜에 해당하는 일정만 찾습니다.
              const daySchedules = schedule.filter(function (item) {
                return item.start <= dateString && dateString <= item.end;
              });

              return (
                <li key={dateString}>
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
                    <span className="weekly-calendar-weekday">{weekdays[date.getDay()]}</span>
                    <span className="weekly-calendar-date">
                      {date.getMonth() + 1}/{date.getDate()}
                    </span>

                    <span className="weekly-calendar-summary">
                      {daySchedules.length === 0
                        ? '일정 없음'
                        : daySchedules.length === 1
                          ? daySchedules[0].title
                          : '일정 ' + daySchedules.length + '개'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 클릭한 날짜의 상태가 바뀌면 해당 날짜의 정보를 다시 표시합니다. */}
        <aside className="weekly-calendar-details" aria-live="polite">
          <h2>선택 날짜</h2>
          <p>{selectedDate} · {weekdays[selectedDay.getDay()]}요일</p>

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

          {/* 입력이나 저장 없이 선택 날짜의 일정을 메모장처럼 보여줍니다. */}
          <div className="weekly-calendar-memo">
            <h3>업무 내용</h3>

            {selectedSchedules.length > 0 ? (
              selectedSchedules.map(function (item) {
                return (
                  <div key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.description || '등록된 업무 내용이 없습니다.'}</p>
                  </div>
                );
              })
            ) : (
              <p>등록된 일정이 없습니다.</p>
            )}

          </div>

          <h3>출결 정보</h3>
          <p>데이터 미연결</p>
        </aside>
      </div>
    </section>
  );
}

export default WeeklyCalendar;
