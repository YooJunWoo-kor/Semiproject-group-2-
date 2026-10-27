const LOGIN_USER_KEY = "loginUser";
const EMPLOYEE_ACCOUNT_KEY = "employeeAccounts";


// =============================
// MASTER 계정
// =============================
export const MASTER_ACCOUNT = {
    loginId: "master",
    password: "1234",
    name: "MASTER",
    email: "",
    department: "전산관리",
    position: "시스템 관리자",
    role: "MASTER"
};


// =============================
// 기존 일반 직원 더미 계정
// 로그인 ID = 이메일
// =============================
export const NORMAL_ACCOUNTS = [
    {
        employeeKey: "EMP-1001",
        email: "minjun.kim@enova.co.kr",
        password: "1234",
        name: "김민준",
        department: "개발팀",
        position: "팀장",
        role: "USER"
    },
    {
        employeeKey: "EMP-1002",
        email: "seoyeon.lee@enova.co.kr",
        password: "1234",
        name: "이서연",
        department: "인사팀",
        position: "대리",
        role: "USER"
    },
    {
        employeeKey: "EMP-1003",
        email: "jiho.park@enova.co.kr",
        password: "1234",
        name: "박지호",
        department: "디자인팀",
        position: "사원",
        role: "USER"
    },
    {
        employeeKey: "EMP-1004",
        email: "yujin.choi@enova.co.kr",
        password: "1234",
        name: "최유진",
        department: "마케팅팀",
        position: "과장",
        role: "USER"
    },
    {
        employeeKey: "EMP-1005",
        email: "doyun.jung@enova.co.kr",
        password: "1234",
        name: "정도윤",
        department: "경영지원팀",
        position: "대리",
        role: "USER"
    },
    {
        employeeKey: "EMP-1006",
        email: "jiwoo.han@enova.co.kr",
        password: "1234",
        name: "한지우",
        department: "개발팀",
        position: "사원",
        role: "USER"
    }
];


// =============================
// 로그인 사용자 저장
// =============================
export function saveLoginUser(user) {

    localStorage.setItem(
        LOGIN_USER_KEY,
        JSON.stringify(user)
    );
}


// =============================
// 로그인 사용자 조회
// =============================
export function getLoginUser() {

    const user =
        localStorage.getItem(LOGIN_USER_KEY);

    if (!user) {
        return null;
    }

    return JSON.parse(user);
}


// =============================
// 로그아웃
// =============================
export function logoutUser() {

    localStorage.removeItem(
        LOGIN_USER_KEY
    );
}


// =============================
// MASTER가 등록한 직원들
// =============================
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


// =============================
// 직원 계정 등록
// =============================
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


// =============================
// 로그인
// =============================
export function findLoginAccount(
    loginId,
    password
) {

    // 입력 앞뒤 공백 제거
    const inputId =
        loginId.trim();

    const inputPassword =
        password.trim();

    // -----------------------------
    // MASTER 로그인
    // -----------------------------
    if (
        inputId === MASTER_ACCOUNT.loginId &&
        inputPassword === MASTER_ACCOUNT.password
    ) {

        return MASTER_ACCOUNT;
    }

    // -----------------------------
    // 기본 직원 로그인
    // 이메일 사용
    // -----------------------------
    const normalAccount =
        NORMAL_ACCOUNTS.find(
            account =>
                account.email === inputId &&
                account.password === inputPassword
        );

    if (normalAccount) {
        return normalAccount;
    }

    // -----------------------------
    // MASTER가 등록한 직원 로그인
    // 이메일 사용
    // -----------------------------
    const employeeAccounts =
        getEmployeeAccounts();

    const employee =
        employeeAccounts.find(
            account =>
                account.email === inputId &&
                account.password === inputPassword
        );

    if (employee) {
        return employee;
    }

    return null;
}