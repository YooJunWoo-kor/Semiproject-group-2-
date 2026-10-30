import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import WeeklyCalendar from '../../../../components/weeklycalendar/WeeklyCalendar';
import BasicCalendar from '../../../../components/calendar/BasicCalendar';

function Items() {
  // 1. 매입 / 매출 탭 필터 ('ALL' | 'SALES' | 'PURCHASE')
  const [activeTab, setActiveTab] = useState('ALL');

  // 2. 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 3. 우측 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState('week'); // 'week' | 'month'

  // 4. 선택된 품목 ID
  const [selectedItemId, setSelectedItemId] = useState('ITM-2026-001');

  // 매입/매출 품목 목 데이터 (거래일 date 외에 정산 마감일 dueDate 추가 보강)
  const [itemList] = useState([
    {
      id: 'ITM-2026-001',
      type: 'SALES', // 매출
      date: '2026-10-18', // 거래/발행일
      dueDate: '2026-10-25', // 입금 마감일
      itemName: 'ERP 구축 솔루션 라이선스 v1.0',
      spec: '1식 (Enterprise)',
      customer: '(주)알파솔루션',
      unitPrice: 20000000,
      quantity: 1,
      supplyAmount: 20000000,
      vat: 2000000,
      totalAmount: 22000000,
      status: '세금계산서발행'
    },
    {
      id: 'ITM-2026-002',
      type: 'PURCHASE', // 매입
      date: '2026-10-15',
      dueDate: '2026-10-31', // 지급 마감일
      itemName: '사내 개발용 고성능 모니터 32인치',
      spec: '4K IPS / 5EA',
      customer: '(주)베타원자재',
      unitPrice: 450000,
      quantity: 5,
      supplyAmount: 2250000,
      vat: 225000,
      totalAmount: 2475000,
      status: '지급완료'
    },
    {
      id: 'ITM-2026-003',
      type: 'SALES', // 매출
      date: '2026-10-12',
      dueDate: '2026-10-20',
      itemName: '클라우드 인프라 유지보수 (10월분)',
      spec: '월 정기계약',
      customer: '대한물류(주)',
      unitPrice: 3500000,
      quantity: 1,
      supplyAmount: 3500000,
      vat: 350000,
      totalAmount: 3850000,
      status: '정산완료'
    },
    {
      id: 'ITM-2026-004',
      type: 'PURCHASE', // 매입
      date: '2026-10-10',
      dueDate: '2026-10-15',
      itemName: '사내 서버랙 전원 공급장치(UPS)',
      spec: '3kVA / 2EA',
      customer: '감마클라우드(주)',
      unitPrice: 1200000,
      quantity: 2,
      supplyAmount: 2400000,
      vat: 240000,
      totalAmount: 2640000,
      status: '정산대기'
    }
  ]);

  // 탭 및 검색어 필터링
  const filteredList = itemList.filter((item) => {
    const matchesTab = activeTab === 'ALL' || item.type === activeTab;
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // 상단 요약 집계 연산
  const totalSalesAmount = itemList
    .filter((item) => item.type === 'SALES')
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const totalPurchaseAmount = itemList
    .filter((item) => item.type === 'PURCHASE')
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const operatingProfit = totalSalesAmount - totalPurchaseAmount;

  // 테이블 헤더 규격 정의
  const itemTableTitle = "매입/매출 품목 거래 현황";
  const itemHeaders = [
    "구분",
    "거래일 (마감일)",
    "거래처",
    "품목 (규격)",
    "합계 금액",
    "상태",
    "관리"
  ];

  // PaginationTable 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tItemData = filteredList.map((item) => {
    const isSales = item.type === 'SALES';
  
    return {
      content: [
        // 1. 구분 뱃지
        <span className={`status-badge ${isSales ? 'status-success' : 'status-danger'}`}>
          {isSales ? '매출' : '매입'}
        </span>,
  
        // 2. 거래일 + 마감일 (세로 2줄 결합)
        <div>
          <div>{item.date}</div>
          <small style={{ color: '#64748b' }}>({item.dueDate} 마감)</small>
        </div>,
  
        // 3. 거래처
        item.customer,
  
        // 4. 품목명 + 규격/수량 (세로 2줄 결합)
        <div>
          <strong>{item.itemName}</strong>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {item.spec} · {item.quantity}개
          </div>
        </div>,
  
        // 5. 총 합계금액 (공급가/부가세는 덜어내고 최종 금액만 강조)
        <strong>{item.totalAmount.toLocaleString()}원</strong>,
  
        // 6. 상태
        <span className={`status-badge ${item.status.includes('완료') ? 'status-success' : 'status-pending'}`}>
          {item.status}
        </span>,
  
        // 7. 관리 버튼
        <button
          type="button"
          onClick={() => alert(`[${item.id}] ${item.itemName} 상세 전표`)}
        >
          전표
        </button>
      ]
    };
  });

  // 우측 달력용 이벤트 데이터 매핑 (정산 마감일 dueDate 기준)
  const calendarEvents = itemList.map((item) => {
    const isSales = item.type === 'SALES';
    return {
      id: item.id,
      title: `[${isSales ? '입금' : '출금'}] ${item.customer} (${(item.totalAmount / 10000).toLocaleString()}만)`,
      start: item.dueDate,
      end: item.dueDate,
      type: isSales ? 'income' : 'expense'
    };
  });

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 및 액션 버튼 */}
      <header className="dashboard-header">
        <span className="subtitle">매입/매출 품목관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={() => alert('신규 품목/거래 등록 모달')}
          >
            + 품목 거래내역 신규 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 상단 누적 손익 요약 카드 */}
      <section>
        <h3>금월 거래 총액 요약</h3>
        <p>
          <span>총 매출: <strong>{totalSalesAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>총 매입: <strong>{totalPurchaseAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>
            예상 영업이익: <strong style={{ color: operatingProfit >= 0 ? '#2563eb' : '#dc2626' }}>
              {operatingProfit.toLocaleString()}원
            </strong>
          </span>
        </p>
      </section>

      <hr />

      {/* 3. 좌우 2단 분할 레이아웃 컨테이너 */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>

        {/* [좌측 영역] 탭 + 검색 필터 + PaginationTable (약 62% 너비) */}
        <div style={{ flex: '1 1 62%', minWidth: 0 }}>
          {/* 탭 전환 및 검색 필터 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                전체 ({itemList.length})
              </button>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'SALES' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('SALES')}
              >
                매출(판매)
              </button>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'PURCHASE' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('PURCHASE')}
              >
                매입(구매)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '280px' }}>
              <input
                type="text"
                placeholder="품목명 또는 거래처명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <PaginationTable
            title={itemTableTitle}
            th={itemHeaders}
            allData={tItemData}
            itemsPerPage={5}
          />
        </div>

        {/* [우측 영역] 상시 노출 정산 마감 달력 (약 38% 너비) */}
        <div style={{ flex: '0 0 38%', minWidth: '340px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>품목 정산 마감 일정</h4>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={calendarType === 'week' ? 'is-active' : ''}
                onClick={() => setCalendarType('week')}
              >
                주간
              </button>
              <button
                type="button"
                className={calendarType === 'month' ? 'is-active' : ''}
                onClick={() => setCalendarType('month')}
              >
                월간
              </button>
            </div>
          </div>


          <div className="calendar-widget-wrapper">
            {calendarType === 'week' ? (
              <WeeklyCalendar
                events={calendarEvents}
                onEventClick={(event) => setSelectedItemId(event.id)}
              />
            ) : (
              <BasicCalendar
                events={calendarEvents}
                onEventClick={(event) => setSelectedItemId(event.id)}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Items;