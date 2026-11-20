// 담당 화면: 자금관리 → 회사계좌
// 역할: 계좌 기본정보 및 거래 이력 상세 창
import { FinanceButton } from "../ui/FinanceButton";
import { getBankAccountStatusLabel, getBankAccountStatusActionLabel, } from "../../models/financeBankAccountModel";
import React from "react";
import { FinanceResourceModal, FinanceResourceDetails } from "../ui/FinanceDetailDisplay";
import { FinancePaymentHistory } from "../ui/FinancePaymentHistory";

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
    if (paymentsLoading) return <p>거래내역을 불러오는 중입니다.</p>;

    if (paymentsError) return <p role="alert">{paymentsError}</p>;

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
    if (accountView === "detail")
      return (
        <FinanceResourceDetails
          rows={[
            ["계좌 ID", selectedAccount.id],
            ["은행명", selectedAccount.bankName],
            ["계좌번호", selectedAccount.accountNumber],
            ["계좌명", selectedAccount.accountName],
            [
              "현재 잔액",
              `${selectedAccount.balance.toLocaleString()} ${selectedAccount.currency}`,
            ],
            ["통화", selectedAccount.currency],
            ["담당자", selectedAccount.managerName],
            ["최근 거래일시", selectedAccount.lastTransactionDate],
            ["상태", getBankAccountStatusLabel(selectedAccount.status)],
          ]}
        />
      );

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
            <FinanceButton
              type="button"
              disabled={saving || accountStatusSaving}
              onClick={() => openAccountHistory(selectedAccount.id)}
            >
              거래내역
            </FinanceButton>
          )}
          <FinanceButton
            type="button"
            disabled={saving || accountStatusSaving}
            onClick={() => openEditAccountForm(selectedAccount)}
            variant="primary"
          >
            수정
          </FinanceButton>
          {accountView === "detail" && (
            <FinanceButton
              type="button"
              disabled={
                saving ||
                accountStatusSaving ||
                !["사용", "ACTIVE", "STOP"].includes(selectedAccount.status)
              }
              onClick={() => handleAccountStatusChange(selectedAccount)}
            >
              {getBankAccountStatusActionLabel(selectedAccount.status, accountStatusSaving)}
            </FinanceButton>
          )}
        </>
      }
    >
      {renderAccountContent()}
      {accountStatusError && <p role="alert">{accountStatusError}</p>}
    </FinanceResourceModal>
  );
}
