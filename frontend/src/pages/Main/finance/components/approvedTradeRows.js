// 원본 상태는 유지하고 표시·필터에만 승인/미승인을 사용합니다.
export function normalizeApprovalStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  if (['승인', 'APPROVED'].includes(status)) return 'APPROVED';
  if (['대기', '승인대기', '결재대기', '진행중', '반려', '미승인', 'PENDING', 'WAITING', 'IN_PROGRESS', 'REJECTED'].includes(status)) return 'UNAPPROVED';
  return 'UNKNOWN';
}

// 결재 문서를 거래로 저장하지 않고 조회합니다. 승인된 급여는 기존 월별 행을 사용합니다.
export function toApprovedTradeRows(documents, payrollMonths = []) {
  const seen = new Set();
  return documents.filter(document => {
    const id = String(document.document_id ?? '');
    const status = normalizeApprovalStatus(document.approval_status);
    const months = document.payroll_months || [];
    const payrollCovered = document.is_payroll_draft && status === 'APPROVED' && months.length > 0 && months.every(month => payrollMonths.includes(month));
    if (payrollCovered || document.linked_transaction_id || status === 'UNKNOWN' || !(/^[1-9]\d*$/.test(id) || document.source_type === 'draft' && /^draft-[1-9]\d*$/.test(id)) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(document => ({
    id: `approval-document-${document.document_id}`,
    transactionId: null,
    sourceDocumentId: document.document_id,
    originType: document.source_type === 'draft' ? 'draft' : 'approval',
    originId: document.source_type === 'draft' ? Number(String(document.document_id).replace('draft-', '')) : Number(document.document_id),
    isApprovalDocument: true,
    isPayrollDraft: Boolean(document.is_payroll_draft),
    approvalStatus: document.approval_status,
    originalApprovalStatus: document.original_approval_status || document.approval_status,
    isSourceDraft: document.source_type === 'draft',
    partnerId: null,
    type: 'PURCHASE',
    date: String(document.created_at || '').slice(0, 10) || '미등록',
    dueDate: document.due_date || '',
    itemName: document.title || '제목 없음',
    customer: document.is_payroll_draft ? '임직원' : '미등록',
    spec: document.document_type || '미등록',
    quantity: null,
    unitPrice: null,
    supplyAmount: null,
    vat: null,
    totalAmount: document.amount == null ? null : Number(document.amount),
    // 결재 상태로 정산 완료 여부를 추정하지 않습니다.
    status: '미등록',
    closingDay: null,
    requester: document.requester_name || '미등록',
    department: document.department_name || '미등록',
    documentType: document.document_type || '미등록',
    content: document.content || '',
    createdAt: document.created_at || '미등록'
  }));
}
