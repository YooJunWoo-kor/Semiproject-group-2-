import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createId } from '../utils/createId';

const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  address: '',
  joinDate: '',
  lastPurchaseDate: '',
};

export default function CustomerFormPage(props) {

  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const params = useParams();
  const customerId = params.customerId;
  
  const savedCustomer = data.customers.find(function (item) {
    return item.id === customerId;
  });


  const [form, setForm] = useState(savedCustomer || EMPTY_CUSTOMER);
  const isEdit = Boolean(customerId);

  // 바뀐 입력 항목 하나를 form에 반영합니다.
  function handleChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    setForm(function (current) { return { ...current, [name]: value }; });
  }

  // 필수값 확인 후 신규 고객을 추가하거나 기존 고객을 수정합니다.
  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      alert('고객명, 연락처, 이메일을 모두 입력해 주세요.');
      return;
    }

    const customer = {
      ...form,
      id: isEdit ? customerId : createId('customer'),
    };

    setData(function (current) {
      let customers = [...current.customers, customer];

      if (isEdit) {
        customers = current.customers.map(function (item) {
          if (item.id === customerId) {
            return customer;
          }
          return item;
        });
      }

      return {
        ...current,
        customers: customers,
      };
    });

    window.alert(isEdit ? '고객 정보가 수정되었습니다.' : '고객이 등록되었습니다.');
    navigate('/main/crm/customers');
  }

  if (isEdit && !savedCustomer) {
    return (
      <section className="workspace-page crm-page">
        <div className="empty-state">
          <h2>고객을 찾을 수 없습니다.</h2>
          <button
            type="button"
            onClick={function () { navigate('/main/crm/customers'); }}
          >
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
          <span className="eyebrow">CRM 고객 관리</span>
          <h1>{isEdit ? '고객 정보 수정' : '고객 등록'}</h1>
          <p>* 표시가 있는 항목은 꼭 입력해 주세요.</p>
        </div>
      </header>
      <form className="erp-form" onSubmit={handleSubmit}>
        <h2>기본 정보</h2>
        <div className="form-grid">
          <Field label="고객명 *" name="name" value={form.name} onChange={handleChange} />
          <Field label="연락처 *" name="phone" value={form.phone} onChange={handleChange} />
          <Field label="이메일 *" name="email" type="email" value={form.email} onChange={handleChange} />
          <Field label="주소" name="address" value={form.address} onChange={handleChange} />
          <Field label="가입일" name="joinDate" type="date" value={form.joinDate} onChange={handleChange} />
          <Field
            label="최근 구매일"
            name="lastPurchaseDate"
            type="date"
            value={form.lastPurchaseDate}
            onChange={handleChange}
          />
        </div>
        <div className="button-row">
          <button type="button" onClick={function () { navigate('/main/crm/customers'); }}>취소</button>
          <button type="submit">{isEdit ? '수정 내용 저장' : '고객 등록'}</button>
        </div>
      </form>
    </section>
  );
}

function Field(props) {
  return (
    <label>
      {props.label}
      <input
        name={props.name}
        type={props.type || 'text'}
        value={props.value}
        onChange={props.onChange}
      />
    </label>
  );
}
