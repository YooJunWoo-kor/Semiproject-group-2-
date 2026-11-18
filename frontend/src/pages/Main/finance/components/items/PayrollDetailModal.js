import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import DetailSummary from "./ItemDetailSummary";
import { getSettlementLabel } from "./itemUtils";

//화면 표시만 담당합니다. 상태와 처리는 Items.js에서 전달합니다.
export default function PayrollDetailModal({
  accountsError,
  accountsLoading,
  closeVoucher,
  handlePayrollPayment,
  paymentAccounts,
  payrollCanPay,
  payrollDetailError,
  payrollDetailLoading,
  payrollMoneyKeys,
  payrollMonth,
  payrollNetPending,
  payrollPayForm,
  payrollPaymentError,
  payrollPaymentNotice,
  payrollPaymentSaving,
  payrollRows,
  payrollUnpaidRows,
  payrollWon,
  selectedItem,
  setPayrollPayForm,
  today,
}) {
  return (
    <div className="finance-registration-modal finance-voucher-detail">
      <ModalBase
        className="finance-payroll-modal"
        title={`${payrollMonth} 급여 상세`}
        onClose={closeVoucher}
        layout={
          <section
            style={{
              width: "100%",
              minWidth: 0,
            }}
          >
            <style>{`
                      .finance-registration-modal .modal-boder.finance-payroll-modal {
                        width: min(560px, calc(100vw - 32px));
                        min-width: 0;
                        max-width: 100%;
                      }
                      .finance-payroll-modal .modal-body { min-width: 0; }
                      .finance-payroll-modal .payroll-employee-card {
                        border: 1px solid var(--color-line, #dde4ee);
                        border-radius: 10px;
                        padding: 12px;
                        margin-top: 10px;
                      }
                      .finance-payroll-modal .payroll-employee-values {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 8px 10px;
                        margin: 10px 0 0;
                      }
                      .finance-payroll-modal .payroll-employee-values dt {
                        color: var(--color-muted, #697386);
                        font-size: 12px;
                        margin-bottom: 2px;
                      }
                      .finance-payroll-modal .payroll-employee-values dd {
                        margin: 0;
                        font-size: 13px;
                        font-weight: 600;
                        overflow-wrap: anywhere;
                        font-variant-numeric: tabular-nums;
                      }
                      @media (max-width: 420px) {
                        .finance-payroll-modal .payroll-employee-values {
                          grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                      }
                    `}</style>
            <DetailSummary
              title={`${payrollMonth} 급여 (인건비)`}
              amount={
                selectedItem.totalAmount == null
                  ? "미등록"
                  : payrollWon(selectedItem.totalAmount)
              }
              status={getSettlementLabel(selectedItem.status)}
            />
            {payrollDetailLoading && <p role="status">급여 내역 조회 중…</p>}
            {payrollDetailError && <p role="alert">{payrollDetailError}</p>}
            {!payrollDetailLoading &&
              !payrollDetailError &&
              (payrollRows.length === 0 ? (
                <p>현재 승인된 급여 내역이 없습니다.</p>
              ) : (
                <>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                    }}
                  >
                    직원{" "}
                    {new Set(payrollRows.map((row) => row.employee_id)).size}명
                    · 급여 승인 완료
                  </p>
                  <dl
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: "6px 12px",
                      margin: 0,
                      padding: 12,
                      fontSize: 14,
                      background: "var(--color-canvas, #f5f8fc)",
                      borderRadius: 10,
                    }}
                  >
                    {[
                      ["세전 합계", "gross_pay"],
                      ["공제 합계", "deduction"],
                      ["실지급 합계", "net_pay"],
                    ].map(([label, key]) => (
                      <React.Fragment key={key}>
                        <dt>{label}</dt>
                        <dd
                          style={{
                            margin: 0,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {payrollWon(
                            payrollRows.reduce(
                              (sum, row) => sum + Number(row[key] || 0),
                              0,
                            ),
                          )}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                  {payrollRows.map((row) => (
                    <article
                      key={row.payroll_id}
                      className="payroll-employee-card"
                      aria-label={`${row.name} 급여 내역`}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 14,
                          }}
                        >
                          {row.name}{" "}
                          <span className="subtext">
                            ({row.employee_number || "사번 미등록"})
                          </span>
                        </strong>
                        <span
                          className="subtext"
                          style={{
                            fontSize: 12,
                          }}
                          title={row.draft_title}
                        >
                          {row.department_name || "부서 미등록"} · 기안서 #
                          {row.draft_id} · {row.payment_status || "미등록"}
                        </span>
                      </div>
                      <dl className="payroll-employee-values">
                        {payrollMoneyKeys.map((key, index) => (
                          <div key={key}>
                            <dt>
                              {
                                [
                                  "기본급",
                                  "수당",
                                  "상여금",
                                  "기타 지급액",
                                  "공제액",
                                  "세전 급여",
                                  "실지급액",
                                ][index]
                              }
                            </dt>
                            <dd>{payrollWon(row[key])}</dd>
                          </div>
                        ))}
                      </dl>
                      {row.payment_id && (
                        <p
                          style={{
                            margin: "10px 0 0",
                            fontSize: 12,
                          }}
                        >
                          지급 이력 #{row.payment_id} ·{" "}
                          {row.registered_payment_date}
                          <br />
                          {row.payment_bank_name} · {row.payment_account_name} ·{" "}
                          {payrollWon(row.registered_payment_amount)}
                        </p>
                      )}
                    </article>
                  ))}
                  {payrollPaymentNotice && (
                    <p role="status">{payrollPaymentNotice}</p>
                  )}
                  {payrollPaymentError && (
                    <p role="alert">{payrollPaymentError}</p>
                  )}
                  {payrollCanPay && payrollUnpaidRows.length > 0 && (
                    <form
                      onSubmit={handlePayrollPayment}
                      style={{
                        marginTop: 16,
                      }}
                    >
                      <fieldset
                        disabled={
                          payrollPaymentSaving ||
                          payrollDetailLoading ||
                          accountsLoading
                        }
                        style={{
                          minWidth: 0,
                          padding: 12,
                          border: "1px solid var(--color-line, #dde4ee)",
                          borderRadius: 10,
                        }}
                      >
                        <legend>급여 지급 내역 등록</legend>
                        <p>
                          미지급 {payrollUnpaidRows.length}명 · 실지급액{" "}
                          <strong>{payrollWon(payrollNetPending)}</strong>
                        </p>
                        <p
                          className="subtext"
                          style={{
                            fontSize: 12,
                          }}
                        >
                          실제 은행 송금 후 등록하세요. 이 버튼은 은행 송금을
                          실행하지 않습니다.
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <label htmlFor="payroll-account">출금 회사계좌</label>
                          <select
                            id="payroll-account"
                            required
                            value={payrollPayForm.account_id}
                            onChange={(event) =>
                              setPayrollPayForm((previous) => ({
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
                          <label htmlFor="payroll-date">실제 지급일</label>
                          <input
                            id="payroll-date"
                            type="date"
                            required
                            max={today}
                            value={payrollPayForm.payment_date}
                            onChange={(event) =>
                              setPayrollPayForm((previous) => ({
                                ...previous,
                                payment_date: event.target.value,
                              }))
                            }
                          />
                          <label htmlFor="payroll-password">
                            로그인 비밀번호 확인
                          </label>
                          <input
                            id="payroll-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={payrollPayForm.password}
                            onChange={(event) =>
                              setPayrollPayForm((previous) => ({
                                ...previous,
                                password: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="submit"
                            className="register-btn"
                            disabled={
                              payrollNetPending <= 0 ||
                              paymentAccounts.length === 0
                            }
                          >
                            {payrollPaymentSaving
                              ? "등록 중…"
                              : `${payrollWon(payrollNetPending)} 지급 등록`}
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  )}
                  {payrollUnpaidRows.length === 0 && (
                    <p>모든 직원의 급여가 지급 등록되었습니다.</p>
                  )}
                  <p
                    className="subtext"
                    style={{
                      margin: "10px 0 0",
                      fontSize: 12,
                    }}
                  >
                    실지급액 = 세전 급여 − 공제액. 공제액의 납부 상태는 공제액
                    상세에서 확인할 수 있습니다.
                  </p>
                </>
              ))}
          </section>
        }
      />
    </div>
  );
}
