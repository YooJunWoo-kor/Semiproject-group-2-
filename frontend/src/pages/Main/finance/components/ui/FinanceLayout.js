// 담당 화면: 재무 여러 화면에서 재사용
// 역할: FinanceResourceModal·FinanceTwoColumn·FinanceLayoutColumn 등 모달과 2단 배치 UI
import React, { useLayoutEffect, useId, useRef } from "react";

// 재무 전용 공통 상세·거래내역 창
export function FinanceResourceModal({ title, onClose, busy = false, children, actions }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const latest = useRef({
    onClose,
    busy,
  });
  latest.current = {
    onClose,
    busy,
  };
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const originalPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    const previousWidth = document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    // 스크롤바가 실제로 사라져 늘어난 폭만 보정합니다.
    // scrollbar-gutter 등으로 공간이 이미 유지되면 보정하지 않습니다.
    const widthIncrease = Math.max(0, document.documentElement.clientWidth - previousWidth);
    if (widthIncrease > 0) body.style.paddingRight = `${originalPadding + widthIncrease}px`;
    dialog?.focus({
      preventScroll: true,
    });
    function handleKeyDown(event) {
      if (event.key === "Escape" && !latest.current.busy) {
        event.preventDefault();
        latest.current.onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus({
          preventScroll: true,
        });
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus({
          preventScroll: true,
        });
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first.focus({
          preventScroll: true,
        });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected)
        previousFocus.focus({
          preventScroll: true,
        });
    };
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: 900,
          maxWidth: "100%",
          maxHeight: "calc(100dvh - 40px)",
          background: "var(--color-surface)",
          color: "var(--font-color1, var(--color-ink))",
          borderRadius: 14,
          padding: 24,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={`${title} 닫기`}
            disabled={busy}
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              padding: 8,
              cursor: busy ? "default" : "pointer",
              fontSize: 20,
              color: "inherit",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            minHeight: 0,
            overflow: "auto",
            scrollbarGutter: "stable",
          }}
        >
          {children}
        </div>
        {actions && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// 좌측 목록·우측 달력 등 재무 화면의 2단 배치입니다.
// 글자·색상은 기존 공통 CSS를 상속하고, 여기서는 배치만 지정합니다.
export function FinanceTwoColumn({ children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}
export function FinanceLayoutColumn({ side = "left", children }) {
  const isRight = side === "right";
  return (
    <div
      className={isRight ? "finance-layout-column-divider" : undefined}
      style={
        isRight
          ? {
              flex: "0 0 38%",
              minWidth: 340,
              paddingLeft: 20,
              borderLeft: "1px solid var(--color-line)",
            }
          : {
              flex: "1 1 62%",
              minWidth: 0,
            }
      }
    >
      {children}
    </div>
  );
}
