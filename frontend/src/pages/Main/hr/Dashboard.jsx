import StatisticsCard from '../../../components/StatisticsCard';
import { useEffect, useState } from 'react';
import {
    getHrAttendance,
    getHrOrganization
} from '../../../components/HrData';
import DepartmentAttendanceComp from './DepartmentAttendanceComp';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/authStorage';

import { getLoginUser } from '../../../utils/authStorage';

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export default function Dashboard() {
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [attendanceError, setAttendanceError] = useState('');

    const [departments, setDepartmentsCount] = useState(0);
    const [employeesCount, setEmployeesCount] = useState(0);

    // 부서 직원 표에서 사용할 자료
    const [leaveCount, setLeaveCount] = useState(0);

 // 1. 오늘 날짜
    const today = formatDate(new Date());

   // 2. 전체 근태 데이터 중 오늘 날짜만 추출
   const todayAttendance = attendanceData.filter(
    (attendance) => attendance.attendanceDate === today
);   


//     // const todayAbnormalCount = new Set(
//     // todayAttendance
//     //     .filter((attendance) => {
//     //         const memo = String(attendance.memo || "").trim();
//     //         const hasMemo = memo !== "" && memo !== "-";

//             // 휴가는 금일휴가자 카드에서 별도로 계산
//             if (attendance.status === "휴가") {
//                 return false;
//             }

//             // 이상근태 상태이거나 메모가 있으면 포함
//             return (
//                 abnormalStatuses.includes(attendance.status) ||
//                 hasMemo
//             );
//         })
//         .map((attendance) => attendance.employeeId)
//         .filter((employeeId) => employeeId != null)
// ).size;


    // const todayWorkingCount = todayAttendance.filter(
    //     (attendance) =>
    //         attendance.clockIn ||
    //         attendance.status === '정상' ||
    //         attendance.status === '지각'
    // ).length;

     // 3. 이상근태로 판단할 상태 목록
     const abnormalStatuses = [
        '지각',
        '조퇴',
        '야근',
        '지각·조퇴',
        '지각·야근',
        '출장'
    ];

      // 4. 오늘 출근자 수 (직원 중복 제거)
      const todayWorkingCount = new Set(
        todayAttendance
            .filter(
                (attendance) =>
                    attendance.clockIn ||
                    attendance.status === '정상' ||
                    attendance.status === '지각'
            )
            .map((attendance) => attendance.employeeId)
            .filter((employeeId) => employeeId != null)
    ).size;


    // 5. 오늘 이상근태자 수 (메모 포함, 직원 중복 제거)
    const todayAbnormalCount = new Set(
        todayAttendance
            .filter((attendance) => {
                const memo = String(attendance.memo || '').trim();
                const hasMemo = memo !== '' && memo !== '-';

                // 휴가는 별도 카드에서 집계
                if (attendance.status === '휴가') {
                    return false;
                }

                // 이상근태 상태 또는 메모가 있는 경우
                return (
                    abnormalStatuses.includes(attendance.status) ||
                    hasMemo
                );
            })
            .map((attendance) => attendance.employeeId)
            .filter((employeeId) => employeeId != null)
    ).size;


     // 6. 금일 휴가자 수 (직원 중복 제거)
     const todayLeaveCount = new Set(
        todayAttendance
            .filter(
                (attendance) => attendance.status === '휴가'
            )
            .map((attendance) => attendance.employeeId)
            .filter((employeeId) => employeeId != null)
    ).size;





    useEffect(() => {
        loadLeave();
    }, []);


    const loadLeave = async () => {
        try{
            const employeeId = Number(getLoginUser()?.employeeKey);

            const response = await axios.get(`${API_BASE_URL}/AD/attendance/leave`,
                {
                    params: { employeeId }
                }

            );

            const usedLeaveDays  = response.data.data.usedLeaveDays;

            setLeaveCount(Number(usedLeaveDays));
        }
        catch(err){
            console.error("연차 조회 실패", err);
        }
    }

    // 7. 상단 통계 카드용 근태 및 조직 요약 조회
    useEffect(() => {
        let ignore = false;

        async function loadSummaryData() {
            setAttendanceLoading(true);
            setAttendanceError('');

            try {
                const [attendanceRes, [deptRes, empRes]] = await Promise.all([
                    getHrAttendance(),
                    getHrOrganization()
                ]);

                if (!ignore) {
                    if (
                        attendanceRes.data.success &&
                        Array.isArray(attendanceRes.data.data)
                    ) {
                        setAttendanceData(attendanceRes.data.data);
                    } else {
                        setAttendanceData([]);
                        setAttendanceError('근태 정보를 불러오지 못했습니다.');
                    }

                    if (deptRes.data.success && Array.isArray(deptRes.data.data)) {
                        setDepartmentsCount(deptRes.data.data.length);
                    }
                    if (empRes.data.success && Array.isArray(empRes.data.data)) {
                        setEmployeesCount(empRes.data.data.length);
                    }
                }
            } catch (error) {
                console.error('대시보드 요약 조회 오류:', error);
                if (!ignore) {
                    setAttendanceData([]);
                    setAttendanceError('근태 정보를 불러오지 못했습니다.');
                }
            } finally {
                if (!ignore) {
                    setAttendanceLoading(false);
                }
            }
        }

        loadSummaryData();

        return () => {
            ignore = true;
        };
    }, []);



    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">인사관리 대시보드</span>
            </header>

            {attendanceLoading && (
                <p className="hr-dashboard-feedback" role="status">
                    근태 정보를 불러오는 중입니다.
                </p>
            )}
            {attendanceError && (
                <p className="hr-dashboard-feedback error" role="alert">
                    {attendanceError}
                </p>
            )}

            <section className="stats-section">
                <StatisticsCard title="운용부서" count={String(departments)} stiyle={0} />
                <StatisticsCard title="전체직원" count={String(employeesCount)} stiyle={1} />
                <StatisticsCard title="오늘출근" count={String(todayWorkingCount)} stiyle={1} />
                <StatisticsCard title="이상근태자" count={String(todayAbnormalCount)} stiyle={1} />
                <StatisticsCard title="금일휴가자" count={String(todayLeaveCount)} stiyle={1} />
                
               
            </section>

            {/* 분리된 부서 출결현황 컴포넌트 */}
            <DepartmentAttendanceComp today={today} />
        </div>
    );
}