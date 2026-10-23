import { NavLink, Outlet, useLocation } from 'react-router-dom';

const menuItems = [
  { to: '/main/hr', label: '대시보드', icon: '📊', end: true },
  { to: '/main/hr/employees', label: '직원 관리', icon: '👥' },
  { to: '/main/hr/departments', label: '부서 관리', icon: '🏢' },
  { to: '/main/hr/attendance', label: '근태 관리', icon: '📅' },
  { to: '/main/hr/payroll', label: '급여 관리', icon: '💰' },
  { to: '/main/hr/settings', label: '시스템 관리', icon: '⚙️' }
];

const pageTitles = {
  '/main/hr': '대시보드',
  '/main/hr/employees': '직원 관리',
  '/main/hr/departments': '부서 관리',
  '/main/hr/attendance': '근태 관리',
  '/main/hr/payroll': '급여 관리',
  '/main/hr/settings': '시스템 관리'
};

export default function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'ERP';

  return (
    <div className="hr-layout">
      <aside className="hr-sidebar">
        <div className="hr-brand">
          <strong>eNOVA ERP</strong>
          <p>BUSINESS PLATFORM</p>
        </div>

        <p className="hr-nav-label">WORKSPACE</p>
        
        <nav className="hr-nav">
          {menuItems.map(({ to, label, icon, end }) => (
            <div key={to}>
              <NavLink to={to} end={end}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="hr-help-card">
          <span>❓</span>
          <strong>도움이 필요하신가요?</strong>
          <p>관리자에게 문의하세요.</p>
          <p>ERP SYSTEM · v1.0.0</p>
        </div>
      </aside>

      <main className="hr-main">
        <header className="hr-topbar">
          <div>홈 / <strong>{title}</strong></div>
          
          <div>
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
