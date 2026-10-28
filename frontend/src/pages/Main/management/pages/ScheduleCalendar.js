import React, { useState } from "react";
import "../ScheduleManagement.css";

export default function ScheduleCalendar() {
  //new Date(): 사용자가 접속한 현제 날짜 기준으로 날짜 데이터 값 생성
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  //버튼생성에 필요한 데이터
  const statusClasses = {
    "진행 중": "status-progress",
    "완료": "status-done",
    "예정": "status-todo",
    "지연": "status-delayed",
  };

  //스케쥴 생성 테스트용 더미데이터
  const dummySchedules = [
    {
      id: 1,
      title: "재무팀 결산 마감",
      department: "재무회계",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      status: "완료",
    },
    {
      id: 2,
      title: "화장품 신제품 원가 회계 검토",
      department: "재무회계",
      startDate: "2026-10-20",
      endDate: "2026-10-23",
      status: "진행 중",
    },
    {
      id: 3,
      title: "ERP 백엔드 배포 회의",
      department: "개발팀",
      startDate: "2026-10-22",
      endDate: "2026-10-22",
      status: "예정",
    },
    {
      id: 4,
      title: "법인카드 지출 영수증 마감",
      department: "재무회계",
      startDate: "2026-10-22",
      endDate: "2026-10-22",
      status: "지연",
    },
  ];

  //현 기준 날짜에서 연.월 추출
  const year = currentDate.getFullYear(); //  2026
  const month = currentDate.getMonth();   //  10(월)

  //getDay():
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // 현제달에서 +1을 한 뒤, 0번째 인덱스를 출력하면, 이전달의 마지막 일이 출력됨
  // == 이번달의 총 일수
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 달력 셀 배열 (시작 빈칸 + 1일부터 말일까지)
  // 현제 시작 날짜 firstDayOfWeek만큼의 배열을 null값으로 생성,
  // .from()을 통해 현제 daysInMonth만큼 자동 배열생성
  const cells = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  //값을 받아 현제 월 초기화
  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    // YYYY-MM-DD 형식으로 문자열 변환
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // 일정의 startDate <= 현재 날짜 <= endDate 조건 검사
    return dummySchedules.filter(
      (schedule) => schedule.startDate <= dateStr && dateStr <= schedule.endDate
    );
  };

  const handleEventClick = (event, schedule) => {
    event.stopPropagation(); // 날짜 칸 클릭과 이벤트 분리
    alert(`[${schedule.department}] ${schedule.title}\n상태: ${schedule.status}`);
  };

  return (
    <div className="calendar-container">
      {/* 달력 상단 네비게이션 */}
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <span className="current-title">
          {year}년 {month + 1}월
        </span>
        <button className="nav-btn" onClick={() => changeMonth(1)}>
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
        {cells.map((day, index) => {
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={index}
              className={`calendar-cell ${day ? "has-date" : "empty"}`}
            >
              {/* 날짜 숫자 */}
              {day && <span className="date-number">{day}</span>}

              {/* 일정 버튼 리스트 */}
              {day && (
                <div className="event-list">
                  {/* 해당 일의 이벤트 중 2개만 잘라서 노출 */}
                  {dayEvents.slice(0, 2).map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      className={`event-btn ${statusClasses[schedule.status] || "status-todo"}`}
                      onClick={(e) => handleEventClick(e, schedule)}
                      title={`${schedule.department} | ${schedule.title}`}
                    >
                      {schedule.title}
                    </button>
                  ))}

                  {/* 3개 이상이면 더보기 라벨 표시 */}
                  {dayEvents.length > 2 && (
                    <span className="more-badge">
                      +{dayEvents.length - 2}개 더보기
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}