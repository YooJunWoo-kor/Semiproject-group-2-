import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import DetailSummary from "./ItemDetailSummary";

//화면 표시만 담당합니다. 상태와 처리는 Items.js에서 전달합니다.
export default function PayrollDeductionModal({
  accountsError,
  accountsLoading,
  closeVoucher,
  deductionData,
  deductionError,
  deductionForm,
  deductionLoading,
  deductionMonth,
  deductionNotice,
  deductionSaving,
  handleDeductionPayment,
  paymentAccounts,
  payrollCanPay,
  payrollWon,
  setDeductionForm,
  today,
}) {
  function getDeductionStatus() {
    if (Number(deductionData.pending_total) > 0) {
      if (Number(deductionData.paid_total) > 0) {
        return "일부 완료";
      }
      return "대기";
    }
    if (deductionData.items.length > 0) {
      return "완료";
    }
    return "미등록";
  }
  return (
    <div className="finance-registration-modal">
      <ModalBase
        className="finance-deduction-modal"
        title={`${deductionMonth} 급여 공제액`}
        onClose={closeVoucher}
        layout={
          <section
            style={{
              width: "100%",
              minWidth: 0,
            }}
          >
            <style>{`
                      .finance-registration-modal .modal-boder.finance-deduction-modal { width: min(560px, calc(100vw - 32px)); min-width: 0; max-width: 100%; }
                      .finance-deduction-modal table { width: 100%; table-layout: fixed; }
                      .finance-deduction-modal th, .finance-deduction-modal td { padding: 9px; font-size: 13px; overflow-wrap: anywhere; }
                    `}</style>
            {deductionNotice && <p role="status">{deductionNotice}</p>}
            {deductionError && <p role="alert">{deductionError}</p>}
            {deductionLoading && <p role="status">공제액 조회 중…</p>}
            {deductionData && !deductionLoading && (
              <>
                <DetailSummary
                  title={`${deductionMonth} 급여 공제액`}
                  amount={payrollWon(
                    Number(deductionData.pending_total) +
                      Number(deductionData.paid_total),
                  )}
                  status={getDeductionStatus()}
                />
                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 8,
                    margin: "0 0 12px",
                    padding: 12,
                    background: "var(--color-canvas, #f5f8fc)",
                    borderRadius: 10,
                  }}
                >
                  <dt>남은 공제액</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontWeight: 700,
                    }}
                  >
                    {payrollWon(deductionData.pending_total)}
                  </dd>
                  <dt>납부완료</dt>
                  <dd
                    style={{
                      margin: 0,
                    }}
                  >
                    {payrollWon(deductionData.paid_total)}
                  </dd>
                </dl>
                {deductionData.items.length === 0 ? (
                  <p>지급된 급여의 공제액 내역이 없습니다.</p>
                ) : (
                  <div className="table-shell">
                    <table>
                      <thead>
                        <tr>
                          <th>직원</th>
                          <th>공제액</th>
                          <th>납부 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductionData.items.map((row) => (
                          <tr key={row.salary_payment_id}>
                            <td>{row.name}</td>
                            <td>{payrollWon(row.amount)}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {Number(deductionData.pending_total) > 0 && payrollCanPay && (
                  <form
                    onSubmit={handleDeductionPayment}
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <fieldset
                      disabled={deductionSaving || accountsLoading}
                      style={{
                        minWidth: 0,
                        padding: 12,
                        border: "1px solid var(--color-line, #dde4ee)",
                        borderRadius: 10,
                      }}
                    >
                      <legend>공제액 납부 내역 등록</legend>
                      <p
                        className="subtext"
                        style={{
                          fontSize: 12,
                        }}
                      >
                        실제 납부 후 등록하세요. 해당 월 미납 공제액 전액을 한
                        건으로 등록하며, 은행 송금이나 기관 납부를 실행하지
                        않습니다.
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <label htmlFor="deduction-account">출금 회사계좌</label>
                        <select
                          id="deduction-account"
                          required
                          value={deductionForm.account_id}
                          onChange={(event) =>
                            setDeductionForm((previous) => ({
                              ...previous,
                              account_id: event.target.value,
                            }))
                          }
                        >
                          <option value="">회사계좌 선택</option>
                          {paymentAccounts.map((account) => (
                            <option
                              key={account.account_id}
                              value={account.account_id}
                            >
                              {account.bank_name} · {account.account_name} ·
                              잔액 {payrollWon(account.balance)}
                            </option>
                          ))}
                        </select>
                        {accountsError && <p role="alert">{accountsError}</p>}
                        <label htmlFor="deduction-date">실제 납부일</label>
                        <input
                          id="deduction-date"
                          type="date"
                          required
                          max={today}
                          value={deductionForm.payment_date}
                          onChange={(event) =>
                            setDeductionForm((previous) => ({
                              ...previous,
                              payment_date: event.target.value,
                            }))
                          }
                        />
                        <label htmlFor="deduction-password">
                          로그인 비밀번호 확인
                        </label>
                        <input
                          id="deduction-password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={deductionForm.password}
                          onChange={(event) =>
                            setDeductionForm((previous) => ({
                              ...previous,
                              password: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="submit"
                          className="register-btn"
                          disabled={paymentAccounts.length === 0}
                        >
                          {deductionSaving
                            ? "등록 중…"
                            : `${payrollWon(deductionData.pending_total)} 납부 등록`}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}
                {deductionData.items.length > 0 &&
                  Number(deductionData.pending_total) === 0 && (
                    <p>공제액 납부가 모두 등록되었습니다.</p>
                  )}
              </>
            )}
          </section>
        }
      />
    </div>
  );
}
