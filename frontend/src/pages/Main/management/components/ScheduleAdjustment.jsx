import React, { useState } from 'react';
import { useSchedules } from '../ScheduleContext';

export default function ScheduleAdjustment({ onClose }) {
  const schedule = useSchedules();
  const first = schedule.schedules[0];

  // 조정할 일정과 변경할 날짜
  const [id, setId] = useState(String(first?.id || ''));
  const [start, setStart] = useState(first?.startDate || '');
  const [end, setEnd] = useState(first?.endDate || '');
  const item = schedule.schedules.find(value => String(value.id) === id);

  function choose(value) {
    const next = schedule.schedules.find(entry => String(entry.id) === value);
    setId(value);
    setStart(next?.startDate || '');
    setEnd(next?.endDate || '');
  }

  function submit(event) {
    event.preventDefault();
    if (item && start && end && end >= start) {
      schedule.adjust({ id: item.id, startDate: start, endDate: end });
    }
  }

  return (
    <section className="schedule-dialog" role="dialog" aria-modal="true">
      <h2>일정 기간 조정</h2>
      <form onSubmit={submit}>
        <p>
          <select value={id} onChange={event => choose(event.target.value)}>
            {schedule.schedules.map(entry => (
              <option key={entry.id} value={entry.id}>{entry.title}</option>
            ))}
          </select>
        </p>
        <p>
          <input type="date" value={start} onChange={event => setStart(event.target.value)} />
          {' ~ '}
          <input type="date" value={end} onChange={event => setEnd(event.target.value)} />
        </p>
        <button type="button" onClick={onClose}>취소</button>
        <button type="submit" disabled={!item || !start || !end || end < start}>기간 저장</button>
      </form>
    </section>
  );
}
