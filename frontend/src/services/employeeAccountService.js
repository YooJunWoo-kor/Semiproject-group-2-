import { NORMAL_ACCOUNTS } from "../data/authAccounts";
import { getJson, setJson } from "./storageService";

const EMPLOYEE_ACCOUNT_KEY = "employeeAccounts";
const EMPLOYEE_ACCOUNT_MIGRATION_KEY = "employeeAccountsInitializedV2";

function normalizeAccount(account) {
    return {
        employeeKey: account.employeeKey,
        name: account.name,
        department: account.department,
        position: account.position,
        email: account.email,
        password: account.password,
        role: "USER",
        status: account.status || "재직"
    };
}

function initializeEmployeeAccounts() {
    const migrated = localStorage.getItem(EMPLOYEE_ACCOUNT_MIGRATION_KEY) === "true";
    const savedAccounts = getJson(EMPLOYEE_ACCOUNT_KEY, []);

    if (migrated) {
        return savedAccounts;
    }

    // 기존 버전에서는 등록한 직원만 localStorage에 저장했기 때문에
    // 최초 1회 기본 직원 목록과 합쳐서 하나의 직원 원본으로 마이그레이션한다.
    const merged = [...NORMAL_ACCOUNTS, ...savedAccounts]
        .map(normalizeAccount)
        .filter((account, index, accounts) =>
            accounts.findIndex(item => item.employeeKey === account.employeeKey) === index
        );

    setJson(EMPLOYEE_ACCOUNT_KEY, merged);
    localStorage.setItem(EMPLOYEE_ACCOUNT_MIGRATION_KEY, "true");

    return merged;
}

export function getEmployeeAccounts() {
    return initializeEmployeeAccounts();
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

    const newAccount = normalizeAccount(account);

    setJson(EMPLOYEE_ACCOUNT_KEY, [...accounts, newAccount]);

    return {
        success: true,
        account: newAccount
    };
}

export function removeEmployeeAccount(employeeKey) {
    const accounts = getEmployeeAccounts();
    const nextAccounts = accounts.filter(
        account => account.employeeKey !== employeeKey
    );

    setJson(EMPLOYEE_ACCOUNT_KEY, nextAccounts);

    return {
        success: nextAccounts.length !== accounts.length
    };
}
