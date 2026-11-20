// 담당 화면: 재무 여러 화면에서 재사용
// 역할: FinanceField·FinanceControl·FinanceActions·FinanceSearchForm·FinanceFormStack 등 입력/검색 공통 UI
import React, { useEffect, useRef, useState } from "react";
import { FinanceButton } from "./FinanceButton";

// 입력 라벨과 여백을 모든 재무 폼에서 동일하게 사용합니다.
export function FinanceField({
  label,
  htmlFor,
  children,
  hint,
  error,
  nested = false,
  style,
  ...props
}) {
  return (
    <div
      {...props}
      style={{
        marginBottom: 14,
        minWidth: 0,
        ...style,
      }}
    >
      <label
        htmlFor={htmlFor}
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {label}
        {nested && children}
      </label>
      {!nested && children}
      {hint && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            color: "var(--color-muted)",
          }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            color: "var(--color-danger)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// 기본/포커스/비활성 스타일을 별도 CSS 파일 없이 관리합니다.
export function FinanceControl({
  as: Element = "input",
  style,
  disabled = false,
  onFocus,
  onBlur,
  ...props
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const [fieldsetDisabled, setFieldsetDisabled] = useState(false);
  useEffect(() => {
    const inherited = Boolean(ref.current?.matches(":disabled")) && !disabled;
    setFieldsetDisabled((previous) => {
      if (previous === inherited) return previous;
      return inherited;
    });
  });
  const inactive = disabled || fieldsetDisabled;
  const controlStyle = {
    display: "block",
    width: "100%",
    minWidth: 0,
    minHeight: 36,
    boxSizing: "border-box",
    padding: "8px 10px",
    margin: 0,
    border: "1px solid var(--color-line)",
    borderRadius: 6,
    background: "var(--color-surface)",
    color: "var(--font-color1, var(--color-ink))",
    fontFamily: "inherit",
    fontSize: 12,
    lineHeight: 1.5,
  };
  if (Element === "textarea") {
    controlStyle.minHeight = 88;
    controlStyle.resize = "vertical";
  }
  if (focused && !inactive) {
    controlStyle.outline = "2px solid var(--color-brand)";
    controlStyle.outlineOffset = 2;
  }
  if (inactive) {
    controlStyle.opacity = 0.6;
    controlStyle.cursor = "default";
  }
  return (
    <Element
      {...props}
      ref={ref}
      disabled={disabled}
      data-finance-control=""
      style={{
        ...controlStyle,
        ...style,
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
export function FinanceActions({ children, style, ...props }) {
  return (
    <div
      {...props}
      style={{
        display: "flex",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 16,
        marginBottom: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
const searchLabelStyle = {
  flexShrink: 0,
  width: "auto",
  margin: 0,
  padding: 0,
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};
export function FinanceSearchForm({
  filters = [],
  keyword,
  onSubmit,
  className = "finance-card-search",
  disabled = false,
  style,
  submitLabel = "조회",
}) {
  function handleKeywordKeyDown(event) {
    // 입력기에서 한글을 확정하는 Enter가 검색을 실행하지 않도록 합니다.
    const composing = event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229;
    if (event.key === "Enter" && composing) {
      event.preventDefault();
      return;
    }
    // 기존 거래처 Enter 핸들러와 form submit이 중복 실행되지 않게 합니다.
    if (event.key === "Enter" && keyword?.onKeyDown) event.preventDefault();
    keyword?.onKeyDown?.(event);
  }
  return (
    <form
      className={className}
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minWidth: 0,
        margin: "0 0 16px",
        padding: 0,
        ...style,
      }}
    >
      {filters.map((filter) => (
        <div
          key={filter.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "0 1 auto",
            minWidth: 0,
          }}
        >
          <label htmlFor={filter.id} style={searchLabelStyle}>
            {filter.label}
          </label>
          <FinanceControl
            as="select"
            id={filter.id}
            value={filter.value}
            disabled={disabled || filter.disabled}
            onChange={(event) => filter.onChange(event.target.value)}
            style={{
              flex: "0 1 140px",
              width: 140,
            }}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FinanceControl>
        </div>
      ))}
      {keyword && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 220px",
            minWidth: 0,
          }}
        >
          <label htmlFor={keyword.id} style={searchLabelStyle}>
            {keyword.label || "검색: "}
          </label>
          <FinanceControl
            id={keyword.id}
            type="text"
            placeholder={keyword.placeholder}
            value={keyword.value}
            disabled={disabled || keyword.disabled}
            onChange={(event) => keyword.onChange(event.target.value)}
            onKeyDown={handleKeywordKeyDown}
            style={{
              flex: "1 1 180px",
              width: "auto",
              minWidth: 100,
            }}
          />
        </div>
      )}
      <FinanceButton
        type="submit"
        variant="primary"
        color="blue"
        disabled={disabled}
        style={{
          flex: "0 0 auto",
          width: "auto",
          minWidth: 52,
          whiteSpace: "nowrap",
        }}
      >
        {submitLabel}
      </FinanceButton>
    </form>
  );
}

// 지급/납부 입력 묶음의 반복 grid 배치를 관리합니다.
export function FinanceFormStack({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}
