import { useNavigate } from 'react-router-dom';

export default function PartnersPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();

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
          <span className="eyebrow">CRM</span>
          <h1>거래처 관리</h1>
          <p>등록된 거래처 정보를 확인합니다.</p>
        </div>
        <button
          className="erp-primary-button"
          type="button"
          onClick={function () { navigate('/main/crm/partners/new'); }}
        >
          거래처 등록
        </button>
      </header>

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
