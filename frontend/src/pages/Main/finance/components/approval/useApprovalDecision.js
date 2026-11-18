// 결재 이력 조회와 지정 결재자의 승인·반려를 담당합니다.
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import { getApprovals, getApprovalSteps, decideApproval } from "../../../../../utils/financeService";
import { toApproval } from "./approvalModel";

export default function useApprovalDecision({
  attachmentSaving,
  loginUser,
  paymentBusy,
  selectedApproval,
  selectedApprovalId,
  setApprovalList,
  setError,
  setPaymentFormOpen,
}) {
  const [decisionOpinion, setDecisionOpinion] = useState("");
  const [decisionPassword, setDecisionPassword] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [stepsRefresh, setStepsRefresh] = useState(0);
  // 선택한 문서의 결재 처리 이력
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState("");

  // 기안 등록폼

  // 선택한 문서가 바뀌면 결재 처리 이력을 조회합니다.
  useEffect(() => {
    let cancelled = false;
    setApprovalSteps([]);
    setStepsError("");
    if (selectedApprovalId === null || String(selectedApprovalId).startsWith("draft-")) {
      setStepsLoading(false);
      return;
    }
    async function loadSteps() {
      setStepsLoading(true);
      try {
        const data = await getApprovalSteps(selectedApprovalId);
        if (!cancelled) {
          setApprovalSteps(data);
        }
      } catch (err) {
        if (!cancelled) {
          setStepsError(getFinanceError(err, "결재 처리 이력을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setStepsLoading(false);
        }
      }
    }
    loadSteps();

    // 다른 문서를 선택하면 이전 요청의 결과는 무시합니다.
    return () => {
      cancelled = true;
    };
  }, [selectedApprovalId, stepsRefresh]);

  // 다른 문서를 열면 이전 의견과 비밀번호를 지웁니다.
  useEffect(() => {
    setPaymentFormOpen(false);
    setDecisionOpinion("");
    setDecisionPassword("");
    setDecisionError("");
    setDecisionMessage("");
  }, [selectedApprovalId]);

  // 목록에 있는 부서명으로 검색 선택 항목을 만듭니다.

  const currentStep = approvalSteps.find((step) => step.step_status !== "승인");
  const canDecide =
    selectedApproval?.status === "대기" &&
    !stepsLoading &&
    !stepsError &&
    currentStep?.step_status === "대기" &&
    Number(currentStep.employee_id) === Number(loginUser?.employee_id);
  async function handleDecision(decision) {
    if (decisionSaving || attachmentSaving || paymentBusy || !canDecide) return;
    if (!decisionPassword) {
      setDecisionError("결재를 처리하려면 로그인 비밀번호를 입력해 주세요.");
      return;
    }
    if (decision === "반려" && !decisionOpinion.trim()) {
      setDecisionError("반려 사유를 입력해 주세요.");
      return;
    }
    setDecisionSaving(true);
    setDecisionError("");
    setDecisionMessage("");
    try {
      const result = await decideApproval(selectedApprovalId, {
        employee_id: loginUser.employee_id,
        password: decisionPassword,
        decision,
        opinion: decisionOpinion.trim(),
      });
      // 서버에서 확정한 상태를 즉시 반영합니다. 지급·계좌 잔액은 변경하지 않습니다.
      setApprovalList((previous) =>
        previous.map((item) => {
          if (item.id === selectedApprovalId) {
            return { ...item, status: result.approval_status };
          }
          return item;
        }),
      );
      setApprovalSteps([]);
      setDecisionOpinion("");
      setDecisionMessage(result.message);
      setStepsRefresh((previous) => previous + 1);
      try {
        const data = await getApprovals();
        setApprovalList(data.map(toApproval));
        setError("");
      } catch {
        setError("결재 처리는 완료됐지만 목록 재조회에 실패했습니다. 새로고침해 확인해 주세요.");
      }
    } catch (err) {
      setDecisionError(
        getFinanceError(err, "처리 결과를 확인하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요."),
      );
      // 중복 요청이나 통신 오류가 나면 실제 DB 상태와 결재 순서를 다시 확인합니다.
      setStepsRefresh((previous) => previous + 1);
      try {
        const data = await getApprovals();
        setApprovalList(data.map(toApproval));
      } catch {
        setError("최신 결재 상태를 불러오지 못했습니다. 새로고침해 확인해 주세요.");
      }
    } finally {
      setDecisionPassword("");
      setDecisionSaving(false);
    }
  }
  return {
    decisionOpinion,
    setDecisionOpinion,
    decisionPassword,
    setDecisionPassword,
    decisionSaving,
    decisionError,
    decisionMessage,
    approvalSteps,
    stepsLoading,
    stepsError,
    canDecide,
    handleDecision,
  };
}
