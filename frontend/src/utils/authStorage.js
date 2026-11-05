import axios from 'axios';

const LOGIN_USER_KEY = "loginUser";
const EMPLOYEE_ACCOUNT_KEY = "employeeAccounts";

// env에서 설정한 api를 사용하거나, 없다면 기본값 4000번 포트 사용.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

// 로그인 사용자 저장
export function saveLoginUser(user) {
    localStorage.setItem(
        LOGIN_USER_KEY,
        JSON.stringify(user)
    );
}

// 로그인 사용자 조회
export function getLoginUser() {

    const user =
        localStorage.getItem(LOGIN_USER_KEY);

    if (!user) {
        return null;
    }

    return JSON.parse(user);
}

// 로그아웃
export function logoutUser() {

    localStorage.removeItem(
        LOGIN_USER_KEY
    );
}

// MASTER가 등록한 직원들
export function getEmployeeAccounts() {

    const accounts =
        localStorage.getItem(
            EMPLOYEE_ACCOUNT_KEY
        );

    if (!accounts) {
        return [];
    }

    return JSON.parse(accounts);
}

// 직원 계정 등록
export function saveEmployeeAccount(account) {

    const accounts =
        getEmployeeAccounts();


    const keyExists =
        accounts.some(
            item =>
                item.employeeKey ===
                account.employeeKey
        );


    if (keyExists) {

        return {
            success: false,
            message: "이미 사용 중인 사원 Key입니다."
        };
    }


    const emailExists =
        accounts.some(
            item =>
                item.email ===
                account.email
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


    localStorage.setItem(
        EMPLOYEE_ACCOUNT_KEY,
        JSON.stringify([
            ...accounts,
            newAccount
        ])
    );


    return {
        success: true
    };
}

export async function findLoginAccount(loginId, password) {
    const inputId = loginId.trim();

    if (!inputId || !password) {
        throw new Error("이메일과 비밀번호를 입력해 주세요.");
    }

    try {
        // 백엔드에서 DB의 사원 계정을 확인합니다.
        const response = await axios.post(
            `${API_BASE_URL}/login`,
            {
                email: inputId,
                password
            }
        );

        // 기존 로그인 화면에서 사용하는 응답 형태를 유지합니다.
        return response.data;
    } catch (error) {
        throw new Error(
            error.response?.data?.message ||
            "로그인 서버에 연결하지 못했습니다."
        );
    }
}