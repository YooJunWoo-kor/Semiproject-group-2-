// 담당 화면: 재무 여러 화면에서 재사용
// 역할: 재무 버튼의 색상·크기·비활성·상호작용 스타일
import React, { useEffect, useRef, useState } from "react";

// 기존 color 속성은 유지하고, 실제 색상은 프로젝트 테마 변수에서 가져옵니다.
const COLORS = {
  blue: {
    soft: "var(--color-brand-soft)",
    text: "var(--color-brand)",
    line: "var(--color-brand)",
  },
  green: {
    soft: "var(--color-surface)",
    text: "var(--color-success)",
    line: "var(--color-success)",
  },
  purple: {
    soft: "var(--color-surface)",
    text: "var(--color-brand-dark)",
    line: "var(--color-brand-dark)",
  },
  orange: {
    soft: "var(--color-surface)",
    text: "var(--color-warning)",
    line: "var(--color-warning)",
  },
  red: {
    soft: "var(--color-surface)",
    text: "var(--color-danger)",
    line: "var(--color-danger)",
  },
  gray: {
    soft: "var(--color-surface)",
    text: "var(--color-muted)",
    line: "var(--color-line)",
  },
};

// 디자인과 상호작용 스타일을 컴포넌트 안에서 관리합니다.
// 기존 variant/size/native button 속성 사용법도 유지합니다.
export function FinanceButton({
  variant = "secondary",
  size = "medium",
  color,
  className = "",
  style,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}) {
  const buttonRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [fieldsetDisabled, setFieldsetDisabled] = useState(false);

  // disabled fieldset 안의 버튼도 비활성 디자인을 적용합니다.
  useEffect(() => {
    const inherited = Boolean(buttonRef.current?.matches(":disabled")) && !disabled;
    setFieldsetDisabled((previous) => {
      if (previous === inherited) return previous;
      return inherited;
    });
  });
  const theme = COLORS[color] || COLORS.blue;
  const inactive = disabled || fieldsetDisabled;
  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    minHeight: 36,
    margin: 0,
    padding: "8px 14px",
    border: "1px solid var(--color-line)",
    borderRadius: 6,
    background: "var(--color-surface)",
    color: "var(--font-color1, var(--color-ink))",
    fontFamily: "inherit",
    fontSize: 12,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transform: "none",
  };
  if (color) {
    buttonStyle.background = theme.soft;
    buttonStyle.color = theme.text;
    buttonStyle.borderColor = theme.line;
  }
  if (variant === "primary") {
    buttonStyle.background = theme.text;
    buttonStyle.borderColor = theme.text;
    buttonStyle.color = "var(--color-surface)";
  }
  if (size === "small")
    Object.assign(buttonStyle, {
      height: 30,
      minHeight: 30,
      padding: "6px 8px",
      borderRadius: 8,
      lineHeight: "16px",
    });

  if (hovered && !inactive) {
    buttonStyle.filter = "brightness(.96)";
    if (variant !== "primary") {
      buttonStyle.background = theme.soft;
      buttonStyle.borderColor = theme.text;
    }
  }
  if (focused && !inactive) {
    buttonStyle.outline = `2px solid ${theme.text}`;
    buttonStyle.outlineOffset = 2;
  }
  if (inactive) {
    buttonStyle.opacity = 0.6;
    buttonStyle.cursor = "default";
  }
  return (
    <button
      {...props}
      ref={buttonRef}
      disabled={disabled}
      className={`finance-button ${className}`.trim()}
      data-finance-button=""
      data-variant={variant}
      data-size={size}
      style={{
        ...buttonStyle,
        ...style,
      }}
      onMouseEnter={(event) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
}
export function FinanceButtonGroup({ children, style, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`finance-button-group ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "nowrap",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
