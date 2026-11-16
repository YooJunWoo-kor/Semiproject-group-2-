//재무 공통 UI: 계좌·카드·거래 전표의 입출금 이력 표.
import React from 'react';

export default function FinancePaymentHistory({ payments = [], className = '', showPartner = false, amountSuffix = '원', statusLabel = '처리 상태' }) {
  return <div className={`table-shell ${className}`.trim()}>
    <table>
      <thead><tr>
        <th scope="col">처리 날짜</th>
        {showPartner && <th scope="col">거래처</th>}
        <th scope="col">구분</th>
        <th scope="col">결제수단</th>
        <th scope="col">금액</th>
        <th scope="col">{statusLabel}</th>
      </tr></thead>
      <tbody>{payments.map(payment => <tr key={payment.payment_id}>
        <td>{payment.payment_date}</td>
        {showPartner && <td>{payment.company_name || '-'}</td>}
        <td>{payment.payment_direction}</td>
        <td>{payment.payment_method}</td>
        <td>{Number(payment.amount).toLocaleString()}{amountSuffix}</td>
        <td>{payment.payment_status}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
