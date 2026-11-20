// 담당 화면: 대시보드의 재무 일정
// 역할: 공통 일정판과 로딩·오류·빈 일정 안내를 표시합니다.
import React from "react";
import ScheduleBoard from "../../../../../components/ScheduleBoard";

export default function FinanceSchedulePanel({
  schedules = [],
  loading,
  error,
  onCalendarClick,
  children,
}) {
  function renderCalendar() {
    if (loading) return <p className="fd-state subtext">지급 일정을 불러오는 중입니다.</p>;
    if (error)
      return <p className="fd-state subtext">서버 연결 후 지급 일정을 확인할 수 있습니다.</p>;
    return (
      <>
        <ScheduleBoard schedule={schedules} />
        {!schedules.length && <p className="fd-note subtext">등록된 지급 일정이 없습니다.</p>}
      </>
    );
  }
  return (
    <section className="fd-calendar fd-panel">
      <h2>재무 일정</h2>
      <div className="fd-calendar-layout">
        <div className="fd-board" onClickCapture={onCalendarClick}>
          {renderCalendar()}
        </div>
        {children}
      </div>
    </section>
  );
}
