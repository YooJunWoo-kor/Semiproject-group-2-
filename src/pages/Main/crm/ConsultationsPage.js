import { useState } from 'react';
import { createId } from './crmStorage';

const INITIAL_FORM = {
  customerId: '',
  inquiry: '',
  answer: '',
  status: '접수',
};

const CONSULTATION_STATUS = ['접수', '처리 중', '답변 완료'];

export default function ConsultationsPage({ data, setData }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  function findCustomerName(customerId) {
    return data.customers.find((customer) => customer.id === customerId)?.name
      || '삭제된 고객';
  }

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

    if (!form.customerId || !form.inquiry.trim()) {
      alert('고객과 문의 내용을 입력해 주세요.');
      return;
    }

    const consultation = {
      ...form,
      id: editingId || createId('consultation'),
    };

    setData((current) => ({
      ...current,
      consultations: editingId
        ? current.consultations.map((item) => (
          item.id === editingId ? consultation : item
        ))
        : [...current.consultations, consultation],
    }));

    setSelectedConsultation(consultation);
    resetForm();
  }

  function startEditing(consultation) {
    setEditingId(consultation.id);
    setForm(consultation);
  }

  function deleteConsultation(consultationId) {
    if (!window.confirm('상담을 삭제할까요?')) return;

    setData((current) => ({
      ...current,
      consultations: current.consultations.filter(
        (consultation) => consultation.id !== consultationId
      ),
    }));

    if (selectedConsultation?.id === consultationId) {
      setSelectedConsultation(null);
    }
  }

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>상담 관리</h1>
          <p>일반 구매자의 문의, 답변 및 처리 상태를 관리합니다.</p>
        </div>
      </header>

      <form className="erp-form" onSubmit={handleSubmit}>
        <h2>{editingId ? '상담 수정 및 답변' : '문의 등록'}</h2>
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
            상태
            <select name="status" value={form.status} onChange={handleChange}>
              {CONSULTATION_STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="full-field">
            문의 내용 *
            <textarea name="inquiry" value={form.inquiry} onChange={handleChange} />
          </label>

          <label className="full-field">
            답변
            <textarea name="answer" value={form.answer} onChange={handleChange} />
          </label>
        </div>

        <div className="button-row">
          <button type="submit">저장</button>
          {editingId && <button type="button" onClick={resetForm}>취소</button>}
        </div>
      </form>

      {!data.customers.length && (
        <p className="connection-status is-offline">
          상담을 등록하려면 고객 관리에서 고객을 먼저 등록하세요.
        </p>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr><th>고객</th><th>문의 내용</th><th>답변</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {data.consultations.map((consultation) => (
              <tr
                key={consultation.id}
                onClick={() => setSelectedConsultation(consultation)}
              >
                <td>{findCustomerName(consultation.customerId)}</td>
                <td>{consultation.inquiry}</td>
                <td>{consultation.answer || '-'}</td>
                <td><span className="status-badge">{consultation.status}</span></td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => startEditing(consultation)}>
                    답변/수정
                  </button>{' '}
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deleteConsultation(consultation.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}

            {!data.consultations.length && (
              <tr><td colSpan="5" className="no-data">등록된 상담이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedConsultation && (
        <ConsultationDetail
          consultation={selectedConsultation}
          customerName={findCustomerName(selectedConsultation.customerId)}
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </section>
  );
}

function ConsultationDetail({ consultation, customerName, onClose }) {
  return (
    <article className="detail-card">
      <div className="page-header">
        <h2>상담 상세</h2>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
      <dl>
        <div><dt>고객</dt><dd>{customerName}</dd></div>
        <div><dt>문의</dt><dd>{consultation.inquiry}</dd></div>
        <div><dt>답변</dt><dd>{consultation.answer || '답변 전'}</dd></div>
        <div><dt>상태</dt><dd>{consultation.status}</dd></div>
      </dl>
    </article>
  );
}
