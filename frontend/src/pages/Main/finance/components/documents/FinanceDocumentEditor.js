// 담당 화면: 영수증·청구서·견적서
// 역할: 고객 정보·문서 상세·품목·비고 입력 화면
import React from "react";
import { currencyDigits } from "../../utils/financeDocumentUtils";
import { getDocumentAccountLabel } from "../../models/financeDocumentModel";
import { FinanceControl } from "../ui/FinanceFormControls";
import { FinanceButton } from "../ui/FinanceButton";

function DocumentField({ label, required, validation, dateRole, ...props }) {
  return (
    <label className="fd-field">
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <FinanceControl
        data-validation={validation}
        data-date-role={dateRole}
        data-label={label}
        required={required}
        {...props}
      />
    </label>
  );
}

function DocumentCustomerFields({ title, value, onChange, children }) {
  const field = (name, label, props = {}) => {
    let maxLength = 100;
    if (name === "address") maxLength = 200;

    return (
      <DocumentField
        label={label}
        value={value[name]}
        onChange={(e) => onChange(name, e.target.value)}
        maxLength={maxLength}
        {...props}
      />
    );
  };
  return (
    <section className="fd-card">
      <h3>{title}</h3>
      {children}
      <div className="fd-grid">
        {field("name", "고객명 / 회사명", {
          required: true,
        })}
        {field("email", "이메일", {
          type: "email",
          validation: "email",
          placeholder: "example@company.com",
        })}
        {field("address", "주소")}
        {field("country", "국가")}
        {field("phone", "전화번호", {
          type: "tel",
          validation: "phone",
        })}
        {field("businessNumber", "사업자등록번호", {
          placeholder: "000-00-00000",
          validation: "businessNumber",
        })}
      </div>
    </section>
  );
}

export default function FinanceDocumentEditor({ type, state }) {
  const {
    config,
    data,
    saving,
    partners,
    partnerError,
    readOnly,
    accounts,
    setupError,
    rows,
    update,
    updateParty,
    updateItem,
    setFormElement,
    setStorageError,
    refreshValidity,
    handleSave,
    selectPartner,
    selectAccount,
    addItem,
  } = state;
  if (readOnly) return null;
  return (
    <form
      ref={setFormElement}
      className="fd-editor"
      noValidate
      onChangeCapture={(event) => {
        setStorageError("");
        refreshValidity(event.currentTarget);
      }}
      onBlurCapture={(event) => {
        const input = event.target;
        if (!input.matches("input, textarea, select") || input.disabled || input.readOnly) return;
        refreshValidity(event.currentTarget);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <fieldset
        className="fd-storage-fields"
        className="fd-storage-fields"
        disabled={saving || readOnly}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
          margin: 0,
          padding: 0,
          border: 0,
        }}
      >
        {setupError && (
          <p className="fd-storage-error" role="alert">
            {setupError}
          </p>
        )}

        <DocumentCustomerFields
          title={`${config.party} 정보`}
          value={data.customer}
          onChange={updateParty("customer")}
        >
          <div
            style={{
              marginBottom: 16,
            }}
          >
            {
              <>
                <label className="fd-field fd-partner-select">
                  <span>기존 거래처 선택 (선택사항)</span>
                  <FinanceControl value={data.partnerId} onChange={selectPartner} as="select">
                    <option value="">미등록 고객 / 직접 입력</option>
                    {partners.map((partner) => (
                      <option key={partner.partner_id} value={String(partner.partner_id)}>
                        {partner.company_name} (#{partner.partner_id})
                      </option>
                    ))}
                  </FinanceControl>
                </label>
                {partnerError && <p className="fd-storage-info subtext">{partnerError}</p>}
              </>
            }
          </div>
        </DocumentCustomerFields>
        <section className="fd-card">
          <h3>{config.title} 상세</h3>
          <div className="fd-grid">
            <DocumentField
              label={config.date}
              dateRole="start"
              type="date"
              required
              value={data.date}
              onChange={(e) => update("date", e.target.value)}
            />
            {config.extraDate && (
              <DocumentField
                label={config.extraDate}
                dateRole="end"
                type="date"
                min={data.date}
                required
                value={data.extraDate}
                onChange={(e) => update("extraDate", e.target.value)}
              />
            )}
            <label className="fd-field">
              <span>통화</span>
              <FinanceControl
                value={data.currency}
                onChange={(e) => update("currency", e.target.value)}
                as="select"
              >
                <option value="KRW">KRW — 원</option>
                <option value="USD">USD — 달러</option>
                <option value="EUR">EUR — 유로</option>
                <option value="JPY">JPY — 엔</option>
              </FinanceControl>
            </label>
            {type !== "estimate" && (
              <label className="fd-field">
                <span>{type === "receipt" ? "결제 방법" : "지급 방법"}</span>
                <FinanceControl
                  value={data.method}
                  onChange={(e) => update("method", e.target.value)}
                  as="select"
                >
                  <option>계좌이체</option>
                  <option>카드</option>
                  <option>현금</option>
                  <option>기타</option>
                </FinanceControl>
              </label>
            )}
            {type === "invoice" && data.method === "계좌이체" && (
              <label className="fd-field">
                <span>입금 계좌 *</span>
                {
                  <FinanceControl
                    required
                    value={data.accountId || ""}
                    onChange={selectAccount}
                    as="select"
                  >
                    <option value="">
                      {accounts.length ? "입금 계좌 선택" : "사용 가능한 등록 계좌가 없습니다"}
                    </option>
                    {accounts.map((account) => (
                      <option key={account.account_id} value={String(account.account_id)}>
                        {getDocumentAccountLabel(account)}
                      </option>
                    ))}
                  </FinanceControl>
                }
              </label>
            )}
          </div>
        </section>
        <section className="fd-card">
          <div className="fd-section-title">
            <h3>품목</h3>
            <span>부가세 별도</span>
          </div>
          {rows.map((item, index) => (
            <div className="fd-item" key={item.id}>
              <div className="fd-item-title">
                <strong>품목 {index + 1}</strong>
                <FinanceButton
                  type="button"
                  className="fd-text-button"
                  disabled={rows.length === 1}
                  onClick={() =>
                    update(
                      "items",
                      data.items.filter((row) => row.id !== item.id),
                    )
                  }
                  aria-label={`품목 ${index + 1} 삭제`}
                  size="small"
                >
                  삭제
                </FinanceButton>
              </div>
              <DocumentField
                label="품목명"
                required
                maxLength={150}
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                placeholder="예: 화장품 샘플 제작"
              />
              <div className="fd-item-numbers">
                <DocumentField
                  label="수량"
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9][0-9]{0,6}"
                  maxLength={7}
                  required
                  value={item.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && Number(value) <= 1000000)
                      updateItem(item.id, "quantity", value);
                  }}
                />
                <DocumentField
                  label="단가"
                  type="number"
                  min="0"
                  max="1000000000"
                  step={10 ** -currencyDigits(data.currency)}
                  required
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                />
                <DocumentField
                  label="세율 (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={item.taxRate}
                  onChange={(e) => updateItem(item.id, "taxRate", e.target.value)}
                />
              </div>
              <DocumentField
                label="추가 설명 (선택)"
                value={item.description}
                maxLength={300}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
            </div>
          ))}
          <FinanceButton
            type="button"
            className="fd-secondary"
            disabled={data.items.length >= 50}
            onClick={addItem}
            size="small"
          >
            ＋ 품목 추가
          </FinanceButton>
        </section>
        <section className="fd-card">
          <h3>비고</h3>
          <label className="fd-field">
            <span>안내 사항 / 추가 메모</span>
            <FinanceControl
              as="textarea"
              data-label="비고"
              rows={4}
              maxLength={2000}
              value={data.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="거래 조건, 감사 인사 등을 입력해주세요."
            />
          </label>
        </section>
      </fieldset>
    </form>
  );
}
