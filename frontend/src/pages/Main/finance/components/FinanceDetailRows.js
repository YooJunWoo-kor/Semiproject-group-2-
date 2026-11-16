//재무 공통 UI: 기존 table > tbody 안에서 항목명·값 행을 재사용합니다.
import React from 'react';

export default function FinanceDetailRows({ rows = [] }) {
  return <>{rows.map(([label, value]) => <tr key={label}>
    <th scope="row">{label}</th>
    <td>{value}</td>
  </tr>)}</>;
}
