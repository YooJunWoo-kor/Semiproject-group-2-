import { getJson, setJson } from "./storageService";

const EMPLOYEE_ACCOUNT_KEY = "employeeAccounts";

export function getEmployeeAccounts() {
    return getJson(EMPLOYEE_ACCOUNT_KEY, []);
}

export function saveEmployeeAccount(account) {
    const accounts = getEmployeeAccounts();

    const keyExists = accounts.some(
        item => item.employeeKey === account.employeeKey
    );

    if (keyExists) {
        return {
            success: false,
            message: "이미 사용 중인 사원 Key입니다."
        };
    }

    const emailExists = accounts.some(
        item => item.email === account.email
    );

    if (emailExists) {
        return {
            success: false,
            message: "이미 사용 중인 이메일입니다."
        };
    }

    const newAccount = {
        employeeKey: account.employeeKey,
        name: account.name,
        department: account.department,
        position: account.position,
        email: account.email,
        password: account.password,
        role: "USER"
    };

    setJson(EMPLOYEE_ACCOUNT_KEY, [...accounts, newAccount]);

    return {
        success: true
    };
}
