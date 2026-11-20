import { getFinanceError, koreaDate as todayInKorea } from './financeUtils';
import React, { useEffect, useState } from 'react';
import ModalBase from '../../../../components/ModalBase';
import { getApprovalPayments, createApprovalPayment, getBankAccounts, getCorporateCards, getApprovalAttachments, uploadApprovalAttachment, downloadApprovalAttachment } from '../../../../utils/financeService';
import { canAccessFinance } from '../../../../utils/authStorage';
import './Finance.css';
import '../../../../css/Form.css';
import '../../../../css/Table.css';
import '../../../../css/SubMain.css';
import '../../../../css/ModalPopup.css';

// ApprovalPayments
//승인된 결재 문서의 지급 현황·내역과 지급 등록 폼

export function ApprovalPayments({
  approval,
  loginUser,
  blocked,
  onBusyChange,
  onPaid,
  embedded = false,
  paymentFormOpen = false,
  onFormOpenChange
}) {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [localFormOpen, setLocalFormOpen] = useState(false);
  const formOpen = embedded ? paymentFormOpen : localFormOpen;
  function setFormOpen(value) {
    if (embedded) onFormOpenChange?.(value); else setLocalFormOpen(value);
  }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    payment_date: "",
    amount: "",
    payment_method: "계좌이체",
    account_id: "",
    card_id: "",
    password: ""
  });
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
        if (!cancelled) setError(getFinanceError(err, "지급 현황을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayments();
    return () => {
      cancelled = true;
    };
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
      if (banks.status === "fulfilled" && Array.isArray(banks.value)) setBankAccounts(banks.value); else setBankError("회사계좌 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      if (cardList.status === "fulfilled" && Array.isArray(cardList.value)) setCards(cardList.value); else setCardError("법인카드 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      setOptionsLoading(false);
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [formOpen]);

  // 상위 모달의 닫기 버튼으로 돌아간 경우에도 비밀번호를 지웁니다.
  useEffect(() => {
    if (!formOpen) setForm(previous => ({
      ...previous,
      password: ""
    }));
  }, [formOpen]);
  // 1. 지급 금액이 올바른 값인지 확인
  function isValidAmount(value) {
    if (value == null) return false;

    const amount = Number(value);

    return Number.isSafeInteger(amount) && amount >= 0;
  }

  // 2. 현재 문서의 지급 요약인지 확인
  const isSameDocument =
    Number(summary?.document_id) === Number(approval.id);

  const hasValidAmounts = [
    summary?.document_amount,
    summary?.paid_amount,
    summary?.remaining_amount,
  ].every(isValidAmount);

  const validSummary =
    Boolean(summary) && isSameDocument && hasValidAmounts;

  // 3. 로그인한 사용자의 지급 권한 확인
  const employeeId = Number(loginUser?.employee_id ?? loginUser?.employeeKey);
  const isLoggedIn = Number.isSafeInteger(employeeId) && employeeId > 0;
  const isFinance = isLoggedIn && canAccessFinance(loginUser);

  // 4. 승인 상태와 남은 지급 금액 확인
  const isApproved =
    approval.status === "승인" &&
    summary?.approval_status === "승인";

  const remaining = Number(summary?.remaining_amount);
  const hasRemainingAmount = remaining > 0;
  const isReady = !loading && !error;

  // 5. 지급 가능 여부
  const canPay =
    isApproved &&
    isFinance &&
    validSummary &&
    hasRemainingAmount &&
    isReady;

  // 6. 사용 가능한 계좌와 카드
  function isActive(status) {
    return status === "사용" || status === "ACTIVE";
  }

  const availableBanks = bankAccounts.filter(bank => {
    const isKRW = bank.currency === "KRW";
    const isUsable = isActive(bank.account_status);

    return isKRW && isUsable;
  });

  const availableCards = cards.filter(card =>
    isActive(card.card_status)
  );
  function openForm() {
    if (!canPay || saving || blocked) return;
    setForm({
      payment_date: todayInKorea(),
      amount: String(remaining),
      payment_method: "계좌이체",
      account_id: "",
      card_id: "",
      password: ""
    });
    setFormError("");
    setMessage("");
    setOptionsLoading(true);
    setFormOpen(true);
  }
  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setForm(previous => ({
      ...previous,
      password: ""
    }));
  }
  function changeForm(event) {
    const {
      name,
      value
    } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: value,
      ...(name === "payment_method" ? {
        account_id: "",
        card_id: ""
      } : {})
    }));
    setFormError("");
  }
  async function submitPayment(event) {
    event.preventDefault();
    if (saving || blocked) return;
    setFormError("");
    const amount = Number(form.amount);
    if (!canPay) {
      setFormError("최신 지급 현황을 다시 확인해 주세요.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) {
      setFormError(`지급액은 1원부터 남은 지급액 ${remaining.toLocaleString()}원까지 입력해 주세요.`);
      return;
    }
    const date = new Date(`${form.payment_date}T00:00:00Z`);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(form.payment_date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.payment_date) {
      setFormError("올바른 지급일을 입력해 주세요.");
      return;
    }
    if (!form.password) {
      setFormError("지급 등록자의 로그인 비밀번호를 입력해 주세요.");
      return;
    }
    if (form.payment_method === "계좌이체") {
      const bank = availableBanks.find(item => String(item.account_id) === form.account_id);
      if (optionsLoading || bankError || !bank) {
        setFormError("사용할 회사계좌를 선택해 주세요.");
        return;
      }
      if (!Number.isSafeInteger(Number(bank.balance)) || Number(bank.balance) < amount) {
        setFormError("회사계좌의 잔액을 확인해 주세요.");
        return;
      }
    } else if (form.payment_method === "법인카드") {
      const card = availableCards.find(item => String(item.card_id) === form.card_id);
      if (optionsLoading || cardError || !card) {
        setFormError("사용할 법인카드를 선택해 주세요.");
        return;
      }
      if (!Number.isSafeInteger(Number(card.remaining_limit)) || Number(card.remaining_limit) < amount) {
        setFormError("법인카드의 잔여 한도를 확인해 주세요.");
        return;
      }
      if (form.payment_date.slice(0, 7) !== todayInKorea().slice(0, 7)) {
        setFormError("법인카드 지급일은 현재 월로 입력해 주세요.");
        return;
      }
    } else if (form.payment_method !== "현금") {
      setFormError("올바른 결제수단을 선택해 주세요.");
      return;
    }
    setSaving(true);
    onBusyChange(true);
    try {
      const result = await createApprovalPayment(approval.id, {
        employee_id: employeeId,
        password: form.password,
        payment_date: form.payment_date,
        amount,
        payment_method: form.payment_method,
        account_id: form.payment_method === "계좌이체" ? Number(form.account_id) : null,
        card_id: form.payment_method === "법인카드" ? Number(form.card_id) : null
      });
      // 저장 성공 뒤 폼을 닫고 새로 조회합니다. 재조회 실패 시 재등록하지 않습니다.
      setFormOpen(false);
      setSummary(null);
      setMessage(result.message || "지급 내역이 등록되었습니다.");
      setRefresh(previous => previous + 1);
      await onPaid();
    } catch (err) {
      setFormError(getFinanceError(err, "지급 결과를 확인하지 못했습니다. 지급 현황을 다시 조회한 뒤 확인해 주세요."));
      setSummary(null);
      setRefresh(previous => previous + 1);
    } finally {
      setForm(previous => ({
        ...previous,
        password: ""
      }));
      setSaving(false);
      onBusyChange(false);
    }
  }

  const paymentForm = <form onSubmit={submitPayment}>
    <fieldset disabled={saving || blocked}>
      <p>{approval.title} / 남은 지급액: {Number.isSafeInteger(remaining) ? remaining.toLocaleString() : "조회 중"}원</p>
      <div><label htmlFor="doc-payment-date">지급일 *</label>
        <input id="doc-payment-date" name="payment_date" type="date" required value={form.payment_date} onChange={changeForm} /></div>
      <div><label htmlFor="doc-payment-amount">지급 금액 *</label>
        <input id="doc-payment-amount" name="amount" type="number" min="1" step="1" max={Number.isSafeInteger(remaining) ? remaining : undefined} required value={form.amount} onChange={changeForm} /></div>
      <div><label htmlFor="doc-payment-method">결제수단 *</label>
        <select id="doc-payment-method" name="payment_method" value={form.payment_method} onChange={changeForm}>
          <option value="계좌이체">계좌이체</option><option value="법인카드">법인카드</option><option value="현금">현금</option>
        </select></div>
      {form.payment_method === "계좌이체" && <div>
        <label htmlFor="doc-payment-account">회사계좌 *</label>
        <select id="doc-payment-account" name="account_id" required value={form.account_id} disabled={optionsLoading || Boolean(bankError)} onChange={changeForm}>
          <option value="">회사계좌 선택</option>
          {availableBanks.map(bank => <option key={bank.account_id} value={bank.account_id}>
            {bank.bank_name} / {bank.account_name} / 잔액 {Number(bank.balance).toLocaleString()}원
          </option>)}
        </select>
        {bankError && <p role="alert">{bankError}</p>}
      </div>}
      {form.payment_method === "법인카드" && <div>
        <label htmlFor="doc-payment-card">법인카드 *</label>
        <select id="doc-payment-card" name="card_id" required value={form.card_id} disabled={optionsLoading || Boolean(cardError)} onChange={changeForm}>
          <option value="">법인카드 선택</option>
          {availableCards.map(card => <option key={card.card_id} value={card.card_id}>
            {card.card_name} / 잔여 한도 {Number(card.remaining_limit).toLocaleString()}원
          </option>)}
        </select>
        <p>법인카드는 현재 월의 지급일만 등록할 수 있습니다.</p>
        {cardError && <p role="alert">{cardError}</p>}
      </div>}
      {optionsLoading && <p>계좌와 카드 목록을 불러오는 중입니다.</p>}
      <div><label htmlFor="doc-payment-password">지급 등록자 로그인 비밀번호 *</label>
        <input id="doc-payment-password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={changeForm} /></div>
      <p>ERP에 지급 내역을 기록합니다. 실제 은행 이체나 카드 결제를 실행하지 않습니다.</p>
      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={!canPay || form.payment_method !== "현금" && optionsLoading || form.payment_method === "계좌이체" && Boolean(bankError) || form.payment_method === "법인카드" && Boolean(cardError)}>
        {saving ? "지급 저장 중..." : "지급 저장"}
      </button>
      <button type="button" onClick={closeForm}>취소</button>
    </fieldset>
  </form>;

  return <section className="finance-registration-modal" aria-label="지급 현황">
    {(!embedded || !formOpen) && <>
      <h3>지급 현황</h3>
      <button type="button" disabled={loading || saving || blocked} onClick={() => setRefresh(previous => previous + 1)}>지급 현황 새로고침</button>
      {message && <p role="status">{message}</p>}
      {loading ? <p>지급 현황을 불러오는 중입니다.</p> : error ? <p role="alert">{error}</p> : <>
        <p>
          문서 금액: {Number(summary?.document_amount || 0).toLocaleString()}원
          {" | "}지급 완료: {Number(summary?.paid_amount || 0).toLocaleString()}원
          {" | "}남은 지급액: {Number(summary?.remaining_amount || 0).toLocaleString()}원
        </p>
        {!validSummary && <p role="alert">기존 문서 금액과 지급 합계를 확인해 주세요. 지급 등록을 중단했습니다.</p>}
        {canPay && <button type="button" className="erp-primary-button" disabled={saving || blocked || formOpen} onClick={openForm}>+ 지급 등록</button>}
        {validSummary && remaining === 0 && <p>지급이 완료된 문서입니다.</p>}
        {approval.status !== "승인" && <p>최종 승인된 문서에 지급을 등록할 수 있습니다.</p>}
        {!isFinance && <p>지급 등록은 재무부 또는 MASTER 계정으로 진행해 주세요.</p>}
        {payments.length === 0 ? <p>등록된 지급 내역이 없습니다.</p> : <div className="table-shell finance-approval-scroll">
          <table>
            <thead><tr>
              <th scope="col">지급 번호</th><th scope="col">지급일</th>
              <th scope="col">금액</th><th scope="col">결제수단</th>
              <th scope="col">계좌·카드 ID</th><th scope="col">입출금 구분</th><th scope="col">상태</th>
            </tr></thead>
            <tbody>{payments.map(payment => <tr key={payment.payment_id}>
              <td>{payment.payment_id}</td><td>{payment.payment_date}</td>
              <td>{Number(payment.amount).toLocaleString()}원</td><td>{payment.payment_method}</td>
              <td>{payment.account_id ? `계좌 #${payment.account_id}` : payment.card_id ? `카드 #${payment.card_id}` : "-"}</td>
              <td>{payment.payment_direction}</td><td>{payment.payment_status}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </>}
    </>}
    {formOpen && (embedded ? paymentForm : <ModalBase title="지출 지급 등록" onClose={closeForm} layout={paymentForm} />)}
  </section>;
}

// FinanceAttachments
// 결재 상세와 거래 전표에서 같은 첨부 화면/API를 재사용합니다.
export function FinanceAttachments({ documentId, employeeId, canUpload = false, blocked = false, onBusyChange, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const isDraft = String(documentId).startsWith('draft-');
  const busy = saving || downloading !== null;

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    async function load() {
      try {
        const rows = await getApprovalAttachments(documentId);
        if (!cancelled) setFiles(rows);
      } catch (err) {
        if (!cancelled) setLoadError(getFinanceError(err, '첨부파일 목록을 불러오지 못했습니다.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [documentId, refresh]);

  useEffect(() => {
    let cancelled = false;
    let url;
    setPreviewUrl('');
    setPreviewLoading(Boolean(preview));
    if (preview) {
      downloadApprovalAttachment(documentId, preview.file_id).then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }).catch(err => {
        if (!cancelled) setError(getFinanceError(err, '이미지를 불러오지 못했습니다.'));
      }).finally(() => { if (!cancelled) setPreviewLoading(false); });
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [documentId, preview]);

  async function submit(event) {
    event.preventDefault();
    if (blocked || busy || !canUpload || isDraft) return;
    setError('');
    setMessage('');
    if (!file) return setError('첨부할 이미지를 선택해주세요.');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      return setError('JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.');
    }
    if (file.size > 5 * 1024 * 1024) return setError('파일은 최대 5MB까지 첨부할 수 있습니다.');
    if (Array.from(file.name).length > 255) return setError('파일명은 255자 이내로 작성해주세요.');
    setSaving(true);
    try {
      await uploadApprovalAttachment(documentId, file, employeeId);
      setFile(null);
      setInputKey(previous => previous + 1);
      setRefresh(previous => previous + 1);
      setMessage('증빙파일이 첨부되었습니다.');
      try { await onUploaded?.(); }
      catch { setMessage('첨부는 완료되었습니다. 문서의 첨부 건수는 새로고침해 확인해주세요.'); }
    } catch (err) {
      setError(getFinanceError(err, '첨부 결과를 확인하지 못했습니다. 목록을 새로고침해 확인해주세요.'));
    } finally { setSaving(false); }
  }

  async function download(item) {
    if (busy || blocked) return;
    setDownloading(item.file_id);
    setError('');
    let url;
    let link;
    try {
      const blob = await downloadApprovalAttachment(documentId, item.file_id);
      url = URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.download = item.original_name;
      document.body.appendChild(link);
      link.click();
    } catch (err) { setError(getFinanceError(err, '첨부파일을 다운로드하지 못했습니다.')); }
    finally {
      link?.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloading(null);
    }
  }

  return <section className="finance-attachments" aria-label="증빙파일">
    <h3>증빙파일</h3>
    {isDraft && <p>내업무관리 기안서에 첨부된 영수증입니다. 원본 파일을 그대로 조회합니다.</p>}
    <button type="button" disabled={busy || loading || blocked} onClick={() => setRefresh(previous => previous + 1)}>첨부 목록 새로고침</button>
    {loading ? <p>첨부파일 목록을 불러오는 중입니다.</p> : loadError ? <p role="alert">{loadError}</p> : files.length === 0 ? <p>등록된 첨부파일이 없습니다.</p> : <div className="table-shell finance-approval-scroll">
      <table>
        <thead><tr><th scope="col">파일명</th><th scope="col">크기</th><th scope="col">첨부일시</th><th scope="col">파일 보기</th></tr></thead>
        <tbody>{files.map(item => <tr key={item.file_id}>
          <td>{item.original_name}</td>
          <td>{(Number(item.file_size) / 1024).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}KB</td>
          <td>{item.created_at || '-'}</td>
          <td><button type="button" disabled={busy || blocked} onClick={() => { setError(''); setPreview(item); }}>미리보기</button>{' '}
            <button type="button" disabled={busy || blocked} onClick={() => download(item)}>{downloading === item.file_id ? '다운로드 중...' : '다운로드'}</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {preview && <div className="finance-attachment-preview">
      <button type="button" onClick={() => setPreview(null)}>미리보기 닫기</button>
      <p>{preview.original_name}</p>
      {previewLoading ? <p>이미지를 불러오는 중입니다.</p> : previewUrl && <img src={previewUrl} alt={preview.original_name} />}
    </div>}
    {canUpload && !isDraft ? <form onSubmit={submit}>
      <fieldset disabled={busy || blocked}>
        <label>증빙 이미지 <input key={inputKey} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={event => { setFile(event.target.files?.[0] || null); setError(''); setMessage(''); }} /></label>
        <p>JPG, PNG, WEBP / 최대 5MB / 한 번에 1개</p>
        <button type="submit">{saving ? '첨부 중...' : '증빙파일 첨부'}</button>
      </fieldset>
    </form> : !isDraft && <p>작성자만 대기 상태의 결재 문서에 증빙파일을 첨부할 수 있습니다.</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
