import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createId } from '../utils/createId';

const EMPTY_CLAIM = {
  customerId: '',
  purchaseId: '',
  type: '제품 불량',
  content: '',
  resolution: '',
  status: '접수',
};

const CLAIM_TYPES = ['제품 불량', '교환', '환불', '불만 사항'];
const CLAIM_STATUS = ['접수', '검토 중', '처리 완료'];

export default function ClaimFormPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const params = useParams();
  const claimId = params.claimId;
  const savedClaim = data.claims.find(function (item) {
    return item.id === claimId;
  });
  const isEdit = Boolean(claimId);
  const [form, setForm] = useState(savedClaim || EMPTY_CLAIM);

  const customerPurchases = data.purchases.filter(function (purchase) {
    return purchase.customerId === form.customerId;
  });
  const selectedPurchase = data.purchases.find(function (purchase) {
    return purchase.id === form.purchaseId;
  });

  function handleChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    setForm(function (current) {
      const nextForm = { ...current, [name]: value };
      if (name === 'customerId') {
        nextForm.purchaseId = '';
      }
      return nextForm;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const linkedPurchase = data.purchases.find(function (purchase) {
      return purchase.id === form.purchaseId && purchase.customerId === form.customerId;
    });

    if (!form.customerId || !linkedPurchase || !form.content.trim()) {
      alert('고객, 해당 고객의 구매 건, 클레임 내용을 입력해 주세요.');
      return;
    }

    const claim = {
      ...form,
      id: isEdit ? claimId : createId('claim'),
    };

    setData(function (current) {
      let claims = [...current.claims, claim];
      if (isEdit) {
        claims = current.claims.map(function (item) {
          return item.id === claimId ? claim : item;
        });
      }
      return { ...current, claims: claims };
    });

    alert(isEdit ? '클레임이 수정되었습니다.' : '클레임이 등록되었습니다.');
    navigate('/main/crm/claims');
  }

  if (isEdit && !savedClaim) {
    return (
      <section className="workspace-page crm-page">
        <div className="empty-state">
          <h2>클레임을 찾을 수 없습니다.</h2>
          <button type="button" onClick={function () { navigate('/main/crm/claims'); }}>
            목록으로
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page crm-page crm-form-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM · 클레임 관리</span>
          <h1>{isEdit ? '클레임 수정 및 처리' : '클레임 등록'}</h1>
          <p>고객의 구매 건과 클레임 처리 정보를 입력하세요.</p>
        </div>
      </header>
      <form className="erp-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            고객 *
            <select name="customerId" value={form.customerId} onChange={handleChange}>
              <option value="">고객 선택</option>
              {data.customers.map(function (customer) {
                return <option key={customer.id} value={customer.id}>{customer.name} ({customer.phone})</option>;
              })}
            </select>
          </label>
          <label>
            구매 건 *
            <select name="purchaseId" value={form.purchaseId} onChange={handleChange} disabled={!form.customerId}>
              <option value="">구매 건 선택</option>
              {customerPurchases.map(function (purchase) {
                return <option key={purchase.id} value={purchase.id}>{purchase.date} · {purchase.productName} · {purchase.store}</option>;
              })}
            </select>
          </label>
          <label>
            유형
            <select name="type" value={form.type} onChange={handleChange}>
              {CLAIM_TYPES.map(function (type) { return <option key={type}>{type}</option>; })}
            </select>
          </label>
          <label>
            상태
            <select name="status" value={form.status} onChange={handleChange}>
              {CLAIM_STATUS.map(function (status) { return <option key={status}>{status}</option>; })}
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
          <button type="button" onClick={function () { navigate('/main/crm/claims'); }}>취소</button>
          <button type="submit">{isEdit ? '수정 내용 저장' : '클레임 등록'}</button>
        </div>
      </form>
    </section>
  );
}
