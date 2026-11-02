# ERP 프로젝트 구조 가이드

## 원칙
- 기존 yjw 화면 디자인, CSS, 라우팅, 기능을 유지한다.
- 화면 컴포넌트가 localStorage/더미 데이터를 직접 다루는 코드를 줄인다.
- 데이터와 로직은 data / services 로 분리한다.
- 기존 import가 깨지지 않도록 utils/authStorage.js 는 호환 facade로 유지한다.
- 향후 DB 연결 시 services 내부 구현을 API 호출로 교체하는 방향을 사용한다.

## 빠른 파일 찾기
- 로그인 화면: frontend/src/pages/Home.js
- 회원가입: frontend/src/pages/RegisterPage.js
- 메인 ERP 메뉴: frontend/src/pages/Main/MainModule.js
- 인사: frontend/src/pages/Main/hr/
- 품질: frontend/src/pages/Main/qualityControl/
- CRM: frontend/src/pages/Main/crm/
- 재무: frontend/src/pages/Main/finance/
- 일정/관리: frontend/src/pages/Main/management/
- 프로젝트: frontend/src/pages/Main/project/
- 커뮤니티: frontend/src/pages/Main/community/
- 공통 컴포넌트: frontend/src/components/
- 더미 계정 데이터: frontend/src/data/authAccounts.js
- 인증/직원 데이터 서비스: frontend/src/services/
- 기존 호환 진입점: frontend/src/utils/authStorage.js
- 백엔드: backend/

## 데이터 흐름
화면 -> service -> 현재 localStorage/더미 데이터
화면 -> service -> 추후 API -> Node/Express -> MySQL
