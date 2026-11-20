// 담당 화면: 대시보드의 문서 작성
// 역할: 문서 유형별 작성 버튼·아이콘과 문서 작성 모달을 연결합니다.
import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import FinanceDocumentForm from "./FinanceDocumentForm";

function DocumentIcon({ type }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" aria-hidden="true">
      <path d="M8 2h23l11 12v37a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />

      <path d="M31 2v12h11M13 24h21M13 33h21M13 42h21" />

      {type === "invoice" && <path d="M13 24v18M25 24v18M34 24v18" />}
    </svg>
  );
}
export default function FinanceDocumentLauncher({ documentType, onSelect, onClose }) {
  return (
    <>
      <section className="fd-documents fd-panel">
        <h2>문서 작성</h2>

        <div className="fd-document-grid">
          {[
            ["receipt", "영수증 작성"],
            ["invoice", "청구서 작성"],
            ["quote", "견적서 작성"],
          ].map(([type, label]) => (
            <button
              type="button"
              className="fd-document"
              key={type}
              onClick={() => onSelect(type === "quote" ? "estimate" : type)}
            >
              <DocumentIcon type={type} />

              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      {documentType && (
        <div className="finance-document-modal">
          <ModalBase
            title={<></>}
            onClose={onClose}
            layout={
              <FinanceDocumentForm key={documentType} type={documentType} onClose={onClose} />
            }
          />
        </div>
      )}
    </>
  );
}
