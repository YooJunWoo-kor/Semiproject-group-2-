import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import StatisticsCard from '../../../../components/StatisticsCard';

export default function ConsultationsPage({ data, setData }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const today = formatSeoulDate(new Date());

  // 통계 집계
  const todayAnsweredCount = (data?.consultations || []).filter(
    (c) => c.status === '답변 완료' && c.answeredAt && formatSeoulDate(c.answeredAt) === today
  ).length;

  const newCount = (data?.consultations || []).filter((c) => c.status === '신규').length;
  const answeredCount = (data?.consultations || []).filter((c) => c.status === '답변 완료').length;

  function findCustomerName(customerId) {
    const customer = (data?.customers || []).find((item) => item.id === customerId);
    return customer ? customer.name : '삭제된 고객';
  }

  function deleteConsultation(consultationId) {
    if (!window.confirm('해당 상담 내역을 삭제하시겠습니까?')) return;

    setData((current) => ({
      ...current,
      consultations: current.consultations.filter((item) => item.id !== consultationId),
    }));

    if (selectedConsultation && selectedConsultation.id === consultationId) {
      setSelectedConsultation(null);
    }
  }

  // 추후 제작할 공통 답변/수정 모달 팝업 오픈 핸들러
  const handleOpenAnswerModal = (consultation) => {
    alert(`[${consultation.inquiry}] 건에 대한 답변/수정 모달을 띄울 예정입니다.`);
  };

  const tableHeaders = ['고객명', '문의 내용', '답변', '답변일', '상태', '관리'];

  const tableData = (data?.consultations || []).map((c) => ({
    content: [
      <strong>{findCustomerName(c.customerId)}</strong>,
      <span
        className="table-link-title"
        onClick={() => setSelectedConsultation(c)}
      >
        {c.inquiry}
      </span>,
      c.answer || '-',
      formatSeoulDate(c.answeredAt),
      <span className={`status-badge ${c.status === '답변 완료' ? 'status-success' : 'status-danger'}`}>
        {c.status}
      </span>,
      <div className="table-actions">
        <button
          type="button"
          onClick={() => handleOpenAnswerModal(c)}
        >
          답변/수정
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => deleteConsultation(c.id)}
        >
          삭제
        </button>
      </div>,
    ],
  }));

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 (신규 등록 버튼 제거 완료) */}
      <header className="dashboard-header">
        <span className="subtitle">상담 관리</span>
      </header>

      <hr />

      {/* 2. 통계 카드 구역 */}
      <section className="stats-section">
        <StatisticsCard title="전체 상담" count={data?.consultations?.length || 0} stiyle={2} />
        <StatisticsCard title="오늘 답변완료" count={todayAnsweredCount} stiyle={2} />
        <StatisticsCard title="신규 문의" count={newCount} stiyle={1} />
        <StatisticsCard title="누적 완료" count={answeredCount} stiyle={2} />
      </section>

      <hr />

      {/* 3. 5개씩 페이징되는 규격 테이블 */}
      <PaginationTable
        title="고객 상담 목록"
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={5}
      />

      {/* 4. 상세 보기 영역 */}
      {selectedConsultation && (
        <article className="detail-card" style={{ marginTop: '20px' }}>
          <header className="dashboard-header" style={{ marginBottom: '10px' }}>
            <span className="subtitle" style={{ fontSize: '18px' }}>상담 상세 정보</span>
            <div className="dashboard-top">
              <button type="button" onClick={() => setSelectedConsultation(null)}>
                닫기
              </button>
            </div>
          </header>
          <dl>
            <div>
              <dt>고객명</dt>
              <dd>{findCustomerName(selectedConsultation.customerId)}</dd>
            </div>
            <div>
              <dt>문의 내용</dt>
              <dd>{selectedConsultation.inquiry}</dd>
            </div>
            <div>
              <dt>답변 내용</dt>
              <dd>{selectedConsultation.answer || '답변 대기 중'}</dd>
            </div>
            <div>
              <dt>처리 상태</dt>
              <dd>{selectedConsultation.status}</dd>
            </div>
          </dl>
        </article>
      )}
    </div>
  );
}

function formatSeoulDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}