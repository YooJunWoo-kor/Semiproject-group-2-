import React, { useState } from "react";
import "./ScheduleCalendar.css";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export default function ScheduleCalendar() {
  //new Date(): 사용자가 접속한 현제 날짜 기준으로 날짜 데이터 값 생성
  const [currentDate, setCurrentDate] = useState(new Date());

  //현 기준 날짜에서 연.월 추출
  const year = currentDate.getFullYear(); //  2026
  const month = currentDate.getMonth();   //  10(월)

  //getDay():
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // 해당 월의 총 일수
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 달력 셀 배열 (시작 빈칸 + 1일부터 말일까지)
  const cells = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="calendar-container">
      {/* 달력 상단 네비게이션 */}
      <div className="calendar-header">
        <button type="button" className="nav-btn" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <span className="current-title">
          {year}년 {month + 1}월
        </span>
        <button type="button" className="nav-btn" onClick={() => changeMonth(1)}>
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="calendar-weekdays">
        {weekdays.map((day) => (
          <div key={day} className="weekday-col">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="calendar-grid">
        {cells.map((day, index) => (
          <div
            key={index}
            className={`calendar-cell ${day ? "has-date" : "empty"}`}
          >
            {day && <span className="date-number">{day}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}