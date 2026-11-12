// APPROVED인 기안서와 연결된 급여만 서버와 화면에서 함께 확인합니다.
export function toPayrollPurchaseRows(summaries) {
  const seen = new Set();
  return summaries.flatMap((payroll) => {
    if (payroll.approval_status !== 'APPROVED') return [];
    const month = String(payroll.pay_month || '');
    const gross = Number(payroll.gross_pay);
    const count = Number(payroll.employee_count);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || seen.has(month)
        || !Number.isSafeInteger(gross) || gross < 0
        || !Number.isSafeInteger(count) || count <= 0) return [];
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
      status: ['지급완료', '일부 지급', '지급대기'].includes(payroll.payment_status)
        ? payroll.payment_status : '지급대기',
      closingDay: null
    }];
  });
}
