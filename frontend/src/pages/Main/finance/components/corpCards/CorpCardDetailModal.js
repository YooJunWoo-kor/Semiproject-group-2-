import { getCorpCardStatusLabel } from "./corpCardModel";
import React from "react";
import { FinanceResourceModal, FinanceResourceDetails } from "../FinanceDetailUI";
import { FinancePaymentHistory } from "../FinanceFunds";
export default function CorpCardDetailModal({
  cardPayments,
  cardSaving,
  cardView,
  closeCardDetail,
  limitSaving,
  openCardDetail,
  openCardHistory,
  openEditCardForm,
  openLimitForm,
  paymentsError,
  paymentsLoading,
  selectedCard,
  statusSavingId,
}) {
  function renderHistoryContent() {
    if (paymentsLoading) {
      return <p>거래내역을 불러오는 중입니다.</p>;
    }
    if (paymentsError) {
      return <p role="alert">{paymentsError}</p>;
    }
    return (
      <FinancePaymentHistory
        key={selectedCard.id}
        className="finance-card-history"
        payments={cardPayments}
        showPartner
        statusLabel="상태"
        enablePeriodFilter
        currency="KRW"
      />
    );
  }
  function renderCardContent() {
    if (cardView === "detail") {
      return (
        <FinanceResourceDetails
          rows={[
            ["카드 ID", selectedCard.id],
            ["법인카드명", selectedCard.cardName],
            ["발급부서", selectedCard.department],
            ["관리자명", selectedCard.managerName],
            ["당월 사용량", `${selectedCard.currentUsage.toLocaleString()}원`],
            ["월 한도", `${selectedCard.monthlyLimit.toLocaleString()}원`],
            ["잔여 한도", `${selectedCard.remainingLimit.toLocaleString()}원`],
            ["상태", getCorpCardStatusLabel(selectedCard.status)],
          ]}
        />
      );
    }
    return (
      <>
        <p
          style={{
            margin: "0 0 8px",
            overflowWrap: "anywhere",
          }}
        >
          {selectedCard.cardName}
        </p>
        {renderHistoryContent()}
      </>
    );
  }
  function renderCardActions() {
    if (cardView === "detail") {
      return (
        <>
          <button
            type="button"
            disabled={cardSaving || limitSaving || statusSavingId !== null}
            onClick={() => openCardHistory(selectedCard.id)}
          >
            거래내역
          </button>
          <button
            type="button"
            className="erp-primary-button"
            disabled={cardSaving || limitSaving || statusSavingId !== null}
            onClick={() => openEditCardForm(selectedCard)}
          >
            수정
          </button>
          <button
            type="button"
            disabled={cardSaving || limitSaving || statusSavingId !== null}
            onClick={() => openLimitForm(selectedCard)}
          >
            한도변경
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        disabled={cardSaving || limitSaving || statusSavingId !== null}
        onClick={() => openCardDetail(selectedCard.id)}
      >
        상세
      </button>
    );
  }
  return (
    <FinanceResourceModal
      key={cardView}
      title={cardView === "detail" ? "법인카드 상세정보" : "법인카드 거래내역"}
      onClose={closeCardDetail}
      busy={cardSaving || limitSaving || statusSavingId !== null}
      actions={renderCardActions()}
    >
      {renderCardContent()}
    </FinanceResourceModal>
  );
}
