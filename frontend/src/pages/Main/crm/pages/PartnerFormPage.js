import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createId } from '../utils/createId';

const EMPTY_PARTNER = {
  name: '',
  type: '유통사',
  manager: '',
  phone: '',
  email: '',
  address: '',
  memo: '',
};

export default function PartnerFormPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const params = useParams();
  const partnerId = params.partnerId;
  const savedPartner = data.partners.find(function (item) {
    return item.id === partnerId;
  });
  const isEdit = Boolean(partnerId);

  const [form, setForm] = useState(savedPartner || EMPTY_PARTNER);

  // 입력한 값을 form에 저장합니다.
  function handleChange(event) {
    const name = event.target.name;
    const value = event.target.value;

    setForm(function (current) {
      return {
        ...current,
        [name]: value,
      };
    });
  }

  // 거래처명을 확인한 뒤 거래처 목록에 추가합니다.
  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert('거래처명을 입력해 주세요.');
      return;
    }

    const partner = {
      ...form,
      id: isEdit ? partnerId : createId('partner'),
    };

    setData(function (current) {
      let partners = [...current.partners, partner];

      if (isEdit) {
        partners = current.partners.map(function (item) {
          if (item.id === partnerId) {
            return partner;
          }
          return item;
        });
      }

      return {
        ...current,
        partners: partners,
      };
    });

    alert(isEdit ? '거래처 정보가 수정되었습니다.' : '거래처가 등록되었습니다.');

    navigate('/main/crm/partners');
  }

  // 거래처 목록으로 돌아갑니다.
  function handleCancel() {
    navigate('/main/crm/partners');
  }

  if (isEdit && !savedPartner) {
    return (
      <section className="workspace-page   ">
        <div className="empty-state">
          <h2>거래처를 찾을 수 없습니다.</h2>
          <button type="button" onClick={handleCancel}>목록으로</button>
        </div>
      </section>
    );
  }









  
  return (
    <section className="workspace-page    crm-form-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM · 거래처 관리</span>
          <h1>{isEdit ? '거래처 정보 수정' : '신규 거래처 등록'}</h1>
          <p>거래처 기본 정보와 담당자 정보를 입력하세요.</p>
        </div>
      </header>

      <form className="erp-form" onSubmit={handleSubmit}>
        <h2>기본 정보</h2>

        <div className="form-grid">
          <Field
            label="거래처명 *"
            name="name"
            value={form.name}
            onChange={handleChange}
          />

          <label>
            거래처 유형
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="유통사">유통사</option>
              <option value="대리점">대리점</option>
              <option value="납품처">납품처</option>
            </select>
          </label>

          <Field
            label="담당자명"
            name="manager"
            value={form.manager}
            onChange={handleChange}
          />

          <Field
            label="연락처"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />

          <Field
            label="이메일"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <Field
            label="주소"
            name="address"
            value={form.address}
            onChange={handleChange}
          />

          <label className="full-field">
            메모
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            type="button"
            onClick={handleCancel}
          >
            취소
          </button>

          <button type="submit">
            {isEdit ? '수정 내용 저장' : '거래처 등록'}
          </button>
        </div>
      </form>
    </section>
  );
}

// 반복되는 입력창을 하나의 컴포넌트로 관리합니다.
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
