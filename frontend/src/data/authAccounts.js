// 로그인/권한 테스트용 더미 계정 데이터
// 화면 컴포넌트와 저장 로직에서 분리해 둔다.
// 추후 DB 연동 시 이 파일의 일반 직원 데이터는 API 응답으로 대체할 수 있다.

export const MASTER_ACCOUNT = {
    loginId: "master",
    password: "1234",
    name: "MASTER",
    email: "",
    department: "전산관리",
    position: "시스템 관리자",
    role: "MASTER"
};

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
