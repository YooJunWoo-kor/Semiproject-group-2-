import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createId } from './crmStorage';

const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  address: '',
  memo: '',
};

const EMPTY_PURCHASE = {
  date: '',
  productName: '',
  quantity: '1',
  amount: '',
  store: '',
};

export function CustomersPage({ data, setData }) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);

  const customers = data.customers.filter((customer) => {
    const target = `${customer.name} ${customer.phone}`.toLowerCase();
    return target.includes(searchText.toLowerCase());
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_CUSTOMER);
  }

  function saveCustomer(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      alert('이름과 연락처를 입력해 주세요.');
      return;
    }

    const customer = {
      ...form,
      id: editingId || createId('customer'),
    };

    setData((current) => ({
      ...current,
      customers: editingId
        ? current.customers.map((item) => item.id === editingId ? customer : item)
        : [...current.customers, customer],
    }));

    resetForm();
  }

  function startEditing(customer) {
    setEditingId(customer.id);
    setForm(customer);
  }

  function deleteCustomer(customer) {
    const message = `${customer.name} 고객과 연결된 구매·상담·클레임을 삭제할까요?`;
    if (!window.confirm(message)) return;

    const purchaseIds = data.purchases
      .filter((purchase) => purchase.customerId === customer.id)
      .map((purchase) => purchase.id);

    setData((current) => ({
      ...current,
      customers: current.customers.filter((item) => item.id !== customer.id),
      purchases: current.purchases.filter((item) => item.customerId !== customer.id),
      consultations: current.consultations.filter(
        (item) => item.customerId !== customer.id
      ),
      claims: current.claims.filter((claim) => (
        claim.customerId !== customer.id && !purchaseIds.includes(claim.purchaseId)
      )),
    }));
  }

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>고객 관리</h1>
          <p>일반 구매자를 등록하고 구매 이력을 확인합니다.</p>
        </div>
      </header>

      <form className="erp-form" onSubmit={saveCustomer}>
        <h2>{editingId ? '고객 수정' : '고객 등록'}</h2>
        <div className="form-grid">
          <TextField label="이름 *" name="name" value={form.name} onChange={handleChange} />
          <TextField label="연락처 *" name="phone" value={form.phone} onChange={handleChange} />
          <TextField label="이메일" name="email" type="email" value={form.email} onChange={handleChange} />
          <TextField label="주소" name="address" value={form.address} onChange={handleChange} />
          <label className="full-field">
            메모
            <textarea name="memo" value={form.memo} onChange={handleChange} />
          </label>
        </div>
        <div className="button-row">
          <button type="submit">저장</button>
          {editingId && <button type="button" onClick={resetForm}>취소</button>}
        </div>
      </form>

      <div className="filter-bar">
        <label className="search-field">
          이름 또는 연락처 검색
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="검색어 입력"
          />
        </label>
        <span>총 {customers.length}명</span>
      </div>

      <div className="table-shell">
        <table>
          <thead><tr><th>이름</th><th>연락처</th><th>이메일</th><th>관리</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => navigate(`/main/crm/customers/${customer.id}`)}
              >
                <td>
                  <Link className="link-button" to={`/main/crm/customers/${customer.id}`}>
                    {customer.name}
                  </Link>
                </td>
                <td>{customer.phone}</td>
                <td>{customer.email || '-'}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => startEditing(customer)}>수정</button>{' '}
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deleteCustomer(customer)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {!customers.length && (
              <tr><td colSpan="4" className="no-data">등록된 고객이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CustomerDetailPage({ data, setData }) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PURCHASE);

  const customer = data.customers.find((item) => item.id === customerId);
  const purchases = data.purchases.filter((item) => item.customerId === customerId);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_PURCHASE);
  }

  function savePurchase(event) {
    event.preventDefault();

    const requiredValues = [
      form.date,
      form.productName.trim(),
      form.quantity,
      form.amount,
      form.store.trim(),
    ];

    if (requiredValues.some((value) => !value)) {
      alert('구매 이력의 필수값을 모두 입력해 주세요.');
      return;
    }

    const purchase = {
      ...form,
      id: editingId || createId('purchase'),
      customerId,
    };

    setData((current) => ({
      ...current,
      purchases: editingId
        ? current.purchases.map((item) => item.id === editingId ? purchase : item)
        : [...current.purchases, purchase],
    }));

    resetForm();
  }

  function startEditing(purchase) {
    setEditingId(purchase.id);
    setForm(purchase);
  }

  function deletePurchase(purchaseId) {
    if (!window.confirm('구매 이력을 삭제할까요? 연결된 클레임도 함께 삭제됩니다.')) {
      return;
    }

    setData((current) => ({
      ...current,
      purchases: current.purchases.filter((item) => item.id !== purchaseId),
      claims: current.claims.filter((claim) => claim.purchaseId !== purchaseId),
    }));
  }

  if (!customer) {
    return (
      <section className="workspace-page">
        <p>고객을 찾을 수 없습니다.</p>
        <Link to="/main/crm/customers">고객 목록으로</Link>
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CUSTOMER DETAIL</span>
          <h1>{customer.name}</h1>
          <p>{customer.phone}</p>
        </div>
        <button type="button" onClick={() => navigate('/main/crm/customers')}>
          목록으로
        </button>
      </header>

      <article className="detail-card">
        <h2>기본 정보</h2>
        <dl>
          <div><dt>이메일</dt><dd>{customer.email || '-'}</dd></div>
          <div><dt>주소</dt><dd>{customer.address || '-'}</dd></div>
          <div><dt>메모</dt><dd>{customer.memo || '-'}</dd></div>
        </dl>
      </article>

      <form className="erp-form" onSubmit={savePurchase}>
        <h2>{editingId ? '구매 이력 수정' : '구매 이력 등록'}</h2>
        <div className="form-grid">
          <TextField label="구매일 *" name="date" type="date" value={form.date} onChange={handleChange} />
          <TextField label="제품명 *" name="productName" value={form.productName} onChange={handleChange} />
          <TextField label="수량 *" name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
          <TextField label="결제금액 *" name="amount" type="number" min="0" value={form.amount} onChange={handleChange} />
          <TextField label="구매처 *" name="store" value={form.store} onChange={handleChange} />
        </div>
        <div className="button-row">
          <button type="submit">저장</button>
          {editingId && <button type="button" onClick={resetForm}>취소</button>}
        </div>
      </form>

      <div className="table-shell">
        <table>
          <thead>
            <tr><th>구매일</th><th>제품명</th><th>수량</th><th>결제금액</th><th>구매처</th><th>관리</th></tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.date}</td>
                <td>{purchase.productName}</td>
                <td>{purchase.quantity}</td>
                <td>{Number(purchase.amount).toLocaleString()}원</td>
                <td>{purchase.store}</td>
                <td>
                  <button type="button" onClick={() => startEditing(purchase)}>수정</button>{' '}
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deletePurchase(purchase.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {!purchases.length && (
              <tr><td colSpan="6" className="no-data">구매 이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TextField({ label, ...inputProps }) {
  return (
    <label>
      {label}
      <input {...inputProps} />
    </label>
  );
}
