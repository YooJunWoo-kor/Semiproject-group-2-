// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 결재 문서 변환·검색·기안/승인/지급 입력 검증·요청 데이터 계산을 담당합니다.
import { applyFinanceResourceSave } from "../utils/financeDataUtils";
import { canAccessFinance } from "../utils/financeDataUtils";

// 결재 문서 변환, 검색·요약 및 입력 기본값을 담당합니다.
export function toApproval(item) {
  return {
    id: item.document_id,
    isSourceDraft: item.source_type === "draft",
    isLinkedTrade: Boolean(item.linked_transaction_id),
    sourceDraftId: item.source_draft_id ?? null,
    employeeId: item.employee_id,
    department: item.department_name || "미지정",
    requester: item.requester_name || "미지정",
    title: item.title,
    content: item.content || "",
    amount: item.amount == null ? null : Number(item.amount),
    paymentMethod: item.payment_methods || "미등록",
    deadline: item.due_date || "-",
    attachmentCount: Number(item.attachment_count ?? 0),
    status: item.approval_status || "미지정",
    documentType: item.document_type || "-",
    createdAt: item.created_at || "-",
  };
}
export function getApprovalStatusTone(status) {
  if (status === "대기") return "status-pending";
  if (status === "반려") return "status-danger";
  return "status-success";
}
export function createApprovalDraftForm() {
  return {
    employee_id: "",
    approver_id: "",
    title: "",
    content: "",
    amount: "",
    due_date: "",
    document_type: "비용",
    category_code: "",
  };
}
export function getApprovalListView(approvalList, searchFilter) {
  // 목록에 있는 부서명으로 검색 선택 항목을 만듭니다.
  const departmentOptions = [...new Set(approvalList.map((item) => item.department))];

  // 상태와 부서 조건을 모두 만족하는 문서만 표시합니다.
  const filteredApprovals = approvalList.filter((item) => {
    const matchesStatus = searchFilter.status === "ALL" || item.status === searchFilter.status;
    const matchesDepartment =
      searchFilter.department === "ALL" || item.department === searchFilter.department;
    return matchesStatus && matchesDepartment;
  });
  // 요약은 검색 조건과 관계없이 전체 문서 기준입니다.
  const pendingCount = approvalList.filter((item) => item.status === "대기").length;
  const approvedAmount = approvalList
    .filter((item) => item.status === "승인")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const rejectedCount = approvalList.filter((item) => item.status === "반려").length;
  return {
    departmentOptions,
    filteredApprovals,
    pendingCount,
    approvedAmount,
    rejectedCount,
  };
}

// Model: 기안 검증과 결재 가능 여부·요청 데이터 계산을 담당합니다.
export function validateApprovalDraft(form) {
  if (form.title.trim() === "") return "제목을 입력해 주세요.";
  return "";
}
export function getApprovalDecisionState(steps, approval, loginUser, loading, error) {
  const currentStep = steps.find((step) => step.step_status !== "승인");
  let canDecide = false;
  if (
    approval?.status === "대기" &&
    !loading &&
    !error &&
    currentStep?.step_status === "대기" &&
    Number(currentStep.employee_id) === Number(loginUser?.employee_id)
  )
    canDecide = true;

  return {
    currentStep,
    canDecide,
  };
}
export function validateApprovalDecision(decision, password, opinion) {
  if (!password) return "결재를 처리하려면 로그인 비밀번호를 입력해 주세요.";
  if (decision === "반려" && !opinion.trim()) return "반려 사유를 입력해 주세요.";
  return "";
}
export function getApprovalDecisionPayload(loginUser, password, decision, opinion) {
  return {
    employee_id: loginUser.employee_id,
    password,
    decision,
    opinion: opinion.trim(),
  };
}
export function applyApprovalDecisionResult(rows, approvalId, result) {
  return applyFinanceResourceSave(
    rows,
    {
      id: approvalId,
      status: result.approval_status,
    },
    true,
  );
}

// 승인 문서 지급 Model: 화면 상태와 API 호출 없이 계산·검증합니다.
export function getApprovalPaymentState(
  summary,
  approval,
  loginUser,
  loading,
  error,
  bankAccounts,
  cards,
) {
  // 1. 지급 금액이 올바른 값인지 확인
  function isValidAmount(value) {
    if (value == null) return false;
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount >= 0;
  }

  // 2. 현재 문서의 지급 요약인지 확인
  const isSameDocument = Number(summary?.document_id) === Number(approval.id);
  const hasValidAmounts = [
    summary?.document_amount,
    summary?.paid_amount,
    summary?.remaining_amount,
  ].every(isValidAmount);
  const validSummary = Boolean(summary) && isSameDocument && hasValidAmounts;

  // 3. 로그인한 사용자의 지급 권한 확인
  const isLoggedIn = Number(loginUser?.employee_id) > 0;
  const isFinance = isLoggedIn && canAccessFinance(loginUser);

  // 4. 승인 상태와 남은 지급 금액 확인
  const isApproved = approval.status === "승인" && summary?.approval_status === "승인";
  const remaining = Number(summary?.remaining_amount);
  const hasRemainingAmount = remaining > 0;
  const isReady = !loading && !error;

  // 5. 지급 가능 여부
  const canPay = isApproved && isFinance && validSummary && hasRemainingAmount && isReady;

  // 6. 사용 가능한 계좌와 카드
  function isActive(status) {
    return status === "사용" || status === "ACTIVE";
  }
  const availableBanks = bankAccounts.filter((bank) => {
    const isKRW = bank.currency === "KRW";
    const isUsable = isActive(bank.account_status);
    return isKRW && isUsable;
  });
  const availableCards = cards.filter((card) => isActive(card.card_status));
  return {
    validSummary,
    isFinance,
    remaining,
    canPay,
    availableBanks,
    availableCards,
  };
}
export function createApprovalPaymentForm(paymentDate = "", amount = "") {
  return {
    payment_date: paymentDate,
    amount,
    payment_method: "계좌이체",
    account_id: "",
    card_id: "",
    password: "",
  };
}
export function changeApprovalPaymentForm(form, name, value) {
  const next = {
    ...form,
    [name]: value,
  };
  if (name === "payment_method") {
    next.account_id = "";
    next.card_id = "";
  }
  return next;
}
export function validateApprovalPayment(
  form,
  { canPay, remaining, availableBanks, availableCards, optionsLoading, bankError, cardError },
  currentDate,
) {
  const amount = Number(form.amount);
  if (!canPay) return "최신 지급 현황을 다시 확인해 주세요.";

  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining)
    return `지급액은 1원부터 남은 지급액 ${remaining.toLocaleString()}원까지 입력해 주세요.`;

  const date = new Date(`${form.payment_date}T00:00:00Z`);
  if (
    !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(form.payment_date) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== form.payment_date
  )
    return "올바른 지급일을 입력해 주세요.";

  if (!form.password) return "지급 등록자의 로그인 비밀번호를 입력해 주세요.";

  if (form.payment_method === "계좌이체") {
    const bank = availableBanks.find((item) => String(item.account_id) === form.account_id);
    if (optionsLoading || bankError || !bank) return "사용할 회사계좌를 선택해 주세요.";

    if (!Number.isSafeInteger(Number(bank.balance)) || Number(bank.balance) < amount)
      return "회사계좌의 잔액을 확인해 주세요.";
  } else if (form.payment_method === "법인카드") {
    const card = availableCards.find((item) => String(item.card_id) === form.card_id);
    if (optionsLoading || cardError || !card) return "사용할 법인카드를 선택해 주세요.";

    if (
      !Number.isSafeInteger(Number(card.remaining_limit)) ||
      Number(card.remaining_limit) < amount
    )
      return "법인카드의 잔여 한도를 확인해 주세요.";

    if (form.payment_date.slice(0, 7) !== currentDate.slice(0, 7))
      return "법인카드 지급일은 현재 월로 입력해 주세요.";
  } else if (form.payment_method !== "현금") return "올바른 결제수단을 선택해 주세요.";

  return "";
}
export function getApprovalPaymentPayload(form, loginUser) {
  let accountId = null;
  let cardId = null;
  if (form.payment_method === "계좌이체") accountId = Number(form.account_id);
  if (form.payment_method === "법인카드") cardId = Number(form.card_id);
  return {
    employee_id: loginUser.employee_id,
    password: form.password,
    payment_date: form.payment_date,
    amount: Number(form.amount),
    payment_method: form.payment_method,
    account_id: accountId,
    card_id: cardId,
  };
}

// 첨부 Model: 문서 구분, 업로드 조건과 표시값을 계산합니다.
export function isDraftApprovalDocument(documentId) {
  return String(documentId).startsWith("draft-");
}
export function validateApprovalAttachment(file) {
  if (!file) return "첨부할 이미지를 선택해주세요.";
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name))
    return "JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.";

  if (file.size > 5 * 1024 * 1024) return "파일은 최대 5MB까지 첨부할 수 있습니다.";
  if (Array.from(file.name).length > 255) return "파일명은 255자 이내로 작성해주세요.";
  return "";
}
export function formatApprovalAttachmentSize(value) {
  return `${(Number(value) / 1024).toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  })}KB`;
}
