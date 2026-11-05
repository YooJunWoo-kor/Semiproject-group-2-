import axios from 'axios';

export const LOGIN_USER_KEY = "loginUser";
const EMPLOYEE_ACCOUNT_KEY = "employeeAccounts";

// env에서 설정한 api를 사용하거나, 없다면 기본값 4000번 포트 사용.
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';
const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${defaultHost}:4000/api`;

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

//오늘날짜 조회
export function getTodayString (){
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

//출결 데이터 포멧팅 함수
function formatDateToYYYYMMDD(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// 출결 데이터 조회
export async function getAttendance(){
    //return [{title: '출근',start:'2026-10-01', end:'2026-11-05', typeId: 0}];
    // { title: "출근", start: "2026-10-01", end: "2026-10-01", typeId: 0 }
    const user = localStorage.getItem(LOGIN_USER_KEY);
    const userID = JSON.parse(user).employeeKey;
    
    /*date: "2026-11-01T15:00:00.000Z"
    end: "2026-11-02T09:10:00.000Z"
    start: "2026-11-01T23:50:00.000Z"
    title: "정상출근"*/

     try {
         const data = await axios.post(API_BASE_URL + '/AD/attendance',{userID})
         const dataSet = data.data.data;

         const formattedData = dataSet.map((item)=>{
            const stData = formatDateToYYYYMMDD(item.start);
            const enData = formatDateToYYYYMMDD(item.end);
            const title = item.title;

            return {
                title: title
                , start: stData
                , end: enData
                , typeId: (
                    title == "정상출근" ? 0 :
                    title == "지각" ? 1 :
                    title == "휴가" ? 2 :
                    title == "출장" ? 3 :
                    title == "휴직" ? 4 : 5
                )
            }
         });
         return formattedData || [];
     } catch (err) {
        console.error("error:", err);
         if (err.response){
             return alert(userID);
         }
     }
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

<<<<<<< HEAD
    if (!inputId || !password) {
        throw new Error("이메일과 비밀번호를 입력해 주세요.");
=======
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
    }
    catch(error){
        if(error.response && error.response.data){
            return error.response.data.message;
        }
        return alert('서버와 통신할 수 없습니다.');
>>>>>>> origin/main
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