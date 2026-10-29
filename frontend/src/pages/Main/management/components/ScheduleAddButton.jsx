import React from 'react';

export default function ScheduleAddButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}>
      + 일정 등록
    </button>
  );
}
