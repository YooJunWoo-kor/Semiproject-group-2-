import { useEffect, useState, useId } from "react";
import { getEmployeeAccounts } from "../utils/authStorage";

function DepEmpList({ departmentName, onSelect }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const radioName = useId();

    useEffect(() => {
        let cancelled = false;

        setEmployees([]);
        setSelectedEmployee(null);

        if (!departmentName) return;

        async function loadEmployees() {
            try {
                const allEmployees = await getEmployeeAccounts();

                if (!cancelled) {
                    setEmployees(
                        allEmployees.filter(
                            employee =>
                                employee.department_name === departmentName
                        )
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("직원 조회 실패:", error);
                    setEmployees([]);
                }
            }
        }

        loadEmployees();

        return () => {
            cancelled = true;
        };
    }, [departmentName]);

    const handleSelect = (employee) => {
        setSelectedEmployee(employee);

        // onSelect 함수가 전달된 경우에만 실행
        onSelect?.(employee);
    };

    return (
        <div>
            <h4>{departmentName} 직원 목록</h4>

            {employees.map(employee => (
                <label key={employee.employee_id}>
                    <input
                        type="radio"
                        name={radioName}
                        checked={
                            selectedEmployee?.employee_id ===
                            employee.employee_id
                        }
                        onChange={() => handleSelect(employee)}
                    />
                    {employee.position} {employee.name}
                </label>
            ))}
        </div>
    );
}

export default DepEmpList;