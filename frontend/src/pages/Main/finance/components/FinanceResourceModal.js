// 재무 전용 공통 상세·거래내역 창. 상위 ModalBase와 CSS는 수정하지 않습니다.
import React, { useLayoutEffect, useId, useRef } from 'react';

export default function FinanceResourceModal({ title, onClose, busy = false, children, actions }) {
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
