import { useState } from 'react';
import { createId } from './crmStorage';

const INITIAL_FORM = {
  customerId: '',
  purchaseId: '',
  type: '제품 불량',
  content: '',
  resolution: '',
  status: '접수',
};

const CLAIM_TYPES = ['제품 불량', '교환', '환불', '불만 사항'];
const CLAIM_STATUS = ['접수', '검토 중', '처리 완료'];

export default function ClaimsPage({ data, setData }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

  const customerPurchases = data.purchases.filter(
    (purchase) => purchase.customerId === form.customerId
  );
  const selectedPurchase = findPurchase(form.purchaseId);

  function findCustomerName(customerId) {
    return data.customers.find((customer) => customer.id === customerId)?.name
      || '삭제된 고객';
  }

  function findPurchase(purchaseId) {
    return data.purchases.find((purchase) => purchase.id === purchaseId);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      // 고객을 바꾸면 이전 고객의 구매 건이 남지 않게 초기화한다.
      ...(name === 'customerId' && { purchaseId: '' }),
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const linkedPurchase = data.purchases.find(
      (purchase) => purchase.id === form.purchaseId
        && purchase.customerId === form.customerId
    );

    if (!form.customerId || !linkedPurchase || !form.content.trim()) {
      alert('고객, 해당 고객의 구매 건, 클레임 내용을 입력해 주세요.');
      return;
    }

    const claim = {
      ...form,
      id: editingId || createId('claim'),
    };

    setData((current) => ({
      ...current,
      claims: editingId
        ? current.claims.map((item) => item.id === editingId ? claim : item)
        : [...current.claims, claim],
    }));

    setSelectedClaim(claim);
    resetForm();
  }

  function startEditing(claim) {
    setEditingId(claim.id);
    setForm(claim);
  }

  function deleteClaim(claimId) {
    if (!window.confirm('클레임을 삭제할까요?')) return;

    setData((current) => ({
      ...current,
      claims: current.claims.filter((claim) => claim.id !== claimId),
    }));

    if (selectedClaim?.id === claimId) setSelectedClaim(null);
  }

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>클레임 관리</h1>
          <p>고객의 실제 구매 건에 연결해 클레임을 처리합니다.</p>
        </div>
      </header>

      <form className="erp-form" onSubmit={handleSubmit}>
        <h2>{editingId ? '클레임 수정 및 처리' : '클레임 등록'}</h2>

        <div className="form-grid">
          <label>
            고객 *
            <select name="customerId" value={form.customerId} onChange={handleChange}>
              <option value="">고객 선택</option>
              {data.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone})
                </option>
              ))}
            </select>
          </label>

          <label>
            구매 건 *
            <select
              name="purchaseId"
              value={form.purchaseId}
              onChange={handleChange}
              disabled={!form.customerId}
            >
              <option value="">구매 건 선택</option>
              {customerPurchases.map((purchase) => (
                <option key={purchase.id} value={purchase.id}>
                  {purchase.date} · {purchase.productName} · {purchase.store}
                </option>
              ))}
            </select>
          </label>

          <label>
            유형
            <select name="type" value={form.type} onChange={handleChange}>
              {CLAIM_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>

          <label>
            상태
            <select name="status" value={form.status} onChange={handleChange}>
              {CLAIM_STATUS.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>

          <label className="full-field">
            클레임 내용 *
            <textarea name="content" value={form.content} onChange={handleChange} />
          </label>

          <label className="full-field">
            처리 내용
            <textarea name="resolution" value={form.resolution} onChange={handleChange} />
          </label>
        </div>

        {selectedPurchase && (
          <p className="connection-status">
            선택 구매 건: {selectedPurchase.productName} / 구매일 {selectedPurchase.date}
          </p>
        )}

        <div className="button-row">
          <button type="submit">저장</button>
          {editingId && <button type="button" onClick={resetForm}>취소</button>}
        </div>
      </form>

      {!data.purchases.length && (
        <p className="connection-status is-offline">
          클레임을 등록하려면 고객 상세에서 구매 이력을 먼저 등록하세요.
        </p>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>고객</th>
              <th>유형</th>
              <th>제품 / 구매일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {data.claims.map((claim) => {
              const purchase = findPurchase(claim.purchaseId);

              return (
                <tr key={claim.id} onClick={() => setSelectedClaim(claim)}>
                  <td>{findCustomerName(claim.customerId)}</td>
                  <td>{claim.type}</td>
                  <td>
                    {purchase
                      ? `${purchase.productName} / ${purchase.date}`
                      : '삭제된 구매 건'}
                  </td>
                  <td><span className="status-badge">{claim.status}</span></td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => startEditing(claim)}>수정/처리</button>{' '}
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => deleteClaim(claim.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}

            {!data.claims.length && (
              <tr><td colSpan="5" className="no-data">등록된 클레임이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <ClaimDetail
          claim={selectedClaim}
          customerName={findCustomerName(selectedClaim.customerId)}
          purchase={findPurchase(selectedClaim.purchaseId)}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </section>
  );
}

function ClaimDetail({ claim, customerName, purchase, onClose }) {
  return (
    <article className="detail-card">
      <div className="page-header">
        <h2>클레임 상세</h2>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
      <dl>
        <div><dt>고객</dt><dd>{customerName}</dd></div>
        <div>
          <dt>구매 건</dt>
          <dd>{purchase ? `${purchase.productName} / ${purchase.date}` : '-'}</dd>
        </div>
        <div><dt>유형 / 상태</dt><dd>{claim.type} / {claim.status}</dd></div>
        <div><dt>클레임 내용</dt><dd>{claim.content}</dd></div>
        <div><dt>처리 내용</dt><dd>{claim.resolution || '처리 전'}</dd></div>
      </dl>
    </article>
  );
}
