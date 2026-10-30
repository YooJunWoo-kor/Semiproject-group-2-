import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createId } from '../utils/createId';

const EMPTY_CONSULTATION = {
  customerId: '',
  inquiry: '',
  answer: '',
  status: '신규',
};

const CONSULTATION_STATUS = ['신규', '답변 완료'];

// 변경: 날짜를 UTC ISO 형식으로 저장해 나중에 DB와 연동하기 쉽게 합니다.
function getCurrentDateTime() {
  return new Date().toISOString();
}

export default function ConsultationFormPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const params = useParams();
  const consultationId = params.consultationId;
  const savedConsultation = data.consultations.find(function (item) {
    return item.id === consultationId;
  });
  const isEdit = Boolean(consultationId);
  const [form, setForm] = useState(savedConsultation || EMPTY_CONSULTATION);

  function handleChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    setForm(function (current) {
      return { ...current, [name]: value };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.customerId || !form.inquiry.trim()) {
      alert('고객과 문의 내용을 입력해 주세요.');
      return;
    }

    // 변경: 처음 답변 완료로 바뀔 때 날짜를 기록하고, 기존 날짜는 보존합니다.
    const wasAlreadyAnswered = savedConsultation && savedConsultation.status === '답변 완료';
    const answeredAt = form.status === '답변 완료'
      ? (wasAlreadyAnswered ? savedConsultation.answeredAt || '' : getCurrentDateTime())
      : '';

    const consultation = {
      ...form,
      id: isEdit ? consultationId : createId('consultation'),
      answeredAt: answeredAt, // 변경: 답변 완료 날짜 저장
    };

    setData(function (current) {
      let consultations = [...current.consultations, consultation];
      if (isEdit) {
        consultations = current.consultations.map(function (item) {
          return item.id === consultationId ? consultation : item;
        });
      }
      return { ...current, consultations: consultations };
    });

    alert(isEdit ? '상담이 수정되었습니다.' : '상담이 등록되었습니다.');
    navigate('/main/crm/consultations');
  }

  if (isEdit && !savedConsultation) {
    return (
      <section className="workspace-page   ">
        <div className="empty-state">
          <h2>상담을 찾을 수 없습니다.</h2>
          <button type="button" onClick={function () { navigate('/main/crm/consultations'); }}>
            목록으로
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page    crm-form-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM · 상담 관리</span>
          <h1>{isEdit ? '상담 수정 및 답변' : '상담 등록'}</h1>
          <p>고객 문의와 답변 및 처리 상태를 입력하세요.</p>
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
            상태
            <select name="status" value={form.status} onChange={handleChange}>
              {CONSULTATION_STATUS.map(function (status) {
                return <option key={status}>{status}</option>;
              })}
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
          <button type="button" onClick={function () { navigate('/main/crm/consultations'); }}>취소</button>
          <button type="submit">{isEdit ? '수정 내용 저장' : '상담 등록'}</button>
        </div>
      </form>
    </section>
  );
}
