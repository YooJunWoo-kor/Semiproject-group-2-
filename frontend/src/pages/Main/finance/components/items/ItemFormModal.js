// 담당 화면: 지출·거래 관리 / 급여
// 역할: 거래·품목 등록 및 수정 입력 창
import { FinanceButton } from "../ui/FinanceButton";
import { FinanceControl, FinanceField, FinanceActions } from "../ui/FinanceFormControls";
import { calculateItemAmounts } from "../../models/financeItemTransactionModel";
import React from "react";
import ModalBase from "../../../../../components/ModalBase";

//화면 표시만 담당합니다. 상태와 처리는 Items.js에서 전달합니다.
export default function ItemFormModal({
  categoryError,
  closeRegistrationModal,
  editingItemId,
  formError,
  handleItemChange,
  handleItemSubmit,
  isExpenseRegistration,
  itemCategories,
  itemForm,
  linkingApproval,
  partnerOptions,
  saving,
}) {
  const amounts = calculateItemAmounts(itemForm);
  function getModalTitle() {
    if (linkingApproval) return "승인 지출 거래정보 등록";

    if (editingItemId === null) return "신규 매입·매출 거래 등록";

    return "거래 품목 수정";
  }
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title={getModalTitle()}
        onClose={closeRegistrationModal}
        layout={
          <form onSubmit={handleItemSubmit}>
            <fieldset disabled={saving}>
              {linkingApproval && (
                <p>
                  원본: {linkingApproval.itemName}
                  <br />
                  승인 금액: {linkingApproval.totalAmount.toLocaleString()}원 · 입력 합계가 이
                  금액과 같아야 합니다.
                </p>
              )}
              {!isExpenseRegistration && (
                <>
                  <FinanceField label={<>거래처 *</>} htmlFor="item-partner">
                    <FinanceControl
                      id="item-partner"
                      name="partner_id"
                      value={itemForm.partner_id}
                      onChange={handleItemChange}
                      required
                      as="select"
                    >
                      <option value="">거래처 선택</option>

                      {partnerOptions.map((partner) => (
                        <option key={partner.partner_id} value={partner.partner_id}>
                          {partner.company_name}
                        </option>
                      ))}
                    </FinanceControl>
                  </FinanceField>

                  <FinanceField label={<>거래 구분 *</>} htmlFor="item-trade-type">
                    <FinanceControl
                      id="item-trade-type"
                      disabled={Boolean(linkingApproval)}
                      name="trade_type"
                      value={itemForm.trade_type}
                      onChange={handleItemChange}
                      required
                      as="select"
                    >
                      <option value="매입">매입</option>
                      <option value="매출">매출</option>
                    </FinanceControl>
                  </FinanceField>
                </>
              )}
              <FinanceField label={<>거래 분류</>} htmlFor="item-category">
                <FinanceControl
                  id="item-category"
                  name="category_code"
                  value={itemForm.category_code || ""}
                  onChange={handleItemChange}
                  disabled={saving}
                  as="select"
                >
                  <option value="">
                    {linkingApproval
                      ? "원본 분류 유지 (없으면 미분류)"
                      : "분류 선택 (미선택 시 미분류)"}
                  </option>
                  {(itemForm.trade_type === "매출"
                    ? itemCategories.sales
                    : itemCategories.purchase
                  ).map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.items.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </FinanceControl>
                {categoryError && <p role="alert">{categoryError}</p>}
              </FinanceField>

              {/* 같은 구조의 입력칸은 map으로 만듭니다. */}
              {[
                {
                  name: "trade_date",
                  label: "거래일",
                  type: "date",
                  required: true,
                },
                {
                  name: "due_date",
                  label: "정산 마감일",
                  type: "date",
                },
                {
                  name: "item_name",
                  label: "품목명",
                  type: "text",
                  required: true,
                  maxLength: 100,
                },
                {
                  name: "standard",
                  label: "규격",
                  type: "text",
                  maxLength: 50,
                },
                {
                  name: "quantity",
                  label: "수량",
                  type: "number",
                  required: true,
                  min: 1,
                  step: 1,
                },
                {
                  name: "unit_price",
                  label: "단가(공급가액 기준)",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 1,
                },
                {
                  name: "vat",
                  label: "부가세",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 1,
                },
              ]
                .filter(
                  (field) =>
                    !isExpenseRegistration ||
                    !["due_date", "standard", "quantity", "unit_price"].includes(field.name),
                )
                .map((field) => (
                  <FinanceField
                    key={field.name}
                    label={
                      <>
                        {field.label}
                        {field.required ? " *" : ""}
                      </>
                    }
                    htmlFor={`item-${field.name}`}
                  >
                    <FinanceControl
                      id={`item-${field.name}`}
                      name={field.name}
                      type={field.type}
                      value={itemForm[field.name]}
                      onChange={handleItemChange}
                      required={field.required}
                      maxLength={field.maxLength}
                      min={field.min}
                      step={field.step}
                    />
                  </FinanceField>
                ))}

              <p>공급가액: {amounts.supplyAmount.toLocaleString()}원</p>

              <p>합계 금액: {amounts.totalAmount.toLocaleString()}원</p>

              {/* [비용 간편등록 추가] 등록만으로 계좌를 차감하거나 지급완료로 처리하지 않습니다. */}
              <p>
                {isExpenseRegistration
                  ? "신청 금액으로 등록되며 지급대기를 유지합니다. 등록 후 출금 등록이 가능합니다."
                  : "신규 거래는 미정산 상태로 등록됩니다."}
              </p>

              {formError && <p role="alert">{formError}</p>}

              <FinanceActions>
                <FinanceButton type="submit" variant="primary">
                  {saving ? "저장 중..." : "저장"}
                </FinanceButton>
                <FinanceButton type="button" onClick={closeRegistrationModal}>
                  취소
                </FinanceButton>
              </FinanceActions>
            </fieldset>
          </form>
        }
      />
    </div>
  );
}
