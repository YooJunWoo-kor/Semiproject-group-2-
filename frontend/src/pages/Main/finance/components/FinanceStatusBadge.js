//재무 공통 UI: 상태 문구·색상 판정은 호출 화면에서 전달합니다.
import React from 'react';

export default function FinanceStatusBadge({ tone = '', children }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
