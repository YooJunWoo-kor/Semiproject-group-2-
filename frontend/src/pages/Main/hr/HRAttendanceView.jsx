import { useEffect, useState } from 'react';
import { getLoginUser } from '../../../utils/authStorage';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import '../../../components/ADComp.css';

const attendanceType = {
    '정상': 0,
    '지각': 1,
    '휴직': 2,
    '휴가': 4,
    '출장': 5
};

export default function HRAttendanceView(props) {
    const user = getLoginUser();
    const [time, setTime] = useState(new Date());
    const [calendarStyle, setCalendarStyle] = useState(0);
    const attendanceData = props.attendanceData || [];
    const isLoading = props.isLoading || false;
    const error = props.error || '';

    // 우측 근태 카드의 현재 시각을 1초마다 갱신합니다.
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    // API 근태 응답을 달력과 주간 목록이 사용하는 일정 형식으로 변환합니다.
    const schedule = attendanceData.map((attendance) => ({
        id: attendance.attendanceId,
        title: `${attendance.employeeName} ${attendance.status}`,
        start: attendance.attendanceDate,
        end: attendance.attendanceDate,
        status: attendance.status,
        typeId: attendanceType[attendance.status] ?? 9,
        description:
            `${attendance.departmentName} / ` +
            `출근 ${attendance.clockIn || '-'} / ` +
            `퇴근 ${attendance.clockOut || '-'} / ` +
            `메모 ${attendance.memo || '-'}`
    }));
    const filteredCalendarSchedule = schedule.filter(
        (attendance) => attendance.status !== '정상'
    );
    const calendarScheduleByDate = {};

    filteredCalendarSchedule.forEach((attendance) => {
        if (!calendarScheduleByDate[attendance.start]) {
            calendarScheduleByDate[attendance.start] = [];
        }

        calendarScheduleByDate[attendance.start].push(attendance);
    });

    // 월간 달력은 날짜별 3건까지만 표시하고 나머지는 인원수로 묶습니다.
    const calendarSchedule = Object.keys(calendarScheduleByDate).flatMap((date) => {
        const daySchedule = calendarScheduleByDate[date];
        const visibleSchedule = daySchedule.slice(0, 3);
        const hiddenCount = daySchedule.length - visibleSchedule.length;

        if (hiddenCount === 0) {
            return visibleSchedule;
        }

        return [
            ...visibleSchedule,
            {
                id: `more-${date}`,
                title: `외 ${hiddenCount}명`,
                start: date,
                end: date,
                typeId: 9,
                description: `${hiddenCount}명의 근태자료가 더 있습니다.`
            }
        ];
    });

    const hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    const timeString = hours + ':' + minutes + ':' + seconds;

    return (
        <div className="hr-attendance-view" style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '20px',
            boxSizing: 'border-box'
        }}>
            <div className="attendance-card">
                <div>
                    <button type="button" onClick={() => setCalendarStyle(0)}>
                        달력
                    </button>
                    <button type="button" onClick={() => setCalendarStyle(1)}>
                        리스트
                    </button>
                </div>

                {isLoading ? (
                    <p role="status">근태자료를 불러오는 중입니다.</p>
                ) : error ? (
                    <p role="alert">{error}</p>
                ) : schedule.length === 0 ? (
                    <p>표시할 근태자료가 없습니다.</p>
                ) : calendarStyle === 0 ? (
                    <BasicCalendar schedule={calendarSchedule} />
                ) : (
                    <WeeklyCalendar schedule={schedule} />
                )}
            </div>

            <div className="attendance-card">
                <div className="attendance-card-header">
                    <span className="attendance-badge">근태 관리</span>
                </div>

                <div className="attendance-info-row">
                    <div className="attendance-user-info">
                        <span className="user-greeting">반갑습니다, </span>
                        <strong className="user-name">{user?.name}</strong>님
                    </div>

                    <div className="attendance-clock-box">
                        <span className="clock-label">현재 시각</span>
                        <span className="clock-time">{timeString}</span>
                    </div>
                </div>

                <div className="attendance-action-group">
                    <button type="button" className="btn-attendance check-in">
                        출근하기
                    </button>
                </div>
            </div>
        </div>
    );
}
