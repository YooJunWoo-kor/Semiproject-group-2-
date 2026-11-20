// 담당 화면: 결재·이력 / 승인 지급
// 역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.
import React from "react";
import { FinanceStatusBadge } from "../ui/FinanceDetailDisplay";
import { getApprovalStatusTone } from "../../models/financeApprovalModel";

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
