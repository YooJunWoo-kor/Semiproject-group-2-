import React, { useEffect, useState } from "react";
import { getEmployeeAccounts } from "../utils/authStorage";

function DepEmpList({departmentName}) {
    const [employees, setEmployees] = useState([]);

    useEffect(() => {

        if(!selectedDepartment){
            setEmployees([]);
            return;
        }

        let active = true;

        async function loadEmployees() {
            try {
                const result = await getEmployeesByDepartment(selectedDepartment);
                

                

                const filtered = result.filter(employee => 
                    employee.department_name === departmentName

                );

                setEmployees(filtered)
                


            } catch {
                console.error("직원 조회 실패", error);
                setEmployees([]);
            }

            loadEmployees();
        }
    }, [departmentName])

    return (
        <div>
            <h4>{departmentName} 부서원 목록</h4>

            {employees.map(employee => (
                <div key={employee.employee_id}>
                    {employee.name} / {employee.position}
                </div>
            ))}
        </div>
    )
}

export default DepEmpList;