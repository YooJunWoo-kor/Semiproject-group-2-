import React, { useEffect, useState } from "react";
import { getCategoryDropdownLabel } from "./paymentManagementModel";

export default function PaymentCategoryFilter({ groups, selectedCodes, onChange, disabled, resetKey }) {
  
  const [open, setOpen] = useState(false);
  const [rootElement, setRootElement] = useState(null);
  const [triggerElement, setTriggerElement] = useState(null);
  const items = groups.flatMap((group) => group.items);
  const selected = items.filter((item) => selectedCodes.includes(item.key));
  const allSelected = items.length > 0 && selected.length === items.length;
  useEffect(() => {
    setOpen(false);
  }, [resetKey, disabled]);
  useEffect(() => {
    if (!open) return undefined;
    function outside(event) {
      if (!rootElement?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerElement?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, rootElement, triggerElement]);
  function close() {
    setOpen(false);
    triggerElement?.focus();
  }
  const label = getCategoryDropdownLabel(selected, allSelected);
  function toggleAllCategories(checked) {
    if (checked) {
      onChange(items.map((item) => item.key));
      return;
    }
    onChange([]);
  }
  function toggleCategory(key, checked) {
    if (checked) {
      onChange([...selectedCodes, key]);
      return;
    }
    onChange(selectedCodes.filter((code) => code !== key));
  }
  return (
    <div
      className="pm-category-dropdown"
      ref={setRootElement}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="pm-dropdown-trigger"
        ref={setTriggerElement}
        disabled={disabled}
        aria-expanded={open}
        aria-controls="pm-category-options"
        aria-label={`세부 항목: ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          id="pm-category-options"
          className="pm-dropdown-popover"
          role="group"
          aria-label="세부 항목 선택"
        >
          <h4>세부 항목 선택</h4>
          <label className="pm-dropdown-check">
            <input
              type="checkbox"
              ref={(element) => {
                if (element) element.indeterminate = selected.length > 0 && !allSelected;
              }}
              checked={allSelected}
              onChange={(event) => toggleAllCategories(event.target.checked)}
            />
            전체 선택
          </label>
          <div className="pm-dropdown-options">
            {groups.map((group) => (
              <fieldset key={group.key}>
                <legend>{group.heading}</legend>
                {group.items.map((item) => (
                  <label key={item.key} className="pm-dropdown-check">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(item.key)}
                      onChange={(event) => toggleCategory(item.key, event.target.checked)}
                    />
                    {item.label}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="pm-dropdown-footer">
            <span>{selected.length}개 선택</span>
            <button type="button" onClick={close}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function PaymentSelectionChips({ selectedItems, tradeBusy, setSelectedCodes }) {
  return (
    <div className="pm-selection-chips">
      {selectedItems.map((item) => (
        <button
          type="button"
          key={item.key}
          disabled={tradeBusy}
          aria-label={`${item.label} 선택 해제`}
          onClick={() => setSelectedCodes((previous) => previous.filter((code) => code !== item.key))}
        >
          {item.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        className="pm-clear-selection"
        disabled={tradeBusy}
        onClick={() => setSelectedCodes([])}
      >
        선택 해제
      </button>
    </div>
  );
}
