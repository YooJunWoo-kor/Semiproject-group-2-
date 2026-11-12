// 이번 단계는 화면 확인 전용입니다. 실제 기안서 API 연결 시 false로 바꿉니다.
export const ENABLE_DRAFT_MOCK = false;

export const mockDrafts = [
  { draft_id: 1001, employee_id: null, title: '[더미 기안서] 사무용품 구매',
    document_type: '비용', content: '내업무 관리에서 최종 승인된 기안서의 표시 예시입니다.',
    status: 'APPROVED', department_name: '경영지원부서', requester_name: '더미 작성자',
    created_at: '2026-11-12 09:00', detail_data: { amount: 50000, due_date: '2026-11-20' } },
  { draft_id: 1002, employee_id: null, title: '[더미 기안서] 원재료 구매',
    document_type: '구매', status: 'PENDING', detail_data: { amount: 200000, due_date: '2026-11-23' } },
  { draft_id: 1003, employee_id: null, title: '[더미 기안서] 광고비 신청',
    document_type: '비용', status: 'REJECTED', detail_data: { amount: 100000, due_date: '2026-11-25' } }
];

// 숫자형 실제 결재 문서 ID와 충돌하지 않도록 별도 ID를 사용합니다.
export function isMockDraftId(id) {
  return typeof id === 'string' && id.startsWith('mock-draft-');
}

export function getApprovedMockDrafts(drafts = mockDrafts) {
  if (!ENABLE_DRAFT_MOCK) return [];
  const seen = new Set();
  return drafts.filter((draft) => {
    if (draft.status !== 'APPROVED' || seen.has(draft.draft_id)) return false;
    seen.add(draft.draft_id);
    return true;
  }).map((draft) => ({
    document_id: `mock-draft-${draft.draft_id}`,
    source_draft_id: draft.draft_id,
    is_mock_draft: true,
    employee_id: draft.employee_id,
    department_name: draft.department_name,
    requester_name: draft.requester_name,
    title: draft.title,
    content: draft.content,
    amount: draft.detail_data.amount,
    due_date: draft.detail_data.due_date,
    approval_status: '승인',
    document_type: draft.document_type,
    created_at: draft.created_at,
    payment_methods: '', attachment_count: 0
  }));
}


// 화면 확인용 거래처/품목/세액 예시입니다. 실제 기안서에서 추출한 정보가 아닙니다.
const mockTradeDetails = {
  1001: { customer: '더미 거래처', spec: '사무용품 1세트 (더미)',
    supplyAmount: 45455, vat: 4545 }
};

// 결제(지출) 관리와 같은 승인 데이터만 사용합니다.
// 승인(결재 상태)과 미정산(지급 상태)은 서로 다른 상태입니다.
export function getApprovedMockTradeItems(drafts = mockDrafts) {
  return getApprovedMockDrafts(drafts).filter((approval) =>
    approval.approval_status === '승인' && mockTradeDetails[approval.source_draft_id]
  ).map((approval) => {
    const detail = mockTradeDetails[approval.source_draft_id];
    return {
      id: approval.document_id,
      transactionId: approval.document_id,
      sourceDraftId: approval.source_draft_id,
      isMockDraft: true,
      partnerId: null,
      type: 'PURCHASE',
      date: approval.created_at.slice(0, 10),
      dueDate: approval.due_date,
      itemName: approval.title,
      customer: detail.customer,
      spec: detail.spec,
      quantity: 1,
      unitPrice: detail.supplyAmount,
      supplyAmount: detail.supplyAmount,
      vat: detail.vat,
      totalAmount: Number(approval.amount),
      status: '미정산',
      closingDay: null
    };
  });
}
