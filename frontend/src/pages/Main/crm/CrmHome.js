import { Link } from 'react-router-dom';

const menus = [
  { title: '고객 관리', description: '고객 정보 조회 및 등록', path: 'customers', key: 'customers' },
  { title: '거래처 관리', description: '유통사·대리점·납품처 관리', path: 'partners', key: 'partners' },
  { title: '상담 관리', description: '고객 문의 및 답변 처리', path: 'consultations', key: 'consultations' },
  { title: '클레임 관리', description: '불량·교환·환불 접수 처리', path: 'claims', key: 'claims' },
];


export default function CrmHome(props) {
  const data = props.data;

  return (
    <section className="workspace-page crm-page crm-home">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>고객관계관리</h1>
          <p>고객과 거래처 정보를 확인하고 상담 및 클레임 업무를 처리합니다.</p>
        </div>
      </header>

      <div className="crm-summary" aria-label="CRM 현황">
        <div>
          <span>전체 고객</span>
          <strong>{data.customers.length}</strong>
          <small>명</small>
        </div>
        <div>
          <span>거래처</span>
          <strong>{data.partners.length}</strong>
          <small>곳</small>
        </div>
        <div>
          <span>상담</span>
          <strong>{data.consultations.length}</strong>
          <small>건</small>
        </div>
        <div>
          <span>클레임</span>
          <strong>{data.claims.length}</strong>
          <small>건</small>
        </div>
      </div>

      <div className="crm-section-heading">
        <h2>업무 메뉴</h2>
        <p>작업할 메뉴를 선택하세요.</p>
      </div>
      <div className="crm-menu-grid">
        {menus.map(function (menu, index) {
          return (
            <Link
              className="crm-menu-card"
              to={'/main/crm/' + menu.path}
              key={menu.path}
            >
              <span className="crm-menu-number">{index + 1}</span>
              <div>
                <h3>{menu.title}</h3>
                <p>{menu.description}</p>
              </div>
              <span className="crm-menu-arrow" aria-hidden="true">›</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
