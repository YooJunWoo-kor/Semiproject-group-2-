import StatisticsCard from '../../../components/StatisticsCard';
import axios from 'axios';
import { getLoginUser } from '../../../utils/authStorage';
import { useEffect, useState } from 'react';
import ModalBase from '../../../components/ModalBase';
import HRAttendanceView from './HRAttendanceView';

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

const departmentButtons = [
    { label: '인사', departmentId: 2, departmentName: '인사팀' },
    { label: '재무', departmentId: 1, departmentName: '경영지원부서' },
    { label: '품질', departmentId: 3, departmentName: '제품개발부서' },
    { label: '고객관리', departmentId: 5, departmentName: '영업팀' }
];

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function TestModal() {
    return (
        <div>
            테스트용 모달
            <div style={{ height: '500px' }}>테스트용 모달</div>
        </div>
    );
}

export default function Dashboard() {
    const loginUser = getLoginUser();
    const isMaster = loginUser?.role === 'MASTER';

    const [isModal, setIsModal] = useState(false);

    // 달력·리스트에서 사용할 전체 근태자료
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [attendanceError, setAttendanceError] = useState('');

    // 부서 직원 표에서 사용할 자료
    const [departmentAttendance, setDepartmentAttendance] = useState([]);
    const [departmentLoading, setDepartmentLoading] = useState(false);
    const [departmentError, setDepartmentError] = useState('');

    const [selectedDepartmentId, setSelectedDepartmentId] = useState(
        departmentButtons[0].departmentId
    );

    const today = formatDate(new Date());

    const selectedDepartment = departmentButtons.find(
        (department) => department.departmentId === selectedDepartmentId
    );

    function openModal() {
        setIsModal(true);
    }

    function closeModal() {
        setIsModal(false);
    }

    // 기존 전체 근태자료를 가져옵니다.
    // 이 자료는 달력과 리스트에서 사용합니다.
    useEffect(() => {
        let ignore = false;

        async function loadAttendance() {
            setAttendanceLoading(true);
            setAttendanceError('');

            try {
                const response = await axios.get(
                    API_BASE_URL + '/hr/attendance'
                );

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

        async function loadDepartmentAttendance() {
            setDepartmentLoading(true);
            setDepartmentError('');

            try {
                const response = await axios.get(
                    API_BASE_URL + '/hr/attendance/department',
                    {
                        params: {
                            date: today,
                            departmentId: selectedDepartmentId
                        }
                    }
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
        <div className="sub-container">
            <header className="dashboard-header">
                <span className="subtitle">인사관리 대시보드</span>
                <span className="subtext">
                    처리할 세부 인사 항목을 선택하세요.
                </span>

                <div className="dashboard-top">
                    {isMaster && (
                        <button
                            onClick={openModal}
                            className="register-btn"
                        >
                            직원 등록하기
                        </button>
                    )}
                </div>
            </header>

            {isModal && (
                <ModalBase
                    onClose={closeModal}
                    layout={<TestModal />}
                />
            )}

            <section className="stats-section">
                <StatisticsCard title="전체직원" count="128" stiyle={1} />
                <StatisticsCard title="오늘출근" count="119" stiyle={1} />
                <StatisticsCard title="휴가사용" count="9" stiyle={1} />
                <StatisticsCard title="운용부서" count="12" stiyle={0} />
            </section>

            <div className="stats-section">
                {/* 전체 근태자료를 달력·리스트에 전달합니다. */}
                <HRAttendanceView
                    attendanceData={attendanceData}
                    isLoading={attendanceLoading}
                    error={attendanceError}
                />

                <div className="attendance-card hr-department-attendance">
                    <h2>부서 출결현황</h2>

                    <div className="grouborad">
                        <ul className="grouplist">
                            {departmentButtons.map((department) => (
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
                                        {department.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <p>
                            오늘 출결 · {today} ·{' '}
                            {selectedDepartment?.departmentName}
                        </p>

                        {departmentLoading ? (
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