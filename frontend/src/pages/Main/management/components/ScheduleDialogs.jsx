import React from 'react';
import ScheduleForm from './ScheduleForm';
import ScheduleDetail from './ScheduleDetail';

export default function ScheduleDialogs(props) {
  const selectedSchedule = props.selectedSchedule;
  const editingSchedule = props.editingSchedule;
  const formOpen = props.formOpen;
  const rooms = props.rooms;

  const onCloseDetail = props.onCloseDetail;
  const onCloseForm = props.onCloseForm;
  const onEdit = props.onEdit;
  const onDelete = props.onDelete;
  const onSave = props.onSave;

//selectedSchedule:상세보기에서 보여줄 선택한 데이터, editingSchedule:수정일정or새일정, formOpen
//formOpen:등록or수정폼을 열고 닫는 값(참or거짓), onCloseDetail:상세보기 닫기 함수
//onEdit:일정 수정 시작 함수, onDelete:일정 삭제 함수, onSave:입력한 일정 저장 함수
//rooms: 회의실 목록 배열


  if (!selectedSchedule && !formOpen) return null;

  return (
    <div className="schedule-dialog-layer">
      {formOpen ? (
        <ScheduleForm
          key={editingSchedule?.id ?? 'new'}
          item={editingSchedule}
          onSave={onSave}
          onClose={onCloseForm}
          rooms={rooms}
        />
      ) : (
        <ScheduleDetail
          selectedSchedule={selectedSchedule}
          onClose={onCloseDetail}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
