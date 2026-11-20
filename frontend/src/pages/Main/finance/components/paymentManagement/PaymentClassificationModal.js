// 담당 화면: 지출·거래 관리 요약
// 역할: 거래 분류 변경 입력 창
import { FinanceButton } from "../ui/FinanceButton";
import { FinanceControl, FinanceField } from "../ui/FinanceFormControls";
import React from "react";
import { getClassificationDetailRows } from "../../models/financePaymentOverviewModel";
import BasicTable from "../../../../../components/BasicTable";
import ModalBase from "../../../../../components/ModalBase";

export default function PaymentClassificationModal({
  classification,
  classificationGroups,
  closeDetail,
  handleClassification,
  openSelectedApproval,
  openSelectedTrade,
  password,
  saveError,
  saving,
  selectedRow,
  setClassification,
  setPassword,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title="입출금 상세 및 분류"
        onClose={closeDetail}
        layout={
          <>
            <BasicTable
              title={selectedRow.title}
              th={["항목", "내용"]}
              td={getClassificationDetailRows(selectedRow)}
            />
            <form className="pm-classification-form" onSubmit={handleClassification}>
              <fieldset disabled={saving}>
                <FinanceField label={<>분류 변경</>} htmlFor="pm-classification">
                  <FinanceControl
                    id="pm-classification"
                    value={classification}
                    onChange={(event) => setClassification(event.target.value)}
                    required
                    as="select"
                  >
                    {classificationGroups.map((item) => (
                      <optgroup key={item.id} label={item.label}>
                        {item.items.map((sub) => (
                          <option key={sub.code} value={sub.code}>
                            {sub.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </FinanceControl>
                </FinanceField>
                <p>같은 문서·거래의 분할 입출금에는 동일한 분류가 적용됩니다.</p>
                <FinanceField label={<>로그인 비밀번호 확인</>} htmlFor="pm-password">
                  <FinanceControl
                    id="pm-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FinanceField>
                <FinanceButton type="submit" variant="primary">
                  {saving ? "저장 중…" : "분류 저장"}
                </FinanceButton>
              </fieldset>
            </form>
            {saveError && <p role="alert">{saveError}</p>}
            {selectedRow.source_type === "approval" && (
              <FinanceButton type="button" disabled={saving} onClick={openSelectedApproval}>
                결재 문서 및 지급 관리
              </FinanceButton>
            )}
            {selectedRow.source_type === "transaction" && (
              <FinanceButton type="button" disabled={saving} onClick={openSelectedTrade}>
                거래 전표 및 정산
              </FinanceButton>
            )}
          </>
        }
      />
    </div>
  );
}
