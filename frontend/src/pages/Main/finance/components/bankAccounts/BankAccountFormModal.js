// 담당 화면: 자금관리 → 회사계좌
// 역할: 계좌 등록·수정 입력 창
import React from "react";
import { FinanceField, FinanceControl, FinanceButton, FinanceActions, } from "../ui/FinanceDetailDisplay";
import ModalBase from "../../../../../components/ModalBase";

export default function BankAccountFormModal({
  accountForm,
  closeRegistrationModal,
  editingAccountId,
  employeeOptions,
  employeesError,
  employeesLoading,
  formError,
  handleAccountChange,
  handleAccountSubmit,
  saving,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title={editingAccountId === null ? "회사계좌 신규 등록" : "회사계좌 정보 수정"}
        onClose={closeRegistrationModal}
        layout={
          <form onSubmit={handleAccountSubmit}>
            <fieldset disabled={saving}>
              {[
                {
                  name: "bank_name",
                  label: "은행명",
                  required: true,
                  maxLength: 50,
                },
                {
                  name: "account_number",
                  label: "계좌번호",
                  required: true,
                  maxLength: 50,
                },
                {
                  name: "account_name",
                  label: "계좌명",
                  required: true,
                  maxLength: 100,
                },
                {
                  name: "account_type",
                  label: "용도 구분",
                  maxLength: 30,
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
                  htmlFor={`account-${field.name}`}
                >
                  <FinanceControl
                    id={`account-${field.name}`}
                    name={field.name}
                    type="text"
                    value={accountForm[field.name]}
                    onChange={handleAccountChange}
                    required={field.required}
                    maxLength={field.maxLength}
                  />
                </FinanceField>
              ))}

              <FinanceField label={<>통화 *</>} htmlFor="account-currency">
                <FinanceControl
                  id="account-currency"
                  name="currency"
                  value={accountForm.currency}
                  onChange={handleAccountChange}
                  disabled={editingAccountId !== null}
                  required
                  as="select"
                >
                  <option value="KRW">KRW — 원화</option>
                  <option value="USD">USD — 미국 달러</option>
                  <option value="JPY">JPY — 일본 엔</option>
                  <option value="EUR">EUR — 유로</option>
                </FinanceControl>
              </FinanceField>

              <FinanceField label={<>초기 잔액 *</>} htmlFor="account-balance">
                <FinanceControl
                  id="account-balance"
                  name="balance"
                  type="number"
                  min="0"
                  step="1"
                  value={accountForm.balance}
                  onChange={handleAccountChange}
                  disabled={editingAccountId !== null}
                  required
                />
              </FinanceField>

              <FinanceField label={<>관리 사원</>} htmlFor="account-employee">
                <FinanceControl
                  id="account-employee"
                  name="employee_id"
                  value={accountForm.employee_id}
                  onChange={handleAccountChange}
                  disabled={employeesLoading || Boolean(employeesError)}
                  as="select"
                >
                  <option value="">미지정</option>

                  {employeeOptions.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.name} / {employee.department_name || "부서 미지정"}
                      {" / "}
                      {employee.employee_number}
                    </option>
                  ))}
                </FinanceControl>

                {employeesLoading && <p>관리 사원 목록을 불러오는 중입니다.</p>}
                {employeesError && <p role="alert">{employeesError}</p>}
              </FinanceField>

              <p>
                {editingAccountId === null
                  ? "관리 사원은 선택 항목이며, 계좌 상태는 사용으로 등록됩니다."
                  : "수정 시 잔액과 통화는 기존 값을 유지합니다."}
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
