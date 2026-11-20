// 담당 화면: 결재·이력 / 승인 지급
// 역할: 결재 문서 상세와 승인·반려·지급 등 관련 화면 연결
import { ApprovalSteps, ApprovalDecisionPanel } from "./ApprovalSteps";
import React from "react";
import { FinanceAttachments, ApprovalPayments } from "./ApprovalPaymentEvidence";
import { FinanceDetailRows } from "../ui/FinanceDetailDisplay";
import ModalBase from "../../../../../components/ModalBase";

export default function ApprovalDetailModal({
  approvalSteps,
  attachmentSaving,
  canAttach,
  canDecide,
  closeApprovalDetail,
  decisionError,
  decisionMessage,
  decisionOpinion,
  decisionPassword,
  decisionSaving,
  handleDecision,
  handlePaymentBusyChange,
  handlePaymentSaved,
  loginUser,
  paymentBusy,
  paymentFormOpen,
  refreshApprovalAttachments,
  selectedApproval,
  setApprovalModalElement,
  setAttachmentSaving,
  setDecisionOpinion,
  setDecisionPassword,
  setPaymentFormOpen,
  stepsError,
  stepsLoading,
}) {
  function renderPaymentSection() {
    if (selectedApproval.isSourceDraft || selectedApproval.isLinkedTrade)
      return (
        <p role="status">
          {selectedApproval.isLinkedTrade
            ? "거래로 연결된 문서입니다. 거래·정산 탭의 전표에서 지급해주세요."
            : "내업무 관리에서 최종 승인된 기안서입니다. 품목관리에서 거래정보를 등록한 뒤 지급할 수 있습니다."}
        </p>
      );

    return (
      <ApprovalPayments
        key={selectedApproval.id}
        embedded
        paymentFormOpen={paymentFormOpen}
        onFormOpenChange={setPaymentFormOpen}
        approval={selectedApproval}
        loginUser={loginUser}
        blocked={decisionSaving || attachmentSaving}
        onBusyChange={handlePaymentBusyChange}
        onPaid={handlePaymentSaved}
      />
    );
  }
  return (
    <div
      ref={setApprovalModalElement}
      className="finance-registration-modal finance-approval-detail"
    >
      <ModalBase
        title={paymentFormOpen ? "지출 지급 등록" : "결재 문서 상세정보"}
        onClose={closeApprovalDetail}
        layout={
          <section aria-label="결재 문서 상세정보">
            <div hidden={paymentFormOpen}>
              <div className="table-shell">
                <table className="finance-approval-fields">
                  <tbody>
                    <FinanceDetailRows
                      rows={[
                        ["문서 ID", selectedApproval.id],
                        ["제목", selectedApproval.title],
                        ["문서 유형", selectedApproval.documentType],
                        ["상신 부서", selectedApproval.department],
                        ["작성자", selectedApproval.requester],
                        [
                          "신청 금액",
                          selectedApproval.amount == null
                            ? "미등록"
                            : `${selectedApproval.amount.toLocaleString()}원`,
                        ],
                        ["등록된 결제수단", selectedApproval.paymentMethod],
                        ["처리 마감일", selectedApproval.deadline],
                        ["진행 상태", selectedApproval.status],
                        ["작성일시", selectedApproval.createdAt],
                        ["첨부파일 수", `${selectedApproval.attachmentCount}건`],
                      ]}
                    />

                    <tr>
                      <th scope="row">내용</th>
                      <td
                        style={{
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selectedApproval.content || "작성된 내용이 없습니다."}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {renderPaymentSection()}{" "}
            <div hidden={paymentFormOpen}>
              <FinanceAttachments
                key={selectedApproval.id}
                documentId={selectedApproval.id}
                employeeId={loginUser?.employee_id}
                canUpload={canAttach}
                blocked={decisionSaving || paymentBusy}
                onBusyChange={setAttachmentSaving}
                onUploaded={refreshApprovalAttachments}
              />

              <h3>결재자 및 처리 이력</h3>

              {
                <ApprovalSteps
                  approvalSteps={approvalSteps}
                  selectedApproval={selectedApproval}
                  stepsError={stepsError}
                  stepsLoading={stepsLoading}
                />
              }
              {selectedApproval.status === "대기" && !stepsLoading && !stepsError && (
                <ApprovalDecisionPanel
                  attachmentSaving={attachmentSaving}
                  canDecide={canDecide}
                  decisionOpinion={decisionOpinion}
                  decisionPassword={decisionPassword}
                  decisionSaving={decisionSaving}
                  handleDecision={handleDecision}
                  paymentBusy={paymentBusy}
                  setDecisionOpinion={setDecisionOpinion}
                  setDecisionPassword={setDecisionPassword}
                />
              )}
              {decisionSaving && <p role="status">결재를 저장하는 중입니다.</p>}
              {decisionError && <p role="alert">{decisionError}</p>}
              {decisionMessage && <p role="status">{decisionMessage}</p>}
            </div>
          </section>
        }
      />
    </div>
  );
}
