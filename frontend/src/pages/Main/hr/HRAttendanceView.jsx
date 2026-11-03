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

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const schedule = attendanceData.map((attendance) => ({
        id: attendance.attendanceId,
        title: `${attendance.employeeName} ${attendance.status}`,
        start: attendance.attendanceDate,
        end: attendance.attendanceDate,
        typeId: attendanceType[attendance.status] ?? 9,
        description:
            `${attendance.departmentName} / ` +
            `출근 ${attendance.clockIn || '-'} / ` +
            `퇴근 ${attendance.clockOut || '-'} / ` +
            `메모 ${attendance.memo || '-'}`
    }));

    const hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    const timeString = hours + ':' + minutes + ':' + seconds;

    return (
        <div style={{
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
                    <BasicCalendar schedule={schedule} />
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
