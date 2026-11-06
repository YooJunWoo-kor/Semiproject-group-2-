import React, { useId, useState } from "react";
import "./DepartmentEmployeePicker.css";

/**
 * Reusable department / employee picker.
 *
 * employees: [{ employee_id, department_name, name, position, ... }]
 * selectedEmployee: currently selected employee (or null)
 * onSelect: callback receiving the complete employee object, or null when department changes
 * radioName: optional radio group name (otherwise generated per component instance)
 *
 * Data loading and the action after selection belong to the parent component.
 */
function DepartmentEmployeePicker({
    employees = [],
    selectedEmployee = null,
    onSelect,
    radioName
}) {
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const generatedName = useId();
    const groupName = radioName || generatedName;

    const departments = [...new Set(
        employees.map(employee => employee.department_name).filter(Boolean)
    )];
    const departmentEmployees = employees.filter(
        employee => employee.department_name === selectedDepartment
    );

    return (
        <div className="department-employee-picker">
            <h4 className="department-employee-picker__heading">부서 선택</h4>
            <div className="department-employee-picker__departments">
                {departments.map(department => (
                    <button
                        type="button"
                        className="department-employee-picker__department"
                        key={department}
                        aria-pressed={selectedDepartment === department}
                        onClick={() => {
                            setSelectedDepartment(department);
                            if (selectedDepartment !== department) onSelect(null);
                        }}
                    >
                        {department}
                    </button>
                ))}
            </div>

            {departments.length === 0 && (
                <p className="department-employee-picker__empty">부서 정보가 없습니다.</p>
            )}

            {selectedDepartment && (
                <div className="department-employee-picker__employees">
                    <h4 className="department-employee-picker__heading">{selectedDepartment}</h4>
                    {departmentEmployees.length === 0 && (
                        <p className="department-employee-picker__empty">등록된 직원이 없습니다.</p>
                    )}
                    {departmentEmployees.map(employee => (
                        <label
                            key={employee.employee_id}
                            className="department-employee-picker__employee"
                        >
                            <input
                                type="radio"
                                name={groupName}
                                checked={selectedEmployee?.employee_id === employee.employee_id}
                                onChange={() => onSelect(employee)}
                            />
                            <span>{employee.name} / {employee.position}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DepartmentEmployeePicker;
