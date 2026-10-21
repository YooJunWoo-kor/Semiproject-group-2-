import { NavLink, Outlet, useLocation } from 'react-router-dom';

const menuItems = [
  { to: '/', label: '대시보드', icon: '📊', end: true },
  { to: '/employees', label: '직원 관리', icon: '👥' },
  { to: '/departments', label: '부서 관리', icon: '🏢' },
  { to: '/attendance', label: '근태 관리', icon: '📅' },
  { to: '/payroll', label: '급여 관리', icon: '💰' },
  { to: '/settings', label: '시스템 관리', icon: '⚙️' }
];

const pageTitles = {
  '/': '대시보드',
  '/employees': '직원 관리',
  '/departments': '부서 관리',
  '/attendance': '근태 관리',
  '/payroll': '급여 관리',
  '/settings': '시스템 관리'
};

export default function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'ERP';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <strong>eNOVA ERP</strong>
          <p>BUSINESS PLATFORM</p>
        </div>

        <p className="sidebar-section-title">WORKSPACE</p>
        
        <nav className="sidebar-nav">
          {menuItems.map(({ to, label, icon, end }) => (
            <div key={to} className="nav-item-wrapper">
              <NavLink to={to} end={end} className="nav-link">
                <span className="icon">{icon}</span>
                <span>{label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="footer-icon">❓</span>
          <strong>도움이 필요하신가요?</strong>
          <p>관리자에게 문의하세요.</p>
          <p>ERP SYSTEM · v1.0.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="breadcrumb">홈 / <strong>{title}</strong></div>
          
          <div className="user-profile-area">
            <button type="button" aria-label="알림" className="alarm-btn">
              🔔
            </button>
            <span className="user-name">김대성</span>
            <span className="user-role">인사팀 관리자</span>
            <span className="dropdown-arrow">▼</span>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}