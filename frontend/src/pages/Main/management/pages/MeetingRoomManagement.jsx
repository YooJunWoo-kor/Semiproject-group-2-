import { useOutletContext } from 'react-router-dom';
import React, { useState } from 'react';

export default function MeetingRoomManagement() {
  // --------------------------------------------------
  // 1. 데이터와 상태
  // --------------------------------------------------

  // 부모가 관리하는 회의실 목록
  const { rooms, setRooms } = useOutletContext();

  // 폼에 입력할 값
  const [form, setForm] = useState(createEmptyForm);

  // 폼 열림 여부
  const [formOpen, setFormOpen] = useState(false);

  // 오류 메시지
  const [error, setError] = useState('');

  // 등록인지 수정인지 구분
  const isEditing = Boolean(form.id);

  // --------------------------------------------------
  // 2. 화면에 보여줄 내용
  // --------------------------------------------------

  return (
    <section className="sub-container">
      <h2>회의실 관리</h2>
      <p>회의실 정보와 운영 상태를 관리합니다.</p>

      <button type="button" onClick={openCreate}>
        + 회의실 등록
      </button>

      {/* 위쪽: 등록·수정 폼 */}
      {formOpen && (
        <form onSubmit={handleSubmit}>
          <h3>
            {isEditing ? '회의실 수정' : '회의실 등록'}
          </h3>

          <p>
            <label>
              회의실 이름 *
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                readOnly={isEditing}
                required
              />
            </label>
          </p>

          {isEditing && (
            <p>
              기존 예약과 연결될 회의실 이름은 변경하지 않습니다.
            </p>
          )}

          <p>
            <label>
              위치
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="예: 본관 2층"
              />
            </label>
          </p>

          <p>
            <label>
              수용 인원 *
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                min="1"
                step="1"
                required
              />
            </label>
          </p>

          <p>
            <label>
              보유 장비
              <input
                type="text"
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                placeholder="예: 모니터, 화이트보드"
              />
            </label>
          </p>

          <p>
            <label>
              <input
                type="checkbox"
                name="available"
                checked={form.available}
                onChange={handleChange}
              />
              운영 중
            </label>
          </p>

          <p>
            체크를 해제하면 사용 중지 상태로 저장됩니다.
          </p>

          {error && <p role="alert">{error}</p>}

          <button type="button" onClick={closeForm}>
            취소
          </button>

          <button type="submit">
            저장
          </button>
        </form>
      )}

      {/* 아래쪽: 회의실 목록 */}
      <h3>회의실 목록 — {rooms.length}개</h3>

      <div className="table-shell schedule-table-shell">
        <table className="schedule-data-table">
          <thead>
            <tr>
              <th>회의실</th>
              <th>위치</th>
              <th>수용 인원</th>
              <th>보유 장비</th>
              <th>운영 상태</th>
              <th>관리</th>
            </tr>
          </thead>

          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td>{room.name}</td>
                <td>{room.location || '-'}</td>
                <td>{room.capacity}명</td>
                <td>{room.equipment || '-'}</td>
                <td>
                  {room.available ? '운영 중' : '사용 중지'}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => openEdit(room)}
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  // --------------------------------------------------
  // 3. 기본값과 버튼 동작 함수
  // --------------------------------------------------

  // 빈 입력 폼 만들기
  function createEmptyForm() {
    return {
      name: '',
      location: '',
      capacity: '',
      equipment: '',
      available: true
    };
  }

  // 등록 폼 열기
  function openCreate() {
    setForm(createEmptyForm());
    setError('');
    setFormOpen(true);
  }

  // 기존 회의실 정보를 폼에 넣기
  function openEdit(room) {
    setForm({ ...room });
    setError('');
    setFormOpen(true);
  }

  // 폼 닫기
  function closeForm() {
    setFormOpen(false);
    setError('');
  }

  // 입력값 변경
  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm(previousForm => ({
      ...previousForm,
      [name]: type === 'checkbox' ? checked : value
    }));

    setError('');
  }

  // 등록 또는 수정
  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const capacity = Number(form.capacity);

    if (!name) {
      setError('회의실 이름을 입력해 주세요.');
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('수용 인원은 1명 이상의 정수로 입력해 주세요.');
      return;
    }

    // 자기 자신을 제외하고 같은 이름이 있는지 검사합니다.
    const duplicated = rooms.some(room => {
      return room.id !== form.id && room.name === name;
    });

    if (duplicated) {
      setError('같은 이름의 회의실이 있습니다.');
      return;
    }

    const roomToSave = {
      ...form,
      name,
      capacity,
      location: form.location.trim(),
      equipment: form.equipment.trim()
    };

    if (isEditing) {
      // 같은 ID의 회의실만 수정합니다.
      setRooms(previousRooms =>
        previousRooms.map(room =>
          room.id === form.id ? roomToSave : room
        )
      );
    } else {
      // 새 회의실을 추가합니다.
      const newRoom = {
        ...roomToSave,
        id: `room-${crypto.randomUUID()}`
      };

      setRooms(previousRooms => [
        ...previousRooms,
        newRoom
      ]);
    }

    closeForm();
  }
}