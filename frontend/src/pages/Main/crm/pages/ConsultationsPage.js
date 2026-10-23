import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConsultationsPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  function findCustomerName(customerId) {
    const customer = data.customers.find(function (item) {
      return item.id === customerId;
    });
    return customer ? customer.name : '삭제된 고객';
  }

  function deleteConsultation(consultationId) {
    if (!window.confirm('상담을 삭제할까요?')) {
      return;
    }

    setData(function (current) {
      return {
        ...current,
        consultations: current.consultations.filter(function (item) {
          return item.id !== consultationId;
        }),
      };
    });

    if (selectedConsultation && selectedConsultation.id === consultationId) {
      setSelectedConsultation(null);
    }
  }

  return (
    <section className="workspace-page crm-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>상담 관리</h1>
          <p>일반 구매자의 문의, 답변 및 처리 상태를 관리합니다.</p>
        </div>
        <button
          className="erp-primary-button"
          type="button"
          onClick={function () { navigate('/main/crm/consultations/new'); }}
        >
          상담 등록
        </button>
      </header>

      {!data.customers.length && (
        <p className="connection-status is-offline">
          상담을 등록하려면 고객 관리에서 고객을 먼저 등록하세요.
        </p>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>고객</th>
              <th>문의 내용</th>
              <th>답변</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {data.consultations.map(function (consultation) {
              return (
                <tr
                  className="clickable-row"
                  key={consultation.id}
                  onClick={function () { setSelectedConsultation(consultation); }}
                >
                  <td>{findCustomerName(consultation.customerId)}</td>
                  <td>{consultation.inquiry}</td>
                  <td>{consultation.answer || '-'}</td>
                  <td><span className="status-badge">{consultation.status}</span></td>
                  <td onClick={function (event) { event.stopPropagation(); }}>
                    <button
                      type="button"
                      onClick={function () {
                        navigate('/main/crm/consultations/edit/' + consultation.id);
                      }}
                    >
                      답변/수정
                    </button>{' '}
                    <button
                      className="danger-button"
                      type="button"
                      onClick={function () { deleteConsultation(consultation.id); }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
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
          onClose={function () { setSelectedConsultation(null); }}
        />
      )}
    </section>
  );
}

function ConsultationDetail(props) {
  return (
    <article className="detail-card">
      <div className="page-header">
        <h2>상담 상세</h2>
        <button type="button" onClick={props.onClose}>닫기</button>
      </div>
      <dl>
        <div><dt>고객</dt><dd>{props.customerName}</dd></div>
        <div><dt>문의</dt><dd>{props.consultation.inquiry}</dd></div>
        <div><dt>답변</dt><dd>{props.consultation.answer || '답변 전'}</dd></div>
        <div><dt>상태</dt><dd>{props.consultation.status}</dd></div>
      </dl>
    </article>
  );
}
