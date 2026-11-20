// 담당 화면: 결재·이력 / 승인 지급
// 역할: 기안서 작성 입력 화면
import { FinanceButton } from "../ui/FinanceButton";
import { FinanceControl, FinanceField, FinanceActions } from "../ui/FinanceFormControls";
import React from "react";
import ModalBase from "../../../../../components/ModalBase";

export default function ApprovalDraftModal({
  closeDraftForm,
  draftEmployees,
  draftError,
  draftForm,
  draftSaving,
  employeesError,
  employeesLoading,
  expenseGroups,
  handleDraftChange,
  handleDraftSubmit,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title="지출 결재 기안"
        onClose={closeDraftForm}
        layout={
          <form onSubmit={handleDraftSubmit}>
            <fieldset disabled={draftSaving}>
              {/* 작성자와 결재자는 같은 사원 목록을 사용합니다. */}
              {[
                {
                  name: "employee_id",
                  label: "작성자",
                },
                {
                  name: "approver_id",
                  label: "결재자",
                },
              ].map((field) => (
                <FinanceField
                  key={field.name}
                  label={<>{field.label} *</>}
                  htmlFor={`draft-${field.name}`}
                >
                  <FinanceControl
                    id={`draft-${field.name}`}
                    name={field.name}
                    value={draftForm[field.name]}
                    onChange={handleDraftChange}
                    disabled={employeesLoading || Boolean(employeesError)}
                    required
                    as="select"
                  >
                    <option value="">선택해 주세요</option>

                    {draftEmployees
                      .filter(
                        (employee) =>
                          field.name !== "approver_id" || Number(employee.can_approve) === 1,
                      )
                      .map((employee) => (
                        <option key={employee.employee_id} value={employee.employee_id}>
                          {employee.name} / {employee.department_name || "부서 미지정"}
                          {" / "}
                          {employee.employee_number}
                        </option>
                      ))}
                  </FinanceControl>
                </FinanceField>
              ))}

              <FinanceField label={<>제목 *</>} htmlFor="draft-title">
                <FinanceControl
                  id="draft-title"
                  name="title"
                  type="text"
                  value={draftForm.title}
                  onChange={handleDraftChange}
                  maxLength={150}
                  required
                />
              </FinanceField>

              {expenseGroups.length > 0 && (
                <FinanceField label={<>지출 분류 / 세부 항목 *</>} htmlFor="draft-category">
                  <FinanceControl
                    id="draft-category"
                    name="category_code"
                    value={draftForm.category_code}
                    onChange={handleDraftChange}
                    required
                    as="select"
                  >
                    <option value="">선택해 주세요</option>
                    {expenseGroups.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.items.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </FinanceControl>
                </FinanceField>
              )}

              <FinanceField label={<>문서 유형 *</>} htmlFor="draft-type">
                <FinanceControl
                  id="draft-type"
                  name="document_type"
                  value={draftForm.document_type}
                  onChange={handleDraftChange}
                  required
                  as="select"
                >
                  <option value="일반">일반</option>
                  <option value="비용">비용</option>
                  <option value="구매">구매</option>
                  <option value="급여">급여</option>
                </FinanceControl>
              </FinanceField>

              <FinanceField label={<>신청 금액 *</>} htmlFor="draft-amount">
                <FinanceControl
                  id="draft-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={draftForm.amount}
                  onChange={handleDraftChange}
                  required
                />
              </FinanceField>

              <FinanceField label={<>처리 마감일</>} htmlFor="draft-due-date">
                <FinanceControl
                  id="draft-due-date"
                  name="due_date"
                  type="date"
                  value={draftForm.due_date}
                  onChange={handleDraftChange}
                />
              </FinanceField>

              <FinanceField label={<>내용</>} htmlFor="draft-content">
                <FinanceControl
                  id="draft-content"
                  name="content"
                  rows={5}
                  value={draftForm.content}
                  onChange={handleDraftChange}
                  as="textarea"
                />
              </FinanceField>

              <p>기안은 대기 상태로 등록됩니다.</p>

              {employeesLoading && <p>사원 목록을 불러오는 중입니다.</p>}
              {employeesError && <p role="alert">{employeesError}</p>}
              {draftError && <p role="alert">{draftError}</p>}

              <FinanceActions>
                <FinanceButton
                  type="submit"
                  disabled={employeesLoading || Boolean(employeesError)}
                  variant="primary"
                >
                  {draftSaving ? "저장 중..." : "저장"}
                </FinanceButton>
                <FinanceButton type="button" onClick={closeDraftForm}>
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
