// 공통 날짜 계산: 목표일까지 남은 일수(지났다면 음수)
export function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}
