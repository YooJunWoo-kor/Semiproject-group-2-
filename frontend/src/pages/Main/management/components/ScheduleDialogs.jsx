import React from 'react';
import ScheduleForm from './ScheduleForm';
import ScheduleDetail from './ScheduleDetail';

export default function ScheduleDialogs({
  selectedSchedule, editingSchedule, formOpen,
  onCloseDetail, onCloseForm, onEdit, onDelete, onSave, rooms
}) {
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
