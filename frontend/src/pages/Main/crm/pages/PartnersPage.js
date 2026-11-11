import React from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import StatisticsCard from '../../../../components/StatisticsCard';

export default function PartnersPage({ data, setData }) {
  // 거래처 종류별 집계
  const partnerTypeCounts = ['유통사', '대리점', '납품처'].map((type) => ({
    type,
    count: (data?.partners || []).filter((partner) => partner.type === type).length,
  }));

  // 거래처 삭제 핸들러
  const deletePartner = (partner) => {
    if (!window.confirm(`'${partner.name}' 거래처를 삭제하시겠습니까?`)) {
      return;
    }

    setData((current) => ({
      ...current,
      partners: current.partners.filter((item) => item.id !== partner.id),
    }));
  };

  // 공통 모달 연결 핸들러
  const handleOpenPartnerModal = (partner = null) => {
    if (partner) {
      alert(`[${partner.name}] 거래처 수정 모달을 띄울 예정입니다.`);
    } else {
      alert('신규 거래처 등록 모달을 띄울 예정입니다.');
    }
  };

  // PaginationTable 헤더 정의
  const tableHeaders = ['거래처명', '유형', '담당자', '연락처', '이메일', '주소', '관리'];

  // PaginationTable 규격 데이터 매핑 ({ content: [...] })
  const tableData = (data?.partners || []).map((partner) => ({
    content: [
      <strong>{partner.name}</strong>,
      <span className="status-badge">{partner.type}</span>,
      partner.manager || '-',
      partner.phone || '-',
      partner.email || '-',
      partner.address || '-',
      <div className="table-actions">
        <button
          type="button"
          onClick={() => handleOpenPartnerModal(partner)}
        >
          수정
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => deletePartner(partner)}
        >
          삭제
        </button>
      </div>,
    ],
  }));

  return (
    <div className="border-container">
      {/* 1. 상단 공통 헤더 및 등록 버튼 */}
      <header className="dashboard-header">
        <span className="subtitle">거래처 관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={() => handleOpenPartnerModal(null)}
          >
            + 거래처 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 상단 통계 카드 구역 */}
      <section className="stats-section">
        <StatisticsCard
          title="전체 거래처"
          count={data?.partners?.length || 0}
          stiyle={2}
        />
        {partnerTypeCounts.map((item) => (
          <StatisticsCard
            key={item.type}
            title={item.type}
            count={item.count}
            stiyle={2}
          />
        ))}
      </section>

      <hr />

      {/* 3. 5개씩 페이징되는 규격 테이블 */}
      <PaginationTable
        title="거래처 목록 현황"
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={5}
      />
    </div>
  );
}