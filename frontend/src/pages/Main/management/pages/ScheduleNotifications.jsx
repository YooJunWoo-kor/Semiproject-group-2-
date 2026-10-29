import { useOutletContext } from 'react-router-dom';
import React from 'react';

// 날짜를 하루 단위 숫자로 바꿉니다.
function dateNumber(value) {
  if (!value) return NaN;
  const date = new Date(value + 'T00:00:00');
  return date.getTime() / 86400000;
}

export default function ScheduleNotifications() {
  const { schedules, onSelectSchedule } = useOutletContext();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const today = now.getTime() / 86400000;

  // 원본 일정 객체를 보관하여 상세보기에 그대로 전달합니다.
  const unfinished = schedules
    .filter(schedule => schedule.status !== '완료')
    .map(schedule => ({ schedule, daysLeft: Math.round(dateNumber(schedule.endDate) - today) }));

  const deadlines = unfinished
    .filter(item => item.daysLeft >= 0 && item.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const priorityOrder = { '긴급': 0, '높음': 1 };
  const important = unfinished
    .filter(({ schedule }) => schedule.priority === '긴급' || schedule.priority === '높음')
    .sort((a, b) => {
      const priorityDifference = priorityOrder[a.schedule.priority] - priorityOrder[b.schedule.priority];
      if (priorityDifference) return priorityDifference;
      const aDays = Number.isFinite(a.daysLeft) ? a.daysLeft : Infinity;
      const bDays = Number.isFinite(b.daysLeft) ? b.daysLeft : Infinity;
      return aDays === bDays ? 0 : aDays - bDays;
    })
    .slice(0, 5);

  return (
    <div className="schedule-notifications">
      <h2 className="sn-title">일정 알림</h2>
      <p className="sn-intro">마감이 가까운 일정과 중요한 일정을 확인하세요.</p>

      <div className="sn-grid">
        <section className="sn-panel" aria-labelledby="sn-deadline-title">
          <header className="sn-heading">
            <h3 id="sn-deadline-title">마감 알림</h3>
            <p>7일 이내 미완료 일정 · 최대 5건</p>
          </header>
          {deadlines.length === 0 ? (
            <p className="sn-empty">마감이 임박한 일정이 없습니다.</p>
          ) : (
            <ul className="sn-list">
              {deadlines.map(({ schedule, daysLeft }) => (
                <li key={schedule.id}>
                  <button type="button" className="sn-row" onClick={() => onSelectSchedule(schedule)}>
                    <span className="sn-text">
                      <span className="sn-name">{schedule.title}</span>
                      <span className="sn-meta">{schedule.department || '부서 미지정'} · {schedule.endDate} 마감</span>
                    </span>
                    <span className={`sn-badge ${daysLeft <= 1 ? 'sn-urgent' : ''}`}>
                      {daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sn-panel sn-important" aria-labelledby="sn-important-title">
          <header className="sn-heading">
            <h3 id="sn-important-title">중요도 알림</h3>
            <p>긴급·높음 미완료 일정 · 최대 5건</p>
          </header>
          {important.length === 0 ? (
            <p className="sn-empty">중요도 알림이 없습니다.</p>
          ) : (
            <ul className="sn-list">
              {important.map(({ schedule }) => (
                <li key={schedule.id}>
                  <button type="button" className="sn-row" onClick={() => onSelectSchedule(schedule)}>
                    <span className="sn-text">
                      <span className="sn-name">{schedule.title}</span>
                      <span className="sn-meta">{schedule.manager || '담당자 미지정'} · {schedule.endDate || '종료일 미지정'} · {schedule.status}</span>
                    </span>
                    <span className={`sn-badge ${schedule.priority === '긴급' ? 'sn-urgent' : 'sn-high'}`}>{schedule.priority}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
