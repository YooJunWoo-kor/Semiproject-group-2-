import StatisticsCard from '../../../components/StatisticsCard';
import { useEffect, useState } from 'react';
import {
    getHrAttendance,
    getHrDepartmentAttendance,
    getHrOrganization
} from '../../../components/HrData';

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export default function Dashboard() {
    // HR 대시보드는 조직 현황과 오늘의 근태 요약을 함께 보여줍니다.
    // 조직 정보와 근태 정보를 각각 조회해 HR 요약 화면에 전달합니다.
    // 달력·리스트에서 사용할 전체 근태자료
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [attendanceError, setAttendanceError] = useState('');

    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [organizationLoading, setOrganizationLoading] = useState(true);
    const [organizationError, setOrganizationError] = useState('');

    // 부서 직원 표에서 사용할 자료
    const [departmentAttendance, setDepartmentAttendance] = useState([]);
    const [departmentLoading, setDepartmentLoading] = useState(false);
    const [departmentError, setDepartmentError] = useState('');

    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

    const today = formatDate(new Date());

    const selectedDepartment = departments.find(
        (department) => department.departmentId === selectedDepartmentId
    );

    const todayAttendance = attendanceData.filter(
        (attendance) => attendance.attendanceDate === today
    );
    const todayWorkingCount = todayAttendance.filter(
        (attendance) => attendance.clockIn || attendance.status === '정상' || attendance.status === '지각'
    ).length;
    const todayLeaveCount = todayAttendance.filter(
        (attendance) => attendance.status === '휴가'
    ).length;

    useEffect(() => {
        let ignore = false;

        // 부서·직원 데이터를 먼저 조회해 조직 통계와 부서 선택에 사용합니다.
        async function loadOrganization() {
            setOrganizationLoading(true);
            setOrganizationError('');

            try {
                const [departmentResponse, employeeResponse] =
                    await getHrOrganization();

                if (
                    !departmentResponse.data.success ||
                    !Array.isArray(departmentResponse.data.data) ||
                    !employeeResponse.data.success ||
                    !Array.isArray(employeeResponse.data.data)
                ) {
                    throw new Error('조직 자료 형식이 올바르지 않습니다.');
                }

                if (!ignore) {
                    setDepartments(departmentResponse.data.data);
                    setEmployees(employeeResponse.data.data);
                    setSelectedDepartmentId((currentId) => {
                        if (
                            departmentResponse.data.data.some(
                                (department) => department.departmentId === currentId
                            )
                        ) {
                            return currentId;
                        }

                        return departmentResponse.data.data[0]?.departmentId || null;
                    });
                }
            } catch (error) {
                console.error('조직 자료 조회 오류:', error);

                if (!ignore) {
                    setDepartments([]);
                    setEmployees([]);
                    setSelectedDepartmentId(null);
                    setOrganizationError('부서 및 직원 정보를 불러오지 못했습니다.');
                }
            } finally {
                if (!ignore) {
                    setOrganizationLoading(false);
                }
            }
        }

        loadOrganization();

        return () => {
            ignore = true;
        };
    }, []);

    // 기존 전체 근태자료를 가져옵니다.
    // 이 자료는 달력과 리스트에서 사용합니다.
    useEffect(() => {
        let ignore = false;

        // 전체 근태 데이터를 조회해 오늘의 출근·휴가 현황을 계산합니다.
        async function loadAttendance() {
            setAttendanceLoading(true);
            setAttendanceError('');

            try {
                const response = await getHrAttendance();

                if (!ignore) {
                    if (
                        response.data.success &&
                        Array.isArray(response.data.data)
                    ) {
                        setAttendanceData(response.data.data);
                    } else {
                        setAttendanceData([]);
                        setAttendanceError(
                            '근태 정보를 불러오지 못했습니다.'
                        );
                    }
                }
            } catch (error) {
                console.error('근태정보 조회 오류:', error);

                if (!ignore) {
                    setAttendanceData([]);
                    setAttendanceError(
                        '근태 정보를 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!ignore) {
                    setAttendanceLoading(false);
                }
            }
        }

        loadAttendance();

        return () => {
            ignore = true;
        };
    }, []);

    // 선택한 날짜와 부서의 직원 전체를 가져옵니다.
    // 오늘 근태 기록이 없는 직원은 백엔드에서 '미출근'으로 전달합니다.
    useEffect(() => {
        let ignore = false;

        if (!selectedDepartmentId) {
            setDepartmentAttendance([]);
            setDepartmentLoading(false);
            return undefined;
        }

        // 선택한 날짜와 부서의 근태 현황을 조회합니다.
        async function loadDepartmentAttendance() {
            setDepartmentLoading(true);
            setDepartmentError('');

            try {
                const response = await getHrDepartmentAttendance(
                    today,
                    selectedDepartmentId
                );

                if (!ignore) {
                    if (
                        response.data.success &&
                        Array.isArray(response.data.data)
                    ) {
                        setDepartmentAttendance(response.data.data);
                    } else {
                        setDepartmentAttendance([]);
                        setDepartmentError(
                            '부서 근태현황을 불러오지 못했습니다.'
                        );
                    }
                }
            } catch (error) {
                console.error('부서 근태현황 조회 오류:', error);

                if (!ignore) {
                    setDepartmentAttendance([]);
                    setDepartmentError(
                        '부서 근태현황을 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!ignore) {
                    setDepartmentLoading(false);
                }
            }
        }

        loadDepartmentAttendance();

        return () => {
            ignore = true;
        };
    }, [today, selectedDepartmentId]);

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
                <StatisticsCard title="전체직원" count={String(employees.length)} stiyle={1} />
                <StatisticsCard title="오늘출근" count={String(todayWorkingCount)} stiyle={1} />
                <StatisticsCard title="휴가사용" count={String(todayLeaveCount)} stiyle={1} />
                <StatisticsCard title="운용부서" count={String(departments.length)} stiyle={0} />
            </section>

            <div className="stats-section">
                

                <div className="attendance-card hr-department-attendance">
                    <h2>부서 출결현황</h2>

                    <div className="grouborad">
                        <ul className="grouplist">
                            {organizationLoading ? (
                                <li>부서 정보를 불러오는 중입니다.</li>
                            ) : departments.length === 0 ? (
                                <li>등록된 부서가 없습니다.</li>
                            ) : (
                                departments.map((department) => (
                                    <li key={department.departmentId}>
                                        <button
                                            type="button"
                                            className={
                                                selectedDepartmentId ===
                                                department.departmentId
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                setSelectedDepartmentId(
                                                    department.departmentId
                                                )
                                            }
                                        >
                                            {department.departmentName}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>

                        <p>
                            오늘 출결 · {today} ·{' '}
                            {selectedDepartment?.departmentName}
                        </p>

                        {organizationError ? (
                            <p role="alert">{organizationError}</p>
                        ) : departmentLoading ? (
                            <p role="status">
                                부서 출결현황을 불러오는 중입니다.
                            </p>
                        ) : departmentError ? (
                            <p role="alert">{departmentError}</p>
                        ) : departmentAttendance.length === 0 ? (
                            <p>해당 부서의 재직 직원이 없습니다.</p>
                        ) : (
                            <div className="table-shell">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>이름</th>
                                            <th>직급</th>
                                            <th>출근 시간</th>
                                            <th>퇴근 시간</th>
                                            <th>상태</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {departmentAttendance.map(
                                            (attendance) => (
                                                <tr key={attendance.employeeId}>
                                                    <td className="emp-name">
                                                        {attendance.employeeName}
                                                    </td>
                                                    <td className="emp-position">
                                                        {attendance.position}
                                                    </td>
                                                    <td className="emp-time">
                                                        {attendance.clockIn || '-'}
                                                    </td>
                                                    <td className="emp-time">
                                                        {attendance.clockOut || '-'}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`status-tag ${
                                                                attendance.status ===
                                                                '정상'
                                                                    ? 'working'
                                                                    : 'off'
                                                            }`}
                                                        >
                                                            {attendance.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
