import { getBankAccountStatusLabel, getBankAccountStatusActionLabel } from "./bankAccountModel";
import React from "react";
import { FinanceResourceModal, FinanceResourceDetails } from "../FinanceDetailUI";
import { FinancePaymentHistory } from "../FinanceFunds";

export default function BankAccountDetailModal({
  accountPayments,
  accountStatusError,
  accountStatusSaving,
  accountView,
  closeAccountHistory,
  handleAccountStatusChange,
  openAccountHistory,
  openEditAccountForm,
  paymentsError,
  paymentsLoading,
  saving,
  selectedAccount,
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
        className="finance-account-history"
        payments={accountPayments}
        showPartner
        amountSuffix=""
        statusLabel="상태"
        enablePeriodFilter
        currency={selectedAccount.currency}
        currentBalance={selectedAccount.balance}
      />
    );
  }

  function renderAccountContent() {
    if (accountView === "detail") {
      return (
        <FinanceResourceDetails
          rows={[
            ["계좌 ID", selectedAccount.id],
            ["은행명", selectedAccount.bankName],
            ["계좌번호", selectedAccount.accountNumber],
            ["계좌명", selectedAccount.accountName],
            ["용도 구분", selectedAccount.accountType],
            ["현재 잔액", `${selectedAccount.balance.toLocaleString()} ${selectedAccount.currency}`],
            ["통화", selectedAccount.currency],
            ["담당자", selectedAccount.managerName],
            ["최근 거래일시", selectedAccount.lastTransactionDate],
            ["상태", getBankAccountStatusLabel(selectedAccount.status)],
          ]}
        />
      );
    }
    return (
      <>
        <div
          style={{
            marginBottom: 8,
            overflowWrap: "anywhere",
          }}
        >
          <p
            style={{
              margin: 0,
            }}
          >
            계좌번호: {selectedAccount.accountNumber}
          </p>
        </div>
        {renderHistoryContent()}
      </>
    );
  }
  
  return (
    <FinanceResourceModal
      key={accountView}
      title={accountView === "detail" ? "회사계좌 상세정보" : "회사계좌 거래내역"}
      onClose={closeAccountHistory}
      busy={saving || accountStatusSaving}
      actions={
        <>
          {accountView === "detail" && (
            <button
              type="button"
              disabled={saving || accountStatusSaving}
              onClick={() => openAccountHistory(selectedAccount.id)}
            >
              거래내역
            </button>
          )}
          <button
            type="button"
            className="erp-primary-button"
            disabled={saving || accountStatusSaving}
            onClick={() => openEditAccountForm(selectedAccount)}
          >
            수정
          </button>
          {accountView === "detail" && (
            <button
              type="button"
              disabled={
                saving || accountStatusSaving || !["사용", "ACTIVE", "STOP"].includes(selectedAccount.status)
              }
              onClick={() => handleAccountStatusChange(selectedAccount)}
            >
              {getBankAccountStatusActionLabel(selectedAccount.status, accountStatusSaving)}
            </button>
          )}
        </>
      }
    >
      {renderAccountContent()}
      {accountStatusError && <p role="alert">{accountStatusError}</p>}
    </FinanceResourceModal>
  );
}
