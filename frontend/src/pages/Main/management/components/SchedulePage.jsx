import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ScheduleAddButton from './ScheduleAddButton';
import ScheduleDialogs from './ScheduleDialogs';
import { initialSchedules } from '../data/schedules';
import { normalizeSchedule, addSchedule, updateSchedule, removeSchedule } from '../services/scheduleService';
import { conflicts } from '../utils/scheduleUtils';
import '../ScheduleManagement.css';

const initialRooms = [
  {
    id: 'room-a',
    name: 'A회의실',
    location: '본관 2층',
    capacity: 6,
    equipment: '모니터, 화이트보드',
    available: true
  },
  {
    id: 'room-b',
    name: 'B회의실',
    location: '본관 3층',
    capacity: 10,
    equipment: '프로젝터',
    available: true
  },
  {
    id: 'room-c',
    name: 'C회의실',
    location: '본관 3층',
    capacity: 4,
    equipment: '모니터',
    available: true
  }
];


export default function SchedulePage() {
  // --------------------------------------------------
  // 1. 화면에서 사용할 데이터와 상태
  // --------------------------------------------------

  // 전체 일정 목록
  const [schedules, setSchedules] = useState(() =>
    initialSchedules.map(normalizeSchedule)
  );

  // 상세보기에서 선택한 일정
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 등록·수정 폼 열림 여부
  const [formOpen, setFormOpen] = useState(false);

  // 수정 중인 일정
  const [editingSchedule, setEditingSchedule] = useState(null);

  // 컴포넌트 안: 회의실 상태 
  const [rooms, setRooms] = useState(initialRooms);

  // --------------------------------------------------
  // 2. 화면에 보여줄 내용
  // --------------------------------------------------

  return (
    <div className="schedule-page">
      <div className="schedule-content">
        {/* 상단: 일정 등록 버튼 */}
        <div className="schedule-add-area">
          <ScheduleAddButton onClick={openCreate} />
        </div>

        {/* 본문: 선택한 메뉴의 화면 */}
        <Outlet
          context={{
            schedules,
            onSelectSchedule: selectSchedule,
            rooms,
            setRooms
          }}
        />

        {/* 팝업: 등록·수정·상세보기 */}
        <ScheduleDialogs
          selectedSchedule={selectedSchedule}
          editingSchedule={editingSchedule}
          formOpen={formOpen}
          onCloseDetail={closeDetail}
          onCloseForm={closeForm}
          onEdit={openEdit}
          onDelete={deleteSchedule}
          onSave={saveSchedule}
          rooms={rooms}
        />
      </div>
    </div>
  );

  // --------------------------------------------------
  // 3. 버튼을 눌렀을 때 실행할 함수
  // --------------------------------------------------

  // 일정 선택 → 상세보기 열기
  function selectSchedule(schedule) {
    setSelectedSchedule(schedule);
  }

  // 상세보기 닫기
  function closeDetail() {
    setSelectedSchedule(null);
  }

  // 등록 버튼 → 새 일정 입력 폼 열기
  function openCreate() {
    setSelectedSchedule(null);
    setEditingSchedule(null);
    setFormOpen(true);
  }

  // 수정 버튼 → 선택한 일정의 입력 폼 열기
  function openEdit() {
    setEditingSchedule(selectedSchedule);
    setSelectedSchedule(null);
    setFormOpen(true);
  }

  // 취소 버튼 → 입력 폼 닫기
  function closeForm() {
    setFormOpen(false);
    setEditingSchedule(null);
  }

  // 저장 버튼 → 일정 등록 또는 수정
  function saveSchedule(entry) {
    const hasRoomConflict = conflicts(entry, schedules).some(
      item => item.conflictType === 'room'
    );

    if (hasRoomConflict) {
      return '같은 시간에 이미 예약된 회의실입니다.';
    }

    setSchedules(previousSchedules => {
      if (editingSchedule) {
        return updateSchedule(previousSchedules, entry);
      }

      return addSchedule(previousSchedules, entry);
    });

    closeForm();

    return '';
  }

  // 삭제 버튼 → 일정 삭제 후 상세보기 닫기
  function deleteSchedule(id) {
    setSchedules(previousSchedules =>
      removeSchedule(previousSchedules, id)
    );

    closeDetail();
  }
}