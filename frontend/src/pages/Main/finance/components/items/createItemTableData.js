// 담당 화면: 지출·거래 관리 / 급여
// 역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.
//PaginationTable에 전달할 화면 셀을 만듭니다.
import React from "react";
import { getSettlementLabel, getTradeApprovalStatus, isTradeOverdue, } from "../../models/financeItemTradeRules";

export default function createItemTableData({
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
}) {
  // PaginationTable 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tItemData = filteredList.map((item) => {
    function getDetailButtonLabel() {
      if (item.isPayrollDeduction) return "상세";

      if (item.isPayroll || item.isAdditionalPayroll) return "상세";

      if (item.isApprovalDocument) return "상세";

      return "전표";
    }
    function getDetailTitle() {
      if (item.isPayrollDeduction) return "급여 공제액 납부 내역";

      if (item.isPayroll) return "직원별 급여 상세";

      return undefined;
    }
    function getApprovalLabel() {
      if (getTradeApprovalStatus(item, approvedDocuments) === "APPROVED") return "승인";

      if (getTradeApprovalStatus(item, approvedDocuments) === "UNAPPROVED") return "미승인";

      return "승인 미확인";
    }
    function getItemDescription() {
      if (item.isPayroll || item.isAdditionalPayroll) return item.spec;

      if (item.isApprovalDocument) return "품목·수량 미등록";

      return `${item.spec} · ${item.quantity}개`;
    }
    function getClosingDescription() {
      if (item.isPayrollDeduction) return "(급여 공제액 · 별도 납부)";

      if (item.isPayroll) {
        if (scope?.view === "completed") return "(급여 실지급액)";

        return "(인건비 · 세전 급여 합계)";
      }
      if (item.closingDay) {
        if (Number(item.closingDay) === 31) return "(정기 마감: 매월 말일)";

        return `(정기 마감: 매월 ${item.closingDay}일)`;
      }
      return "(정기 마감일 미등록)";
    }
    function getDeadlineLabel() {
      if (item.isPayroll) return "급여 대상 월";

      if (item.isApprovalDocument) return "처리 마감";

      return "정산 마감";
    }
    const isSales = item.type === "SALES";
    return {
      content: [
        // 1. 구분 뱃지
        <span className={`status-badge ${isSales ? "status-success" : "status-danger"}`}>
          {isSales ? "매출" : "매입"}
        </span>,
        // 2. 거래일 + 마감일 (세로 2줄 결합)
        <div>
          <div>{item.date}</div>
          {/* 이번 거래의 실제 정산 마감일 */}
          <div>
            {getDeadlineLabel()}: {item.isPayroll ? item.date : item.dueDate || "미등록"}
          </div>
          <small className="subtext">{getClosingDescription()}</small>
        </div>,
        // 3. 거래처
        item.customer,
        // 4. 품목명 + 규격/수량 (세로 2줄 결합)
        <div>
          <strong>{item.itemName}</strong>
          <div className="subtext">{getItemDescription()}</div>
        </div>,
        // 5. 총 합계금액 (공급가/부가세는 덜어내고 최종 금액만 강조)
        <strong>
          {item.totalAmount == null ? "미등록" : `${item.totalAmount.toLocaleString()}원`}
        </strong>,
        // 6. 상태
        <div className="finance-trade-status">
          <span
            className={`status-badge ${getSettlementLabel(item.status) === "완료" ? "status-success" : "status-pending"}`}
          >
            {getSettlementLabel(item.status)}
          </span>
          <small className="subtext">{getApprovalLabel()}</small>
          {isTradeOverdue(item, today) && (
            <small className="finance-overdue-label">기한 초과</small>
          )}
        </div>,
        // 7. 관리 버튼
        <button
          type="button"
          disabled={
            saving || paymentSaving || attachmentBusy || payrollPaymentSaving || deductionSaving
          }
          title={getDetailTitle()}
          onClick={() => openVoucher(item.id)}
        >
          {getDetailButtonLabel()}
        </button>,
      ],
    };
  });
  return tItemData;
}
