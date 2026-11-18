import React from "react";
import ItemFormModal from "../components/items/ItemFormModal";
import ItemPaymentModal from "../components/items/ItemPaymentModal";
import PayrollDeductionModal from "../components/items/PayrollDeductionModal";
import PayrollDetailModal from "../components/items/PayrollDetailModal";
import ItemVoucherModal from "../components/items/ItemVoucherModal";
import AdditionalPayrollPayment from "../components/AdditionalPayrollPayment";
import PaginationTable from "../../../../components/PaginationTable";
import { FilterTabs, RadioGroup, CheckboxFilter, SelectFilter } from "../../../../components/FilterControls";
import WeeklyCalendar from "../../../../components/weeklycalendar/WeeklyCalendar";
import BasicCalendar from "../../../../components/calendar/BasicCalendar";
import useItemsController from "../components/items/useItemsController";
import createItemTableData from "../components/items/createItemTableData";
import "../components/Finance.css";
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";

// [MVC 2단계] 페이지는 화면 구성과 컴포넌트 연결을 담당합니다.
export {
  getSettlementLabel,
  getTradeApprovalStatus,
  isTradeOverdue,
  compareTradeNewest,
} from "../components/items/itemUtils";
function Items(props) {
  const {
    onClassify,
    embedded,
    compact,
    scope,
    categoryFilter,
    categorySummary,
    activeTab,
    attachmentBusy,
    setAttachmentBusy,
    approvalFilter,
    setApprovalFilter,
    overdueOnly,
    setOverdueOnly,
    selectedTradeType,
    searchTerm,
    setSearchTerm,
    calendarType,
    setCalendarType,
    setSelectedItemId,
    approvedDocuments,
    approvalsLoading,
    approvalsError,
    additionalError,
    setAdditionalBusy,
    payrollLoading,
    payrollError,
    payrollRows,
    payrollDetailLoading,
    payrollDetailError,
    payrollPaymentSaving,
    payrollPaymentError,
    payrollPaymentNotice,
    payrollPayForm,
    setPayrollPayForm,
    deductionMonth,
    deductionData,
    deductionLoading,
    deductionSaving,
    deductionError,
    deductionNotice,
    deductionForm,
    setDeductionForm,
    loading,
    error,
    formOpen,
    saving,
    formError,
    partnerOptions,
    itemCategories,
    categoryError,
    itemForm,
    editingItemId,
    linkingApproval,
    paymentTarget,
    paymentForm,
    paymentSaving,
    paymentError,
    paymentSummary,
    paymentLoading,
    paymentHistoryError,
    settlementFilter,
    setSettlementFilter,
    paymentAccounts,
    accountsLoading,
    accountsError,
    today,
    matchingRecords,
    scopeRecordSource,
    scopedList,
    filteredList,
    filteredTotal,
    paymentCards,
    cardsLoading,
    cardsError,
    totalSalesAmount,
    totalPurchaseAmount,
    operatingProfit,
    calendarEvents,
    openItemForm,
    openApprovedTradeForm,
    isExpenseRegistration,
    handleItemChange,
    handleItemSubmit,
    handleItemDelete,
    selectedItem,
    attachmentDocumentId,
    attachmentDocument,
    payrollMonth,
    payrollMoneyKeys,
    payrollWon,
    payrollUnpaidRows,
    payrollNetPending,
    payrollCanPay,
    handlePayrollPayment,
    handleDeductionPayment,
    openEditItemForm,
    openPaymentForm,
    handlePaymentChange,
    handlePaymentSubmit,
    openVoucher,
    closeVoucher,
    closePaymentModal,
    closeRegistrationModal,
    handleTradeTabChange,
    handleAdditionalPayrollPaid,
    refreshApprovalAttachments,
  } = useItemsController(props);

  // 테이블 헤더 규격 정의
  const itemTableTitle = "매입/매출 품목 거래 현황";
  const itemHeaders = ["구분", "거래일 (마감일)", "거래처", "품목 (규격)", "합계 금액", "상태", "관리"];

  // PaginationTable 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tItemData = createItemTableData({
    approvedDocuments,
    attachmentBusy,
    deductionSaving,
    filteredList,
    openVoucher,
    paymentSaving,
    payrollPaymentSaving,
    saving,
    scope,
    today,
  });
  
  return (
    <div className={`border-container finance-items erp-controls${compact ? " finance-items-compact" : ""}`}>
      {/* 1. 상단 공통 헤더 및 액션 버튼 */}
      {!compact && (
        <header className="dashboard-header">
          <span className="subtitle">{embedded ? "거래·정산" : "매입/매출 품목관리"}</span>
          <div className="dashboard-top">
            <button
              type="button"
              className="register-btn"
              disabled={saving || paymentSaving || attachmentBusy}
              onClick={openItemForm}
            >
              + 품목 거래내역 신규 등록
            </button>
          </div>
        </header>
      )}

      {!compact && (
        <p>
          승인 지출의 상세에서 거래정보를 등록할 수 있습니다. 월 급여는 연결된 기안서가 최종 승인된 경우에만
          매입(인건비)에 표시합니다. 금액은 승인된 급여의 세전 합계이며, 급여 상세에서 직원별 금액을 확인하고
          실제 송금한 급여의 지급 내역을 등록할 수 있습니다.
        </p>
      )}

      {payrollLoading && <p role="status">월 급여 조회 중…</p>}
      {payrollError && (
        <p role="alert">{payrollError} 급여 합계가 누락되어 있으니 백엔드 재시작 후 새로고침해 주세요.</p>
      )}

      {/* 2. 상단 누적 손익 요약 카드 */}
      {!compact && (
        <section className="finance-trade-summary">
          <h3>전체 거래 총액 요약</h3>
          <p>
            <span>
              총 매출: <strong>{totalSalesAmount.toLocaleString()}원</strong>
            </span>{" "}
            |{" "}
            <span>
              총 매입: <strong>{totalPurchaseAmount.toLocaleString()}원</strong>
            </span>{" "}
            |{" "}
            <span>
              매출·매입 차액(부가세 포함):{" "}
              <strong className={operatingProfit >= 0 ? "finance-positive" : "finance-negative"}>
                {operatingProfit.toLocaleString()}원
              </strong>
            </span>
          </p>
        </section>
      )}

      {!compact && <hr />}

      {/* 3. 좌우 2단 분할 레이아웃 컨테이너 */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          marginTop: compact ? 0 : "16px",
        }}
      >
        {/* [좌측 영역] 탭 + 검색 필터 + PaginationTable (약 62% 너비) */}
        <div
          style={{
            flex: compact ? "1 1 100%" : "1 1 62%",
            minWidth: 0,
          }}
        >
          {/* 탭 전환 및 검색 필터 */}
          <div className="finance-item-toolbar">
            {!scope?.unified && (
              <FilterTabs
                label="거래 구분"
                value={activeTab}
                onChange={handleTradeTabChange}
                options={[
                  {
                    value: "ALL",
                    label: `전체 (${scopedList.length})`,
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
            )}
            <div className="finance-approval-toolbar">
              <RadioGroup
                label="승인 여부"
                value={approvalFilter}
                onChange={setApprovalFilter}
                options={[
                  {
                    value: "ALL",
                    label: "전체",
                  },
                  {
                    value: "APPROVED",
                    label: "승인",
                  },
                  {
                    value: "UNAPPROVED",
                    label: "미승인",
                  },
                ]}
              />
              <CheckboxFilter label="기한 초과만 보기" checked={overdueOnly} onChange={setOverdueOnly} />
            </div>

            <div className={scope?.unified ? "pm-unified-filters" : "finance-trade-filters"}>
              {categoryFilter}
              <SelectFilter
                label="정산 상태"
                value={settlementFilter}
                onChange={setSettlementFilter}
                options={[
                  {
                    value: "ALL",
                    label: "전체 상태",
                  },
                  ...["미등록", "대기", "일부 완료", "완료"].map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
              />
              <input
                type="text"
                aria-label="품목명 또는 거래처명 검색"
                placeholder="품목명 또는 거래처명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>

          {categorySummary && (
            <div className="pm-filter-summary">
              {categorySummary}
              <span className="pm-filter-total">
                선택 거래 합계 <strong>{filteredTotal.toLocaleString("ko-KR")}원</strong>
              </span>
            </div>
          )}
          {approvalFilter !== "ALL" && (
            <p className="finance-approval-note">
              승인 여부가 확인되는 거래만 표시합니다. 승인 정보가 없는 거래는 전체에서 확인할 수 있습니다.
            </p>
          )}
          {approvalsLoading && <p>결재·기안서를 불러오는 중입니다.</p>}
          {approvalsError && <p role="alert">{approvalsError}</p>}
          {loading && <p>거래 품목을 불러오는 중입니다.</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !approvalsLoading && !error && !approvalsError && filteredList.length === 0 && (
            <p>표시할 거래 품목이 없습니다.</p>
          )}

          {formOpen && (
            <ItemFormModal
              categoryError={categoryError}
              closeRegistrationModal={closeRegistrationModal}
              editingItemId={editingItemId}
              formError={formError}
              handleItemChange={handleItemChange}
              handleItemSubmit={handleItemSubmit}
              isExpenseRegistration={isExpenseRegistration}
              itemCategories={itemCategories}
              itemForm={itemForm}
              linkingApproval={linkingApproval}
              partnerOptions={partnerOptions}
              saving={saving}
            />
          )}

          {paymentTarget && (
            <ItemPaymentModal
              accountsError={accountsError}
              accountsLoading={accountsLoading}
              cardsError={cardsError}
              cardsLoading={cardsLoading}
              closePaymentModal={closePaymentModal}
              handlePaymentChange={handlePaymentChange}
              handlePaymentSubmit={handlePaymentSubmit}
              paymentAccounts={paymentAccounts}
              paymentCards={paymentCards}
              paymentError={paymentError}
              paymentForm={paymentForm}
              paymentSaving={paymentSaving}
              paymentTarget={paymentTarget}
            />
          )}

          <PaginationTable
            key={`${selectedTradeType}-${approvalFilter}-${overdueOnly}-${searchTerm}-${settlementFilter}-${scope?.month}-${scope?.direction}-${scope?.view}-${scope?.groupId}-${scope?.selectedCodes.join(",")}-${tItemData.length}`}
            title={itemTableTitle}
            th={itemHeaders}
            allData={tItemData}
            itemsPerPage={10}
            pageGroupSize={5}
          />
          {compact && !scope?.unified && (
            <p className="finance-workspace-note">
              {scope?.view === "completed"
                ? "조회 기간에 입출금한 거래입니다. 합계 금액은 품목의 전체 거래금액입니다."
                : "조회 월 마감의 미정산 거래입니다. 분류가 없는 거래는 미분류에서 확인하세요."}
            </p>
          )}
          {deductionMonth && !formOpen && !paymentTarget && (
            <PayrollDeductionModal
              accountsError={accountsError}
              accountsLoading={accountsLoading}
              closeVoucher={closeVoucher}
              deductionData={deductionData}
              deductionError={deductionError}
              deductionForm={deductionForm}
              deductionLoading={deductionLoading}
              deductionMonth={deductionMonth}
              deductionNotice={deductionNotice}
              deductionSaving={deductionSaving}
              handleDeductionPayment={handleDeductionPayment}
              paymentAccounts={paymentAccounts}
              payrollCanPay={payrollCanPay}
              payrollWon={payrollWon}
              setDeductionForm={setDeductionForm}
              today={today}
            />
          )}

          {additionalError && <p role="alert">{additionalError}</p>}
          {selectedItem?.isAdditionalPayroll && (
            <AdditionalPayrollPayment
              key={selectedItem.id}
              row={selectedItem.additional}
              accounts={paymentAccounts}
              canPay={payrollCanPay}
              onBusyChange={setAdditionalBusy}
              onClose={closeVoucher}
              onPaid={handleAdditionalPayrollPaid}
            />
          )}
          {selectedItem?.isPayroll && !selectedItem.isPayrollDeduction && !formOpen && !paymentTarget && (
            <PayrollDetailModal
              accountsError={accountsError}
              accountsLoading={accountsLoading}
              closeVoucher={closeVoucher}
              handlePayrollPayment={handlePayrollPayment}
              paymentAccounts={paymentAccounts}
              payrollCanPay={payrollCanPay}
              payrollDetailError={payrollDetailError}
              payrollDetailLoading={payrollDetailLoading}
              payrollMoneyKeys={payrollMoneyKeys}
              payrollMonth={payrollMonth}
              payrollNetPending={payrollNetPending}
              payrollPayForm={payrollPayForm}
              payrollPaymentError={payrollPaymentError}
              payrollPaymentNotice={payrollPaymentNotice}
              payrollPaymentSaving={payrollPaymentSaving}
              payrollRows={payrollRows}
              payrollUnpaidRows={payrollUnpaidRows}
              payrollWon={payrollWon}
              selectedItem={selectedItem}
              setPayrollPayForm={setPayrollPayForm}
              today={today}
            />
          )}

          {selectedItem &&
            !selectedItem.isPayroll &&
            !selectedItem.isAdditionalPayroll &&
            !formOpen &&
            !paymentTarget && (
              <ItemVoucherModal
                approvedDocuments={approvedDocuments}
                attachmentBusy={attachmentBusy}
                attachmentDocument={attachmentDocument}
                attachmentDocumentId={attachmentDocumentId}
                closeVoucher={closeVoucher}
                compact={compact}
                handleItemDelete={handleItemDelete}
                matchingRecords={matchingRecords}
                onClassify={onClassify}
                openApprovedTradeForm={openApprovedTradeForm}
                openEditItemForm={openEditItemForm}
                openPaymentForm={openPaymentForm}
                paymentHistoryError={paymentHistoryError}
                paymentLoading={paymentLoading}
                paymentSaving={paymentSaving}
                paymentSummary={paymentSummary}
                payrollWon={payrollWon}
                saving={saving}
                scopeRecordSource={scopeRecordSource}
                selectedItem={selectedItem}
                onAttachmentsUploaded={refreshApprovalAttachments}
                setAttachmentBusy={setAttachmentBusy}
                setSelectedItemId={setSelectedItemId}
              />
            )}
        </div>

        {/* [우측 영역] 상시 노출 정산 마감 달력 (약 38% 너비) */}
        {!compact && (
          <div
            style={{
              flex: "0 0 38%",
              minWidth: "340px",
              borderLeft: "1px solid var(--color-line)",
              paddingLeft: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h4 className="board-title finance-calendar-title">품목 정산 마감 일정</h4>
              <FilterTabs
                label="달력 보기"
                options={[
                  {
                    value: "week",
                    label: "주간",
                  },
                  {
                    value: "month",
                    label: "월간",
                  },
                ]}
                value={calendarType}
                onChange={setCalendarType}
              />
            </div>

            <div className="calendar-widget-wrapper">
              {calendarType === "week" ? (
                <WeeklyCalendar schedule={calendarEvents} />
              ) : (
                <BasicCalendar schedule={calendarEvents} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default Items;
