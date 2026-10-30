import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClaimsPage(props) {
  const data = props.data;
  const setData = props.setData;
  const navigate = useNavigate();
  const [selectedClaim, setSelectedClaim] = useState(null);
  const today = getLocalDateString();
  const completedTodayCount = data.claims.filter(function (claim) {
    return claim.status === '처리 완료' && claim.completedAt === today;
  }).length;
  const newClaimCount = data.claims.filter(function (claim) {
    return claim.status === '신규';
  }).length;
  const completedClaimCount = data.claims.filter(function (claim) {
    return claim.status === '처리 완료';
  }).length;

  function findCustomerName(customerId) {
    const customer = data.customers.find(function (item) {
      return item.id === customerId;
    });
    return customer ? customer.name : '삭제된 고객';
  }

  function findPurchase(purchaseId) {
    return data.purchases.find(function (item) {
      return item.id === purchaseId;
    });
  }

  function deleteClaim(claimId) {
    if (!window.confirm('클레임을 삭제할까요?')) {
      return;
    }

    setData(function (current) {
      return {
        ...current,
        claims: current.claims.filter(function (item) {
          return item.id !== claimId;
        }),
      };
    });

    if (selectedClaim && selectedClaim.id === claimId) {
      setSelectedClaim(null);
    }
  }

  return (
    <section className="workspace-page crm-page">
      <header className="page-header">
        <div>
             {/* 변경: CRM 작은 라벨과 설명 문구는 제거하고 페이지 제목만 남겼습니다. */}
          <h1>클레임 관리</h1>
     
        </div>
       
      </header>

      <div className="stats-grid" aria-label="클레임 현황">
        <div className="stat-copy content-card">
          <span>전체 클레임</span>
          <strong>{data.claims.length}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>오늘 처리 완료</span>
          <strong>{completedTodayCount}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>신규</span>
          <strong>{newClaimCount}<small>건</small></strong>
        </div>
        <div className="stat-copy content-card">
          <span>처리 완료</span>
          <strong>{completedClaimCount}<small>건</small></strong>
        </div>
      </div>

      {!data.purchases.length && (
        <p className="connection-status is-offline">
          클레임을 등록하려면 고객의 구매 이력이 먼저 필요합니다.
        </p>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>고객</th>
              <th>유형</th>
              <th>제품 / 구매일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {data.claims.map(function (claim) {
              const purchase = findPurchase(claim.purchaseId);
              return (
                <tr
                  className="clickable-row"
                  key={claim.id}
                  onClick={function () { setSelectedClaim(claim); }}
                >
                  <td>{findCustomerName(claim.customerId)}</td>
                  <td>{claim.type}</td>
                  <td>{purchase ? purchase.productName + ' / ' + purchase.date : '삭제된 구매 건'}</td>
                  <td><span className="status-badge">{claim.status}</span></td>
                  <td onClick={function (event) { event.stopPropagation(); }}>
                    <button
                      type="button"
                      onClick={function () { navigate('/main/crm/claims/edit/' + claim.id); }}
                    >
                      수정/처리
                    </button>{' '}
                    <button
                      className="danger-button"
                      type="button"
                      onClick={function () { deleteClaim(claim.id); }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
            {!data.claims.length && (
              <tr><td colSpan="5" className="no-data">등록된 클레임이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <ClaimDetail
          claim={selectedClaim}
          customerName={findCustomerName(selectedClaim.customerId)}
          purchase={findPurchase(selectedClaim.purchaseId)}
          onClose={function () { setSelectedClaim(null); }}
        />
      )}
    </section>
  );
}

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function ClaimDetail(props) {
  return (
    <article className="detail-card">
      <div className="page-header">
        <h2>클레임 상세</h2>
        <button type="button" onClick={props.onClose}>닫기</button>
      </div>
      <dl>
        <div><dt>고객</dt><dd>{props.customerName}</dd></div>
        <div>
          <dt>구매 건</dt>
          <dd>{props.purchase ? props.purchase.productName + ' / ' + props.purchase.date : '-'}</dd>
        </div>
        <div><dt>유형 / 상태</dt><dd>{props.claim.type} / {props.claim.status}</dd></div>
        <div><dt>클레임 내용</dt><dd>{props.claim.content}</dd></div>
        <div><dt>처리 내용</dt><dd>{props.claim.resolution || '처리 전'}</dd></div>
      </dl>
    </article>
  );
}
