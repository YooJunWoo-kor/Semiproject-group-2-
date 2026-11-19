import { useEffect, useState } from 'react';
import {
    getHrDepartmentAttendance,
    getHrOrganization
} from '../../../components/HrData';

export default function DepartmentAttendanceComp({ today }) {
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [organizationLoading, setOrganizationLoading] = useState(true);
    const [organizationError, setOrganizationError] = useState('');

    // 부서 직원 표에서 사용할 자료
    const [departmentAttendance, setDepartmentAttendance] = useState([]);
    const [departmentLoading, setDepartmentLoading] = useState(false);
    const [departmentError, setDepartmentError] = useState('');

    const selectedDepartment = departments.find(
        (department) => department.departmentId === selectedDepartmentId
    );

    // 1. 부서 목록 조회 및 첫 번째 부서 자동 선택
    useEffect(() => {
        let ignore = false;

        async function loadDepartments() {
            setOrganizationLoading(true);
            setOrganizationError('');

            try {
                const [departmentResponse] = await getHrOrganization();

                if (
                    !departmentResponse.data.success ||
                    !Array.isArray(departmentResponse.data.data)
                ) {
                    throw new Error('부서 자료 형식이 올바르지 않습니다.');
                }

                if (!ignore) {
                    const deptList = departmentResponse.data.data;
                    setDepartments(deptList);
                    setSelectedDepartmentId((currentId) => {
                        if (deptList.some((dept) => dept.departmentId === currentId)) {
                            return currentId;
                        }
                        return deptList[0]?.departmentId || null;
                    });
                }
            } catch (error) {
                console.error('부서 조회 오류:', error);
                if (!ignore) {
                    setDepartments([]);
                    setSelectedDepartmentId(null);
                    setOrganizationError('부서 정보를 불러오지 못했습니다.');
                }
            } finally {
                if (!ignore) {
                    setOrganizationLoading(false);
                }
            }
        }

        loadDepartments();

        return () => {
            ignore = true;
        };
    }, []);

    // 2. 선택된 부서의 오늘 출결현황 조회
    useEffect(() => {
        let ignore = false;

        if (!selectedDepartmentId) {
            setDepartmentAttendance([]);
            setDepartmentLoading(false);
            return undefined;
        }

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
                        setDepartmentError('부서 근태현황을 불러오지 못했습니다.');
                    }
                }
            } catch (error) {
                console.error('부서 근태현황 조회 오류:', error);
                if (!ignore) {
                    setDepartmentAttendance([]);
                    setDepartmentError('부서 근태현황을 불러오지 못했습니다.');
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
        <div className="boder hr-department-attendance" style={{padding:'30px', paddingBottom:'100px'}}>
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
                                        selectedDepartmentId === department.departmentId
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedDepartmentId(department.departmentId)
                                    }
                                >
                                    {department.departmentName}
                                </button>
                            </li>
                        ))
                    )}
                </ul>

                <p>
                    오늘 출결 · {today} · {selectedDepartment?.departmentName}
                </p>

                {organizationError ? (
                    <p role="alert">{organizationError}</p>
                ) : departmentLoading ? (
                    <p role="status">부서 출결현황을 불러오는 중입니다.</p>
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
                                {departmentAttendance.map((attendance) => (
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
                                                    attendance.status === '정상'
                                                        ? 'working'
                                                        : attendance.status === '휴가'
                                                            ? 'leave'
                                                            : 'off'
                                                }`}
                                            >
                                                {attendance.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
