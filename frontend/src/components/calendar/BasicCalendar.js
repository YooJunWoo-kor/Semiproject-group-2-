import React, { useState } from 'react';
import './Calendar.css';

function BasicCalendar({ schedule = [] }) {

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

  //달력에 표기할 색상 리스트
  const CALENDAR_COLORS = [
    '#3b82f6', // 0: 소프트 블루 (정상 출근)
    '#f59e0b', // 1: 웜 앰버 (지각 / 조퇴)
    '#ef4444', // 2: 뮤트 레드 (결근 / 병가)
    '#10b981', // 3: 세이지 에메랄드 (연차 / 반차)
    '#06b6d4', // 4: 덜 시안 (경조휴가)
    '#6366f1', // 5: 소프트 인디고 (외근 / 출장)
    '#14b8a6', // 6: 차분한 틸 (재택근무)
    '#8b5cf6', // 7: 뮤트 바이올렛 (야간근무)
    '#d946ef', // 8: 소프트 후샤 (휴일근무)
    '#64748b'  // 9: 뉴트럴 슬레이트 (기타)
  ];

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>

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
      <div className='table-shell'>
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
                        {getDaySchedules(day).map((item, index) => {
                          const setColor = CALENDAR_COLORS[item.typeId];
                         return <div
                            className="basic-calendar-schedule"
                            key={index}
                            style={{
                              // border: `1px solid ${setColor}`,
                              backgroundColor: setColor,
                              color: "#fff",
                              borderRadius: `10px`,
                              textAlign: 'center'
                            }}
                          >
                            {item.title}
                          </div>
                        }
                        )}
                      </>
                    )}

                  </td>
                ))}

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default BasicCalendar;
