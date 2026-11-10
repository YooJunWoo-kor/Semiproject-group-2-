import React, { useState } from 'react';
import './Calendar.css';
import { TOGLE_COLORS } from '../../utils/authStorage';

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
    if (!day) return '';
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function getCleanDate(dateStr) {
    if (!dateStr) return '';
    return String(dateStr).substring(0, 10);
  }

  // 한 주(Week)에 걸쳐 있는 일정 및 초과 일정 계산
  function getWeekEvents(week) {
    const validDays = week.filter(d => d !== null);
    if (validDays.length === 0) return { visibleEvents: [], overflowCounts: {} };

    const weekStartDate = formatDate(week[0] || validDays[0]);
    const weekEndDate = formatDate(week[6] || validDays[validDays.length - 1]);

    const matched = schedule.filter(item => {
      const s = getCleanDate(item.start || item.start_date);
      const e = getCleanDate(item.end || item.end_date);
      return s <= weekEndDate && e >= weekStartDate;
    });

    matched.sort((a, b) => {
      const sA = getCleanDate(a.start || a.start_date);
      const sB = getCleanDate(b.start || b.start_date);
      if (sA !== sB) return sA.localeCompare(sB);

      const lenA = new Date(getCleanDate(a.end || a.end_date)) - new Date(sA);
      const lenB = new Date(getCleanDate(b.end || b.end_date)) - new Date(sB);
      return lenB - lenA;
    });

    const tracks = [];
    const visibleEvents = []; // [새로 추가됨] 2줄까지만 들어갈 표시 일정
    const overflowCounts = [0, 0, 0, 0, 0, 0, 0]; // [새로 추가됨] 요일별(0~6) 숨겨진 일정 수 카운트
    const MAX_SLOT = 3; //최대 노출 버튼 수

    matched.forEach(item => {
      const itemStart = getCleanDate(item.start || item.start_date);
      const itemEnd = getCleanDate(item.end || item.end_date);

      let startCol = 0;
      let endCol = 6;

      for (let i = 0; i < 7; i++) {
        const dStr = formatDate(week[i]);
        if (dStr && dStr === itemStart) startCol = i;
        if (dStr && dStr === itemEnd) endCol = i;
      }

      if (itemStart < weekStartDate) startCol = 0;
      if (itemEnd > weekEndDate) endCol = 6;

      let slotIndex = 0;
      while (true) {
        if (!tracks[slotIndex]) {
          tracks[slotIndex] = [];
        }
        const isConflict = tracks[slotIndex].some(range => 
          !(endCol < range.startCol || startCol > range.endCol)
        );

        if (!isConflict) {
          tracks[slotIndex].push({ startCol, endCol });
          break;
        }
        slotIndex++;
      }

      // 최대 줄 수를 넘어가면 숨김 처리하고 카운트 증가
      if (slotIndex < MAX_SLOT) {
        visibleEvents.push({
          data: item,
          startCol: startCol + 1,
          endCol: endCol + 2,
          slot: slotIndex,

          //이번주 시작/종료일정인지
          isActualStart: itemStart >= weekStartDate,
          isActualEnd: itemEnd <= weekEndDate,
        });
      } else {
        for (let col = startCol; col <= endCol; col++) {
          overflowCounts[col] += 1;
        }
      }
    });

    return { visibleEvents, overflowCounts };
  }

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>

      {/* 달력 상단 */}
      <div className="basic-calendar-header">
        <button onClick={goToday} className='curront-button'>오늘</button>
        <div className="basic-calendar-navigation">
          <button onClick={() => changeMonth(-1)} className='arrowButton'>◀</button>
          <h2>{year}년 {month + 1}월</h2>
          <button onClick={() => changeMonth(1)} className='arrowButton'>▶</button>
        </div>
        <div className="basic-calendar-header-space" />
      </div>

      <div className="g-cal-container">
        
        {/* 요일 헤더 */}
        <div className="g-cal-header-row">
          {weekdays.map((day, index) => (
            <div key={index} className={`g-cal-th ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 주(Week) 목록 렌더링 */}
        <div className="g-cal-body">
          {weeks.map((week, weekIndex) => {
            // [새로 추가됨] 렌더링할 일정과 넘친 개수 가져오기
            const { visibleEvents, overflowCounts } = getWeekEvents(week);

            return (
              <div key={weekIndex} className="g-cal-week-row">
                
                {/* 1. 배경 날짜 격자판 레이어 */}
                <div className="g-cal-bg-grid">
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className="g-cal-day-cell">
                      {day !== null && (
                        <span className={`g-cal-day-num ${dayIndex === 0 ? 'sun' : dayIndex === 6 ? 'sat' : ''}`}>
                          {day}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 2. 전면 일정 막대 레이어 */}
                <div className="g-cal-events-layer">
                    {visibleEvents.map((evt, evtIndex) => {
                      const item = evt.data;
                      const typeId =
                        item.typeId !== undefined
                          ? item.typeId
                          : item.type_id;
                      const bgColor = TOGLE_COLORS?.[typeId] || '#4A90E2';
                      const titleText =
                        item.title || item.schedule_name || '일정';

                      // 이번 주에 시작하는 일정이면 왼쪽 둥글게(4px), 이전 주에서 넘어왔으면 직각(0px)
                      // 이번 주에 끝나는 일정이면 오른쪽 둥글게(4px), 다음 주로 이어지면 직각(0px)
                      const leftRadius = evt.isActualStart ? '30px' : '0px';
                      const rightRadius = evt.isActualEnd ? '30px' : '0px';
                      const dynamicRadius = `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;

                      return (
                        <button
                          type="button"
                          key={item.schedule_id || evtIndex}
                          className="g-cal-bar"
                          style={{
                            gridColumnStart: evt.startCol,
                            gridColumnEnd: evt.endCol,
                            gridRowStart: evt.slot + 1,
                            backgroundColor: bgColor,
                            borderRadius: dynamicRadius, // [새로 추가됨] 계산된 모서리 적용
                            marginLeft: evt.isActualStart ? '1px' : '0px', // [새로 추가됨] 이어질 땐 벽에 딱 붙임
                            marginRight: evt.isActualEnd ? '1px' : '0px',
                          }}
                          onClick={() => console.log('선택된 일정:', item)}
                          title={titleText}
                        >
                          {titleText}
                        </button>
                      );
                    })}

                  {/* [새로 추가됨] 3개 이상 넘쳤을 때 표시되는 '+N개 더보기' 버튼 */}
                  {overflowCounts.map((count, dayIdx) => {
                    if (count === 0 || week[dayIdx] === null) return null;

                    return (
                      <button
                        key={`more-${dayIdx}`}
                        type="button"
                        className="g-cal-more-button"
                        style={{
                          gridColumnStart: dayIdx + 1,
                          gridColumnEnd: dayIdx + 2,
                          top: '0px' // 2개 막대 아래(20 + 21*2 = 62px)에 고정
                        }}
                        onClick={() => {
                          const clickedDate = formatDate(week[dayIdx]);
                          alert(`${clickedDate}의 추가 일정 ${count}개가 더 있습니다.`);
                        }}
                      >
                        +{count}개 더보기
                      </button>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

export default BasicCalendar;