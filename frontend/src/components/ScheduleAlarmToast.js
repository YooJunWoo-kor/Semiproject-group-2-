
// 알림창 열었다가 닫히는 컴포넌트 (재사용 용도)

import React from "react";
import { BellRing, X } from "lucide-react";
import "../css/ScheduleAlarmToast.css";

function ScheduleAlarmToast({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="schedule-alarm-toast" role="status">
      <BellRing size={22} className="schedule-toast-icon" />

      <div className="schedule-toast-content">
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
      </div>

      <button
        type="button"
        className="schedule-toast-close"
        aria-label="알림 닫기"
        onClick={onClose}
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default ScheduleAlarmToast;
