export function dateISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function moveDate(date, days) {
  const result = new Date(date); result.setDate(result.getDate() + days); return result;
}
export function weekDates(date) {
  const monday = moveDate(date, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDate(monday, index));
}
export function minutes(time) {
  const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins;
}
// 겹치는 일정 묶음마다 열을 배정합니다.
export function layoutEvents(events) {
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
  const groups = []; let end = -1;
  sorted.forEach(event => {
    if (minutes(event.startTime) >= end) groups.push([]);
    groups[groups.length - 1].push(event);
    end = Math.max(minutes(event.endTime), minutes(event.startTime) >= end ? -1 : end);
  });
  return groups.flatMap(group => {
    const columns = [];
    const placed = group.map(event => {
      let column = columns.findIndex(endTime => endTime <= minutes(event.startTime));
      if (column < 0) column = columns.length;
      columns[column] = minutes(event.endTime);
      return { ...event, column };
    });
    return placed.map(event => ({ ...event, columns: columns.length }));
  });
}
