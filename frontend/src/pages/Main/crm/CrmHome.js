import React from 'react';
import { Link } from 'react-router-dom';
import StatisticsCard from '../../../components/StatisticsCard';
import BasicTable from '../../../components/BasicTable';

export default function CrmHome({ data }) {
  const customers = data?.customers || [];
  const partners = data?.partners || [];
  const consultations = data?.consultations || [];
  const claims = data?.claims || [];

  // 고객 이름 매핑 헬퍼
  const getCustomerName = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : '고객';
  };

  // 1. 최근 등록/활동 회원 (BasicTable 규격)
  const customerHeaders = ['고객명', '연락처', '가입일', '최근구매일'];
  const customerData = customers.slice(0, 5).map((item) => ({
    content: [
      <Link className="table-link-title" to="/main/crm/customers">
        {item.name}
      </Link>,
      item.phone || '-',
      item.joinDate || '-',
      item.lastPurchaseDate || '-',
    ],
  }));

  // 2. 주요 거래처 현황 (BasicTable 규격)
  const partnerHeaders = ['거래처명', '유형', '담당자', '연락처'];
  const partnerData = partners.slice(0, 5).map((item) => ({
    content: [
      <Link className="table-link-title" to="/main/crm/partners">
        {item.name}
      </Link>,
      <span className="status-badge">{item.type}</span>,
      item.manager || '-',
      item.phone || '-',
    ],
  }));

  // 3. 최근 상담 문의 내역 (BasicTable 규격)
  const consultationHeaders = ['상태', '고객명', '문의 내용'];
  const consultationData = consultations.slice(0, 5).map((item) => ({
    content: [
      <span
        className={`status-badge ${
          item.status === '답변 완료' ? 'status-success' : 'status-danger'
        }`}
      >
        {item.status || '대기'}
      </span>,
      <strong>{getCustomerName(item.customerId)}</strong>,
      <Link className="table-link-title" to="/main/crm/consultations">
        {item.inquiry}
      </Link>,
    ],
  }));

  // 4. 최근 접수 클레임 (BasicTable 규격)
  const claimHeaders = ['처리상태', '구분', '고객명', '클레임 내용'];
  const claimData = claims.slice(0, 5).map((item) => ({
    content: [
      <span
        className={`status-badge ${
          item.status === '처리 완료' ? 'status-success' : 'status-danger'
        }`}
      >
        {item.status || '접수'}
      </span>,
      <span className="subtext">{item.type}</span>,
      getCustomerName(item.customerId),
      <Link className="table-link-title" to="/main/crm/claims">
        {item.content}
      </Link>,
    ],
  }));

  return (
    <div className="sub-container">
      {/* 1. 상단 대시보드 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">고객관계관리 대시보드</span>
        <span className="subtext">
          회원, 거래처 현황 및 최근 접수된 고객 문의/클레임을 확인하세요.
        </span>
      </header>

      {/* 2. 상단 핵심 통계 카드 (재무/커뮤니티와 통일된 stats-section) */}
      <section className="stats-section">
        <StatisticsCard title="총 회원 수" count={customers.length} stiyle={1} />
        <StatisticsCard title="등록 거래처" count={partners.length} stiyle={0} />
        <StatisticsCard
          title="미답변 상담"
          count={consultations.filter((c) => c.status !== '답변 완료').length}
          stiyle={0}
        />
        <StatisticsCard
          title="미처리 클레임"
          count={claims.filter((c) => c.status !== '처리 완료').length}
          stiyle={0}
        />
      </section>

      <hr />

      {/* 4. 하단 2열 테이블: 상담 문의 & 클레임 접수 현황 */}
      <section className="stats-section" style={{ marginTop: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BasicTable
            title="최근 상담 문의"
            th={consultationHeaders}
            td={consultationData}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BasicTable
            title="최근 접수 클레임"
            th={claimHeaders}
            td={claimData}
          />
        </div>
      </section>

      {/* 3. 상단 2열 테이블: 회원 현황 & 거래처 현황 */}
      <section className="stats-section">
        <div style={{ flex: 1, minWidth: 0 }}>
          <BasicTable
            title="주요 거래처 목록"
            th={partnerHeaders}
            td={partnerData}
          />
        </div>
      </section>
    </div>
  );
}