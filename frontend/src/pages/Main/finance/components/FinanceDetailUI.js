import React, { useLayoutEffect, useId, useRef } from 'react';

//재무 공통 UI: 기존 table > tbody 안에서 항목명·값 행을 재사용합니다.

export function FinanceDetailRows({ rows = [] }) {
  return <>{rows.map(([label, value]) => <tr key={label}>
    <th scope="row">{label}</th>
    <td>{value}</td>
  </tr>)}</>;
}

// 재무 전용 공통 상세·거래내역 창
export function FinanceResourceModal({ title, onClose, busy = false, children, actions }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const originalPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    const previousWidth = document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    // 스크롤바가 실제로 사라져 늘어난 폭만 보정합니다.
    // scrollbar-gutter 등으로 공간이 이미 유지되면 보정하지 않습니다.
    const widthIncrease = Math.max(0, document.documentElement.clientWidth - previousWidth);
    if (widthIncrease > 0) body.style.paddingRight = `${originalPadding + widthIncrease}px`;
    dialog?.focus({ preventScroll: true });
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault();
        latest.current.onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
      style={{ width: 900, maxWidth: '100%', maxHeight: 'calc(100dvh - 40px)', background: 'var(--color-surface, white)', color: 'var(--color-text, #1e293b)', borderRadius: 14, padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
        <button type="button" aria-label={`${title} 닫기`} disabled={busy} onClick={onClose}
          style={{ background: 'transparent', border: 0, padding: 8, cursor: busy ? 'default' : 'pointer', fontSize: 20, color: 'inherit' }}>×</button>
      </div>
      <div style={{ minHeight: 0, overflow: 'auto', scrollbarGutter: 'stable' }}>{children}</div>
      {actions && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>{actions}</div>}
    </div>
  </div>;
}

// rows: [[항목명, 표시할 값], ...]. 화면별 데이터만 전달합니다.
export function FinanceResourceDetails({ rows = [] }) {
  return <div style={{ border: '1px solid var(--color-line)', borderRadius: 12, overflow: 'hidden' }}>
    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
      <colgroup><col style={{ width: '28%' }} /><col /></colgroup>
      <tbody>{rows.map(([label, value]) => <tr key={label}>
        <th scope="row" style={{ padding: '12px 14px', textAlign: 'left', background: 'var(--color-canvas, #f5f7fa)', borderBottom: '1px solid var(--color-line)', fontSize: 12, whiteSpace: 'normal' }}>{label}</th>
        <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid var(--color-line)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{value ?? '-'}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

//계좌·카드·결재의 검색 폼.
export function FinanceSearchForm({ filters = [], keyword, onSubmit, className = 'finance-card-search' }) {
  return <form className={className} onSubmit={onSubmit}>
    {filters.map(filter => <React.Fragment key={filter.id}>
      <label htmlFor={filter.id}>{filter.label}</label>
      <select id={filter.id} value={filter.value} onChange={event => filter.onChange(event.target.value)}>
        {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </React.Fragment>)}
    {keyword && <>
      <label htmlFor={keyword.id}>검색: </label>
      <input id={keyword.id} type="text" placeholder={keyword.placeholder} value={keyword.value} onChange={event => keyword.onChange(event.target.value)} />
    </>}
    <button type="submit">조회</button>
  </form>;
}


//상태 문구·색상 판정은 호출 화면에서 전달합니다.
export function FinanceStatusBadge({ tone = '', children }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}


// 재무 공통 합계 박스. 금액 계산과 단위 지정은 호출하는 화면에서 처리합니다.
export function FinanceSummaryBox({ items = [] }) {
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



// 좌측 목록·우측 달력 등 재무 화면의 2단 배치입니다.
// 글자·색상은 기존 공통 CSS를 상속하고, 여기서는 배치만 지정합니다.
export function FinanceTwoColumn({ children }) {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 16 }}>
      {children}
    </div>
  );
}

export function FinanceLayoutColumn({ side = 'left', children }) {
  const isRight = side === 'right';
  return (
    <div
      className={isRight ? 'finance-layout-column-divider' : undefined}
      style={isRight
        ? { flex: '0 0 38%', minWidth: 340, paddingLeft: 20 }
        : { flex: '1 1 62%', minWidth: 0 }}
    >
      {children}
    </div>
  );
}
