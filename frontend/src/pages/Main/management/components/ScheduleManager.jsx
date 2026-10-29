import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ScheduleDialogs from './ScheduleDialogs';
import { initialSchedules } from '../data/schedules';
import { initialRooms } from '../data/rooms';
import { normalizeSchedule, addSchedule, updateSchedule, removeSchedule } from '../services/scheduleService';
import { conflicts } from '../utils/scheduleUtils';
import '../ScheduleManagement.css';

export default function ScheduleManager() {
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


  // 공용 메뉴·버튼·팝업은 이 레이아웃에서 한 번만 표시합니다.

  return (
    <div className="schedule-page">
      <div className="schedule-content">
        <button type="button" onClick={openCreate}>
          + 일정 등록
        </button>

        <Outlet
          context={{
            schedules,
            rooms,
            setRooms,
            onSelectSchedule: selectSchedule
          }}
        />

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
