import React from "react";
import { getClassificationDetailRows } from "./paymentManagementModel";
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
                <label htmlFor="pm-classification">분류 변경</label>
                <select
                  id="pm-classification"
                  value={classification}
                  onChange={(event) => setClassification(event.target.value)}
                  required
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
                </select>
                <p>같은 문서·거래의 분할 입출금에는 동일한 분류가 적용됩니다.</p>
                <label htmlFor="pm-password">로그인 비밀번호 확인</label>
                <input
                  id="pm-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="submit">{saving ? "저장 중…" : "분류 저장"}</button>
              </fieldset>
            </form>
            {saveError && <p role="alert">{saveError}</p>}
            {selectedRow.source_type === "approval" && (
              <button type="button" disabled={saving} onClick={openSelectedApproval}>
                결재 문서 및 지급 관리
              </button>
            )}
            {selectedRow.source_type === "transaction" && (
              <button type="button" disabled={saving} onClick={openSelectedTrade}>
                거래 전표 및 정산
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
