재무관리 파일 설명서

1. 먼저 찾아볼 파일

메뉴 이름과 페이지 URL을 바꾸려면:
  FinanceHom.js

대시보드 영역 배치를 바꾸려면:
  FinanceModul.js

자금관리의 전체 요약과 카드/계좌 탭을 바꾸려면:
  pages/FinanceFundsPage.js

문서 작성 버튼이나 문서 창 연결을 바꾸려면:
  components/documents/FinanceDocumentLauncher.js

문서 입력란을 바꾸려면:
  components/documents/FinanceDocumentEditor.js

문서 미리보기와 인쇄 내용을 바꾸려면:
  components/documents/FinanceDocumentPreview.js

문서 저장/인쇄 버튼 위치를 바꾸려면:
  components/documents/FinanceDocumentForm.js

공통 버튼 모양과 색상을 바꾸려면:
  components/ui/FinanceButton.js

재무 권한 기준을 확인하려면:
  utils/financeDataUtils.js의 canAccessFinance
  현재 MASTER 또는 department_id 6을 확인합니다.
  API 권한은 별도로 서버에서 확인해야 합니다.

2. 폴더 역할

pages
  메뉴에서 열리는 페이지와 여러 화면의 연결을 담당합니다.

components
  상세 창, 입력 창, 목록 셀, 문서 등 화면의 일부를 담당합니다.

components/ui
  재무의 여러 화면에서 재사용하는 버튼, 입력, 상세 표시, 배치입니다.

controllers
  조회, 저장, 상태, 로딩과 오류, 이벤트 처리를 담당합니다.
  use로 시작하는 이름들,
  파일마다 독립된 페이지가 있는 것은 아닙니다.

models
  금액 계산, 상태 판별, 폼 기본값, 검증과 데이터 변환을 담당합니다.
  프론트 모델이 DB에 직접 연결하는 구조는 아닙니다.

utils
  권한, 날짜, 오류 변환 등 여러 기능에서 쓰는 도구입니다.
  문서 유틸에는 계산뿐 아니라 API와 인쇄 처리도 있습니다.

styles
  재무 전용 CSS입니다. 공통 src/css와 구분합니다.

3. 메뉴에서 파일로 찾아가기

대시보드: /main/finance
  FinanceModul.js
  controllers/useFinanceDashboardController.js
  components/dashboard/ 안의 세 파일

거래처 관리: /main/finance/partners
  pages/FinancePartnersPage.js
  controllers/usePartnersController.js
  components/partners/ 안의 화면들

지출·거래 관리: /main/finance/items
  pages/FinanceTransactionWorkspace.js
  pages/FinancePaymentOverviewPage.js
  pages/FinanceItemTransactionsPage.js
  controllers/usePaymentManagementController.js
  controllers/useItemsController.js

결재·이력: 지출·거래 관리에서 내부 화면 전환
  pages/FinanceApprovalsPage.js
  controllers/useApprovalsController.js
  components/approval/ 안의 화면들

자금 관리: /main/finance/funds
  pages/FinanceFundsPage.js
  tab=cards는 법인카드, tab=accounts는 회사계좌입니다.
  pages/FinanceCorpCardsPage.js
  pages/FinanceBankAccountsPage.js

영수증·청구서·견적서: 대시보드 문서 작성 버튼
  components/documents/ 안의 네 파일
  controllers/useFinanceDocumentController.js
  models/financeDocumentModel.js
  utils/flinanceDocumentUtis.js

4. 전체 파일별 담당 업무

루트 파일

FinanceHom.js
  담당: 재무 전체
  역할: 재무 메뉴 표시와 하위 페이지 라우팅을 담당합니다.

FinanceModul.js
  담당: 대시보드
  역할: 통계·지급 일정·문서 작성 버튼과 모달을 배치합니다.

components/approval

components/approval/ApprovalDetailModal.js
  담당: 결재·이력 / 승인 지급
  역할: 결재 문서 상세와 승인·반려·지급 등 관련 화면 연결

components/approval/ApprovalDraftModal.js
  담당: 결재·이력 / 승인 지급
  역할: 기안서 작성 입력 화면

components/approval/ApprovalPaymentEvidence.js
  담당: 결재·이력 / 승인 지급
  역할: 첨부파일 표시/업로드와 승인 문서 지급 등록 UI. 하나의 기본 export만 있는 파일이 아니므로 개별 export도 확인

components/approval/ApprovalSteps.js
  담당: 결재·이력 / 승인 지급
  역할: 결재 단계와 처리 이력 표시

components/approval/createApprovalTableData.js
  담당: 결재·이력 / 승인 지급
  역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.

components/bankAccounts

components/bankAccounts/BankAccountDetailModal.js
  담당: 자금관리 → 회사계좌
  역할: 계좌 기본정보 및 거래 이력 상세 창

components/bankAccounts/BankAccountFormModal.js
  담당: 자금관리 → 회사계좌
  역할: 계좌 등록·수정 입력 창

components/bankAccounts/createBankAccountTableData.js
  담당: 자금관리 → 회사계좌
  역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.

components/corpCards

components/corpCards/CorpCardDetailModal.js
  담당: 자금관리 → 법인카드
  역할: 카드 기본정보 및 사용 이력 상세 창

components/corpCards/CorpCardFormModal.js
  담당: 자금관리 → 법인카드
  역할: 카드 등록·수정 입력 창

components/corpCards/CorpCardLimitModal.js
  담당: 자금관리 → 법인카드
  역할: 카드 월 한도 변경 입력 창

components/corpCards/createCorpCardTableData.js
  담당: 자금관리 → 법인카드
  역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.

components/dashboard

components/dashboard/FinancePaymentSummary.js
  담당: 대시보드의 지급 요약
  역할: 기간별 지급총액·지급예정을 표시하고 각 요약의 조회 기간을 관리합니다.

components/dashboard/FinanceScheduleDetailModal.js
  담당: 대시보드의 일정 상세
  역할: 동일 제목 일정 선택 목록과 지급 문서 상세·로딩·오류·닫기를 표시합니다.

components/dashboard/FinanceSchedulePanel.js
  담당: 대시보드의 재무 일정
  역할: 공통 일정판과 로딩·오류·빈 일정 안내를 표시합니다.

components/documents

components/documents/FinanceDocumentEditor.js
  담당: 영수증·청구서·견적서
  역할: 고객 정보·문서 상세·품목·비고 입력 화면

components/documents/FinanceDocumentForm.js
  담당: 영수증·청구서·견적서
  역할: 문서 헤더·저장/인쇄/닫기와 입력/미리보기를 연결하는 최상위 화면

components/documents/FinanceDocumentLauncher.js
  담당: 대시보드의 문서 작성
  역할: 문서 유형별 작성 버튼·아이콘과 문서 작성 모달을 연결합니다.

components/documents/FinanceDocumentPreview.js
  담당: 영수증·청구서·견적서
  역할: 문서 번호·공급자/고객·품목·합계·비고·지급 안내의 인쇄용 표시

components/items

components/items/AdditionalPayrollPayment.js
  담당: 지출·거래 관리 / 급여
  역할: 추가 급여 지급 입력과 API 저장. UI와 상태/요청 처리가 함께 있는 예외 파일

components/items/ItemDetailSummary.js
  담당: 지출·거래 관리 / 급여
  역할: 거래 상세의 제목·금액·상태 등 상단 요약

components/items/ItemFormModal.js
  담당: 지출·거래 관리 / 급여
  역할: 거래·품목 등록 및 수정 입력 창

components/items/ItemPaymentModal.js
  담당: 지출·거래 관리 / 급여
  역할: 거래 입금·출금 등록 입력 창

components/items/ItemVoucherModal.js
  담당: 지출·거래 관리 / 급여
  역할: 거래/승인 문서 상세 전표, 상세 행·첨부·입출금 이력과 작업 버튼

components/items/PayrollDeductionModal.js
  담당: 지출·거래 관리 / 급여
  역할: 급여 공제액과 납부 입력 창

components/items/PayrollDetailModal.js
  담당: 지출·거래 관리 / 급여
  역할: 급여 상세 및 지급 관련 화면

components/items/createItemTableData.js
  담당: 지출·거래 관리 / 급여
  역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.

components/partners

components/partners/PartnerBalanceModal.js
  담당: 거래처 관리
  역할: 거래처 금액 상세와 조회 기간 선택

components/partners/PartnerDetailModal.js
  담당: 거래처 관리
  역할: 거래처 기본정보 상세

components/partners/PartnerFormModal.js
  담당: 거래처 관리
  역할: 거래처 등록·수정 입력 창

components/partners/createPartnerTableData.js
  담당: 거래처 관리
  역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.

components/paymentManagement

components/paymentManagement/PaymentCategoryFilter.js
  담당: 지출·거래 관리 요약
  역할: 비용/수입 분류 선택과 선택 항목 표시

components/paymentManagement/PaymentClassificationModal.js
  담당: 지출·거래 관리 요약
  역할: 거래 분류 변경 입력 창

components/paymentManagement/PaymentOverview.js
  담당: 지출·거래 관리 요약
  역할: 지출·거래 분류별 현황 표시

components/ui

components/ui/FinanceButton.js
  담당: 재무 여러 화면에서 재사용
  역할: 재무 버튼의 색상·크기·비활성·상호작용 스타일

components/ui/FinanceDetailDisplay.js
  담당: 재무 여러 화면에서 재사용
  역할: 상세 행·리소스 상세·상태 배지·요약 표시. Layout/Form/Button 일부를 재내보내 기존 import 호환

components/ui/FinanceFormControls.js
  담당: 재무 여러 화면에서 재사용
  역할: FinanceField·FinanceControl·FinanceActions·FinanceSearchForm·FinanceFormStack 등 입력/검색 공통 UI

components/ui/FinanceLayout.js
  담당: 재무 여러 화면에서 재사용
  역할: FinanceResourceModal·FinanceTwoColumn·FinanceLayoutColumn 등 모달과 2단 배치 UI

components/ui/FinancePaymentHistory.js
  담당: 재무 여러 화면에서 재사용
  역할: 계좌·카드·거래 전표의 입출금 이력 표와 기간 선택

components/ui/FinanceResourceTable.js
  담당: 재무 여러 화면에서 재사용
  역할: 공통 PaginationTable을 재사용하며 재무 표의 자동 열 너비와 정렬을 보완

controllers

controllers/useApprovalDecision.js
  담당: 결재·이력 / 승인 지급
  역할: 결재 단계·이력 조회와 지정 결재자의 승인·반려 처리을 담당합니다.

controllers/useApprovalDraft.js
  담당: 결재·이력 / 승인 지급
  역할: 기안 입력·사원 목록 조회·기안 등록을 담당합니다.

controllers/useApprovalPaymentsController.js
  담당: 결재·이력 / 승인 지급
  역할: 승인 문서의 지급 내역·지급 폼·지급 저장 및 재조회을 담당합니다.

controllers/useApprovalsController.js
  담당: 결재·이력 / 승인 지급
  역할: 결재 목록 조회·검색·문서 선택 및 기안/승인 컨트롤러 연결을 담당합니다.

controllers/useBankAccountEditor.js
  담당: 자금관리 → 회사계좌
  역할: 계좌 등록·기본정보 수정·관리 사원 선택을 담당합니다.

controllers/useBankAccountsController.js
  담당: 자금관리 → 회사계좌
  역할: 계좌 목록 조회·검색·상세 선택·상태 변경 및 하위 기능 연결을 담당합니다.

controllers/useCorpCardEditor.js
  담당: 자금관리 → 법인카드
  역할: 카드 등록·기본정보 수정·부서/관리자 조회을 담당합니다.

controllers/useCorpCardLimit.js
  담당: 자금관리 → 법인카드
  역할: 카드 월 한도 변경 및 변경 후 목록 갱신을 담당합니다.

controllers/useCorpCardsController.js
  담당: 자금관리 → 법인카드
  역할: 카드 목록 조회·검색·상세 선택·상태 변경 및 하위 기능 연결을 담당합니다.

controllers/useFinanceAttachmentsController.js
  담당: 여러 재무 화면
  역할: 첨부파일 조회·업로드·다운로드·미리보기 URL 관리을 담당합니다.

controllers/useFinanceDashboardController.js
  담당: 대시보드
  역할: 대시보드 데이터 조회·지급 일정 상세 및 문서 창 상태을 담당합니다.

controllers/useFinanceDocumentController.js
  담당: 영수증·청구서·견적서
  역할: 문서 초기 정보 조회·입력 상태·유효성 검사·저장·인쇄 연결을 담당합니다.

controllers/useFinanceResourceHistory.js
  담당: 여러 재무 화면
  역할: 선택한 카드/계좌의 거래 이력 조회를 공통 처리. 실제 export 이름은 useFinanceHistory.

controllers/useItemData.js
  담당: 지출·거래 관리
  역할: 거래·승인 문서·급여·계좌 데이터 조회 및 목록 구성을 담당합니다.

controllers/useItemEditor.js
  담당: 지출·거래 관리
  역할: 거래 등록·수정·삭제 및 입력 폼 상태을 담당합니다.

controllers/useItemFilters.js
  담당: 지출·거래 관리
  역할: 조회 조건·초기화·필터된 목록·달력 계산 연결을 담당합니다.

controllers/useItemPayments.js
  담당: 지출·거래 관리
  역할: 거래의 입출금 등록·카드 선택·지급 이력 조회을 담당합니다.

controllers/useItemsController.js
  담당: 지출·거래 관리
  역할: 거래 화면의 선택 상태를 관리하고 조회·필터·편집·지급·급여 기능 연결을 담당합니다.

controllers/usePartnerBalances.js
  담당: 거래처 관리
  역할: 거래처 금액 상세 조회·조회 월·전체 기간 선택을 담당합니다.

controllers/usePartnerEditor.js
  담당: 거래처 관리
  역할: 거래처 입력 폼과 등록·수정·삭제을 담당합니다.

controllers/usePartnersController.js
  담당: 거래처 관리
  역할: 거래처 목록 조회·검색·선택 및 편집/금액 조회 연결을 담당합니다.

controllers/usePaymentClassification.js
  담당: 지출·거래 관리
  역할: 분류 변경 폼·비밀번호·저장 처리을 담당합니다.

controllers/usePaymentManagementController.js
  담당: 지출·거래 관리
  역할: 월별 입출금 조회·분류 필터·결재/거래 화면 전환을 담당합니다.

controllers/usePayrollDeductions.js
  담당: 지출·거래 관리
  역할: 급여 공제액 조회 및 납부 등록을 담당합니다.

controllers/usePayrollPayments.js
  담당: 지출·거래 관리
  역할: 월 급여 상세 조회 및 지급 등록을 담당합니다.

models

models/financeApprovalModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 결재 문서 변환·검색·기안/승인/지급 입력 검증·요청 데이터 계산을 담당합니다.

models/financeBankAccountModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 계좌 표시값·검색·원화 합계·입력값 변환·저장 후 목록 갱신을 담당합니다.

models/financeCorpCardModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 카드 상태 표시·검색·요약·입력 검증·저장 후 목록 갱신을 담당합니다.

models/financeDashboardModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 대시보드 기간·통계 정의·일정 문서 선택·금액 표시 계산을 담당합니다.

models/financeDocumentModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 문서/고객/품목 기본값·저장 스냅샷·거래처/계좌 선택·저장 요청값 구성을 담당합니다.

models/financeItemListModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 거래·승인 문서·급여 목록 통합, 검색·필터·합계·달력 계산을 담당합니다.

models/financeItemTradeRules.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 정산 상태 표시·승인 상태 판별·기한 초과·최신순 비교 규칙을 담당합니다.

models/financeItemTransactionModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 거래 금액 계산·폼 변환·등록/입출금 검증·저장 요청값 및 목록 갱신을 담당합니다.

models/financePartnerModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 거래처 변환·검색·마감 달력·잔액 표시·등록/수정 값 계산을 담당합니다.

models/financePaymentOverviewModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 지출·거래 분류 그룹·선택 항목·요약 및 분류 변경 검증/요청값을 담당합니다.

models/financePayrollModel.js
  담당: 해당 업무의 화면·컨트롤러
  역할: 급여·공제 화면의 금액 계산·입력 검증·요청값 구성을 담당합니다.

pages

pages/FinanceApprovalsPage.js
  담당: 결재·이력
  역할: 결재 목록, 기안 작성, 승인 상세를 연결합니다. 독립 메뉴보다 내부 연결 화면으로 사용합니다.

pages/FinanceBankAccountsPage.js
  담당: 자금관리 → 회사계좌
  역할: 계좌 검색·목록·등록·상세·이력을 연결합니다.

pages/FinanceCorpCardsPage.js
  담당: 자금관리 → 법인카드
  역할: 카드 검색·목록·등록·상세·한도 변경을 연결합니다.

pages/FinanceFundsPage.js
  담당: 자금 관리
  역할: 전체 자금 요약과 법인카드·회사계좌 탭 전환을 담당합니다.

pages/FinanceItemTransactionsPage.js
  담당: 지출·거래 관리의 거래 목록
  역할: 매입/매출 목록·달력·거래 상세 및 급여 관련 모달을 조립합니다.

pages/FinancePartnersPage.js
  담당: 거래처 관리
  역할: 거래처 목록·검색·달력·등록·상세·금액 조회를 연결합니다.

pages/FinancePaymentOverviewPage.js
  담당: 지출·거래 관리
  역할: 월별 입출금·분류 요약, 거래 목록, 결재 화면을 연결합니다.

pages/FinanceTransactionWorkspace.js
  담당: 지출·거래 관리
  역할: 접근 권한을 확인하고 분석 화면과 기존 결재·이력 화면을 전환합니다.

styles

styles/Finance.css
  담당: 재무 전체
  역할: 페이지별 배치·문서·달력·표 등 재무 전용 CSS. 공통 src/css 파일과 구별합니다.

utils

utils/financeDataUtils.js
  담당: 여러 재무 화면
  역할: canAccessFinance(MASTER 또는 department_id 6), 날짜·월 이동·오류·상태·ID 변환·승인/급여 데이터 변환 공통 함수입니다.

utils/financeDocumentUtils.js
  담당: 영수증·청구서·견적서
  역할: 문서 유형·통화별 금액 계산·표시, 문서 API와 인쇄를 처리합니다.

