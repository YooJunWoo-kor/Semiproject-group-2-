import React, { useState } from 'react';
import './WeeklyCalendar.css';
import { TOGLE_COLORS } from '../../utils/authStorage';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// YYYY-MM-DD 포맷 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 해당 날짜가 속한 주의 일요일 계산
function startOfWeek(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

// 날짜 문자열 정규화
function getCleanDate(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).substring(0, 10);
}

// 1. 좌측 요일 버튼 컴포넌트 (세로 1/7 꽉 채움)
function WeeklyDayItem({ date, isSelected, isToday, schedules, onSelect }) {
  const dateString = formatDate(date);
  const summaryText =
    schedules.length === 0
      ? '일정 없음'
      : schedules.length === 1
      ? schedules[0].title
      : `일정 ${schedules.length}개`;

  return (
    <li
      className="size-fill"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
      }}
    >
      <button
        type="button"
        className="weekly-calendar-day"
        aria-label={dateString}
        aria-pressed={isSelected}
        aria-current={isToday ? 'date' : undefined}
        onClick={() => onSelect(dateString)}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <span className="weekly-calendar-weekday">{WEEKDAYS[date.getDay()]}</span>
        <span className="weekly-calendar-date">
          {date.getMonth() + 1}/{date.getDate()}
        </span>
        <span className="weekly-calendar-summary">{summaryText}</span>
      </button>
    </li>
  );
}

// 2. 우측 선택 날짜 상세 패널 (부모 높이 고정 + 내부 목록만 스크롤)
function WeeklyDetailPanel({ selectedDate, schedules, onEventClick }) {
  const dateObj = new Date(selectedDate);
  const dayLabel = Number.isNaN(dateObj.getTime()) ? '' : `${WEEKDAYS[dateObj.getDay()]}요일`;

  return (
    <aside
      className="weekly-calendar-details"
      aria-live="polite"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 상단 날짜 헤더 (고정) */}
      <div style={{ flexShrink: 0, paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>
          {selectedDate} · {dayLabel}
        </h3>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          등록된 일정 {schedules.length}건
        </span>
      </div>

      {/* 일정 리스트 영역 (오직 이 영역에만 세로 스크롤 발생) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          marginTop: '10px',
          paddingRight: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {schedules.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '12px 0' }}>
            등록된 일정이 없습니다.
          </p>
        ) : (
          schedules.map((item, index) => {
            const typeId = item.typeId !== undefined ? item.typeId : item.type_id;
            const badgeColor = TOGLE_COLORS?.[typeId] || '#4A90E2';
            const startStr = getCleanDate(item.start || item.start_date);
            const endStr = getCleanDate(item.end || item.end_date);

            return (
              <div
                key={item.scheduleID || item.schedule_id || index}
                onClick={() => onEventClick && onEventClick(item)}
                style={{
                  flexShrink: 0,
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${badgeColor}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  backgroundColor: '#fff',
                  cursor: onEventClick ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                    {item.title || item.schedule_name || '일정'}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>
                    {startStr === endStr ? startStr : `${startStr} ~ ${endStr}`}
                  </span>
                </div>
                {item.description && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '12px',
                      color: '#475569',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

// 3. 메인 주간 캘린더 컴포넌트
function WeeklyCalendar({ schedule = [], onEventClick }) {
  const todayStr = formatDate(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const days = Array.from({ length: 7 }, (_, index) => {
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
  });

  const getSchedulesForDate = (targetDate) =>
    schedule.filter((item) => {
      const start = getCleanDate(item.start || item.start_date);
      const end = getCleanDate(item.end || item.end_date);
      return start <= targetDate && targetDate <= end;
    });

  const changeWeek = (direction) => {
    const nextWeek = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + direction * 7
    );
    setWeekStart(nextWeek);
    setSelectedDate(formatDate(nextWeek));
  };

  const goToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today));
    setSelectedDate(formatDate(today));
  };

  return (
    <section
      className="weekly-calendar"
      aria-label="주간 달력"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* 상단 네비게이션 */}
      <div className="weekly-calendar-header" style={{ flexShrink: 0 }}>
        <button type="button" onClick={goToday}>
          오늘
        </button>

        <div className="weekly-calendar-navigation">
          <button type="button" aria-label="이전 주" onClick={() => changeWeek(-1)}>
            ◀
          </button>
          <h2>
            {formatDate(days[0])} ~ {formatDate(days[6])}
          </h2>
          <button type="button" aria-label="다음 주" onClick={() => changeWeek(1)}>
            ▶
          </button>
        </div>
      </div>

      {/* 본문: 전체 높이 고정, 좌측은 세로 꽉 채움 고정, 우측만 내부 스크롤 */}
      <div
        className="weekly-calendar-body"
        style={{
          height: '440px',
          minHeight: 0,
          alignItems: 'stretch',
          overflow: 'hidden',
        }}
      >
        {/* 좌측 주간 리스트 (고정 + 세로폭 꽉 채움) */}
        <div
          className="weekly-calendar-main"
          style={{
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <h2 style={{ flexShrink: 0 }}>주간 달력</h2>
          <ul
            className="weekly-calendar-list vertical-box"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {days.map((date) => {
              const dateString = formatDate(date);
              return (
                <WeeklyDayItem
                  key={dateString}
                  date={date}
                  isSelected={selectedDate === dateString}
                  isToday={dateString === todayStr}
                  schedules={getSchedulesForDate(dateString)}
                  onSelect={setSelectedDate}
                />
              );
            })}
          </ul>
        </div>

        {/* 우측 상세 패널 (고정 높이 + 내부 스크롤) */}
        <WeeklyDetailPanel
          selectedDate={selectedDate}
          schedules={getSchedulesForDate(selectedDate)}
          onEventClick={onEventClick}
        />
      </div>
    </section>
  );
}

export default WeeklyCalendar;