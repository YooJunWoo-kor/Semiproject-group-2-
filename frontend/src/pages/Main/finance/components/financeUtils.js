// 재무 전용 유틸: 오류·한국 날짜·카드·승인 문서·급여 데이터 변환.
// 전체 프로젝트 공용 utils와 분리하여 재무관리 안에서 사용합니다.
export function getFinanceError(error, fallbackMessage) {
  return error.response?.data?.message || fallbackMessage;
}

export function koreaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function toFinanceCard(card) {
  return {
    id: card.card_id,
    cardName: card.card_name,
    departmentId: card.department_id,
    department: card.department_name || '미지정',
    managerId: card.employee_id,
    managerName: card.manager_name || '미지정',
    currentUsage: Number(card.monthly_usage ?? 0),
    monthlyLimit: Number(card.monthly_limit ?? 0),
    remainingLimit: Number(card.remaining_limit ?? 0),
    status: card.card_status || '미지정'
  };
}

// 승인 문서 → 거래 목록
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

// 승인 급여 → 매입 목록
// 승인된 기안서(my_draft.status = 'APPROVED')에 연결된
// 월별 급여 집계를 매입 목록 행으로 변환합니다.
export function toPayrollPurchaseRows(summaries) {
  const seen = new Set();
  return summaries.flatMap(payroll => {
    if (payroll.approval_status !== 'APPROVED') return [];
    const month = String(payroll.pay_month || '');
    const gross = Number(payroll.gross_pay);
    const count = Number(payroll.employee_count);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || seen.has(month) || !Number.isSafeInteger(gross) || gross < 0 || !Number.isSafeInteger(count) || count <= 0) return [];
    seen.add(month);
    const duplicateNote = Number(payroll.payroll_count) > count ? ' · 중복 급여 확인 필요' : '';
    return [{
      id: `payroll-month-${month}`,
      transactionId: null,
      isPayroll: true,
      type: 'PURCHASE',
      date: month,
      dueDate: '',
      itemName: `${month.slice(0, 4)}년 ${Number(month.slice(5))}월 월급 (인건비)`,
      customer: '임직원',
      spec: `${count}명 · 급여 승인 완료${duplicateNote}`,
      quantity: null,
      unitPrice: null,
      supplyAmount: gross,
      vat: 0,
      totalAmount: gross,
      status: ['지급완료', '일부 지급', '지급대기'].includes(payroll.payment_status) ? payroll.payment_status : '지급대기',
      closingDay: null
    }];
  });
}
