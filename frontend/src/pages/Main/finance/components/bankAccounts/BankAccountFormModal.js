import React from "react";
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
                <div key={field.name}>
                  <label htmlFor={`account-${field.name}`}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>

                  <input
                    id={`account-${field.name}`}
                    name={field.name}
                    type="text"
                    value={accountForm[field.name]}
                    onChange={handleAccountChange}
                    required={field.required}
                    maxLength={field.maxLength}
                  />
                </div>
              ))}

              <div>
                <label htmlFor="account-currency">통화 *</label>
                <select
                  id="account-currency"
                  name="currency"
                  value={accountForm.currency}
                  onChange={handleAccountChange}
                  disabled={editingAccountId !== null}
                  required
                >
                  <option value="KRW">KRW — 원화</option>
                  <option value="USD">USD — 미국 달러</option>
                  <option value="JPY">JPY — 일본 엔</option>
                  <option value="EUR">EUR — 유로</option>
                </select>
              </div>

              <div>
                <label htmlFor="account-balance">초기 잔액 *</label>
                <input
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
              </div>

              <div>
                <label htmlFor="account-employee">관리 사원</label>

                <select
                  id="account-employee"
                  name="employee_id"
                  value={accountForm.employee_id}
                  onChange={handleAccountChange}
                  disabled={employeesLoading || Boolean(employeesError)}
                >
                  <option value="">미지정</option>

                  {employeeOptions.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.name} / {employee.department_name || "부서 미지정"}
                      {" / "}
                      {employee.employee_number}
                    </option>
                  ))}
                </select>

                {employeesLoading && <p>관리 사원 목록을 불러오는 중입니다.</p>}
                {employeesError && <p role="alert">{employeesError}</p>}
              </div>

              <p>
                {editingAccountId === null
                  ? "관리 사원은 선택 항목이며, 계좌 상태는 사용으로 등록됩니다."
                  : "수정 시 잔액과 통화는 기존 값을 유지합니다."}
              </p>

              {formError && <p role="alert">{formError}</p>}

              <button type="submit">{saving ? "저장 중..." : "저장"}</button>

              <button type="button" onClick={closeRegistrationModal}>
                취소
              </button>
            </fieldset>
          </form>
        }
      />
    </div>
  );
}
