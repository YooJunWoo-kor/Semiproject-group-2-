// 재무 공통 합계 박스. 금액 계산과 단위 지정은 호출하는 화면에서 처리합니다.
import React from 'react';

export default function FinanceSummaryBox({ items = [] }) {
  return <div aria-label="금액 요약" style={{
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 20px',
    padding: 12, border: '1px solid var(--color-line)', borderRadius: 10,
    fontSize: 16, lineHeight: 1.5
  }}>
    {items.map(item => <span key={item.key} style={{
      display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4,
      fontSize: 'inherit', lineHeight: 'inherit'
    }}>
      <span style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>{item.label}:</span>
      <strong style={{ fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 700 }}>{item.value}</strong>
    </span>)}
  </div>;
}
