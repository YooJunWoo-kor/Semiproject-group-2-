// 설정 메뉴는 배열로 관리해 동일한 버튼 구조를 반복 렌더링합니다.
const settings = [
  { title: '회사 정보', desc: '회사명, 사업자 정보 및 기본 설정', color: 'blue' },
  { title: '사용자 및 권한', desc: '사용자 계정과 메뉴 접근 권한 관리', color: 'purple' },
  { title: '알림 설정', desc: '시스템 알림 및 이메일 안내 설정', color: 'orange' },
  { title: '보안 설정', desc: '비밀번호 정책과 로그인 보안 설정', color: 'green' }
];

export default function SystemSettings() {
  // 현재는 HR 설정 메뉴의 기본 화면만 제공하며 저장 로직은 없습니다.
  return (
    <div className="settings-list">
      {/* 실제 설정 화면이 연결되기 전까지는 안내만 표시합니다. */}
      {settings.map((s) => (
        <button
          key={s.title}
          onClick={() =>
            window.alert(`${s.title} 설정 화면은 추후 구현할 수 있습니다.`)
          }
          className="setting-item-btn"
        >
          <span className="setting-text">
            <strong>{s.title}</strong>
            <small>{s.desc}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
