// 담당 화면: 지출·거래 관리 / 급여
// 역할: 거래/승인 문서 상세 전표, 상세 행·첨부·입출금 이력과 작업 버튼
import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import DetailSummary from "./ItemDetailSummary";
import { getTradeApprovalStatus } from "../../models/financeItemTradeRules";
import { getSettlementLabel } from "../../models/financeItemTradeRules";
import { FinanceDetailRows } from "../ui/FinanceDetailDisplay";
import { FinanceAttachments } from "../approval/ApprovalPaymentEvidence";
import { getLoginUser } from "../../../../../utils/authStorage";
import { FinancePaymentHistory } from "../ui/FinancePaymentHistory";

//화면 표시만 담당합니다. 상태와 처리는 Items.js에서 전달합니다.
export default function ItemVoucherModal({
  approvedDocuments,
  attachmentBusy,
  attachmentDocument,
  attachmentDocumentId,
  closeVoucher,
  compact,
  handleItemDelete,
  matchingRecords,
  onClassify,
  openApprovedTradeForm,
  openEditItemForm,
  openPaymentForm,
  paymentHistoryError,
  paymentLoading,
  paymentSaving,
  paymentSummary,
  payrollWon,
  saving,
  scopeRecordSource,
  selectedItem,
  setAttachmentBusy,
  setSelectedItemId,
  onAttachmentsUploaded,
}) {
  function getVoucherRows() {
    if (selectedItem.isApprovalDocument)
      return [
        ["원본 결재 번호", selectedItem.sourceDocumentId],
        ["거래 구분", selectedItem.type === "SALES" ? "매출" : "매입"],
        ["거래일", selectedItem.date],
        ["정산 마감일", selectedItem.dueDate || "미등록"],
        ["거래처", selectedItem.customer],
        ["작성자", selectedItem.requester || "미등록"],
        ["작성일", selectedItem.createdAt || "미등록"],
      ];

    return [
      ["거래 ID", selectedItem.transactionId],
      ["품목 ID", selectedItem.id],
      ["거래 구분", selectedItem.type === "SALES" ? "매출" : "매입"],
      ["거래일", selectedItem.date],
      ["정산 마감일", selectedItem.dueDate || "미등록"],
      ["거래처", selectedItem.customer],
      ["품목명", selectedItem.itemName],
      ["규격", selectedItem.spec],
      ["수량", selectedItem.quantity == null ? "미등록" : selectedItem.quantity.toLocaleString()],
      [
        "단가",
        selectedItem.unitPrice == null ? "미등록" : `${selectedItem.unitPrice.toLocaleString()}원`,
      ],
      [
        "공급가액",
        selectedItem.supplyAmount == null
          ? "미등록"
          : `${selectedItem.supplyAmount.toLocaleString()}원`,
      ],
      ["부가세", selectedItem.vat == null ? "미등록" : `${selectedItem.vat.toLocaleString()}원`],
    ];
  }
  function renderPaymentHistory() {
    if (paymentLoading) return <p>정산 정보를 불러오는 중입니다.</p>;

    if (paymentHistoryError) return <p role="alert">{paymentHistoryError}</p>;

    return (
      paymentSummary &&
      Number(paymentSummary.transaction_id) === Number(selectedItem.transactionId) && (
        <div>
          <h4>입금·출금 이력</h4>

          {paymentSummary.payments.length === 0 ? (
            <p>등록된 입금·출금 이력이 없습니다.</p>
          ) : (
            <FinancePaymentHistory
              className="finance-voucher-history"
              payments={paymentSummary.payments}
            />
          )}
        </div>
      )
    );
  }
  function getApprovalMessage() {
    if (getTradeApprovalStatus(selectedItem, approvedDocuments) !== "APPROVED")
      return "대기·반려 문서는 조회만 가능합니다. 최종 승인 후 지급·정산할 수 있습니다.";

    if (selectedItem.isPayrollDraft)
      return "급여 자료를 확인해주세요. 승인 급여는 월별 인건비 항목에서 지급합니다.";

    if (selectedItem.isSourceDraft)
      return "거래정보를 등록한 뒤 이 화면의 전표에서 지급·정산할 수 있습니다.";

    return "거래정보 등록 버튼으로 거래처·품목을 입력하면 이 화면에서 지급·정산할 수 있습니다.";
  }
  function getVoucherStatus() {
    if (selectedItem.isApprovalDocument) {
      if (getTradeApprovalStatus(selectedItem, approvedDocuments) === "APPROVED") return "승인";

      return "미승인";
    }
    return getSettlementLabel(selectedItem.status);
  }
  return (
    <div className="finance-registration-modal finance-voucher-detail">
      <ModalBase
        title={selectedItem.isApprovalDocument ? "결재·기안서 상세" : "매입·매출 전표"}
        onClose={closeVoucher}
        layout={
          <section aria-label="거래 전표 상세정보">
            <DetailSummary
              title={selectedItem.itemName}
              amount={
                selectedItem.totalAmount == null ? "미등록" : payrollWon(selectedItem.totalAmount)
              }
              status={getVoucherStatus()}
            />

            <div className="table-shell">
              <table className="finance-voucher-fields">
                <tbody>
                  <FinanceDetailRows rows={getVoucherRows()} />
                </tbody>
              </table>
            </div>

            {attachmentDocumentId != null && (
              <FinanceAttachments
                key={attachmentDocumentId}
                documentId={attachmentDocumentId}
                employeeId={getLoginUser()?.employee_id}
                canUpload={
                  attachmentDocument?.source_type !== "draft" &&
                  attachmentDocument?.approval_status === "대기" &&
                  Number(attachmentDocument?.employee_id) === Number(getLoginUser()?.employee_id)
                }
                blocked={saving || paymentSaving}
                onBusyChange={setAttachmentBusy}
                onUploaded={onAttachmentsUploaded}
              />
            )}

            <div className="finance-detail-actions">
              {compact && onClassify && matchingRecords(selectedItem, scopeRecordSource)[0] && (
                <button
                  type="button"
                  disabled={saving || paymentSaving || attachmentBusy}
                  onClick={() => {
                    const row = matchingRecords(selectedItem, scopeRecordSource)[0];
                    setSelectedItemId(null);
                    onClassify(row);
                  }}
                >
                  분류 변경
                </button>
              )}

              {selectedItem.isApprovalDocument &&
                !selectedItem.isPayrollDraft &&
                getTradeApprovalStatus(selectedItem, approvedDocuments) === "APPROVED" && (
                  <button
                    type="button"
                    className="erp-primary-button"
                    disabled={
                      saving || paymentSaving || attachmentBusy || selectedItem.totalAmount == null
                    }
                    onClick={() => openApprovedTradeForm(selectedItem)}
                  >
                    거래정보 등록
                  </button>
                )}
              <button
                type="button"
                disabled={
                  selectedItem.isApprovalDocument ||
                  getTradeApprovalStatus(selectedItem, approvedDocuments) === "UNAPPROVED" ||
                  saving ||
                  paymentSaving ||
                  attachmentBusy
                }
                onClick={() => openPaymentForm(selectedItem)}
              >
                {selectedItem.type === "SALES" ? "입금 등록" : "출금 등록"}
              </button>

              <button
                type="button"
                disabled={
                  selectedItem.isApprovalDocument || saving || paymentSaving || attachmentBusy
                }
                className="erp-primary-button"
                onClick={() => openEditItemForm(selectedItem)}
              >
                수정
              </button>

              <button
                type="button"
                disabled={
                  selectedItem.isApprovalDocument || saving || paymentSaving || attachmentBusy
                }
                className="finance-detail-delete"
                onClick={handleItemDelete}
              >
                삭제
              </button>
            </div>
          </section>
        }
      />
    </div>
  );
}
