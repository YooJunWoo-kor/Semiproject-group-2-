import React from 'react';
import { useOutletContext } from 'react-router-dom';
import BasicCalendar from '../../../../components/calendar/BasicCalendar.js';

export default function ScheduleCalendar() {
  // 일정 목록과 상세보기를 여는 함수를 받습니다.
  const { schedules, onSelectSchedule } = useOutletContext();

  // 달력에 표시할 일정 데이터를 만듭니다.
  const calendarSchedules = schedules.map(item => ({
    start: item.startDate,
    end: item.endDate,

    // 일정명을 누르면 해당 일정의 상세보기를 엽니다.
    title: (
      <button
        type="button"
        className="schedule-calendar-event"
        title={item.title}
        onClick={() => onSelectSchedule(item)}
        style={{
          backgroundColor: item.color || '#eaf1ff'
        }}
      >
        {item.title}
      </button>
    )
  }));

  return (
    <section className="sub-container">
      <BasicCalendar schedule={calendarSchedules} />
    </section>
  );
}