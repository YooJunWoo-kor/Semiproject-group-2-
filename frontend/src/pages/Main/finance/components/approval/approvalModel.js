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
