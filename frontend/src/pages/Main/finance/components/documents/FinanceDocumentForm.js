// 담당 화면: 영수증·청구서·견적서
// 역할: 문서 헤더·저장/인쇄/닫기와 입력/미리보기를 연결하는 최상위 화면
import React from "react";
import useFinanceDocumentController from "../../controllers/useFinanceDocumentController";
import { FinanceButton } from "../ui/FinanceButton";
import FinanceDocumentEditor from "./FinanceDocumentEditor";
import FinanceDocumentPreview from "./FinanceDocumentPreview";
import "../../styles/Finance.css";
import "../../../../../css/Form.css";
import "../../../../../css/Table.css";
import "../../../../../css/SubMain.css";
import "../../../../../css/ModalPopup.css";

// 화면 연결만 담당합니다. 입력/미리보기와 데이터 처리는 각 파일에서 관리합니다.
export default function FinanceDocumentForm({
  type = "receipt",
  onClose,
  storedDocument = null,
  onBusyChange,
}) {
  const state = useFinanceDocumentController({
    type,
    onClose,
    storedDocument,
    onBusyChange,
  });
  const { config, readOnly, saving, savedDocument, storageError, handleSave, handlePrint } = state;
  let modeLabel = "작성";
  let description = "정보 입력 후 저장하면 문서 번호가 발급됩니다.";
  let layoutStyle;
  if (readOnly) {
    modeLabel = "조회";
    description = "저장 당시의 문서를 확인하고 출력할 수 있습니다.";
    layoutStyle = {
      gridTemplateColumns: "minmax(0, 1fr)",
    };
  }
  let saveLabel = "문서 저장";
  if (saving) saveLabel = "저장 중…";
  return (
    <div className="finance-document-form">
      <header className="fd-header">
        <div>
          <h2>
            {config.title} {modeLabel}
          </h2>
          <p>{description}</p>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, }}
        >
          {!readOnly && (
            <FinanceButton
              type="button"
              size="small"
              variant="primary"
              color="blue"
              disabled={saving}
              onClick={handleSave}
            >
              {saveLabel}
            </FinanceButton>
          )}

          <FinanceButton
            type="button"
            size="small"
            onClick={handlePrint}
            disabled={!readOnly || saving}
          >
            인쇄 / PDF
          </FinanceButton>

          {onClose && (
            <FinanceButton type="button" size="small" onClick={onClose} disabled={saving}>
              닫기
            </FinanceButton>
          )}
        </div>
      </header>

      {savedDocument && (
        <p
          className="fd-storage-success"
          role="status"
          style={{ margin: "0 16px 8px", }}
        >
          저장 완료
        </p>
      )}

      {storageError && (
        <p
          className="fd-storage-error"
          role="alert"
          style={{ margin: "0 16px 8px", }}
        >
          {storageError}
        </p>
      )}
      <div className="fd-layout" style={layoutStyle}>
        {!readOnly && <FinanceDocumentEditor type={type} state={state} />}
        <aside className="fd-side">
          <section className="fd-preview-card">
            <div className="fd-section-title">
              <h3>문서 미리보기</h3>
              <span>A4</span>
            </div>
            <div className="fd-paper-scroll">
              <FinanceDocumentPreview type={type} state={state} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
