import React from "react";

function dayNumber(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export default function DeadlineAlerts({ schedules, onSelect }) {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayNumber = dayNumber(todayString);

  const unfinished = schedules.filter((item) => item.status !== "완료");
  const overdue = unfinished
    .filter((item) => item.endDate && dayNumber(item.endDate) < todayNumber)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const dueSoon = unfinished
    .filter((item) => {
      if (!item.endDate) return false;
      const diff = dayNumber(item.endDate) - todayNumber;
      return diff >= 0 && diff <= 3;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  function daysLeft(date) {
    const diff = dayNumber(date) - todayNumber;
    if (diff === 0) return "오늘 마감";
    if (diff === 1) return "내일 마감";
    return `${diff}일 남음`;
  }

  function renderItems(items, emptyMessage, tone) {
    if (!items.length) return <p>{emptyMessage}</p>;
    return <div>
      {items.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item)}>
        <span />
        <span><strong>{item.title}</strong><small>{item.department} · {item.manager} · 마감 {item.endDate}</small></span>
        <span>{tone === "overdue" ? `${Math.abs(dayNumber(item.endDate) - todayNumber)}일 지남` : daysLeft(item.endDate)}</span>
      </button>)}
    </div>;
  }

  return <section>
    <div><div><h2>마감일 알림</h2><p>오늘 기준 마감이 임박했거나 기한이 지난 미완료 업무예요.</p></div></div>
    <div>
      <div><div><span />마감 3일 이내 <strong>{dueSoon.length}</strong></div>{renderItems(dueSoon, "3일 이내 마감할 업무가 없습니다.", "soon")}</div>
      <div><div><span />기한 초과 <strong>{overdue.length}</strong></div>{renderItems(overdue, "기한이 지난 미완료 업무가 없습니다.", "overdue")}</div>
    </div>
  </section>;
}
