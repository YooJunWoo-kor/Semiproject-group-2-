import { Link } from 'react-router-dom';

const menus = [
  { title: '고객 관리'
    , description: '고객 정보 조회 및 등록'
    , path: 'customers'
    , key: 'customers' },
  { title: '거래처 관리'
    , description: '유통사·대리점·납품처 관리'
    , path: 'partners'
    , key: 'partners' },
  { title: '상담 관리'
    , description: '고객 문의 및 답변 처리'
    , path: 'consultations'
    , key: 'consultations' },
  { title: '클레임 관리'
    , description: '불량·교환·환불 접수 처리'
    , path: 'claims'
    , key: 'claims' },
];

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
  const data = initialCrmData;

  return (
    <section className="workspace-page crm-page crm-home">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>고객관계관리</h1>
          <p>고객과 거래처 정보를 확인하고 상담 및 클레임 업무를 처리합니다.</p>
        </div>
      </header>

      <div className="stats-grid" aria-label="CRM 현황">

        <div className="stat-copy content-card">
          <span>전체 고객</span>
          <strong>{data.customers.length}</strong>
          <small>명</small>
        </div>

        <div className="stat-copy content-card">
          <span>거래처</span>
          <strong>{data.partners.length}</strong>
          <small>곳</small>
        </div>

        <div className="stat-copy content-card">
          <span>상담</span>
          <strong>{data.consultations.length}</strong>
          <small>건</small>
        </div>
        
        <div className="stat-copy content-card">
          <span>클레임</span>
          <strong>{data.claims.length}</strong>
          <small>건</small>
        </div>
      </div>

      <div className="crm-section-heading">
        <h2>업무 메뉴</h2>
        <p>작업할 메뉴를 선택하세요.</p>
      </div>
      <div className="module-grid">
        {menus.map(function (menu, index) {
          return (
            <div className="module-card" key={menu.path}>
            <span className="crm-menu-number">{index + 1}</span>
          
            <div>
              <h3>{menu.title}</h3>
              <p>{menu.description}</p>
            </div>
          
            <Link to={'/main/crm/' + menu.path}>
              {menu.title} 이동
            </Link>
          </div>
          );
        })}
      </div>
    </section>
  );
}
