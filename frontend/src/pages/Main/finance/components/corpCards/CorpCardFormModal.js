import React from "react";
import ModalBase from "../../../../../components/ModalBase";
export default function CorpCardFormModal({
  cardForm,
  cardFormError,
  cardSaving,
  closeRegistrationModal,
  editingCardId,
  formDepartments,
  formEmployees,
  handleCardFormChange,
  handleCardSubmit,
  loadError,
  loading,
  optionsError,
  optionsLoading,
}) {
  function renderMonthlyLimitField() {
    if (editingCardId === null) {
      return (
        <div>
          <label htmlFor="new-card-limit">월 한도 *</label>
          <input
            id="new-card-limit"
            name="monthly_limit"
            type="number"
            min="0"
            step="1"
            value={cardForm.monthly_limit}
            onChange={handleCardFormChange}
            required
          />
        </div>
      );
    }
    return <p>월 한도는 목록의 ‘한도변경’ 버튼에서 변경할 수 있습니다.</p>;
  }
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title={editingCardId === null ? "법인카드 신규 등록" : "법인카드 기본정보 수정"}
        onClose={closeRegistrationModal}
        layout={
          <form onSubmit={handleCardSubmit}>
            <fieldset disabled={cardSaving}>
              <div>
                <label htmlFor="new-card-name">법인카드명 *</label>
                <input
                  id="new-card-name"
                  name="card_name"
                  type="text"
                  maxLength={50}
                  value={cardForm.card_name}
                  onChange={handleCardFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-card-department">발급부서</label>
                <select
                  id="new-card-department"
                  name="department_id"
                  value={cardForm.department_id}
                  onChange={handleCardFormChange}
                  disabled={optionsLoading || Boolean(optionsError)}
                >
                  <option value="">미지정</option>
                  {formDepartments.map((department) => (
                    <option key={department.department_id} value={department.department_id}>
                      {department.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-card-manager">관리자</label>
                <select
                  id="new-card-manager"
                  name="employee_id"
                  value={cardForm.employee_id}
                  onChange={handleCardFormChange}
                  disabled={optionsLoading || Boolean(optionsError)}
                >
                  <option value="">미지정</option>
                  {formEmployees.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.name} / {employee.department_name || "부서 미지정"} /{" "}
                      {employee.employee_number}
                    </option>
                  ))}
                </select>
              </div>
              {renderMonthlyLimitField()}
              {editingCardId === null && (
                <p>신규 카드의 사용량은 0원이며 잔여 한도는 입력한 월 한도와 같습니다.</p>
              )}
              {optionsLoading && <p>부서와 관리자 목록을 불러오는 중입니다.</p>}
              {optionsError && <p role="alert">{optionsError}</p>}
              {cardFormError && <p role="alert">{cardFormError}</p>}
              <button
                type="submit"
                disabled={optionsLoading || Boolean(optionsError) || loading || Boolean(loadError)}
              >
                {cardSaving ? "저장 중..." : "저장"}
              </button>
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
