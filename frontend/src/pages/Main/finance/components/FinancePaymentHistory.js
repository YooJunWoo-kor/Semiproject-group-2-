import FinanceSummaryBox from './FinanceSummaryBox';
//재무 공통 UI: 계좌·카드·거래 전표의 입출금 이력 표.
import React, { useState } from 'react';

export default function FinancePaymentHistory({ payments = [], className = '', showPartner = false, amountSuffix = '원', statusLabel = '처리 상태', enablePeriodFilter = false, currency = '', currentBalance = null }) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [allPeriods, setAllPeriods] = useState(false);
  const visiblePayments = enablePeriodFilter && !allPeriods
    ? payments.filter(payment => String(payment.payment_date || '').slice(0, 7) === month)
    : payments;
  // 실제 완료된 입출금만 합산하며 대기·취소 내역은 합계에서 제외합니다.
  const completedPayments = visiblePayments.filter(payment => ['완료', 'COMPLETED'].includes(payment.payment_status));
  const totalFor = direction => completedPayments
    .filter(payment => payment.payment_direction === direction)
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  function changeMonth(offset) {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    const nextYear = date.getFullYear();
    if (nextYear < 1900 || nextYear > 9999) return;
    setMonth(`${nextYear}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return <>
    {enablePeriodFilter && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8, margin: 0 }}>
        <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4, margin: 0, width: 'auto', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={allPeriods} onChange={event => setAllPeriods(event.target.checked)} />전체 기간
        </label>
        <button type="button" aria-label="이전 월" disabled={allPeriods} onClick={() => changeMonth(-1)}>◀</button>
        <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0, width: 'auto', whiteSpace: 'nowrap' }}>조회 월
          <input type="month" style={{ width: 145, margin: 0, boxSizing: 'border-box' }} min="1900-01" max="9999-12" value={month} disabled={allPeriods}
            onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} />
        </label>
        <button type="button" aria-label="다음 월" disabled={allPeriods} onClick={() => changeMonth(1)}>▶</button>
      </div>
      <FinanceSummaryBox items={[
        { key: 'income', label: '입금 합계', value: `${totalFor('입금').toLocaleString()} ${currency || amountSuffix}` },
        { key: 'expense', label: '출금 합계', value: `${totalFor('출금').toLocaleString()} ${currency || amountSuffix}` },
        ...(currentBalance !== null ? [{ key: 'balance', label: '현재 잔액', value: `${Number(currentBalance).toLocaleString()} ${currency || amountSuffix}` }] : [])
      ]} />
    </div>}
    <div className={`table-shell ${className}`.trim()} style={enablePeriodFilter ? { overflowX: 'auto' } : undefined}>
    <table style={enablePeriodFilter ? { width: '100%', minWidth: 640, tableLayout: 'auto' } : undefined}>
      <thead><tr>
        <th scope="col">처리 날짜</th>
        {showPartner && <th scope="col">거래처</th>}
        <th scope="col">구분</th>
        <th scope="col">결제수단</th>
        <th scope="col">금액</th>
        <th scope="col">{statusLabel}</th>
      </tr></thead>
      <tbody>{visiblePayments.map(payment => <tr key={payment.payment_id}>
        <td>{payment.payment_date}</td>
        {showPartner && <td>{payment.company_name || '-'}</td>}
        <td>{payment.payment_direction}</td>
        <td>{payment.payment_method}</td>
        <td>{Number(payment.amount).toLocaleString()}{amountSuffix}</td>
        <td>{payment.payment_status}</td>
      </tr>)}
        {enablePeriodFilter && visiblePayments.length === 0 && <tr><td colSpan={showPartner ? 6 : 5} style={{ textAlign: 'center', padding: 24 }}>조회 기간에 거래내역이 없습니다.</td></tr>}
      </tbody>
    </table>
  </div></>;
}
