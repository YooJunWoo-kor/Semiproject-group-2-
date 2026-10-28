import {
    MASTER_ACCOUNT
} from "../data/authAccounts";

import {
    getEmployeeAccounts
} from "./employeeAccountService";


export function findLoginAccount(
    loginId,
    password
) {

    const inputId =
        loginId.trim();

    const inputPassword =
        password.trim();


    // MASTER 로그인
    if (
        inputId ===
            MASTER_ACCOUNT.loginId &&
        inputPassword ===
            MASTER_ACCOUNT.password
    ) {
        return MASTER_ACCOUNT;
    }


    // 현재 직원목록에 존재하는 직원만 로그인 가능
    const employee =
        getEmployeeAccounts().find(
            account =>
                account.email ===
                    inputId &&
                account.password ===
                    inputPassword
        );


    return employee || null;
}