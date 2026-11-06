import React, { useState } from "react";
import BasicCalendar from "./calendar/BasicCalendar";
import WeeklyCalendar from "./weeklycalendar/WeeklyCalendar";

// 부모 화면에서 전달한 일정 데이터를 받습니다.
function ScheduleBoard({ schedule = [] }) {
    // 0: 월간 달력, 1: 주간 리스트
    const [isCalStyile, setCalStyile] = useState(0);

    return (
        <div className="attendance-card">
            <div>
                <button onClick={() => setCalStyile(0)}>
                    달력
                </button>

                <button onClick={() => setCalStyile(1)}>
                    리스트
                </button>
            </div>

            {/* 전달받은 일정을 각 달력에 넘깁니다. */}
            {isCalStyile === 0 ? (
                <BasicCalendar schedule={schedule} />
            ) : (
                <WeeklyCalendar schedule={schedule} />
            )}
        </div>
    );
}

export default ScheduleBoard;