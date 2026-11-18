import React from "react";
import ModalBase from "../../../../../components/ModalBase";

//화면 표시만 담당합니다. 상태와 처리는 Items.js에서 전달합니다.
export default function ItemPaymentModal({
  accountsError,
  accountsLoading,
  cardsError,
  cardsLoading,
  closePaymentModal,
  handlePaymentChange,
  handlePaymentSubmit,
  paymentAccounts,
  paymentCards,
  paymentError,
  paymentForm,
  paymentSaving,
  paymentTarget,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title={paymentTarget.type === "SALES" ? "입금 등록" : "출금 등록"}
        onClose={closePaymentModal}
        layout={
          <form onSubmit={handlePaymentSubmit}>
            <p>거래 ID: {paymentTarget.transactionId}</p>
            <p>거래처: {paymentTarget.customer}</p>
            <p>선택한 품목이 속한 거래 전체를 기준으로 정산합니다.</p>

            <fieldset disabled={paymentSaving}>
              <div>
                <label htmlFor="payment-date">처리 날짜 *</label>
                <input
                  id="payment-date"
                  name="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={handlePaymentChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="payment-amount">처리 금액 *</label>
                <input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={paymentForm.amount}
                  onChange={handlePaymentChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="payment-method">결제수단 *</label>
                <select
                  id="payment-method"
                  name="payment_method"
                  value={paymentForm.payment_method}
                  onChange={handlePaymentChange}
                  required
                >
                  <option value="계좌이체">계좌이체</option>
                  <option value="현금">현금</option>
                  {paymentTarget.type === "PURCHASE" && (
                    <option value="법인카드">법인카드</option>
                  )}
                </select>
              </div>

              {paymentForm.payment_method === "계좌이체" && (
                <div>
                  <label htmlFor="payment-account">회사계좌 *</label>

                  <select
                    id="payment-account"
                    name="account_id"
                    value={paymentForm.account_id}
                    onChange={handlePaymentChange}
                    disabled={accountsLoading || Boolean(accountsError)}
                    required
                  >
                    <option value="">회사계좌 선택</option>

                    {paymentAccounts.map((account) => (
                      <option
                        key={account.account_id}
                        value={account.account_id}
                      >
                        {account.bank_name} / {account.account_name}
                        {" / "}
                        {account.account_number}
                      </option>
                    ))}
                  </select>

                  {accountsLoading && <p>회사계좌를 불러오는 중입니다.</p>}
                  {accountsError && <p role="alert">{accountsError}</p>}

                  {!accountsLoading &&
                    !accountsError &&
                    paymentAccounts.length === 0 && (
                      <p>선택 가능한 원화 계좌가 없습니다.</p>
                    )}
                </div>
              )}

              {paymentForm.payment_method === "법인카드" && (
                <div>
                  <label htmlFor="payment-card">법인카드 *</label>
                  <select
                    id="payment-card"
                    name="card_id"
                    value={paymentForm.card_id}
                    onChange={handlePaymentChange}
                    required
                    disabled={cardsLoading || Boolean(cardsError)}
                  >
                    <option value="">법인카드 선택</option>
                    {paymentCards.map((card) => (
                      <option key={card.card_id} value={card.card_id}>
                        {card.card_name} / 잔여 한도{" "}
                        {Number(card.remaining_limit).toLocaleString()}원
                      </option>
                    ))}
                  </select>
                  {cardsLoading && <p>법인카드를 불러오는 중입니다.</p>}
                  {cardsError && <p role="alert">{cardsError}</p>}
                  {!cardsLoading &&
                    !cardsError &&
                    paymentCards.length === 0 && (
                      <p>선택 가능한 법인카드가 없습니다.</p>
                    )}
                  <p>카드 결제 시 사용량이 증가하고 잔여 한도가 감소합니다.</p>
                </div>
              )}

              {paymentError && <p role="alert">{paymentError}</p>}

              <button type="submit">
                {paymentSaving ? "저장 중..." : "저장"}
              </button>

              <button type="button" onClick={closePaymentModal}>
                취소
              </button>
            </fieldset>
          </form>
        }
      />
    </div>
  );
}
