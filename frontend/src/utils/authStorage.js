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
    const user = localStorage.getItem(LOGIN_USER_KEY);
    if (!user) return null;

    return JSON.parse(user);
}
// 출결 데이터 조회
export async function getAttendance(){
    return [{title: '출근',start:'2026-10-01', end:'2026-11-05', typeId: 0}];
    // { title: "출근", start: "2026-10-01", end: "2026-10-01", typeId: 0 }
    //const userId = getLoginUser.employeeKey;
    // try {
    //     const data = await axios.post(API_BASE_URL + '/attendance',{userId})
    //     return data.data;
    // } catch (error) {
    //     if (error.response){
    //         return alert(userID);
    //     }
    // }
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


// 로그인
export async function findLoginAccount (loginId,password) {
    // 입력 앞뒤 공백 제거
    const inputId = loginId.trim();
    const inputPassword = password.trim();

    if(!inputId || !inputPassword){
        return alert("이메일 또는 비밀번호를 입력해주세요.");
    }
    
    //디버깅용 알림창, 포트 정상 작동 확인
    //http://localhost:4000/api
    //return alert(API_BASE_URL);
    
    try{
         const response = await axios.post(API_BASE_URL + '/login',{
            email: inputId,
            password: inputPassword
         })

         return response.data;
    }catch(error){
        if(error.response && error.response.data){
            return error.response.data.message;
        }
        return(error.response.data.message || '서버와 통신할 수 없습니다.');
    }

    // -----------------------------
    // MASTER가 등록한 직원 로그인
    // 이메일 사용
    // -----------------------------
    // const employeeAccounts =
    //     getEmployeeAccounts();

    // const employee =
    //     employeeAccounts.find(
    //         account =>
    //             account.email === inputId &&
    //             account.password === inputPassword
    //     );

    // if (employee) {
    //     return employee;
    // }

    // return null;
}