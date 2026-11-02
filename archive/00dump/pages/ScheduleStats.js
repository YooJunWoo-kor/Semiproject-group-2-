import React from "react";

export default function ScheduleStats({ schedules }) {
  const counts = [
    { label: "전체 일정", value: schedules.length, note: "등록된 일정", icon: "▦", tone: "navy" },
    { label: "진행 중", value: schedules.filter((s) => s.status === "진행 중").length, note: "현재 진행 중", icon: "◷", tone: "blue" },
    { label: "완료", value: schedules.filter((s) => s.status === "완료").length, note: "완료된 일정", icon: "✓", tone: "green" },
    { label: "지연", value: schedules.filter((s) => s.status === "지연").length, note: "확인 필요", icon: "!", tone: "red" },
  ];
  return <div className="stats-grid">
    {counts.map((item) =>
      <div className="stat-card" key={item.label}>
        <div className={`stat-icon ${item.tone}`}>{item.icon}</div>
        <div className="stat-copy">
          <span>{item.label}</span>
          <strong>{item.value}<small>건</small></strong><em>{item.note}</em>
        </div>
      </div>)}
  </div>
}