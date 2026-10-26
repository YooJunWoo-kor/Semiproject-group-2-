import { MASTER_ACCOUNT, NORMAL_ACCOUNTS } from "../data/authAccounts";
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

    const normalAccount = NORMAL_ACCOUNTS.find(
        account =>
            account.email === inputId &&
            account.password === inputPassword
    );

    if (normalAccount) {
        return normalAccount;
    }

    const employee = getEmployeeAccounts().find(
        account =>
            account.email === inputId &&
            account.password === inputPassword
    );

    return employee || null;
}
