import React from "react";
import { FinanceStatusBadge } from "../FinanceDetailUI";
import { getApprovalStatusTone } from "./approvalModel";

export default function createApprovalTableData({
  attachmentSaving,
  decisionSaving,
  filteredApprovals,
  openApprovalDetail,
  paymentBusy,
}) {
  const tApprovalData = filteredApprovals.map((item) => {
    const statusClass = getApprovalStatusTone(item.status);
    return {
      content: [
        item.id,
        item.department,
        item.requester,
        <strong>{item.title}</strong>,
        item.amount == null ? "미등록" : `${item.amount.toLocaleString()}원`,
        item.paymentMethod,
        item.attachmentCount > 0 ? `${item.attachmentCount}건` : "미첨부",
        item.deadline,
        <FinanceStatusBadge tone={statusClass}>{item.status}</FinanceStatusBadge>,
        <button
          type="button"
          disabled={decisionSaving || attachmentSaving || paymentBusy}
          onClick={() => openApprovalDetail(item.id)}
        >
          상세
        </button>,
      ],
    };
  });
  return tApprovalData;
}
