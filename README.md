<<<<<<< HEAD
10/27 fetchnote  
- 테이블, form관련 css는 한번에 보기 쉽게 최상위 css폴더에 분리시켰습니다.  
- 기범씨가 작성한 헤더부분은 최상산 Component에 분리시켰습니다.  
- 대성: 고객관리페이지 작성중  
- 기범: 커뮤니티 통합게시판 생성 및 게시판에 들어갈 더미데이터 생성중  
- 현영: 켈린더 모듈 생성중  


* ERP 프로젝트 리팩토링 핵심 정리  
1. 전체 방향  
- 기존 yjw의 화면 디자인, 기능, 라우팅은 그대로 유지  
- 보이는 화면은 바꾸지 않고 내부 구조만 정리  
- 파일 역할을 분리해서 문제 발생 시 찾기 쉽게 구성  
- 나중에 DB 연결 시 화면 파일을 크게 수정하지 않도록 준비  
  
2. 기본 데이터 흐름  
현재:  
화면(Page) -> Service -> localStorage / 더미 데이터  
  
나중:  
화면(Page) -> Service -> API -> Node/Express -> MySQL  
  
핵심:  
화면이 데이터를 직접 관리하지 않고 Service를 통해 접근하도록 정리  
  
3. 역할별 파일 구조  
pages/  
- 실제 화면  
- 화면이 이상하면 가장 먼저 확인  
  
components/  
- 여러 곳에서 반복해서 사용하는 UI  
- 테이블, 카드, 폼 등  
- 무조건 잘게 쪼개지 않고 실제로 반복되는 경우만 분리  

services/  
- 데이터 조회, 저장, 로그인 판별 등  
- 현재는 localStorage/더미 데이터 사용  
- 나중에는 API 호출로 교체  
  
data/  
- MASTER 계정, 일반 직원 계정 등 현재 사용하는 더미 데이터  
- 화면 파일에 직접 데이터를 복붙하지 않도록 분리  
  
utils/  
- 공통 함수 또는 기존 코드와의 호환용 파일  
  
4. 로그인 관련 리팩토링  
기존:  
authStorage.js 하나에  
- MASTER 데이터  
- 일반 직원 데이터  
- 로그인 판별  
- 로그인 사용자 저장  
- 직원 계정 저장  
등이 같이 들어있었음  
  
정리 후:  
data/authAccounts.js  
- MASTER / 일반 직원 더미 데이터  
  
services/authService.js  
- 로그인 계정 판별  
  
services/sessionService.js  
- 현재 로그인 사용자 저장/조회/로그아웃  
  
services/employeeAccountService.js  
- MASTER가 등록한 직원 계정 관리  
  
services/storageService.js  
- localStorage 공통 처리  
  
utils/authStorage.js  
- 기존 Home.js, HR 코드가 깨지지 않도록 연결용 facade로 유지  
  
5. 기능별 폴더  
pages/Main/  
- hr/ : 직원, 부서, 근태, 급여  
- qualityControl/ : 제품, 품질검사, 검사결과, 그래프  
- crm/ : 고객, 상담, 클레임  
- finance/ : 재무, 카드, 계좌  
- management/ : 일정, 캘린더  
- project/ : 프로젝트 관리  
- community/ : 공지, 게시판  
  
6. 중복/불필요 파일 정리  
- qualityControl 내부의 중복 Home.js 제거  
- qualityControl 내부의 중복 RegisterPage.js 제거  
- src/00dump 같은 예전 백업 코드는 실제 소스와 분리  
- 실제 사용 중인 파일은 최대한 유지  
  
7. 컴포넌트 재사용 기준  
- 두 곳 이상에서 실제로 반복되는 UI만 components로 분리  
- 전체에서 재사용하면 src/components/  
- 특정 기능에서만 재사용하면 해당 기능 내부 components/  
  
예:  
전체 공통 테이블 -> src/components/  
품질관리 전용 검사 카드 -> qualityControl/components/  
  
8. CSS 정리 방향  
현재:  
- index.css : 공통 전역 스타일 중심  
- css/ColorList.css : 색상 변수  
- css/SubMain.css : 공통 서브메인 스타일  
- 각 기능 전용 CSS는 해당 기능 쪽에 유지  
  
중요:  
기존 디자인을 유지해야 하므로 CSS를 한 번에 크게 이동하지 않음  
  
9. 문제 생겼을 때 찾는 순서  
화면 문제  
-> pages/  

로그인/저장/데이터 문제  
-> services/  

더미 데이터 수정  
-> data/  

공통 UI 문제  
-> components/  
  
CSS/디자인 문제  
-> index.css 또는 해당 기능 CSS  
  
DB 연결 문제  
-> services -> backend  
  
10. 한 줄 요약  
기존:  
화면 + 데이터 + 저장 + 로직이 섞여 있음  
  
정리 후:  
화면은 pages  
재사용 UI는 components  
데이터 처리는 services  
더미 데이터는 data
DB 연결은 service 뒤쪽에서 처리
=======
현영 프로젝트관리  
기범 고객관리  
준우  
- 깃 초기화 완료
- 품질관리 ui개선
- npm install chart.js react-chartjs-2 (그래프 보는데 필요한 모듈)

대성 직원관리 ui개선  
왕식 네비게이션 추가  
  
직원관리  
	-> 우측 버튼 클릭시 삭제만 뜨는데, 이쪽 디벨롭  
	-> 부서관리 쪽 각 부서 클릭시 부서원 목록 출력  
	-> 오늘 출근만 뜨는데, 추가로 각 인원 클릭시 각인원에 대한 데이터 업데이트  
	-> 전체인원 각 연봉 및 월급 데이터 출력  
	-> 지금 예정일 표기  
재무관리  
	-> 좌측 네비게이션 추가  
	-> 각 버튼 클릭 시 기능 추가  
	-> 켈린더 수정 및 만들어놓은 켈린더와 통합  
품질관리  
	-> 네비게이션 추가  
	-> 제품 목록 클릭시 제품 상세보기  
	-> 검사목록 클릭시 상세보기  
	-> 분석그레프는 일단 대기  
일정관리  
	-> 좌측 네비게이션으로 현제 원페이지 출력되고 있는 부분 나누기  
	-> 일정관리와 현제 더미데이터로 추가된 켈린더 데이터 연결  
프로젝트관리  
	-> 현영씨 작업중  
고객관리  
	-> 기범씨 작업중  
커뮤니티  
	-> 좌측 네비게이션 추가  
	-> 게시판 폼 업데이트  
<<<<<<< HEAD
=======
고객관리  
-> 네비게이션 추가(왕식작업중)  
-> 곡객과리, 거래처 관리 등을 눌렀을때, 리스트가 나오는 페이지 추가  
-> 일단 고객관리만 수정하는데, 더미데이터로 가상의 고객리스트  
-> 없을때도 처리가 되게 하면 좋음.  
-> 고객등록, 거래처 등록 버튼을 눌렀을때, 작성페이지 나오게  
-> 저장 누르면 고객 리스트데이터에 추가  
>>>>>>> origin/feature/hr
>>>>>>> origin/kds
