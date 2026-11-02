import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaginationTable from '../../../../components/PaginationTable';
import StatisticsCard from '../../../../components/StatisticsCard';

export default function CustomersPage({ data, setData }) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  // 검색 필터링
  const filteredCustomers = (data?.customers || []).filter((customer) => {
    const keyword = searchText.trim().toLowerCase();
    const target = `${customer.name} ${customer.phone}`.toLowerCase();
    return target.includes(keyword);
  });

  // 고객 삭제 핸들러
  const deleteCustomer = (customer) => {
    if (!window.confirm(`'${customer.name}' 고객을 삭제하시겠습니까?`)) return;

    const purchaseIds = (data.purchases || [])
      .filter((p) => p.customerId === customer.id)
      .map((p) => p.id);

    setData((current) => ({
      ...current,
      customers: current.customers.filter((item) => item.id !== customer.id),
      purchases: current.purchases.filter((item) => item.customerId !== customer.id),
      consultations: current.consultations.filter((item) => item.customerId !== customer.id),
      claims: current.claims.filter(
        (item) => item.customerId !== customer.id && !purchaseIds.includes(item.purchaseId)
      ),
    }));
  };

  // PaginationTable 규격 헤더 정의
  const tableHeaders = ['고객명', '연락처', '이메일', '주소', '최근 구매일', '관리'];

  // PaginationTable 데이터 매핑 ({ content: [...] })
  const tableData = filteredCustomers.map((customer) => ({
    content: [
      <strong>{customer.name}</strong>,
      customer.phone,
      customer.email,
      customer.address || '-',
      customer.lastPurchaseDate || '-',
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => navigate(`/main/crm/customers/edit/${customer.id}`)}
        >
          수정
        </button>
        <button
          type="button"
          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          onClick={() => deleteCustomer(customer)}
        >
          삭제
        </button>
      </div>,
    ],
  }));

  return (
    <div className="sub-container">
      {/* 1. 표준 헤더 및 액션 버튼 */}
      <header className="dashboard-header">
        <span className="subtitle">회원 관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={() => navigate('/main/crm/customers/new')}
          >
            + 고객 신규 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 상단 통계 카드 구역 */}
      <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
        <StatisticsCard title="총 회원" count={data?.customers?.length || 0} stiyle="1" />
        <StatisticsCard title="검색 결과" count={filteredCustomers.length} stiyle="1" />
      </div>

      <hr />

      {/* 3. 검색 및 필터 영역 */}
      <section style={{ margin: '16px 0' }}>
        <label htmlFor="customerSearch" style={{ marginRight: '8px', fontWeight: 600 }}>
          고객 검색:
        </label>
        <input
          id="customerSearch"
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="이름 또는 연락처 입력"
          style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
      </section>

      {/* 4. 표준 PaginationTable 연동 */}
      <PaginationTable
        title="고객 목록 현황"
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={5}
      />
    </div>
  );
}