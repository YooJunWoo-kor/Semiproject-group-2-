import { normalizeApprovalStatus } from "../financeUtils";

export function getSettlementLabel(value) {
  const status = String(value || "").trim();
  if (
    [
      "일부 지급",
      "일부 납부",
      "일부 입금",
      "일부 출금",
      "일부 완료",
      "부분 정산",
      "PARTIAL",
      "PARTIALLY_PAID",
    ].includes(status)
  )
    return "일부 완료";
  if (
    [
      "완료",
      "지급완료",
      "납부완료",
      "입금완료",
      "출금완료",
      "정산완료",
      "PAID",
      "COMPLETED",
    ].includes(status)
  )
    return "완료";
  if (
    [
      "미정산",
      "대기",
      "지급대기",
      "납부대기",
      "입금대기",
      "출금대기",
      "입출금 예정",
      "PENDING",
      "UNPAID",
    ].includes(status)
  )
    return "대기";
  return "미등록";
}
export function getTradeApprovalStatus(item, documents = []) {
  if (item.isPayroll && !item.isPayrollDeduction) return "APPROVED";
  const document = documents.find(
    (row) =>
      (item.transactionId != null &&
        row.linked_transaction_id != null &&
        String(row.linked_transaction_id) === String(item.transactionId)) ||
      (item.linkedSourceType === "draft" &&
        row.source_type === "draft" &&
        String(row.document_id) === `draft-${item.linkedSourceId}`) ||
      (item.linkedSourceType === "approval" &&
        row.source_type !== "draft" &&
        String(row.document_id) === String(item.linkedSourceId)),
  );
  return normalizeApprovalStatus(
    document?.approval_status ?? item.approvalStatus,
  );
}
export function isTradeOverdue(item, today) {
  const dueDate = String(item.dueDate || "").slice(0, 10);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dueDate) &&
    dueDate < today &&
    getSettlementLabel(item.status) !== "완료"
  );
}
export function compareTradeNewest(left, right) {
  const dateKey = (item) => {
    const value = String(item.date || item.createdAt || "").slice(0, 10);
    if (/^\d{4}-\d{2}$/.test(value)) return value + "-01";
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  };
  const dateOrder = dateKey(right).localeCompare(dateKey(left));
  if (dateOrder) return dateOrder;
  const createdOrder = String(right.createdAt || "").localeCompare(
    String(left.createdAt || ""),
  );
  if (createdOrder) return createdOrder;
  // 같은 날짜/작성시각이면 등록 번호 내림차순, 최종적으로 ID로 순서를 고정합니다.
  const number = (item) =>
    Number(String(item.id ?? "").match(/\d+$/)?.[0] || 0);
  return (
    number(right) - number(left) ||
    String(right.id ?? "").localeCompare(String(left.id ?? ""))
  );
}
