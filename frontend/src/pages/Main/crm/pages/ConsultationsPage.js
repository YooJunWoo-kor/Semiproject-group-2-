import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConsultationsPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const today = formatSeoulDate(new Date()); // 변경: 오늘 날짜를 한국 시간 기준으로 계산
  const todayAnsweredCount = data.consultations.filter(function (consultation) {
    return consultation.status === '답변 완료'
      && consultation.answeredAt
      && formatSeoulDate(consultation.answeredAt) === today;
  }).length; // 변경: 오늘 답변 완료 건수 계산
  const newCount = data.consultations.filter(function (consultation) {
    return consultation.status === '신규';
  }).length; // 변경: 신규 상담 건수 계산
  const answeredCount = data.consultations.filter(function (consultation) {
    return consultation.status === '답변 완료';
  }).length; // 변경: 전체 답변 완료 건수 계산

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

          <h1>상담 관리</h1> 
           {/* 변경: CRM 작은 라벨과 설명 문구는 제거하고 페이지 제목만 남겼습니다. */}

        </div>

        {/* 변경: 목록 상단의 상담 등록 버튼 제거 */}
      </header>

      {/* 변경: 기존 CSS 클래스를 이용한 상담 현황 카드 */}
      <div className="stats-grid" aria-label="상담 현황">
        <div className="stat-copy content-card">
          <span>전체 상담</span>
          <strong>{data.consultations.length}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>오늘 답변 완료</span>
          <strong>{todayAnsweredCount}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>신규</span>
          <strong>{newCount}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>답변 완료</span>
          <strong>{answeredCount}<small>건</small></strong>
        </div>
      </div>

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
              <th>답변일</th>{/* 변경: 답변 완료 날짜 열 추가 */}
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
                  <td>{formatSeoulDate(consultation.answeredAt)}</td>{/* 변경: 날짜 표시, 없으면 '-' */}
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
              <tr><td colSpan="6" className="no-data">등록된 상담이 없습니다.</td></tr>
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

// 변경: UTC 날짜/시간을 한국 날짜(YYYY-MM-DD)로 표시합니다.
function formatSeoulDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
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
