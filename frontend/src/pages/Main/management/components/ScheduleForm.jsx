import React, { useState } from 'react';
import { departments, types, todayISO } from '../utils/scheduleUtils';
import { validateSchedule } from '../utils/scheduleValidation';

// 선택 목록
const statuses = ['예정', '진행 중', '완료', '지연'];
const priorities = ['낮음', '보통', '높음'];

// 회의실 예약 시간: 09:00, 09:30, ... 20:00
const meetingTimes = Array.from({ length: 23 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minute = String(totalMinutes % 60).padStart(2, '0');

  return `${hour}:${minute}`;
});

// 새 일정의 기본값
function createInitialForm() {
  const today = todayISO();

  return {
    title: '',
    type: '기타',
    department: '개발팀',
    manager: '',
    status: '예정',
    priority: '보통',
    startDate: today,
    endDate: today,
    startTime: '',
    endTime: '',
    room: '',
    description: '',
    color: '#eaf1ff',
    attendees: []
  };
}

// item: 수정할 일정
// onSave: 부모에게 저장을 요청하는 함수
// onClose: 폼을 닫는 함수
export default function ScheduleForm({ item, onSave, onClose, rooms }) {
  const [form, setForm] = useState(() => ({
    ...createInitialForm(),
    ...item
  }));

  const [error, setError] = useState('');

  const isEditing = Boolean(item);
  const isRoomReservation = Boolean(form.room);

  // 시작 시간은 19:30까지 선택할 수 있습니다.
  const startTimeOptions = meetingTimes.slice(0, -1);

  // 종료 시간은 09:30부터, 선택한 시작 시간보다 늦게 선택합니다.
  const endTimeOptions = meetingTimes.slice(1).filter(time => {
    return !form.startTime || time > form.startTime;
  });

  // 입력값 변경
  function handleChange(event) {
    const { name, value } = event.target;

    setForm(previousForm => {
      // 회의실 사용 여부가 바뀌면 시간을 다시 선택합니다.
      if (name === 'room') {
        const wasRoomReservation = Boolean(previousForm.room);
        const willBeRoomReservation = Boolean(value);

        if (wasRoomReservation !== willBeRoomReservation) {
          return {
            ...previousForm,
            room: value,
            startTime: '',
            endTime: ''
          };
        }
      }

      // 회의실 시작 시간을 바꾸면 종료 시간도 다시 선택합니다.
      if (name === 'startTime' && previousForm.room) {
        return {
          ...previousForm,
          startTime: value,
          endTime: ''
        };
      }

      // 나머지 항목은 해당 입력값만 변경합니다.
      return {
        ...previousForm,
        [name]: value
      };
    });

    setError('');
  }

  // 저장
  function handleSubmit(event) {
    event.preventDefault();

    // 필수 항목과 날짜·시간 검사
    const validationError = validateSchedule(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    // 일정명과 담당자의 앞뒤 공백 제거
    const scheduleToSave = {
      ...form,
      title: form.title.trim(),
      manager: form.manager.trim()
    };

    // 부모에서 저장하고, 중복 예약 등의 오류를 반환받습니다.
    const saveError = onSave(scheduleToSave);

    setError(saveError || '');
  }

  return (
    <section
      className="schedule-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? '일정 수정' : '일정 등록'}
    >
      <h2>{isEditing ? '일정 수정' : '일정 등록'}</h2>

      <form onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div className="schedule-form-top-row">
          <label>
            일정명 *
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            유형
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            담당 부서
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
            >
              {departments.map(department => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 담당자와 진행 상태 */}
        <div className="schedule-form-manager-row">
          <label>
            담당자 *
            <input
              type="text"
              name="manager"
              value={form.manager}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            상태
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            우선순위
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 일정 기간 */}
        <div className="schedule-form-dates-row">
          <label>
            시작일 *
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            시작 시간
            {isRoomReservation ? (
              <select
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              >
                <option value="">시간 선택</option>

                {startTimeOptions.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                step={60}
              />
            )}
          </label>

          <label>
            종료일 *
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            종료 시간
            {isRoomReservation ? (
              <select
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              >
                <option value="">시간 선택</option>

                {endTimeOptions.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                step={60}
              />
            )}
          </label>
        </div>

        {/* 회의실 예약 */}
        <div>
          <label>
            회의실 (선택)
            <select
              name="room"
              value={form.room}
              onChange={handleChange}
            >
              <option value="">회의실 사용 안 함</option>

              {rooms.map(room => (
                <option
                  key={room.id}
                  value={room.name}
                  disabled={!room.available}
                >
                  {room.name}
                  {!room.available ? ' (사용 중지)' : ''}
                </option>
              ))}
            </select>
          </label>

          {isRoomReservation && (
            <p>
              회의실은 같은 날짜의 09:00~20:00 사이에서
              30분 단위로 예약할 수 있습니다.
            </p>
          )}
        </div>

        {/* 추가 정보 */}
        <div className="schedule-form-bottom-row">
          <label>
            설명
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <label>
            일정 색상
            <input
              type="color"
              name="color"
              value={form.color}
              onChange={handleChange}
            />
          </label>
        </div>

        {/* 오류 메시지 */}
        {error && <p role="alert">{error}</p>}

        {/* 버튼 */}
        <button type="button" onClick={onClose}>
          취소
        </button>

        <button type="submit">
          저장
        </button>
      </form>
    </section>
  );
}