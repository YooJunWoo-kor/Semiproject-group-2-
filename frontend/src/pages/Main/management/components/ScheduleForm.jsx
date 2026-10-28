
import React, { useState } from 'react';
import { useSchedules } from '../ScheduleContext';
import {
  todayISO,
  departments,
  types
} from '../utils/scheduleUtils';

// 회의실은 09:00~20:00, 30분 단위로 예약합니다.
const meetingTimes = Array.from({ length: 23 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

// 새로운 일정의 기본값
function emptySchedule() {
  return {
    title: '',
    department: '개발팀',
    manager: '',
    collaboratingDepartment: '',
    startDate: todayISO(),
    endDate: todayISO(),
    startTime: '',
    endTime: '',
    status: '예정',
    priority: '보통',
    description: '',
    color: '#eaf1ff',
    type: '기타',
    repeat: '없음',
    repeatUntil: '',
    room: '',
    attendees: []
  };
}

// 일정 등록 및 수정 폼
export default function ScheduleForm({
  item,
  defaults = {},
  onClose
}) {
  const schedule = useSchedules();

  // 1. 입력값 관리
  const [form, setForm] = useState(() => ({
    ...emptySchedule(),
    ...defaults,
    ...(item || {})
  }));

  const [error, setError] = useState('');

  // 참석자 입력값
  const [attendeeInput, setAttendeeInput] = useState(() => {
    const people = item?.attendees || defaults.attendees || [];

    return people
      .map(person =>
        typeof person === 'string' ? person : person.name
      )
      .join(', ');
  });

  // 2. 일반 입력값 변경
  function change(event) {
    const { name, value } = event.target;

    setForm(previous => ({
      ...previous,
      [name]: value,

      ...(name === 'room'
        ? { startTime: '', endTime: '' }
        : {}),

      ...(name === 'startTime' &&
        previous.room &&
        previous.endTime &&
        previous.endTime <= value
        ? { endTime: '' }
        : {})
    }));
  }

  // 3. 참석자 목록 변환
  function getAttendees() {
    const names = [
      ...new Set(
        attendeeInput
          .split(',')
          .map(name => name.trim())
          .filter(Boolean)
      )
    ];

    return names.map(name => {
      const old = (form.attendees || []).find(
        person =>
          typeof person !== 'string' &&
          person.name === name
      );

      return {
        name,
        status: old?.status || '미정'
      };
    });
  }

  // 4. 참석 상태 변경
  function changeAttendance(name, status) {
    const attendees = getAttendees().map(person =>
      person.name === name
        ? { ...person, status }
        : person
    );

    setForm(previous => ({
      ...previous,
      attendees
    }));
  }

  // 5. 일정 저장
  function submit(event) {
    event.preventDefault();
    setError('');

    // 필수 입력 검사
    if (!form.title.trim() || !form.manager.trim()) {
      setError('일정명과 담당자는 필수입니다.');
      return;
    }

    // 날짜 검사
    if (
      !form.startDate ||
      !form.endDate ||
      form.endDate < form.startDate
    ) {
      setError('시작일과 종료일을 확인해 주세요.');
      return;
    }

    // 시간 검사
    if (
      form.startTime &&
      form.endTime &&
      form.startDate === form.endDate &&
      form.endTime <= form.startTime
    ) {
      setError('종료 시간이 시작 시간보다 늦어야 합니다.');
      return;
    }

    // 반복 종료일 검사
    if (
      form.repeat !== '없음' &&
      form.repeatUntil &&
      form.repeatUntil < form.startDate
    ) {
      setError('반복 종료일을 확인해 주세요.');
      return;
    }

    // 회의실 예약 검사
    if (form.room) {
      if (!form.startTime || !form.endTime) {
        setError('회의실 시작 시간과 종료 시간을 입력해 주세요.');
        return;
      }

      if (form.startDate !== form.endDate) {
        setError('회의실 예약은 하루 단위로 등록해 주세요.');
        return;
      }

      if (
        !meetingTimes.includes(form.startTime) ||
        !meetingTimes.includes(form.endTime)
      ) {
        setError('회의실 예약은 09:00~20:00 사이에서 30분 단위로 선택해 주세요.');
        return;
      }

      if (form.endTime <= form.startTime) {
        setError('종료 시간은 시작 시간보다 늦어야 합니다.');
        return;
      }
    }

    // 저장할 데이터
    const entry = {
      ...form,
      title: form.title.trim(),
      manager: form.manager.trim(),
      room: form.room || '',
      attendees: getAttendees()
    };

    // 일정 충돌 검사
    const clashes = schedule.conflicts(entry);

    // 회의실 중복 예약 검사
    const roomConflicts = entry.room
      ? schedule.schedules.filter(item => {

        // 수정 중인 자기 자신은 제외
        if (
          item.id != null &&
          entry.id != null &&
          String(item.id) === String(entry.id)
        ) {
          return false;
        }

        // 같은 회의실인지 확인
        if (item.room !== entry.room) {
          return false;
        }

        // 날짜가 겹치는지 확인
        const dateOverlap =
          item.startDate <= entry.endDate &&
          item.endDate >= entry.startDate;

        // 시간이 겹치는지 확인
        const timeOverlap =
          item.startTime < entry.endTime &&
          item.endTime > entry.startTime;

        return dateOverlap && timeOverlap;
      })
      : [];

    // 담당자 및 참석자 충돌
    const personConflicts = clashes.filter(
      value => value.conflictType === 'person'
    );

    // 회의실 중복 예약은 저장 차단
    if (roomConflicts.length > 0) {
      const names = [
        ...new Set(roomConflicts.map(value => value.title))
      ];

      setError(
        `회의실 예약 중복: ${names.join(', ')}. ` +
        '다른 회의실이나 시간을 선택해 주세요.'
      );
      return;
    }

    // 담당자 및 참석자 충돌은 경고
    if (personConflicts.length > 0) {
      const names = [
        ...new Set(personConflicts.map(value => value.title))
      ];

      const confirmed = window.confirm(
        '담당자 또는 참석자의 일정이 중복됩니다.\n' +
        `중복 일정: ${names.join(', ')}\n\n` +
        '계속 저장할까요?'
      );

      if (!confirmed) {
        return;
      }
    }

    // 최종 저장
    schedule.saveSchedule(entry);

  } // ★ submit 함수 종료

  // 화면에 표시할 참석자
  const attendance = getAttendees();

  // 6. 일정 등록 및 수정 화면
  return (
    <section
      className="schedule-dialog"
      role="dialog"
      aria-modal="true"
    >
      <h2>{item ? '일정 수정' : '일정 등록'}</h2>

      <form onSubmit={submit}>

        {/* 일정명 / 유형 / 담당 부서 */}
        <div className="schedule-form-top-row">

          <label>
            일정명 *
            <input
              name="title"
              value={form.title}
              onChange={change}
            />
          </label>

          <label>
            유형
            <select
              name="type"
              value={form.type}
              onChange={change}
            >
              {types.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            담당 부서
            <select
              name="department"
              value={form.department}
              onChange={change}
            >
              {departments.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

        </div>

        {/* 담당자 / 상태 / 우선순위 */}
        <div className="schedule-form-manager-row">

          <label>
            담당자 *
            <input
              name="manager"
              value={form.manager}
              onChange={change}
            />
          </label>

          <label>
            상태
            <select
              name="status"
              value={form.status}
              onChange={change}
            >
              {['예정', '진행 중', '완료', '지연'].map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            우선순위
            <select
              name="priority"
              value={form.priority}
              onChange={change}
            >
              {['낮음', '보통', '높음'].map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

        </div>

        {/* 시작일 / 시작 시간 / 종료일 / 종료 시간 */}
        <div className="schedule-form-dates-row">
          <label>시작일
            <input type="date"
              name="startDate"
              value={form.startDate}
              onChange={change} />
          </label>

          <label>시작 시간
            {form.room ? (
              <select
                name="startTime"
                value={form.startTime}
                onChange={change}
              >
                <option value="">시작 시간 선택</option>
                {meetingTimes.slice(0, -1).map(time => (
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
                onChange={change}
              />
            )}
          </label>

          <label>종료일
            <input type="date"
              name="endDate"
              value={form.endDate}
              onChange={change} />
          </label>


          <label>종료 시간
            {form.room ? (
              <select
                name="endTime"
                value={form.endTime}
                onChange={change}
              >
                <option value="">종료 시간 선택</option>
                {meetingTimes
                  .slice(1)
                  .filter(time => !form.startTime || time > form.startTime)
                  .map(time => (
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
                onChange={change}
              />
            )}
          </label>

        </div>

        {/* 설명과 색상은 한 번만 표시하고, 회의실은 회의 유형일 때만 표시 */}
        <div className="schedule-form-bottom-row">
          <label>설명
            <textarea name="description" value={form.description} onChange={change} />
          </label>
          <label>일정 색상
            <input type="color" name="color"
              value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : '#eaf1ff'}
              onChange={change} />
          </label>

          <label>
            회의실 (선택)
            <select
              name="room"
              value={form.room || ''}
              onChange={change}
            >
              <option value="">회의실 사용 안 함</option>
              <option value="A회의실">A회의실</option>
              <option value="B회의실">B회의실</option>
              <option value="C회의실">C회의실</option>
            </select>
          </label>

        </div>


        <div>
          <p>회의실 예약 가능 시간: 09:00 ~ 20:00 (30분 단위)</p>
          <label>참석자 (쉼표로 구분)
            <input value={attendeeInput} onChange={event => setAttendeeInput(event.target.value)} />
          </label>
          {attendance.map(person => (
            <p key={person.name}>
              {person.name}:{' '}
              <select value={person.status} onChange={event => changeAttendance(person.name, event.target.value)}>
                {['미정', '참석', '불참'].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </p>
          ))}
        </div>


        {/* 오류 메시지 */}
        {error && (
          <p role="alert">{error}</p>
        )}

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