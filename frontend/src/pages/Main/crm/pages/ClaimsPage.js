import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaginationTable from '../../../../components/PaginationTable';
import StatisticsCard from '../../../../components/StatisticsCard';

export default function ClaimsPage({ data, setData }) {
  const navigate = useNavigate();
  const [selectedClaim, setSelectedClaim] = useState(null);

  const findCustomerName = (customerId) => {
    const customer = (data.customers || []).find((c) => c.id === customerId);
    return customer ? customer.name : '삭제된 고객';
  };

  const findPurchase = (purchaseId) => {
    return (data.purchases || []).find((p) => p.id === purchaseId);
  };

  const deleteClaim = (claimId) => {
    if (!window.confirm('해당 클레임을 삭제하시겠습니까?')) return;
    setData((current) => ({
      ...current,
      claims: current.claims.filter((c) => c.id !== claimId),
    }));
    if (selectedClaim?.id === claimId) setSelectedClaim(null);
  };

  const tableHeaders = ['고객명', '유형', '제품 / 구매일', '상태', '관리'];

  const tableData = (data.claims || []).map((claim) => {
    const purchase = findPurchase(claim.purchaseId);
    return {
      content: [
        <strong>{findCustomerName(claim.customerId)}</strong>,
        claim.type,
        purchase ? `${purchase.productName} / ${purchase.date}` : '삭제된 구매 건',
        <span className={`status-badge ${claim.status === '처리 완료' ? 'status-success' : 'status-danger'}`}>
          {claim.status}
        </span>,
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => navigate(`/main/crm/claims/edit/${claim.id}`)}
          >
            처리/수정
          </button>
          <button
            type="button"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            onClick={() => deleteClaim(claim.id)}
          >
            삭제
          </button>
        </div>,
      ],
    };
  });

  return (
    <div className="sub-container">
      <header className="dashboard-header">
        <span className="subtitle">클레임 관리</span>
      </header>

      <hr />

      <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
        <StatisticsCard title="전체 클레임" count={data?.claims?.length || 0} />
        <StatisticsCard
          title="신규 접수"
          count={(data?.claims || []).filter((c) => c.status === '신규').length}
          stiyle="1"
        />
      </div>

      <hr />

      <PaginationTable
        title="클레임 접수 목록"
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={5}
      />
    </div>
  );
}