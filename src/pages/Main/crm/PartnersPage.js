import { useState } from 'react';
import { createId } from './crmStorage';

const INITIAL_FORM = {
  name: '',
  type: '유통사',
  manager: '',
  phone: '',
  memo: '',
};

const PARTNER_TYPES = ['유통사', '대리점', '납품 거래처'];

export default function PartnersPage({ data, setData }) {
  const [searchText, setSearchText] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const filteredPartners = data.partners.filter((partner) => {
    const target = `${partner.name} ${partner.manager} ${partner.phone}`.toLowerCase();
    return target.includes(searchText.toLowerCase());
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.manager.trim() || !form.phone.trim()) {
      alert('거래처명, 담당자, 연락처를 입력해 주세요.');
      return;
    }

    const partner = {
      ...form,
      id: editingId || createId('partner'),
    };

    setData((current) => ({
      ...current,
      partners: editingId
        ? current.partners.map((item) => item.id === editingId ? partner : item)
        : [...current.partners, partner],
    }));

    setSelectedPartner(partner);
    resetForm();
  }

  function startEditing(partner) {
    setEditingId(partner.id);
    setForm(partner);
  }

  function deletePartner(partnerId) {
    if (!window.confirm('거래처를 삭제할까요?')) return;

    setData((current) => ({
      ...current,
      partners: current.partners.filter((partner) => partner.id !== partnerId),
    }));

    if (selectedPartner?.id === partnerId) setSelectedPartner(null);
  }

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>거래처 관리</h1>
          <p>유통사·대리점·납품 거래처를 관리합니다.</p>
        </div>
      </header>

      <form className="erp-form" onSubmit={handleSubmit}>
        <h2>{editingId ? '거래처 수정' : '거래처 등록'}</h2>
        <div className="form-grid">
          <label>
            거래처명 *
            <input name="name" value={form.name} onChange={handleChange} />
          </label>
          <label>
            유형 *
            <select name="type" value={form.type} onChange={handleChange}>
              {PARTNER_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            담당자 *
            <input name="manager" value={form.manager} onChange={handleChange} />
          </label>
          <label>
            연락처 *
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
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
          거래처명·담당자·연락처 검색
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr><th>거래처명</th><th>유형</th><th>담당자</th><th>연락처</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filteredPartners.map((partner) => (
              <tr key={partner.id} onClick={() => setSelectedPartner(partner)}>
                <td><button className="link-button" type="button">{partner.name}</button></td>
                <td>{partner.type}</td>
                <td>{partner.manager}</td>
                <td>{partner.phone}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => startEditing(partner)}>수정</button>{' '}
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deletePartner(partner.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}

            {!filteredPartners.length && (
              <tr><td colSpan="5" className="no-data">등록된 거래처가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPartner && (
        <PartnerDetail
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      )}
    </section>
  );
}

function PartnerDetail({ partner, onClose }) {
  return (
    <article className="detail-card">
      <div className="page-header">
        <h2>거래처 상세</h2>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
      <dl>
        <div><dt>거래처명</dt><dd>{partner.name}</dd></div>
        <div><dt>유형</dt><dd>{partner.type}</dd></div>
        <div><dt>담당자 / 연락처</dt><dd>{partner.manager} / {partner.phone}</dd></div>
        <div><dt>메모</dt><dd>{partner.memo || '-'}</dd></div>
      </dl>
    </article>
  );
}
