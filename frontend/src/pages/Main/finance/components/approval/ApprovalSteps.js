// 담당 화면: 결재·이력 / 승인 지급
// 역할: 결재 단계와 처리 이력 표시
import { FinanceButton } from "../ui/FinanceButton";
import { FinanceControl, FinanceField, FinanceActions } from "../ui/FinanceFormControls";
import React from "react";

export function ApprovalSteps({ approvalSteps, selectedApproval, stepsError, stepsLoading }) {
  if (stepsLoading) return <p>결재 처리 이력을 불러오는 중입니다.</p>;

  if (stepsError) return <p role="alert">{stepsError}</p>;

  if (approvalSteps.length === 0) {
    if (selectedApproval.isSourceDraft)
      return <p>기안서의 결재 이력은 내업무 관리에서 확인해주세요.</p>;

    return <p>등록된 결재 단계가 없습니다.</p>;
  }
  return (
    <div className="table-shell finance-approval-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">결재 순서</th>
            <th scope="col">결재자</th>
            <th scope="col">부서</th>
            <th scope="col">처리 상태</th>
            <th scope="col">처리일시</th>
            <th scope="col">의견</th>
          </tr>
        </thead>

        <tbody>
          {approvalSteps.map((step) => (
            <tr key={step.step_id}>
              <td>{step.step_order}</td>
              <td>{step.approver_name || "미지정"}</td>
              <td>{step.department_name || "미지정"}</td>
              <td>{step.step_status || "-"}</td>
              <td>{step.action_at || "-"}</td>
              <td
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {step.opinion || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ApprovalDecisionPanel({
  attachmentSaving,
  canDecide,
  decisionOpinion,
  decisionPassword,
  decisionSaving,
  handleDecision,
  paymentBusy,
  setDecisionOpinion,
  setDecisionPassword,
}) {
  if (canDecide)
    return (
      <section aria-label="결재 처리">
        <h3>결재 처리</h3>
        <fieldset disabled={decisionSaving || attachmentSaving || paymentBusy}>
          <FinanceField
            label={<>결재 의견 (반려 시 필수, 최대 500자)</>}
            htmlFor="decision-opinion"
          >
            <FinanceControl
              id="decision-opinion"
              maxLength={500}
              value={decisionOpinion}
              onChange={(e) => setDecisionOpinion(e.target.value)}
              as="textarea"
            />
          </FinanceField>
          <FinanceField label={<>로그인 비밀번호 확인</>} htmlFor="decision-password">
            <FinanceControl
              id="decision-password"
              type="password"
              autoComplete="current-password"
              value={decisionPassword}
              onChange={(e) => setDecisionPassword(e.target.value)}
            />
          </FinanceField>
          <p>지정된 결재자만 처리할 수 있습니다. 승인은 실제 지급과 별도로 처리됩니다.</p>
          <FinanceActions>
            <FinanceButton type="button" onClick={() => handleDecision("승인")} variant="primary">
              승인
            </FinanceButton>
            <FinanceButton type="button" onClick={() => handleDecision("반려")}>
              반려
            </FinanceButton>
          </FinanceActions>
        </fieldset>
      </section>
    );

  return (
    <p>현재 순서의 지정 결재자만 승인·반려할 수 있습니다. 결재자와 로그인 계정을 확인해 주세요.</p>
  );
}
