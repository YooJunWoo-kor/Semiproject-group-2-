import { Link } from 'react-router-dom';

// 변경: 아래 업무 메뉴 카드 영역을 제거해 더 이상 사용하지 않는 메뉴 배열도 삭제했습니다.
export const initialCrmData = {
  // 1. 고객 관리 (B2C / 리테일 고객)
  customers: [
    {
      id: 1,
      name: '김서연',
      company: '개인 고객',
      grade: 'VIP',
      phone: '010-3849-1124',
      email: 'sy.kim@example.com',
      joinedAt: '2026-03-12',
      status: '활성',
    },
    {
      id: 2,
      name: '이민호',
      company: '개인 고객',
      grade: '일반',
      phone: '010-9281-4432',
      email: 'mh.lee@example.com',
      joinedAt: '2026-06-20',
      status: '활성',
    },
    {
      id: 3,
      name: '박지훈',
      company: '개인 고객',
      grade: '우수',
      phone: '010-7712-9018',
      email: 'jh.park@example.com',
      joinedAt: '2026-08-05',
      status: '활성',
    },
    {
      id: 4,
      name: '최유진',
      company: '개인 고객',
      grade: '휴면',
      phone: '010-5523-8871',
      email: 'yj.choi@example.com',
      joinedAt: '2025-11-18',
      status: '비활성',
    },
    {
      id: 5,
      name: '정도현',
      company: '개인 고객',
      grade: 'VIP',
      phone: '010-6641-3329',
      email: 'dh.jung@example.com',
      joinedAt: '2026-01-09',
      status: '활성',
    },
  ],

  // 2. 거래처 관리 (유통사, 협력사, 납품처)
  partners: [
    {
      id: 1,
      name: '(주)한성유통',
      type: '유통사',
      businessNumber: '105-86-12345',
      manager: '강동원 부장',
      phone: '02-555-8901',
      address: '서울시 강남구 테헤란로 124',
      status: '거래중',
    },
    {
      id: 2,
      name: '태양로지스틱스',
      type: '물류/배송',
      businessNumber: '214-81-67890',
      manager: '윤아름 과장',
      phone: '031-789-2345',
      address: '경기도 용인시 처인구 백암면 45',
      status: '거래중',
    },
    {
      id: 3,
      name: '(주)글로벌식자재',
      type: '원자재 납품',
      businessNumber: '302-88-54321',
      manager: '오상택 차장',
      phone: '032-441-9988',
      address: '인천광역시 남동구 남동서로 88',
      status: '계약검토',
    },
  ],

  // 3. 상담 관리 (고객 문의 및 지원 요청)
  consultations: [
    {
      id: 1,
      customerId: 1,
      customerName: '김서연',
      channel: '전화',
      category: '대량 주문 견적 문의',
      content: '추석 프로모션 관련 대량 발주 단가 협의 요청',
      manager: '정회계',
      date: '2026-10-21',
      status: '답변완료',
    },
    {
      id: 2,
      customerId: 2,
      customerName: '이민호',
      channel: '웹 문의',
      category: '배송 일정 확인',
      content: '주문한 자재 배송 출하 일자 및 송장 번호 확인 요청',
      manager: '한인사',
      date: '2026-10-22',
      status: '처리중',
    },
    {
      id: 3,
      customerId: 3,
      customerName: '박지훈',
      channel: '이메일',
      category: '결제 및 세금계산서',
      content: '전자세금계산서 발행 내역 이메일 재전송 요청',
      manager: '정회계',
      date: '2026-10-23',
      status: '접수대기',
    },
    {
      id: 4,
      customerId: 5,
      customerName: '정도현',
      channel: '전화',
      category: '품질 사양 문의',
      content: '신규 도입 예정 패키징 규격 및 내열 기준 문의',
      manager: '배품질',
      date: '2026-10-23',
      status: '접수대기',
    },
  ],

  // 4. 클레임 관리 (교환, 반품, 불량 접수)
  claims: [
    {
      id: 1,
      claimCode: 'CLM-202610-001',
      customerName: '김서연',
      partnerName: '(주)한성유통',
      item: '포장용 크라프트 박스',
      reason: '배송 중 박스 모서리 파손 및 습기 유입',
      requestedAction: '맞교환',
      createdAt: '2026-10-19',
      status: '처리완료',
    },
    {
      id: 2,
      claimCode: 'CLM-202610-002',
      customerName: '정도현',
      partnerName: '태양로지스틱스',
      item: '베이킹 트레이 5호',
      reason: '수량 불일치 (발주 100개 중 90개만 입고)',
      requestedAction: '누락분 추가 배송',
      createdAt: '2026-10-22',
      status: '진행중',
    },
  ],
};


export default function CrmHome(props) {
  // 변경: 별도 예시 데이터가 아니라 CrmRoutes에서 전달받은 최신 공용 데이터를 사용합니다.
  const data = props.data || initialCrmData;

  return (
    <section className="workspace-page crm-page crm-home">
      <header className="page-header">
        <div>
          {/* 변경: CRM 작은 라벨과 설명 문구는 제거하고 페이지 제목만 남겼습니다. */}
          <h1>고객관계관리</h1>
        </div>
      </header>

      {/* 변경: 기존 업무 메뉴 안내 문구와 카드 목록은 제거하고 요약 카드만 남겼습니다. */}
      <div className="stats-grid" aria-label="CRM 현황">

        {/* 변경: 요약 카드를 Link로 만들어 고객 관리 페이지로 이동하게 합니다. */}
        <Link className="stat-copy content-card" to="/main/crm/customers" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span>전체 고객</span>
          <strong>{data.customers.length}</strong>
          <small>명</small>
        </Link>

        {/* 변경: 거래처 요약 카드를 누르면 거래처 관리로 이동합니다. */}
        <Link className="stat-copy content-card" to="/main/crm/partners" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span>거래처</span>
          <strong>{data.partners.length}</strong>
          <small>곳</small>
        </Link>

        {/* 변경: 상담 요약 카드를 누르면 상담 관리로 이동합니다. */}
        <Link className="stat-copy content-card" to="/main/crm/consultations" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span>상담</span>
          <strong>{data.consultations.length}</strong>
          <small>건</small>
        </Link>
        
        {/* 변경: 클레임 요약 카드를 누르면 클레임 관리로 이동합니다. */}
        <Link className="stat-copy content-card" to="/main/crm/claims" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span>클레임</span>
          <strong>{data.claims.length}</strong>
          <small>건</small>
        </Link>
      </div>

    </section>
  );
}
