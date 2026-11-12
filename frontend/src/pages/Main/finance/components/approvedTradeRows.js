// 결재 문서를 거래로 저장하지 않고 목록에서 조회하는 용도의 변환입니다.
export function toApprovedTradeRows(documents) {
  const seen = new Set();
  return documents.filter((document) => {
    const id = String(document.document_id ?? '');
    if (document.is_payroll_draft || document.linked_transaction_id || document.approval_status !== '승인' || !(/^[1-9]\d*$/.test(id) || (document.source_type === 'draft' && /^draft-[1-9]\d*$/.test(id))) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((document) => ({
    id: `approval-document-${document.document_id}`,
    transactionId: null,
    sourceDocumentId: document.document_id,
    originType: document.source_type === 'draft' ? 'draft' : 'approval',
    originId: document.source_type === 'draft' ? Number(String(document.document_id).replace('draft-', '')) : Number(document.document_id),
    isApprovalDocument: true,
    isSourceDraft: document.source_type === 'draft',
    partnerId: null,
    type: 'APPROVAL',
    date: '미등록',
    dueDate: document.due_date || '',
    itemName: document.title || '제목 없음',
    customer: '미등록', spec: '미등록',
    quantity: null, unitPrice: null, supplyAmount: null, vat: null,
    totalAmount: document.amount == null ? null : Number(document.amount),
    // 승인 상태만으로 지급 완료 여부를 추정하지 않습니다.
    status: '미등록', closingDay: null,
    requester: document.requester_name || '미등록',
    department: document.department_name || '미등록',
    documentType: document.document_type || '미등록',
    content: document.content || '',
    createdAt: document.created_at || '미등록'
  }));
}
