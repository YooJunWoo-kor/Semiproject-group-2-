# 프로젝트 관리 모듈 리팩터링

## 현재 구조

프로젝트 모듈은 `ProjectProvider`가 공통 상태와 CRUD 함수를 관리하고,
각 업무 화면은 `useProject()`를 통해 필요한 상태와 함수만 꺼내 사용합니다.

- `ProjectHome.jsx`: `/main/project/*` 라우팅과 Provider 경계
- `ProjectContext.jsx`: 공통 상태 + 프로젝트/작업/인력/산출물/예산/비용/리스크 CRUD API
- `pages/`: 화면 입력값과 화면 전용 상태만 관리
- `components/ProjectDashboard.jsx`: 표시 중심 대시보드 컴포넌트
- `services/projectService.js`: 저장/불러오기 구현, 향후 REST API 교체 지점
- `data/projectDummyData.js`: 최초 접속 기본 데이터
- `utils/projectUtils.js`: 공통 계산 유틸리티

기존 경로 호환을 위해 `pages/ProjectContext.jsx`, `pages/ProjectDashboard.jsx`, `projectData.js`는 재내보내기 파일로 유지합니다.

## 데이터 흐름

화면(Page) -> `useProject()` -> `ProjectContext` -> `projectService` -> 현재 localStorage / 향후 REST API

페이지는 더 이상 `setTasks`, `setRisks`, `setExpenses` 같은 raw setter를 props로 전달받지 않습니다. 등록/수정/삭제는 Context의 명시적인 함수로 처리합니다.

예:
- 작업 등록: `addTask`
- 작업 수정: `updateTask`
- 작업 삭제: `removeTask`
- 프로젝트 저장: `saveProject`
- 프로젝트 삭제: `removeProject`
- 예산 저장: `saveBudget`
- 리스크 상태 변경: `updateRisk`

## 이번 리팩터링에서 해결한 문제

1. Context와 props drilling을 동시에 사용하던 이중 구조 제거
2. 각 페이지에 흩어진 상태 변경 로직을 Context CRUD 함수로 통합
3. 숫자/문자열 ID 비교가 섞이던 부분을 문자열 비교 기준으로 안전하게 통일
4. 프로젝트 삭제 시 연결된 작업/산출물/인력/비용/리스크/예산을 함께 정리
5. 작업 공정률을 0~100 범위로 Context에서 보정
6. 예산 키를 문자열 기준으로 저장해 localStorage 복원 후에도 안정적으로 조회
7. Context 외부에서 `useProject()` 호출 시 명확한 오류 메시지 제공

## 저장 동작

- localStorage 키: `erp.project.v1`
- 브라우저별 저장이며 다른 PC/브라우저와 자동 동기화되지 않습니다.
- 저장 데이터가 없으면 `data/projectDummyData.js`의 샘플 데이터로 시작합니다.
- 테스트 초기화: `localStorage.removeItem('erp.project.v1')` 실행 후 새로고침합니다.

## MySQL / API 연동 시

프런트엔드에서 MySQL에 직접 연결하지 않습니다.

현재: `Page -> Context -> projectService -> localStorage`

향후: `Page -> Context -> projectService -> REST API -> Node/Express -> MySQL`

따라서 API 전환 시 화면 컴포넌트보다 `ProjectContext.jsx`와 `services/projectService.js`를 중심으로 변경하면 됩니다.

## 유지보수 원칙

- 화면 입력값, 모달 열림/닫힘, 편집 중 draft: Page local state
- 프로젝트 업무 데이터: ProjectContext state
- 업무 데이터 변경 함수: ProjectContext CRUD API
- 브라우저 저장/API 통신: projectService
- 순수 계산: utils
- 표시만 하는 UI: components

모듈 규모가 더 커지면 Context를 `ProjectDataContext`와 `ProjectActionsContext`로 분리하거나 `useReducer`를 도입할 수 있습니다. 현재 규모에서는 단일 Context + 명시적 CRUD API가 가장 이해하기 쉽고 유지보수하기 쉽습니다.
