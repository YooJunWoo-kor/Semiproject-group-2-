import React, { useId } from 'react';
import '../css/FilterControls.css';

// options: 선택 항목 목록 [{ value: '값', label: '표시 문구' }]
// value: 현재 선택된 값
// onChange: 선택이 바뀌었을 때 실행할 함수

// 1. 탭 버튼
export function FilterTabs({
  options = [],
  value,
  onChange,
  label = '구분',
  disabled = false,
}) {
  return (
    <ul className="grouplist" aria-label={label}>
      {options.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            className={value === option.value ? 'active' : ''}
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

// 2. 라디오 버튼 — 여러 항목 중 하나 선택
export function RadioGroup({
  options = [],
  value,
  onChange,
  label = '필터',
  disabled = false,
}) {
  const name = useId();

  return (
    <fieldset
      className="erp-choice-group"
      aria-label={label}
      disabled={disabled}
    >
      <legend>{label}</legend>

      {options.map((option) => (
        <label className="erp-choice" key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(event) => onChange(event.target.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

// 3. 체크박스 — 선택 / 해제
export function CheckboxFilter({
  checked,
  onChange,
  label,
  disabled = false,
}) {
  return (
    <label className="erp-choice">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

// 4. 선택창 — 드롭다운에서 항목 선택
export function SelectFilter({
  options = [],
  value,
  onChange,
  label = '상태',
  disabled = false,
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}