// 급여 연결 정보는 서버가 제공하며, 실제 승인 상태도 다시 확인합니다.
export function toPayrollPurchaseRows(documents) {
  const seen = new Set();
  return documents.flatMap((document) => {
    const payroll = document.payroll_summary;
    if (!payroll || document.approval_status !== '승인' || document.linked_transaction_id) return [];
    const month = String(payroll.pay_month || '');
    const gross = Number(payroll.gross_pay);
    const count = Number(payroll.employee_count);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || seen.has(month)
        || !Number.isSafeInteger(gross) || gross <= 0
        || !Number.isSafeInteger(count) || count <= 0) return [];
    seen.add(month);
    return [{
      id: `payroll-document-${document.document_id}`,
      transactionId: null,
      sourceDocumentId: document.document_id,
      isPayroll: true,
      type: 'PURCHASE',
      date: month,
      dueDate: '',
      itemName: `${Number(month.slice(5))}월 월급 (인건비)`,
      customer: '임직원',
      spec: `${month} · ${count}명 · 승인 완료`,
      quantity: null,
      unitPrice: null,
      supplyAmount: gross,
      vat: 0,
      totalAmount: gross,
      status: '지급대기',
      closingDay: null
    }];
  });
}
