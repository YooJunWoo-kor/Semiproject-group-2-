import { useOutletContext } from 'react-router-dom';
// 선택한 날짜의 회의실 예약 현황을 보여줍니다.
import React, { useState } from 'react';
import { todayISO } from '../utils/scheduleUtils';

const rooms = ['A회의실', 'B회의실', 'C회의실'];

const slots = Array.from({ length: 22 }, (_, index) => {
  const start = 9 * 60 + index * 30;
  const format = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { start, end: start + 30, label: `${format(start)} ~ ${format(start + 30)}` };
});

export default function ScheduleRoomTimetable() {
  const { schedules: scheduleList } = useOutletContext();

  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  // 선택한 날짜의 회의실 예약 조회
  const reservations = scheduleList.filter(item =>
    rooms.includes(String(item.room || "").trim()) &&
    item.startDate && item.endDate &&
    item.startDate.slice(0, 10) <= selectedDate &&
    selectedDate <= item.endDate.slice(0, 10) &&
    item.startTime &&
    item.endTime
  );

  // 특정 회의실과 시간에 해당하는 예약 찾기
  function getReservations(room, slot) {
    const slotStart = slot.start;
    const slotEnd = slot.end;

    return reservations.filter(item => {
      if (String(item.room).trim() !== room) return false;

      const [startH, startM] = item.startTime.split(':').map(Number);
      const [endH, endM] = item.endTime.split(':').map(Number);

      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      return start < slotEnd && end > slotStart;
    });
  }

  return (
    <section className="schedule-room-timetable">
      <h2>회의실 시간표</h2>
      <p>회의실별 예약 현황을 확인할 수 있습니다.</p>

      <label>
        조회 날짜{' '}
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </label>

      <div className="table-shell schedule-table-shell">
      <table className="schedule-data-table">
        <thead>
          <tr>
            <th>시간</th>
            {rooms.map(room => (
              <th key={room}>{room}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {slots.map(slot => (
            <tr key={slot.start}>
              <th>
                {slot.label}
              </th>

              {rooms.map(room => {
                const items = getReservations(room, slot);

                return (
                  <td key={room}>
                    {items.length === 0 ? (
                      <span>예약 가능</span>
                    ) : (
                      <span className="status-badge status-danger">
                        예약 불가
                      </span>
                    )}
                  </td>
                );

              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <p>
        ※ 회의실 예약은 일정 등록 화면에서만 가능합니다.
      </p>
    </section>
  );
}