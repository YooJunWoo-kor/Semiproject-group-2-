import { Link } from 'react-router-dom';

const menus = [
  ['고객 관리', '일반 구매자와 고객별 구매 이력을 관리합니다.', 'customers'],
  ['거래처 관리', '유통사·대리점·납품 거래처 정보를 관리합니다.', 'partners'],
  ['상담 관리', '고객 문의와 답변, 처리 상태를 관리합니다.', 'consultations'],
  ['클레임 관리', '구매 건에 연결된 불량·교환·환불·불만을 관리합니다.', 'claims'],
];

export default function CrmHome() {
  return (
    <section className="workspace-page crm-home">
      <header className="page-header">
        <div>
          <span className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</span>
          <h1>고객관계관리</h1>
          <p>고객 접점부터 구매 후 클레임까지 한곳에서 관리합니다.</p>
        </div>
      </header>

      <div className="crm-menu-grid">
        {menus.map(([title, description, path]) => (
          <Link
            className="crm-menu-card"
            to={`/main/crm/${path}`}
            key={path}
          >
            <h2>{title}</h2>
            <p>{description}</p>
            <span>화면으로 이동 →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
