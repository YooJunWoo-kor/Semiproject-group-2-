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
                <div key={field.name}>
                  <label htmlFor={`draft-${field.name}`}>{field.label} *</label>

                  <select
                    id={`draft-${field.name}`}
                    name={field.name}
                    value={draftForm[field.name]}
                    onChange={handleDraftChange}
                    disabled={employeesLoading || Boolean(employeesError)}
                    required
                  >
                    <option value="">선택해 주세요</option>

                    {draftEmployees
                      .filter(
                        (employee) => field.name !== "approver_id" || Number(employee.can_approve) === 1,
                      )
                      .map((employee) => (
                        <option key={employee.employee_id} value={employee.employee_id}>
                          {employee.name} / {employee.department_name || "부서 미지정"}
                          {" / "}
                          {employee.employee_number}
                        </option>
                      ))}
                  </select>
                </div>
              ))}

              <div>
                <label htmlFor="draft-title">제목 *</label>
                <input
                  id="draft-title"
                  name="title"
                  type="text"
                  value={draftForm.title}
                  onChange={handleDraftChange}
                  maxLength={150}
                  required
                />
              </div>

              {expenseGroups.length > 0 && (
                <div>
                  <label htmlFor="draft-category">지출 분류 / 세부 항목 *</label>
                  <select
                    id="draft-category"
                    name="category_code"
                    value={draftForm.category_code}
                    onChange={handleDraftChange}
                    required
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
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="draft-type">문서 유형 *</label>
                <select
                  id="draft-type"
                  name="document_type"
                  value={draftForm.document_type}
                  onChange={handleDraftChange}
                  required
                >
                  <option value="일반">일반</option>
                  <option value="비용">비용</option>
                  <option value="구매">구매</option>
                  <option value="급여">급여</option>
                </select>
              </div>

              <div>
                <label htmlFor="draft-amount">신청 금액 *</label>
                <input
                  id="draft-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={draftForm.amount}
                  onChange={handleDraftChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="draft-due-date">처리 마감일</label>
                <input
                  id="draft-due-date"
                  name="due_date"
                  type="date"
                  value={draftForm.due_date}
                  onChange={handleDraftChange}
                />
              </div>

              <div>
                <label htmlFor="draft-content">내용</label>
                <textarea
                  id="draft-content"
                  name="content"
                  rows={5}
                  value={draftForm.content}
                  onChange={handleDraftChange}
                />
              </div>

              <p>기안은 대기 상태로 등록됩니다.</p>

              {employeesLoading && <p>사원 목록을 불러오는 중입니다.</p>}
              {employeesError && <p role="alert">{employeesError}</p>}
              {draftError && <p role="alert">{draftError}</p>}

              <button type="submit" disabled={employeesLoading || Boolean(employeesError)}>
                {draftSaving ? "저장 중..." : "저장"}
              </button>

              <button type="button" onClick={closeDraftForm}>
                취소
              </button>
            </fieldset>
          </form>
        }
      />
    </div>
  );
}
