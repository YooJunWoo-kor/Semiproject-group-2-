import { MASTER_ACCOUNT } from "../data/authAccounts";
import { getEmployeeAccounts } from "./employeeAccountService";

export function findLoginAccount(loginId, password) {
    const inputId = loginId.trim();
    const inputPassword = password.trim();

    if (
        inputId === MASTER_ACCOUNT.loginId &&
        inputPassword === MASTER_ACCOUNT.password
    ) {
        return MASTER_ACCOUNT;
    }

    const employee = getEmployeeAccounts().find(
        account =>
            account.email === inputId &&
            account.password === inputPassword
    );

    return employee || null;
}
