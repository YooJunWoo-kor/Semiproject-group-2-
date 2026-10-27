import React from 'react';
import { useSchedules } from '../ScheduleContext';

// item: 상세보기할 일정 한 개
export default function ScheduleDetail({ item, onClose }) {

  const schedule = useSchedules();

  // 상세보기할 일정이 없으면 화면을 표시하지 않음
  if (!item) {
    return null;
  }

  // 1. 일정 삭제
  function remove() {
    if (window.confirm('일정을 삭제할까요?')) {
      schedule.deleteSchedule(item.id);
      onClose();
    }
  }

  // 2. 참석자 목록을 문자열로 변환
  const attendees = (item.attendees || []).map(person => {
    return typeof person === 'string'
      ? person
      : `${person.name}(${person.status})`;
  }).join(', ') || '없음';

  // 3. 화면 출력
  return (
    <section
      className="schedule-dialog"
      role="dialog"
      aria-modal="true"
    >
      <h2>{item.title}</h2>

      {/* 일정 상세정보 테이블 */}
      <table className="schedule-detail-table">
        <tbody>

          <tr>
            <th>유형</th>
            <td>{item.type || '-'}</td>
          </tr>

          <tr>
            <th>상태</th>
            <td>{item.status || '-'}</td>
          </tr>

          <tr>
            <th>우선순위</th>
            <td>{item.priority || '-'}</td>
          </tr>

          <tr>
            <th>담당 부서</th>
            <td>{item.department || '-'}</td>
          </tr>

          <tr>
            <th>담당자</th>
            <td>{item.manager || '-'}</td>
          </tr>

          <tr>
            <th>회의실</th>
            <td>{item.room || '사용 안 함'}</td>
          </tr>

          <tr>
            <th>시작일</th>
            <td>
              {item.startDate || '-'}
              {item.startTime ? ` ${item.startTime}` : ''}
            </td>
          </tr>

          <tr>
            <th>종료일</th>
            <td>
              {item.endDate || '-'}
              {item.endTime ? ` ${item.endTime}` : ''}
            </td>
          </tr>

          {/* 회의 일정인 경우에만 표시 */}
          {item.type === '회의' && (
            <>
              <tr>
                <th>회의실</th>
                <td>{item.room || '예약된 회의실 없음'}</td>
              </tr>

              {item.type === '회의' && (
                <tr>
                  <th>참석자</th>
                  <td>{attendees}</td>
                </tr>
              )}
            </>
          )}

          <tr>
            <th>설명</th>
            <td>{item.description || '없음'}</td>
          </tr>

        </tbody>
      </table>

      {/* 기존 버튼 기능 유지 */}
      <div className="schedule-detail-actions">

        <button type="button" onClick={onClose}>
          닫기
        </button>

        <button
          type="button"
          onClick={() => schedule.openEdit(item.id)}
        >
          수정
        </button>

        <button type="button" onClick={remove}>
          삭제
        </button>

      </div>

    </section>
  );
}