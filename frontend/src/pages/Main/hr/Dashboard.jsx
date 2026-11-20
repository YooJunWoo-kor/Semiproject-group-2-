import StatisticsCard from '../../../components/StatisticsCard';
import { useEffect, useState } from 'react';
import {
    getHrAttendance,
    getHrDepartments,
    getHrEmployees
} from '../../../components/HrData';
import DepartmentAttendanceComp from './DepartmentAttendanceComp';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/authStorage';

import { getLoginUser } from '../../../utils/authStorage';

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
    const [organizationError, setOrganizationError] = useState('');

    const [departments, setDepartmentsCount] = useState(0);
    const [employeesCount, setEmployeesCount] = useState(0);

    // 부서 직원 표에서 사용할 자료
    const [leaveCount, setLeaveCount] = useState(0);

    const today = formatDate(new Date());

    const todayAttendance = attendanceData.filter(
        (attendance) => attendance.attendanceDate === today
    );
    const todayWorkingCount = todayAttendance.filter(
        (attendance) =>
            attendance.clockIn ||
            attendance.status === '정상' ||
            attendance.status === '지각'
    ).length;

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

    // 상단 통계 카드용 근태 및 조직 요약 조회
    useEffect(() => {
        let ignore = false;

        async function loadSummaryData() {
            setAttendanceLoading(true);
            setAttendanceError('');

            try {
                // 한 요청 오류가 다른 영역의 성공한 데이터를 지우지 않도록 각각 처리합니다.
                const [attendanceResult, departmentResult, employeeResult] =
                    await Promise.allSettled([
                        getHrAttendance(),
                        getHrDepartments(),
                        getHrEmployees()
                    ]);

                if (!ignore) {
                    const validData = (result) =>
                        result.status === 'fulfilled' &&
                        result.value.data.success &&
                        Array.isArray(result.value.data.data);

                    if (validData(attendanceResult)) {
                        setAttendanceData(attendanceResult.value.data.data);
                        setAttendanceError('');
                    } else {
                        console.error('근태 요약 조회 실패:', attendanceResult);
                        setAttendanceData([]);
                        setAttendanceError('근태 정보를 불러오지 못했습니다.');
                    }

                    const organizationErrors = [];
                    if (validData(departmentResult)) {
                        setDepartmentsCount(departmentResult.value.data.data.length);
                    } else {
                        console.error('부서 요약 조회 실패:', departmentResult);
                        setDepartmentsCount(0);
                        organizationErrors.push('부서 정보');
                    }
                    if (validData(employeeResult)) {
                        setEmployeesCount(employeeResult.value.data.data.length);
                    } else {
                        console.error('직원 요약 조회 실패:', employeeResult);
                        setEmployeesCount(0);
                        organizationErrors.push('직원 정보');
                    }
                    setOrganizationError(
                        organizationErrors.length
                            ? organizationErrors.join('·') + '를 불러오지 못했습니다.'
                            : ''
                    );
                }
            } catch (error) {
                console.error('대시보드 요약 조회 오류:', error);
                if (!ignore) {
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
            {organizationError && (
                <p className="hr-dashboard-feedback error" role="alert">
                    {organizationError}
                </p>
            )}

            <section className="stats-section">
                <StatisticsCard title="전체직원" count={String(employeesCount)} stiyle={1} />
                <StatisticsCard title="오늘출근" count={String(todayWorkingCount)} stiyle={1} />
                <StatisticsCard title="사용한 연차" count={String(leaveCount)} stiyle={3} />
                <StatisticsCard title="운용부서" count={String(departments)} stiyle={0} />
            </section>

            {/* 분리된 부서 출결현황 컴포넌트 */}
            <DepartmentAttendanceComp today={today} />
        </div>
    );
}