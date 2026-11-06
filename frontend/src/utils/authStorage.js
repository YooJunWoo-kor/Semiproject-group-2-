import axios from 'axios';

export const LOGIN_USER_KEY = "loginUser";

// env에서 설정한 api를 사용하거나, 없다면 기본값 4000번 포트 사용.
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';
const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${defaultHost}:4000/api`;

//달력에 표기할 색상 리스트
export const TOGLE_COLORS = [
    '#3b82f6', // 0: 소프트 블루 (정상 출근)
    '#f59e0b', // 1: 웜 앰버 (지각 / 조퇴)
    '#ef4444', // 2: 뮤트 레드 (결근 / 병가)
    '#10b981', // 3: 세이지 에메랄드 (연차 / 반차)
    '#06b6d4', // 4: 덜 시안 (경조휴가)
    '#6366f1', // 5: 소프트 인디고 (외근 / 출장)
    '#14b8a6', // 6: 차분한 틸 (재택근무)
    '#8b5cf6', // 7: 뮤트 바이올렛 (야간근무)
    '#d946ef', // 8: 소프트 후샤 (휴일근무)
    '#64748b'  // 9: 뉴트럴 슬레이트 (기타)
  ];

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
        return alert('서버와 통신할 수 없습니다.');
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
