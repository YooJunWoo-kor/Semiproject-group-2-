import React, { useEffect, useRef, useState } from "react";
import ModalBase from "../../../../components/ModalBase";
import {
  getApprovalPayments, createApprovalPayment,
  getBankAccounts, getCorporateCards
} from "../../../../utils/financeService";
import "../FinanceRegistration.css";

// 백엔드와 동일하게 한국 날짜를 사용합니다.
function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  return ["year", "month", "day"].map((type) =>
    parts.find((part) => part.type === type).value
  ).join("-");
}

export default function ApprovalPayments({ approval, loginUser, blocked, onBusyChange, onPaid }) {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    payment_date: "", amount: "", payment_method: "계좌이체",
    account_id: "", card_id: "", password: ""
  });
  const savingLock = useRef(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummary(null);
    async function loadPayments() {
      try {
        const data = await getApprovalPayments(approval.id);
        if (!data?.summary || !Array.isArray(data.payments)) throw new Error("잘못된 지급 조회 응답");
        if (!cancelled) {
          setSummary(data.summary);
          setPayments(data.payments);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "지급 현황을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayments();
    return () => { cancelled = true; };
  }, [approval.id, approval.status, refresh]);

  // 폼을 다시 열 때마다 잔액과 카드 한도를 새로 조회합니다.
  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    setOptionsLoading(true);
    setBankAccounts([]);
    setCards([]);
    setBankError("");
    setCardError("");
    async function loadOptions() {
      const [banks, cardList] = await Promise.allSettled([getBankAccounts(), getCorporateCards()]);
      if (cancelled) return;
      if (banks.status === "fulfilled" && Array.isArray(banks.value)) setBankAccounts(banks.value);
      else setBankError("회사계좌 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      if (cardList.status === "fulfilled" && Array.isArray(cardList.value)) setCards(cardList.value);
      else setCardError("법인카드 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      setOptionsLoading(false);
    }
    loadOptions();
    return () => { cancelled = true; };
  }, [formOpen]);

  const remaining = Number(summary?.remaining_amount);
  const validSummary = summary && Number(summary.document_id) === Number(approval.id) &&
    [summary.document_amount, summary.paid_amount, summary.remaining_amount].every((value) =>
      value != null && Number.isSafeInteger(Number(value)) && Number(value) >= 0
    );
  const isFinance = Number(loginUser?.employee_id) > 0 &&
    (loginUser?.role === "MASTER" || Number(loginUser?.department_id) === 1);
  const canPay = approval.status === "승인" && summary?.approval_status === "승인" &&
    isFinance && validSummary && remaining > 0 && !loading && !error;
  const availableBanks = bankAccounts.filter((bank) => bank.currency === "KRW" &&
    ["사용", "ACTIVE"].includes(bank.account_status));
  const availableCards = cards.filter((card) => ["사용", "ACTIVE"].includes(card.card_status));

  function openForm() {
    if (!canPay || savingLock.current || blocked) return;
    setForm({ payment_date: todayInKorea(), amount: String(remaining),
      payment_method: "계좌이체", account_id: "", card_id: "", password: "" });
    setFormError("");
    setMessage("");
    setOptionsLoading(true);
    setFormOpen(true);
  }
  function closeForm() {
    if (savingLock.current) return;
    setFormOpen(false);
    setForm((previous) => ({ ...previous, password: "" }));
  }
  function changeForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value,
      ...(name === "payment_method" ? { account_id: "", card_id: "" } : {}) }));
    setFormError("");
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (savingLock.current || blocked) return;
    setFormError("");
    const amount = Number(form.amount);
    if (!canPay) { setFormError("최신 지급 현황을 다시 확인해 주세요."); return; }
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) {
      setFormError(`지급액은 1원부터 남은 지급액 ${remaining.toLocaleString()}원까지 입력해 주세요.`); return;
    }
    const date = new Date(`${form.payment_date}T00:00:00Z`);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(form.payment_date) || Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== form.payment_date) {
      setFormError("올바른 지급일을 입력해 주세요."); return;
    }
    if (!form.password) { setFormError("지급 등록자의 로그인 비밀번호를 입력해 주세요."); return; }
    if (form.payment_method === "계좌이체") {
      const bank = availableBanks.find((item) => String(item.account_id) === form.account_id);
      if (optionsLoading || bankError || !bank) { setFormError("사용할 회사계좌를 선택해 주세요."); return; }
      if (!Number.isSafeInteger(Number(bank.balance)) || Number(bank.balance) < amount) {
        setFormError("회사계좌의 잔액을 확인해 주세요."); return;
      }
    } else if (form.payment_method === "법인카드") {
      const card = availableCards.find((item) => String(item.card_id) === form.card_id);
      if (optionsLoading || cardError || !card) { setFormError("사용할 법인카드를 선택해 주세요."); return; }
      if (!Number.isSafeInteger(Number(card.remaining_limit)) || Number(card.remaining_limit) < amount) {
        setFormError("법인카드의 잔여 한도를 확인해 주세요."); return;
      }
      if (form.payment_date.slice(0, 7) !== todayInKorea().slice(0, 7)) {
        setFormError("법인카드 지급일은 현재 월로 입력해 주세요."); return;
      }
    } else if (form.payment_method !== "현금") {
      setFormError("올바른 결제수단을 선택해 주세요."); return;
    }

    savingLock.current = true;
    setSaving(true);
    onBusyChange(true);
    try {
      const result = await createApprovalPayment(approval.id, {
        employee_id: loginUser.employee_id, password: form.password,
        payment_date: form.payment_date, amount, payment_method: form.payment_method,
        account_id: form.payment_method === "계좌이체" ? Number(form.account_id) : null,
        card_id: form.payment_method === "법인카드" ? Number(form.card_id) : null
      });
      // 저장 성공 뒤 폼을 닫고 새로 조회합니다. 재조회 실패 시 재등록하지 않습니다.
      setFormOpen(false);
      setSummary(null);
      setMessage(result.message || "지급 내역이 등록되었습니다.");
      setRefresh((previous) => previous + 1);
      await onPaid();
    } catch (err) {
      setFormError(err.response?.data?.message ||
        "지급 결과를 확인하지 못했습니다. 지급 현황을 다시 조회한 뒤 확인해 주세요.");
      setSummary(null);
      setRefresh((previous) => previous + 1);
    } finally {
      setForm((previous) => ({ ...previous, password: "" }));
      savingLock.current = false;
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="finance-registration-modal" aria-label="지급 현황">
      <h3>지급 현황</h3>
      <button type="button" disabled={loading || saving || blocked}
        onClick={() => setRefresh((previous) => previous + 1)}>지급 현황 새로고침</button>
      {message && <p role="status">{message}</p>}
      {loading ? <p>지급 현황을 불러오는 중입니다.</p> : error ? <p role="alert">{error}</p> : (
        <>
          <p>
            문서 금액: {Number(summary?.document_amount || 0).toLocaleString()}원
            {" | "}지급 완료: {Number(summary?.paid_amount || 0).toLocaleString()}원
            {" | "}남은 지급액: {Number(summary?.remaining_amount || 0).toLocaleString()}원
          </p>
          {!validSummary && <p role="alert">기존 문서 금액과 지급 합계를 확인해 주세요. 지급 등록을 중단했습니다.</p>}
          {canPay && <button type="button" className="erp-primary-button"
            disabled={saving || blocked || formOpen} onClick={openForm}>+ 지급 등록</button>}
          {validSummary && remaining === 0 && <p>지급이 완료된 문서입니다.</p>}
          {approval.status !== "승인" && <p>최종 승인된 문서에 지급을 등록할 수 있습니다.</p>}
          {!isFinance && <p>지급 등록은 재무부 또는 MASTER 계정으로 진행해 주세요.</p>}
          {payments.length === 0 ? <p>등록된 지급 내역이 없습니다.</p> : (
            <table>
              <thead><tr>
                <th scope="col">지급 번호</th><th scope="col">지급일</th>
                <th scope="col">금액</th><th scope="col">결제수단</th>
                <th scope="col">계좌·카드 ID</th><th scope="col">입출금 구분</th><th scope="col">상태</th>
              </tr></thead>
              <tbody>{payments.map((payment) => (
                <tr key={payment.payment_id}>
                  <td>{payment.payment_id}</td><td>{payment.payment_date}</td>
                  <td>{Number(payment.amount).toLocaleString()}원</td><td>{payment.payment_method}</td>
                  <td>{payment.account_id ? `계좌 #${payment.account_id}` : payment.card_id ? `카드 #${payment.card_id}` : "-"}</td>
                  <td>{payment.payment_direction}</td><td>{payment.payment_status}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </>
      )}
      {formOpen && (
        <ModalBase title="지출 지급 등록" onClose={closeForm} layout={(
          <form onSubmit={submitPayment}>
            <fieldset disabled={saving || blocked}>
              <p>{approval.title} / 남은 지급액: {Number.isSafeInteger(remaining) ? remaining.toLocaleString() : "조회 중"}원</p>
              <div><label htmlFor="doc-payment-date">지급일 *</label>
                <input id="doc-payment-date" name="payment_date" type="date" required value={form.payment_date} onChange={changeForm} /></div>
              <div><label htmlFor="doc-payment-amount">지급 금액 *</label>
                <input id="doc-payment-amount" name="amount" type="number" min="1" step="1"
                  max={Number.isSafeInteger(remaining) ? remaining : undefined} required value={form.amount} onChange={changeForm} /></div>
              <div><label htmlFor="doc-payment-method">결제수단 *</label>
                <select id="doc-payment-method" name="payment_method" value={form.payment_method} onChange={changeForm}>
                  <option value="계좌이체">계좌이체</option><option value="법인카드">법인카드</option><option value="현금">현금</option>
                </select></div>
              {form.payment_method === "계좌이체" && <div>
                <label htmlFor="doc-payment-account">회사계좌 *</label>
                <select id="doc-payment-account" name="account_id" required value={form.account_id}
                  disabled={optionsLoading || Boolean(bankError)} onChange={changeForm}>
                  <option value="">회사계좌 선택</option>
                  {availableBanks.map((bank) => <option key={bank.account_id} value={bank.account_id}>
                    {bank.bank_name} / {bank.account_name} / 잔액 {Number(bank.balance).toLocaleString()}원
                  </option>)}
                </select>
                {bankError && <p role="alert">{bankError}</p>}
              </div>}
              {form.payment_method === "법인카드" && <div>
                <label htmlFor="doc-payment-card">법인카드 *</label>
                <select id="doc-payment-card" name="card_id" required value={form.card_id}
                  disabled={optionsLoading || Boolean(cardError)} onChange={changeForm}>
                  <option value="">법인카드 선택</option>
                  {availableCards.map((card) => <option key={card.card_id} value={card.card_id}>
                    {card.card_name} / 잔여 한도 {Number(card.remaining_limit).toLocaleString()}원
                  </option>)}
                </select>
                <p>법인카드는 현재 월의 지급일만 등록할 수 있습니다.</p>
                {cardError && <p role="alert">{cardError}</p>}
              </div>}
              {optionsLoading && <p>계좌와 카드 목록을 불러오는 중입니다.</p>}
              <div><label htmlFor="doc-payment-password">지급 등록자 로그인 비밀번호 *</label>
                <input id="doc-payment-password" name="password" type="password" autoComplete="current-password"
                  required value={form.password} onChange={changeForm} /></div>
              <p>ERP에 지급 내역을 기록합니다. 실제 은행 이체나 카드 결제를 실행하지 않습니다.</p>
              {formError && <p role="alert">{formError}</p>}
              <button type="submit" disabled={!canPay || (form.payment_method !== "현금" && optionsLoading) ||
                (form.payment_method === "계좌이체" && Boolean(bankError)) ||
                (form.payment_method === "법인카드" && Boolean(cardError))}>
                {saving ? "지급 저장 중..." : "지급 저장"}
              </button>
              <button type="button" onClick={closeForm}>취소</button>
            </fieldset>
          </form>
        )} />
      )}
    </section>
  );
}
