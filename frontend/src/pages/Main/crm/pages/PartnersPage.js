import { useNavigate } from 'react-router-dom';

export default function PartnersPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();

  // 변경: 실제 거래처 데이터를 종류별로 세어 요약 카드에 표시합니다.
  const partnerTypeCounts = ['유통사', '대리점', '납품처'].map(function (type) {
    return {
      type: type,
      count: data.partners.filter(function (partner) {
        return partner.type === type;
      }).length,
    };
  });

  function deletePartner(partner) {
    if (!window.confirm('이 거래처를 삭제하시겠습니까?')) {
      return;
    }

    setData(function (current) {
      return {
        ...current,
        partners: current.partners.filter(function (item) {
          return item.id !== partner.id;
        }),
      };
    });
  }

  return (
    <section className="workspace-page crm-page">
      <header className="page-header">
        <div>
          
          <h1>거래처 관리</h1>
              {/* 변경: CRM 작은 라벨과 설명 문구는 제거하고 페이지 제목만 남겼습니다. */}
        </div>
        <button
          className="erp-primary-button"
          type="button"
          onClick={function () { navigate('/main/crm/partners/new'); }}
        >
          거래처 등록
        </button>
      </header>

      {/* 변경: 고정 CSS 클래스만 사용해 전체 및 유형별 거래처 수를 추가합니다. */}
      <div className="stats-grid" aria-label="거래처 현황">
        <div className="stat-copy content-card">
          <span>전체 거래처</span>
          <strong>{data.partners.length}<small>곳</small></strong>
        </div>
        {partnerTypeCounts.map(function (item) {
          return (
            <div className="stat-copy content-card" key={item.type}>
              <span>{item.type}</span>
              <strong>{item.count}<small>곳</small></strong>
            </div>
          );
        })}
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>거래처명</th>
              <th>유형</th>
              <th>담당자</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>주소</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {data.partners.map(function (partner) {
              return (
                <tr key={partner.id}>
                  <td className="primary-cell">{partner.name}</td>
                  <td><span className="type-badge">{partner.type}</span></td>
                  <td>{partner.manager || '-'}</td>
                  <td>{partner.phone || '-'}</td>
                  <td>{partner.email || '-'}</td>
                  <td>{partner.address || '-'}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      onClick={function () { navigate('/main/crm/partners/edit/' + partner.id); }}
                    >
                      수정
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={function () { deletePartner(partner); }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
            {data.partners.length === 0 && (
              <tr>
                <td colSpan="7" className="no-data">
                  등록된 거래처가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
