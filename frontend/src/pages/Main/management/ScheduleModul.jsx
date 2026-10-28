import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedules } from './ScheduleContext';

// 업무 메뉴
const menus = [
  ['calendar', '달력'],
  ['list', '일정 목록'],
  ['rooms', '회의실 시간표']
];

export default function ScheduleModul() {

  const navigate = useNavigate();
  const schedule = useSchedules();

  // 오늘 날짜
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 일정 마감까지 남은 날짜 계산
  function getDaysLeft(item) {
    const end = item.endDate || item.startDate;

    if (!end) return null;

    const endDate = new Date(end.slice(0, 10) + 'T00:00:00');

    if (Number.isNaN(endDate.getTime())) {
      return null;
    }

    return Math.round(
      (endDate.getTime() - today.getTime()) / 86400000
    );
  }

  // 완료되지 않은 일정
  const active = schedule.schedules.filter(
    item => item.status !== '완료'
  );

  // 7일 이내 마감 일정
  const upcoming = active
    .filter(item => {
      const days = getDaysLeft(item);

      return days !== null && days >= 0 && days <= 7;
    })
    .sort((a, b) => getDaysLeft(a) - getDaysLeft(b));

  // 우선순위
  const priorityOrder = {
    '높음': 1,
    '보통': 2,
    '낮음': 3
  };

  // 중요 일정 TOP 5
  const important = active
    .filter(item => {
      const days = getDaysLeft(item);

      return days !== null && days >= 0;
    })
    .sort((a, b) => {
      const priorityDifference =
        (priorityOrder[a.priority] || 4) -
        (priorityOrder[b.priority] || 4);

      return priorityDifference ||
        getDaysLeft(a) - getDaysLeft(b);
    })
    .slice(0, 5);

  return (
    <section className="schedule-home schedule-dashboard">

      <h1>일정관리 홈</h1>
      <p>마감 일정과 중요한 사내 일정을 확인하세요.</p>

      {/* 상단 3칸 구성 */}
      <div className="schedule-home-layout">

        {/* 1. 일정 관리 */}
        <section className="schedule-home-box">
          <h3>일정 관리</h3>

          <button
            type="button"
            onClick={() => schedule.openCreate()}
          >
            + 일정 등록
          </button>

          <button
            type="button"
            onClick={() => schedule.setAdjustmentOpen(true)}
          >
            기간 조정
          </button>
        </section>

        {/* 2. 마감일 알림 */}
        <section className="schedule-home-box">
          <h3>🔔 마감일 알림 ({upcoming.length}건)</h3>

          <p>오늘부터 7일 이내 종료되는 일정입니다.</p>

          {upcoming.length === 0 ? (
            <p>마감 예정 일정이 없습니다.</p>
          ) : (
            upcoming.map(item => (
              <button
                type="button"
                className="schedule-dashboard-item"
                key={item.id}
                onClick={() => schedule.setSelectedId(item.id)}
              >
                <strong>{item.title}</strong>

                <span>D-{getDaysLeft(item)}</span>

                <small>
                  {item.department} · {item.endDate || item.startDate}
                </small>
              </button>
            ))
          )}
        </section>

        {/* 3. 중요 일정 */}
        <section className="schedule-home-box">
          <h3>중요 일정 TOP 5</h3>

          <p>중요도 · 종료일순</p>

          {important.length === 0 ? (
            <p>등록된 중요 일정이 없습니다.</p>
          ) : (
            important.map(item => (
              <button
                type="button"
                className="schedule-dashboard-item"
                key={item.id}
                onClick={() => schedule.setSelectedId(item.id)}
              >
                <strong>{item.title}</strong>

                <span>{item.priority}</span>

                <small>
                  {item.department} · {item.endDate || item.startDate}
                </small>
              </button>
            ))
          )}
        </section>

      </div>

      {/* 하단 업무 메뉴 */}
      <h2>업무 메뉴</h2>

      <div className="schedule-module-grid">
        {menus.map(([path, title]) => (
          <button
            type="button"
            className="schedule-module-card"
            key={path}
            onClick={() => navigate('/main/schedule/' + path)}
          >
            {title} 보기 →
          </button>
        ))}
      </div>

    </section>
  );
}