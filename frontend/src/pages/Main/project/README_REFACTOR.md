# 프로젝트 관리 모듈 리팩터링

기존 `project(7).zip`의 업무 화면과 CSS를 보존했습니다.

- `ProjectHome.jsx`: 기존 `/main/project/*` 하위 라우트
- `ProjectModul.jsx`: 메뉴 및 홈
- `ProjectContext.jsx`: 공통 상태, 변경 시 localStorage 자동 저장
- `pages/`: 기존 업무별 화면
- `components/ProjectDashboard.jsx`: 홈에서 사용하는 대시보드 UI
- `services/projectService.js`: 저장/불러오기 구현 (향후 API 전환 지점)
- `data/projectDummyData.js`: 최초 접속 시 기본 데이터
- `utils/projectUtils.js`: 공통 날짜 계산

기존 경로 호환을 위해 `pages/ProjectContext.jsx`, `pages/ProjectDashboard.jsx`, `projectData.js`는 재내보내기 파일로 남겼습니다.

## 적용
1. 기존 `project` 폴더를 별도 백업하고 이 폴더로 교체합니다.
2. `MainApp.js`에서 `<Route path="/project/*" element={<ProjectHome />} />` 등록 여부를 확인합니다.
3. 기존 CSS import는 `ProjectHome.jsx`에서 유지됩니다.
4. `frontend`에서 `npm install`, `npm start`로 확인하세요.

## 저장 동작
- 키: `erp.project.v1`
- 브라우저별 localStorage 저장이며 다른 PC/브라우저와 동기화되지 않습니다.
- 저장 데이터가 없다면 `data/projectDummyData.js`의 샘플 데이터로 시작합니다.
- 기존 ZIP은 메모리 상태만 사용했으므로, 그 당시 새로고침으로 사라진 데이터는 복원할 수 없습니다.
- 테스트 초기화: 브라우저 개발자도구 콘솔에서 `localStorage.removeItem('erp.project.v1')` 실행 후 새로고침.
- 저장 용량 초과/차단 시 콘솔 경고만 출력되고 메모리 상태로 계속 동작합니다.

## MySQL 연동 시
`services/projectService.js`의 동기 localStorage 함수는 서버 API용 비동기 함수로 교체해야 합니다. 이때 `ProjectContext.jsx`도 비동기 초기 로딩, 저장 중/실패 상태, CRUD 호출 방식으로 함께 수정해야 합니다. 프런트엔드에서 MySQL에 직접 연결하지 않습니다.

## 범위
원본 ZIP에는 전체 ERP 및 package.json이 없어 통합 빌드/다른 팀 모듈 충돌 검증은 수행하지 않았습니다.
