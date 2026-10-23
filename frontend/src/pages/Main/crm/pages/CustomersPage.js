import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function CustomersPage(props) {
  const data = props.data;   // 부모 컴포넌트에서 전달받은 고객 데이터
  const setData = props.setData;   // 고객 데이터를 추가, 수정, 삭제할 때 사용하는 함수

  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');   // 고객 검색창에 입력한 값을 저장하는 State

  // 이름 또는 연락처에 검색어가 포함된 고객만 찾습니다.
  const filteredCustomers = data.customers.filter(function (customer) {
    const keyword = searchText.trim().toLowerCase();
    const target = (customer.name + ' ' + customer.phone).toLowerCase();
    return target.includes(keyword);
  });

  // 확인을 누른 경우에만 고객과 연결 데이터를 삭제합니다.
  function deleteCustomer(customer) {
    if (!window.confirm('이 고객을 삭제하시겠습니까?')) {
      return;
    }

    const purchaseIds = data.purchases
      .filter(function (purchase) {
        return purchase.customerId === customer.id;
      })
      .map(function (purchase) {
        return purchase.id;
      });

    setData(function (current) {
      return {
        ...current,
        customers: current.customers.filter(function (item) {
          return item.id !== customer.id;
        }),
        purchases: current.purchases.filter(function (item) {
          return item.customerId !== customer.id;
        }),
        consultations: current.consultations.filter(function (item) {
          return item.customerId !== customer.id;
        }),
        claims: current.claims.filter(function (item) {
          return item.customerId !== customer.id && !purchaseIds.includes(item.purchaseId);
        }),
      };
    });
  }

  let emptyMessage = '';
  if (data.customers.length === 0) {
    emptyMessage = '등록된 고객이 없습니다.';
  } else if (filteredCustomers.length === 0) {
    emptyMessage = '검색 결과가 없습니다.';
  }











  
  return (
    <section className="workspace-page crm-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>고객 관리</h1>
          <p>고객 정보를 검색하고 등록·수정·삭제할 수 있습니다.</p>
        </div>
        <button
          className="erp-primary-button"
          type="button"
          onClick={function () { navigate('/main/crm/customers/new'); }}
        >
          고객 등록
        </button>
      </header>

      <div className="filter-bar">
        <label className="search-field">
          고객 검색
          <input
            value={searchText}
            onChange={function (event) { setSearchText(event.target.value); }}
            placeholder="이름 또는 연락처 입력"
          />
        </label>
        <span className="result-count">조회 결과 <strong>{filteredCustomers.length}</strong>명</span>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>고객 이름</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>주소</th>
              <th>최근 구매일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(function (customer) {
              return (
                <tr key={customer.id}>
                  <td className="primary-cell">{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email}</td>
                  <td>{customer.address || '-'}</td>
                  <td>{customer.lastPurchaseDate || '-'}</td>
                  <td className="table-actions">
                    <Link
                      className="table-link-button"
                      to={'/main/crm/customers/edit/' + customer.id}
                    >
                      수정
                    </Link>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={function () { deleteCustomer(customer); }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
            {emptyMessage && (
              <tr>
                <td colSpan="6" className="no-data">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
