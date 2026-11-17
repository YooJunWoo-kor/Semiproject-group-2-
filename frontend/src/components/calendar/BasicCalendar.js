import React, { useState } from 'react';
import './Calendar.css';
import { TOGLE_COLORS } from '../../utils/authStorage';
import ModalBase from '../ModalBase';

function BasicCalendar({ schedule = [], readOnly = false, onEventClick }) {
  // 현재 보고 있는 연도와 월
  const [currentDate, setCurrentDate] = useState(new Date());

  // '+N개 더보기' 팝업 상태 ({ date: 'YYYY-MM-DD', events: [...] } | null)
  const [selectedDayMore, setSelectedDayMore] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 이번 달의 첫 요일과 마지막 날짜
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 달력에 표시할 날짜 배열
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDate; day++) {
    days.push(day);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  // 날짜를 7일씩 나누기
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  function changeMonth(number) {
    setCurrentDate(new Date(year, month + number, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

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

  // 특정 날짜(YYYY-MM-DD)에 해당하는 모든 일정 조회 (더보기 팝업용)
  function getEventsForDate(dateStr) {
    return schedule
      .filter((item) => {
        const s = getCleanDate(item.start || item.start_date);
        const e = getCleanDate(item.end || item.end_date);
        return s <= dateStr && e >= dateStr;
      })
      .sort((a, b) => {
        const sA = getCleanDate(a.start || a.start_date);
        const sB = getCleanDate(b.start || b.start_date);
        return sA.localeCompare(sB);
      });
  }

  // 일정 버튼 클릭 공통 처리
  function handleItemClick(item) {
    if (readOnly) return;
    if (onEventClick) {
      onEventClick(item);
    } else {
      console.log('선택된 일정:', item);
    }
  }

  // 한 주(Week)에 걸쳐 있는 일정 및 초과 일정 계산
  function getWeekEvents(week) {
    const validDays = week.filter((d) => d !== null);
    if (validDays.length === 0) return { visibleEvents: [], overflowCounts: {} };

    const weekStartDate = formatDate(week[0] || validDays[0]);
    const weekEndDate = formatDate(week[6] || validDays[validDays.length - 1]);

    const matched = schedule.filter((item) => {
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
    const visibleEvents = [];
    const overflowCounts = [0, 0, 0, 0, 0, 0, 0];
    const MAX_SLOT = 3; // 최대 노출 버튼 수

    matched.forEach((item) => {
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
        const isConflict = tracks[slotIndex].some(
          (range) => !(endCol < range.startCol || startCol > range.endCol)
        );

        if (!isConflict) {
          tracks[slotIndex].push({ startCol, endCol });
          break;
        }
        slotIndex++;
      }

      if (slotIndex < MAX_SLOT) {
        visibleEvents.push({
          data: item,
          startCol: startCol + 1,
          endCol: endCol + 2,
          slot: slotIndex,
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
        <button onClick={goToday} className="curront-button">
          오늘
        </button>
        <div className="basic-calendar-navigation">
          <button onClick={() => changeMonth(-1)} className="arrowButton">
            ◀
          </button>
          <h2>
            {year}년 {month + 1}월
          </h2>
          <button onClick={() => changeMonth(1)} className="arrowButton">
            ▶
          </button>
        </div>
        <div className="basic-calendar-header-space" />
      </div>

      <div className="g-cal-container">
        {/* 요일 헤더 */}
        <div className="g-cal-header-row">
          {weekdays.map((day, index) => (
            <div
              key={index}
              className={`g-cal-th ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 주(Week) 목록 렌더링 */}
        <div className="g-cal-body">
          {weeks.map((week, weekIndex) => {
            const { visibleEvents, overflowCounts } = getWeekEvents(week);

            return (
              <div key={weekIndex} className="g-cal-week-row">
                {/* 1. 배경 날짜 격자판 레이어 */}
                <div className="g-cal-bg-grid">
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className="g-cal-day-cell">
                      {day !== null && (
                        <span
                          className={`g-cal-day-num ${
                            dayIndex === 0 ? 'sun' : dayIndex === 6 ? 'sat' : ''
                          }`}
                        >
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
                      item.typeId !== undefined ? item.typeId : item.type_id;
                    const bgColor = TOGLE_COLORS?.[typeId] || '#4A90E2';
                    const titleText =
                      item.title || item.schedule_name || '일정';
                    const EventElement = readOnly ? 'span' : 'button';

                    const leftRadius = evt.isActualStart ? '30px' : '0px';
                    const rightRadius = evt.isActualEnd ? '30px' : '0px';
                    const dynamicRadius = `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;

                    return (
                      <EventElement
                        type={readOnly ? undefined : 'button'}
                        key={item.scheduleID || item.schedule_id || evtIndex}
                        className="g-cal-bar"
                        style={{
                          gridColumnStart: evt.startCol,
                          gridColumnEnd: evt.endCol,
                          gridRowStart: evt.slot + 1,
                          backgroundColor: bgColor,
                          borderRadius: dynamicRadius,
                          marginLeft: evt.isActualStart ? '1px' : '0px',
                          marginRight: evt.isActualEnd ? '1px' : '0px',
                          cursor: readOnly ? 'default' : undefined,
                        }}
                        onClick={
                          readOnly ? undefined : () => handleItemClick(item)
                        }
                        title={titleText}
                      >
                        {titleText}
                      </EventElement>
                    );
                  })}

                  {/* 3개 이상 넘쳤을 때 표시되는 '+N개 더보기' 버튼 */}
                  {overflowCounts.map((count, dayIdx) => {
                    if (count === 0 || week[dayIdx] === null) return null;
                    const MoreElement = readOnly ? 'span' : 'button';

                    return (
                      <MoreElement
                        key={`more-${dayIdx}`}
                        type={readOnly ? undefined : 'button'}
                        className="g-cal-more-button"
                        style={{
                          gridColumnStart: dayIdx + 1,
                          gridColumnEnd: dayIdx + 2,
                          gridRowStart: 4,
                          cursor: readOnly ? 'default' : undefined,
                        }}
                        onClick={
                          readOnly
                            ? undefined
                            : () => {
                                const clickedDate = formatDate(week[dayIdx]);
                                const allDayEvents = getEventsForDate(clickedDate);
                                setSelectedDayMore({
                                  date: clickedDate,
                                  events: allDayEvents,
                                });
                              }
                        }
                      >
                        +{count}개 더보기
                      </MoreElement>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* '+N개 더보기' 클릭 시 해당 날짜 전체 일정 팝업 */}
      {selectedDayMore && (
        <ModalBase
          title={`${selectedDayMore.date} 전체 일정 (${selectedDayMore.events.length}건)`}
          onClose={() => setSelectedDayMore(null)}
          layout={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '320px',
                maxHeight: '360px',
                overflowY: 'auto',
                padding: '4px 2px',
              }}
            >
              {selectedDayMore.events.map((item, idx) => {
                const typeId =
                  item.typeId !== undefined ? item.typeId : item.type_id;
                const bgColor = TOGLE_COLORS?.[typeId] || '#4A90E2';
                const titleText =
                  item.title || item.schedule_name || item.description || '일정';
                const startStr = getCleanDate(item.start || item.start_date);
                const endStr = getCleanDate(item.end || item.end_date);

                return (
                  <button
                    key={item.scheduleID || item.schedule_id || idx}
                    type="button"
                    style={{
                      width: '100%',
                      backgroundColor: bgColor,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedDayMore(null);
                      handleItemClick(item);
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {titleText}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 400,
                        opacity: 0.9,
                        flexShrink: 0,
                      }}
                    >
                      {startStr === endStr ? startStr : `${startStr} ~ ${endStr}`}
                    </span>
                  </button>
                );
              })}
            </div>
          }
        />
      )}
    </div>
  );
}

export default BasicCalendar;