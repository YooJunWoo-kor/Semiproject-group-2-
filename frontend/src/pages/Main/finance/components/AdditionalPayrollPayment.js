import React, { useState } from 'react';
import ModalBase from '../../../../components/ModalBase';
import { API_BASE_URL, getLoginUser } from '../../../../utils/authStorage';

export default function AdditionalPayrollPayment({ row, accounts, canPay, onClose, onPaid, onBusyChange }) {
  const [form, setForm] = useState({ account_id: '', payment_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const won = value => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  function change(event) { setForm(previous => ({ ...previous, [event.target.name]: event.target.value })); }
  async function pay(event) {
    event.preventDefault();
    if (saving || !canPay || row.payment_id || row.validation_error) return;
    setSaving(true); onBusyChange(true); setError('');
    try {
      const user = getLoginUser();
      const response = await fetch(`${API_BASE_URL}/finance/additional-payrolls/${row.draft_id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, account_id: Number(form.account_id), expected_amount: row.amount,
          employee_id: Number(user?.employee_id ?? user?.employeeKey) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '추가급여 지급 등록에 실패했습니다.');
      onPaid();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); onBusyChange(false); setForm(previous => ({ ...previous, password: '' })); }
  }
  return <div className="finance-registration-modal finance-voucher-detail">
    <ModalBase title="추가급여 상세" onClose={() => { if (!saving) onClose(); }} layout={<section>
      <h3>{row.title}</h3>
      <dl>
        <dt>직원</dt><dd>{row.employee_name} (#{row.employee_id})</dd>
        <dt>급여월</dt><dd>{row.pay_month}</dd>
        <dt>상세 분류</dt><dd>{row.payment_detail || '-'}</dd>
        <dt>승인 금액</dt><dd>{won(row.amount)}</dd>
        <dt>지급 상태</dt><dd>{row.payment_status}</dd>
      </dl>
      <p>{row.content}</p>
      {row.payment_id && <p>지급일: {row.paid_date} · 지급액: {won(row.paid_amount)} · 지급번호 #{row.payment_id}</p>}
      {row.validation_error && <p role="alert">{row.validation_error}</p>}
      {error && <p role="alert">{error}</p>}
      {canPay && !row.payment_id && !row.validation_error && <form onSubmit={pay}>
        <fieldset disabled={saving}>
          <legend>추가급여 지급 등록</legend>
          <p>승인 금액 전액을 별도 지급합니다. 실제 은행 송금 후 등록하세요.</p>
          <label>출금 회사계좌<select name="account_id" required value={form.account_id} onChange={change}>
            <option value="">회사계좌 선택</option>
            {accounts.map(account => <option key={account.account_id} value={account.account_id}>
              {account.bank_name} · {account.account_name} · 잔액 {won(account.balance)}
            </option>)}
          </select></label>
          <label>실제 지급일<input name="payment_date" type="date" required max={today} value={form.payment_date} onChange={change} /></label>
          <label>로그인 비밀번호<input name="password" type="password" autoComplete="current-password" required value={form.password} onChange={change} /></label>
          <button type="submit" className="register-btn" disabled={!accounts.length}>{saving ? '등록 중…' : `${won(row.amount)} 지급 등록`}</button>
        </fieldset>
      </form>}
    </section>} />
  </div>;
}
