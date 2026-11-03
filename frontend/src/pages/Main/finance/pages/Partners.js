import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import WeeklyCalendar from '../../../../components/weeklycalendar/WeeklyCalendar';
import BasicCalendar from '../../../../components/calendar/BasicCalendar';

function Partners() {
  // 1. 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState('week'); // 'week' | 'month'

  // 2. 선택된 거래처 ID (상세 확인용)
  const [selectedPartnerId, setSelectedPartnerId] = useState('PT-2026-001');

  // 거래처 기본 목록 (목 데이터)
  const [partnersList] = useState([
    {
      id: 'PT-2026-001',
      name: '(주)알파솔루션',
      type: '매출처 (고객사)',
      bizNumber: '120-81-45678',
      ceo: '이대표',
      contact: '010-1234-5678',
      bankInfo: { bank: '신한은행', account: '110-345-678901', holder: '(주)알파솔루션' },
      settlementType: '입금 마감',
      closingDate: '2026-10-25',
      outstandingAmount: 15400000,
      status: '정상'
    },
    {
      id: 'PT-2026-002',
      name: '(주)베타원자재',
      type: '매입처 (공급사)',
      bizNumber: '214-85-98765',
      ceo: '김공급',
      contact: '010-9876-5432',
      bankInfo: { bank: '기업은행', account: '020-012345-01-099', holder: '(주)베타원자재' },
      settlementType: '출금 마감',
      closingDate: '2026-10-31',
      outstandingAmount: 8800000,
      status: '정상'
    },
    {
      id: 'PT-2026-003',
      name: '감마클라우드(주)',
      type: '매입처 (공급사)',
      bizNumber: '105-86-11223',
      ceo: '박서버',
      contact: '02-555-1234',
      bankInfo: { bank: '국민은행', account: '479002-01-998877', holder: '감마클라우드(주)' },
      settlementType: '출금 마감',
      closingDate: '2026-10-15',
      outstandingAmount: 2200000,
      status: '정상'
    }
  ]);

  // 테이블 규격 헤더 정의
  const partnerTableTitle = "거래처 목록 (입출금 마감 현황)";
  const partnerHeaders = [
    "거래처 ID",
    "거래처명",
    "구분",
    "사업자번호",
    "대표자/연락처",
    "마감 구분",
    "정기 마감일",
    "미정산 잔액",
    "관리/선택"
  ];

  // PaginationTable 규격 데이터 매핑 ({ content: [...] })
  const tPartnerData = partnersList.map((item) => ({
    content: [
      item.id,
      <strong>{item.name}</strong>,
      item.type,
      item.bizNumber,
      `${item.ceo} (${item.contact})`,
      <span className={`status-badge ${item.settlementType === '입금 마감' ? 'status-success' : 'status-danger'}`}>
        {item.settlementType}
      </span>,
      <strong>{item.closingDate}</strong>,
      `${item.outstandingAmount.toLocaleString()}원`,
      <button
        type="button"
        onClick={() => setSelectedPartnerId(item.id)}
      >
        선택
      </button>
    ]
  }));

  // 캘린더 이벤트 매핑 (BasicCalendar / WeeklyCalendar 공통 인터페이스 규격)
  const calendarEvents = partnersList.map((item) => ({
    id: item.id,
    title: `[${item.settlementType === '입금 마감' ? '입금' : '출금'}] ${item.name}`,
    start: item.closingDate,
    end: item.closingDate,
    type: item.settlementType === '입금 마감' ? 'income' : 'expense'
  }));

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">거래처 및 정산 마감 관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={() => alert('신규 거래처 등록 폼')}
          >
            + 신규 거래처 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 좌우 2단 분할 레이아웃 컨테이너 (테이블 좌측, 달력 우측 상시 노출) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>
        
        {/* [좌측 영역] 검색 필터 및 거래처 목록 테이블 (약 62% 너비) */}
        <div style={{ flex: '1 1 62%', minWidth: 0 }}>
          {/* 간이 검색/필터 구역 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <label htmlFor="partnerTypeSelect">구분: </label>
            <select id="partnerTypeSelect">
              <option value="ALL">전체 구분</option>
              <option value="INCOME">매출처 (입금마감)</option>
              <option value="EXPENSE">매입처 (출금마감)</option>
            </select>
            <input type="text" placeholder="거래처명, 사업자번호 검색" style={{ flex: 1 }} />
            <button type="button">검색</button>
          </div>

          <PaginationTable
            title={partnerTableTitle}
            th={partnerHeaders}
            allData={tPartnerData}
            itemsPerPage={5}
          />
        </div>

        {/* [우측 영역] 상시 노출 마감일 달력 (약 38% 너비) */}
        <div style={{ flex: '0 0 38%', minWidth: '340px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>정산 마감 일정</h4>
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


          {/* 수정된 컴포넌트명 BasicCalendar 및 WeeklyCalendar 적용 */}
          <div className="calendar-widget-wrapper">
            {calendarType === 'week' ? (
              <WeeklyCalendar
                events={calendarEvents}
                onEventClick={(event) => setSelectedPartnerId(event.id)}
              />
            ) : (
              <BasicCalendar
                events={calendarEvents}
                onEventClick={(event) => setSelectedPartnerId(event.id)}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Partners;