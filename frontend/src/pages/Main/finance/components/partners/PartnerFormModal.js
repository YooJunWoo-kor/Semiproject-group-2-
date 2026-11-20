// 담당 화면: 거래처 관리
// 역할: 거래처 등록·수정 입력 창
import React from "react";
import { FinanceField, FinanceControl, FinanceButton, FinanceActions, } from "../ui/FinanceDetailDisplay";
import ModalBase from "../../../../../components/ModalBase";
import { partnerCalendarColors } from "../../models/financePartnerModel";

export default function PartnerFormModal({
  closeRegistrationModal,
  editingPartnerId,
  formError,
  handlePartnerChange,
  handlePartnerSubmit,
  partnerForm,
  saving,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title={editingPartnerId === null ? "신규 거래처 등록" : "거래처 수정"}
        onClose={closeRegistrationModal}
        layout={
          <form onSubmit={handlePartnerSubmit}>
            {/* 같은 구조의 문자 입력칸은 map으로 만듭니다. */}
            {[
              {
                name: "company_name",
                label: "거래처명",
                required: true,
                max: 100,
              },
              {
                name: "tax_id",
                label: "사업자번호",
                max: 30,
              },
              {
                name: "representative_name",
                label: "대표자",
                max: 50,
              },
              {
                name: "company_phone",
                label: "연락처",
                max: 30,
              },
              {
                name: "company_address",
                label: "주소",
                max: 255,
              },
              {
                name: "company_type",
                label: "업체 유형",
                max: 30,
              },
              {
                name: "bank_name",
                label: "은행명",
                max: 50,
              },
              {
                name: "account_number",
                label: "계좌번호",
                max: 50,
              },
              {
                name: "account_holder",
                label: "예금주",
                max: 100,
              },
            ].map((field) => (
              <FinanceField
                key={field.name}
                label={
                  <>
                    {field.label}
                    {field.required ? " *" : ""}
                  </>
                }
                htmlFor={`partner-${field.name}`}
              >
                <FinanceControl
                  id={`partner-${field.name}`}
                  name={field.name}
                  type="text"
                  value={partnerForm[field.name]}
                  onChange={handlePartnerChange}
                  required={field.required}
                  maxLength={field.max}
                  disabled={saving}
                />
              </FinanceField>
            ))}

            <FinanceField label={<>거래 구분 *</>} htmlFor="partner-trade-role">
              <FinanceControl
                id="partner-trade-role"
                name="trade_role"
                value={partnerForm.trade_role}
                onChange={handlePartnerChange}
                disabled={saving}
                as="select"
              >
                <option value="매입">매입</option>
                <option value="매출">매출</option>
              </FinanceControl>
            </FinanceField>

            <FinanceField label={<>정기 마감일</>} htmlFor="partner-closing-day">
              <FinanceControl
                id="partner-closing-day"
                name="closing_day"
                type="number"
                min="1"
                max="31"
                step="1"
                placeholder="1~31, 31은 말일"
                value={partnerForm.closing_day}
                onChange={handlePartnerChange}
                disabled={saving}
              />
            </FinanceField>

            <fieldset className="finance-color-fieldset" disabled={saving}>
              <legend className="finance-color-legend">일정 색상</legend>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  cursor: "pointer",
                }}
              ></label>
              <div
                className="finance-color-options"
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  gap: 6,
                  overflowX: "auto",
                }}
              >
                {partnerCalendarColors.map(({ typeId, color }, index) => (
                  <label
                    key={typeId}
                    title={`색상 ${index + 1}: ${color}`}
                    className="finance-color-option"
                  >
                    <input
                      type="radio"
                      name="calendar_type_id"
                      value={String(typeId)}
                      checked={String(partnerForm.calendar_type_id) === String(typeId)}
                      onChange={handlePartnerChange}
                      aria-label={`일정 색상 ${index + 1}`}
                      className="finance-color-radio"
                    />
                    <span
                      aria-hidden="true"
                      className="finance-color-swatch"
                      style={{
                        backgroundColor: color,
                      }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <FinanceField label={<>메모</>} htmlFor="partner-memo">
              <FinanceControl
                id="partner-memo"
                name="memo"
                value={partnerForm.memo}
                onChange={handlePartnerChange}
                disabled={saving}
                as="textarea"
              />
            </FinanceField>

            {formError && <p role="alert">{formError}</p>}

            <FinanceActions>
              <FinanceButton type="submit" disabled={saving} variant="primary">
                {saving ? "저장 중..." : "저장"}
              </FinanceButton>
              <FinanceButton type="button" disabled={saving} onClick={closeRegistrationModal}>
                취소
              </FinanceButton>
            </FinanceActions>
          </form>
        }
      />
    </div>
  );
}
