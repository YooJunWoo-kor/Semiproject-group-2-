// 담당 화면: 지출·거래 관리
// 역할: 월별 입출금·분류 요약, 거래 목록, 결재 화면을 연결합니다.
// 지출·거래 관리 화면과 공통 컴포넌트 연결을 담당합니다.
import React from "react";
import usePaymentManagementController from "../controllers/usePaymentManagementController";
import PaymentCategoryFilter, {
  PaymentSelectionChips,
} from "../components/paymentManagement/PaymentCategoryFilter";
import PaymentOverview from "../components/paymentManagement/PaymentOverview";
import PaymentClassificationModal from "../components/paymentManagement/PaymentClassificationModal";
import Items from "./FinanceItemTransactionsPage";
import Approval from "./FinanceApprovalsPage";
import "../../../../css/SubMain.css";
import "../../../../css/ADComp.css";
import "../../../../css/Table.css";
import "../../../../css/GroupBord.css";
import "../../../../css/Form.css";
import "../styles/Finance.css";
import ColorTeg from "../../../../components/ColorTeg";
import { FilterTabs } from "../../../../components/FilterControls";
import "../../../../css/ModalPopup.css";

export default function PaymentManagement(props) {
  const {
    permitted,
    direction,
    tradeType,
    monthInput,
    setMonthInput,
    month,
    refresh,
    data,
    loading,
    error,
    selectedCodes,
    setSelectedCodes,
    selectedRow,
    classification,
    setClassification,
    password,
    setPassword,
    saving,
    saveError,
    workflow,
    workflowBusy,
    setWorkflowBusy,
    tradeRequest,
    tradeBusy,
    setTradeBusy,
    filterReset,
    expenseGroups,
    filterGroups,
    selectedItems,
    classificationGroups,
    openDetail,
    closeDetail,
    handleClassification,
    closeWorkflow,
    openTradeRegistration,
    handleTradeTypeChange,
    handleMonthSubmit,
    resetFilters,
    refreshData,
    openSelectedApproval,
    openSelectedTrade,
    handleOverviewGroupSelect,
  } = usePaymentManagementController(props);
  function renderCategorySummary() {
    if (selectedItems.length === 0) return null;
    return (
      <PaymentSelectionChips
        selectedItems={selectedItems}
        tradeBusy={tradeBusy}
        setSelectedCodes={setSelectedCodes}
      />
    );
  }
  if (!permitted)
    return (
      <div className="border-container">
        <h2 className="subtitle">결제 관리</h2>
        <p role="alert">재무부 또는 MASTER 계정만 이용할 수 있습니다.</p>
      </div>
    );
  if (workflow)
    return (
      <div className="pm-workflow">
        <button type="button" disabled={workflowBusy} onClick={closeWorkflow}>
          ← 결제 관리로 돌아가기
        </button>
        <Approval
          key={`${workflow.documentId || ""}-${workflow.draft}`}
          initialDocumentId={workflow.documentId}
          initialDraftOpen={workflow.draft}
          expenseGroups={expenseGroups}
          onBusyChange={setWorkflowBusy}
        />
      </div>
    );
  return (
    <div className="border-container payment-management erp-controls">
      <header className="dashboard-header pm-unified-header">
        <div className="pm-header-summary">
          <span className="subtitle">지출·거래 관리</span>
          {data && (
            <div className="pm-summary-badges" aria-label="입출금 요약">
              <ColorTeg
                title={"지급예정"}
                count={data.overview.expense.summary.scheduled}
                type={"원"}
                color={"blue"}
              />
              <ColorTeg
                title={"수입예정"}
                count={data.overview.income.summary.scheduled}
                type={"원"}
                color={"green"}
              />
              <ColorTeg
                title={"입출금 차액"}
                count={data.overview.income.summary.total - data.overview.expense.summary.total}
                type={"원"}
                color={"purple"}
              />
            </div>
          )}
        </div>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            disabled={loading || Boolean(error) || tradeBusy}
            onClick={openTradeRegistration}
          >
            매입·매출 등록
          </button>
        </div>
      </header>
      <div className="pm-toolbar pm-trade-toolbar">
        <FilterTabs
          label="거래 구분"
          value={tradeType}
          onChange={handleTradeTypeChange}
          disabled={loading || tradeBusy}
          options={[
            {
              value: "ALL",
              label: "전체",
            },
            {
              value: "SALES",
              label: "매출(판매)",
            },
            {
              value: "PURCHASE",
              label: "매입(구매)",
            },
          ]}
        />
        <form className="form-inputs" onSubmit={handleMonthSubmit}>
          <label htmlFor="pm-month">조회 월</label>
          <input
            id="pm-month"
            type="month"
            min="1000-01"
            max="9998-12"
            required
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
          />
          <button type="submit" disabled={loading || tradeBusy}>
            조회
          </button>
          <button type="button" disabled={loading || tradeBusy} onClick={resetFilters}>
            초기화
          </button>
        </form>
      </div>
      {loading && <p role="status">결제 관리 정보를 불러오는 중입니다.</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={refreshData}>
            다시 조회
          </button>
        </div>
      )}
      {data && (
        <div className="pm-columns pm-unified-columns">
          <PaymentOverview
            data={data}
            handleOverviewGroupSelect={handleOverviewGroupSelect}
            loading={loading}
            selectedCodes={selectedCodes}
            tradeBusy={tradeBusy}
          />
          <section className="pm-detail-panel" aria-label="선택 항목 내역">
            <Items
              embedded
              compact
              tradeRequest={tradeRequest}
              onBusyChange={setTradeBusy}
              onDataChange={refreshData}
              scope={{
                month,
                refresh,
                direction,
                tradeType,
                view: "all",
                unified: true,
                filterReset,
                groupId: "all",
                selectedCodes,
                entries: data.entries,
                scheduled: data.scheduled,
              }}
              categoryFilter={
                <PaymentCategoryFilter
                  groups={filterGroups}
                  selectedCodes={selectedCodes}
                  onChange={setSelectedCodes}
                  disabled={loading || tradeBusy}
                  resetKey={`${month}-${filterReset}-${tradeType}`}
                />
              }
              categorySummary={renderCategorySummary()}
              onClassify={openDetail}
            />
          </section>
        </div>
      )}
      {selectedRow && (
        <PaymentClassificationModal
          classification={classification}
          classificationGroups={classificationGroups}
          closeDetail={closeDetail}
          handleClassification={handleClassification}
          openSelectedApproval={openSelectedApproval}
          openSelectedTrade={openSelectedTrade}
          password={password}
          saveError={saveError}
          saving={saving}
          selectedRow={selectedRow}
          setClassification={setClassification}
          setPassword={setPassword}
        />
      )}
    </div>
  );
}
