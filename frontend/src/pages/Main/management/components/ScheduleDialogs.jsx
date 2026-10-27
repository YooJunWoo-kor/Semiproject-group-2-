import React from 'react';
import { useSchedules } from '../ScheduleContext';
import ScheduleForm from './ScheduleForm';
import ScheduleDetail from './ScheduleDetail';
import ScheduleAdjustment from './ScheduleAdjustment';

export default function ScheduleDialogs() {
  const schedule = useSchedules();

  // 팝업이 없으면 회색 배경도 표시하지 않습니다.
  const isOpen = schedule.selected || schedule.formOpen || schedule.adjustmentOpen;
  if (!isOpen) return null;

  return (
    <div className="schedule-dialog-layer">
      {schedule.selected && (
        <ScheduleDetail
          item={schedule.selected}
          onClose={() => schedule.setSelectedId(null)}
        />
      )}
      {schedule.formOpen && (
        <ScheduleForm
          key={schedule.editing?.id || 'new'}
          item={schedule.editing}
          defaults={schedule.draft}
          onClose={() => schedule.setFormOpen(false)}
        />
      )}
      {schedule.adjustmentOpen && (
        <ScheduleAdjustment onClose={() => schedule.setAdjustmentOpen(false)} />
      )}
    </div>
  );
}
