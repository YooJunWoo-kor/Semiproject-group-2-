import React, { useState } from "react";

/**
 * 공통 부서/직원 선택 UI
 * employees: [{ employee_id, department_name, name, position, ... }]
 * onSelect(employee): 선택한 직원 객체를 부모에게 전달
 */
function DepartmentEmployeePicker({
    employees = [],
    selectedEmployee = null,
    onSelect,
    radioName = "employee-picker"
}) {
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const departments = [...new Set(
        employees.map(employee => employee.department_name).filter(Boolean)
    )];
    const departmentEmployees = employees.filter(
        employee => employee.department_name === selectedDepartment
    );

    return (
        <div className="draft-box">
            <h4>부서 선택</h4>
            <div className="draft-row">
                {departments.map(department => (
                    <button
                        type="button"
                        key={department}
                        onClick={() => {
                            setSelectedDepartment(department);
                            onSelect(null);
                        }}
                    >
                        {department}
                    </button>
                ))}
            </div>

            {selectedDepartment && (
                <div className="draft-box">
                    <h4>{selectedDepartment}</h4>
                    {departmentEmployees.length === 0 && <p>등록된 직원이 없습니다.</p>}
                    {departmentEmployees.map(employee => (
                        <div key={employee.employee_id} className="draft-row">
                            <label>
                                <input
                                    type="radio"
                                    name={radioName}
                                    checked={selectedEmployee?.employee_id === employee.employee_id}
                                    onChange={() => onSelect(employee)}
                                />
                                {employee.name} / {employee.position}
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DepartmentEmployeePicker;
