//회사설정 json형식으로 만들어짐
const settings = [
  { title: '회사 정보', desc: '회사명, 사업자 정보 및 기본 설정', color: 'blue' },
  { title: '사용자 및 권한', desc: '사용자 계정과 메뉴 접근 권한 관리', color: 'purple' },
  { title: '알림 설정', desc: '시스템 알림 및 이메일 안내 설정', color: 'orange' },
  { title: '보안 설정', desc: '비밀번호 정책과 로그인 보안 설정', color: 'green' }
];

export default function SystemSettings() {
  return (
    <div className="settings-list">
      {settings.map((s) => ( //map방식으로 하나씩 찾아옴!
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