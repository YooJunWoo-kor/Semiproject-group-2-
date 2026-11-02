import React, { useMemo, useState } from "react";
import { LunarCalendar } from "kor-lunar";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const statusClass = {
  "진행 중": "event-blue",
  "예정": "event-gray",
  "지연": "event-red",
  "완료": "event-green",
};

// 양력 기준 공휴일. 대체공휴일 대상 여부는 별도로 관리합니다.
const fixedHolidays = [
  { monthDay: "01-01", name: "신정", substitute: false },
  { monthDay: "03-01", name: "삼일절", substitute: true },
  { monthDay: "05-01", name: "노동절", substitute: false },
  { monthDay: "05-05", name: "어린이날", substitute: true },
  { monthDay: "06-06", name: "현충일", substitute: false },
  { monthDay: "07-17", name: "제헌절", substitute: false },
  { monthDay: "08-15", name: "광복절", substitute: true },
  { monthDay: "10-03", name: "개천절", substitute: true },
  { monthDay: "10-09", name: "한글날", substitute: true },
  { monthDay: "12-25", name: "성탄절", substitute: true },
];

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (dateKey, amount) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
};

const dayOfWeek = (dateKey) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

function addHoliday(map, dateKey, name, isSubstitute = false) {
  if (!map[dateKey]) map[dateKey] = [];
  if (!map[dateKey].some((holiday) => holiday.name === name)) {
    map[dateKey].push({ name, isSubstitute });
  }
}

// 음력 설날·추석·부처님오신날을 해당 연도의 양력 날짜로 변환합니다.
function createHolidayMap(year) {
  const holidays = {};
  const eligibleDates = [];

  fixedHolidays.forEach(({ monthDay, name, substitute }) => {
    const dateKey = `${year}-${monthDay}`;
    addHoliday(holidays, dateKey, name);
    if (substitute) eligibleDates.push({ date: dateKey, name });
  });

  function addLunarHoliday(lunarMonth, lunarDay, label, offsets = [0], substitute = false) {
    const lunarDate = LunarCalendar.of(year, lunarMonth, lunarDay);
    offsets.forEach((offset) => {
      const solar = lunarDate.addDays(offset).toSolar();
      const dateKey = `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
      const name = offset === 0 ? label : `${label} 연휴`;
      addHoliday(holidays, dateKey, name);
      if (substitute) eligibleDates.push({ date: dateKey, name });
    });
  }

  // 설날과 추석은 전날·당일·다음 날을 각각 공휴일로 등록합니다.
  addLunarHoliday(1, 1, "설날", [-1, 0, 1], true);
  addLunarHoliday(4, 8, "부처님오신날", [0], true);
  addLunarHoliday(8, 15, "추석", [-1, 0, 1], true);

  // 대체공휴일: 대상 공휴일이 일요일 또는 다른 공휴일과 겹치면
  // 다음 날부터 주말·이미 등록된 공휴일을 건너뛰어 첫 평일에 지정합니다.
  // 설·추석은 토요일만 겹치는 경우에는 대체공휴일을 만들지 않습니다.
  const originalDates = new Set(Object.keys(holidays));
  const substituteDates = new Set();

  // 같은 날짜에 여러 공휴일이 겹쳐도 대체공휴일 계산은 날짜별로 한 번만 합니다.
  // 예: 2028-10-03은 추석과 개천절이 겹치므로 10월 5일에 대체공휴일을 하루만 생성합니다.
  const uniqueEligibleDates = [...new Map(eligibleDates.map((item) => [item.date, item])).values()];

  uniqueEligibleDates.forEach(({ date, name }) => {
    const weekday = dayOfWeek(date);
    const holidaysOnDate = holidays[date] || [];
    const overlapsOtherHoliday = holidaysOnDate.length > 1;
    const isLunarHoliday = holidaysOnDate.some((holiday) =>
      holiday.name === "설날" || holiday.name === "설날 연휴" ||
      holiday.name === "추석" || holiday.name === "추석 연휴"
    );
    // 설·추석 연휴는 일요일 또는 다른 공휴일과 겹칠 때,
    // 그 외 대체공휴일 대상 공휴일은 일요일 또는 다른 공휴일과 겹칠 때 처리합니다.
    // (토요일만 겹치는 설·추석은 여기서 대체 사유로 보지 않습니다.)
    const shouldSubstitute = weekday === 0 || overlapsOtherHoliday;
    if (!shouldSubstitute) return;

    let candidate = addDays(date, 1);
    while (dayOfWeek(candidate) === 0 || dayOfWeek(candidate) === 6 || originalDates.has(candidate) || substituteDates.has(candidate)) {
      candidate = addDays(candidate, 1);
    }
    const substituteName = isLunarHoliday
      ? `${name} 대체공휴일`
      : `${name} 대체공휴일`;
    addHoliday(holidays, candidate, substituteName, true);
    substituteDates.add(candidate);
  });

  return holidays;
}

export default function ScheduleCalendar({ schedules, month, setMonth, onSelect }) {
  const [moreDay, setMoreDay] = useState(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const holidayMap = useMemo(() => createHolidayMap(year), [year]);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function changeMonth(amount) {
    const date = new Date(year, monthNumber - 1 + amount, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    setMoreDay(null);
  }

  function eventsForDay(day) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return schedules.filter((s) => s.startDate <= date && s.endDate >= date);
  }

  function holidaysForDay(day) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return holidayMap[date] || [];
  }

  const moreEvents = moreDay ? eventsForDay(moreDay) : [];

  function selectEvent(event) {
    setMoreDay(null);
    onSelect(event);
  }

  return (
    <div className="calendar-card">
      <div className="calendar-toolbar">
        <div className="month-title">
          <strong>{year}년 {monthNumber}월</strong>
          <div className="calendar-view-options">
            <span>월간 보기</span>
            <label className="year-select-label">
              <span className="sr-only">연도 선택</span>
              <select
                className="year-select"
                aria-label="연도 선택"
                value={year}
                onChange={(event) => {
                  setMonth(`${event.target.value}-${String(monthNumber).padStart(2, "0")}`);
                  setMoreDay(null);
                }}
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)
                  .concat(year < new Date().getFullYear() - 5 || year > new Date().getFullYear() + 5 ? [year] : [])
                  .sort((a, b) => a - b)
                  .map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}년</option>
                  ))}
              </select>
            </label>
          </div>
        </div>
        <div className="calendar-controls">
          <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
          <button className="today-btn" onClick={() => {
            const today = new Date();
            setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
            setMoreDay(null);
          }}>오늘</button>
          <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
        </div>
      </div>

      <div className="calendar-grid weekday-row">
        {weekdays.map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="calendar-grid day-grid">
        {cells.map((day, index) => {
          const events = day ? eventsForDay(day) : [];
          return (
            <div className={`day-cell ${!day ? "empty-day" : ""}`} key={`${month}-${index}`}>
              {day && <>
                <span className={`day-number ${index % 7 === 0 ? "sunday" : ""}`}>{day}</span>
                <div className="day-events">
                  {holidaysForDay(day).map((holiday) => (
                    <span
                      key={`${holiday.name}-${holiday.isSubstitute ? "substitute" : "official"}`}
                      className={`calendar-holiday ${holiday.isSubstitute ? "calendar-holiday-substitute" : ""}`}
                      title={holiday.name}
                    >
                      {holiday.name}
                    </span>
                  ))}
                  {events.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      className={`calendar-event ${statusClass[event.status] || "event-gray"}`}
                      onClick={() => selectEvent(event)}
                      title={`${event.department || "부서 미지정"} - ${event.title}`}
                      style={event.color ? { backgroundColor: event.color, color: "#202938", borderLeft: `3px solid ${event.color}` } : undefined}
                    >
                      {event.department || "부서 미지정"} - {event.title}
                    </button>
                  ))}
                  {events.length > 3 && (
                    <button
                      type="button"
                      className="more-events"
                      onClick={() => setMoreDay(day)}
                      aria-label={`${month}월 ${day}일 나머지 일정 ${events.length - 3}개 보기`}
                    >
                      +{events.length - 3}개 더보기
                    </button>
                  )}
                </div>
              </>}
            </div>
          );
        })}
      </div>

      {moreDay !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMoreDay(null);
        }}>
          <section className="modal more-events-modal" role="dialog" aria-modal="true" aria-labelledby="more-events-title">
            <div className="modal-header">
              <div>
                <h2 id="more-events-title">{monthNumber}월 {moreDay}일 일정</h2>
                <p className="modal-subtitle">해당 날짜에 등록된 업무 {moreEvents.length}개입니다. 업무를 누르면 상세 내용을 확인할 수 있어요.</p>
              </div>
              <button className="close-btn" type="button" onClick={() => setMoreDay(null)} aria-label="닫기">×</button>
            </div>
            <div className="more-events-list">
              {moreEvents.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  className={`more-event-item ${statusClass[event.status] || "event-gray"}`}
                  onClick={() => selectEvent(event)}
                >
                  <span className="more-event-title">{event.title}</span>
                  <span className="more-event-meta">{event.status || "상태 미지정"} · {event.department || "부서 미지정"} · 담당자 {event.manager || "미지정"}</span>
                </button>
              ))}
              {moreEvents.length === 0 && <p className="empty-state">등록된 일정이 없습니다.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
