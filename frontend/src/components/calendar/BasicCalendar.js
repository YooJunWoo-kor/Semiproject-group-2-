import React, { useState } from 'react';
import './Calendar.css';
import WeeklyCalendar from './WeeklyCalendar';

function BasicCalendar({ schedule = [], showWeekly = false }) {

  // 현재 보고 있는 연도와 월
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 이번 달의 첫 요일과 마지막 날짜
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 달력에 표시할 날짜 배열
  const days = [];

  // 첫째 주의 빈칸
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // 1일부터 마지막 날까지
  for (let day = 1; day <= lastDate; day++) {
    days.push(day);
  }

  // 마지막 주의 빈칸
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  // 날짜를 7일씩 나누기
  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // 이전 달 / 다음 달 이동
  function changeMonth(number) {
    setCurrentDate(new Date(year, month + number, 1));
  }

  // 오늘로 이동
  function goToday() {
    setCurrentDate(new Date());
  }

  // 날짜를 YYYY-MM-DD 형식으로 변환
  function formatDate(day) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');

    return `${year}-${mm}-${dd}`;
  }

  // 해당 날짜에 포함되는 일정 찾기
  function getDaySchedules(day) {
    const date = formatDate(day);

    return schedule.filter(item =>
      item.start <= date && date <= item.end
    );
  }

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <>
    <div className="basic-calendar">

      {/* 달력 상단 */}
      <div className="basic-calendar-header">

        <button onClick={goToday} className='curront-button'>
          오늘
        </button>

        <div className="basic-calendar-navigation">
          <button onClick={() => changeMonth(-1)} className='arrowButton'>
            ◀
          </button>

          <h2>{year}년 {month + 1}월</h2>

          <button onClick={() => changeMonth(1)} className='arrowButton'>
            ▶
          </button>
        </div>

        <div className="basic-calendar-header-space" />
      </div>

      {/* 달력 테이블 */}
      <table className="basic-calendar-table">
        <thead>
          <tr>
            {weekdays.map(day => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>

              {week.map((day, dayIndex) => (
                <td key={dayIndex}>

                  {day !== null && (
                    <>
                      <div className="basic-calendar-date">
                        {day}
                      </div>

                      {/* 해당 날짜의 일정 */}
                      {getDaySchedules(day).map((item, index) => (
                        <div
                          className="basic-calendar-schedule"
                          key={index}
                        >
                          {item.title}
                        </div>
                      ))}
                    </>
                  )}

                </td>
              ))}

            </tr>
          ))}
        </tbody>
      </table>

    </div>
    {showWeekly && <WeeklyCalendar schedule={schedule} />}
    </>
  );
}

export default BasicCalendar;
