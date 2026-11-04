import axios from 'axios';

const LOGIN_USER_KEY = "loginUser";

// env에서 설정한 api를 사용하거나, 없다면 기본값 4000번 포트 사용.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.0.23:4000/api';

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
export async function getEmployeeAccounts() {
    try{
        const response = await axios.get(API_BASE_URL +  '/users');

        return response.data;
    } catch(error){
        throw new Error(
            '직원 정보를 불러올 수 없습니다;'
        )
    }
    
}

// 직원 계정 등록
export async function saveEmployeeAccount(account) {

    try{

        const response = await axios.post(API_BASE_URL + "/register", account);
        
        return response.data;
    }catch(error){

        if(error.response && error.response.data){
            throw new Error(
                error.response.data.message ||
                error.response.data.error ||
                '직원 등록에 실패했습니다'
            )
        }

        throw new Error(
            '서버와 통신할 수 없습니다'
        );
    }
}


// 로그인
export async function findLoginAccount (loginId,password) {
    // 입력 앞뒤 공백 제거
    const inputId = loginId.trim();
    const inputPassword = password.trim();

    console.log('로그인버튼', API_BASE_URL);
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

         console.log("서버 로그인 응답:", response.data);

         return response.data;
    }catch(error){
        if(error.response && error.response.data){
            throw new Error(
                error.response.data.message ||
                '로그인에 실패했습니다.'
            )
        }
        throw new Error(
            '서버와 통신할 수 없습니다'
        )
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