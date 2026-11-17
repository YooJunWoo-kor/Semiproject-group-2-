import { FinanceResourceModal, FinanceResourceDetails, FinanceSearchForm, FinanceStatusBadge } from '../components/FinanceDetailUI';
import { useFinanceHistory, FinancePaymentHistory } from '../components/FinanceFunds';
// [공통화 추가] 재무 전용 공통 컴포넌트·함수 재사용 (상위 공용 파일 수정 없음)
import { getFinanceError } from '../components/financeUtils';
import React, { useEffect, useState, useRef } from 'react';
import { getBankAccounts, getBankAccountPayments, createBankAccount, updateBankAccount, getFinanceEmployees, updateBankAccountStatus } from "../../../../utils/financeService";
import ModalBase from '../../../../components/ModalBase';
import '../components/Finance.css';
import PaginationTable from '../../../../components/PaginationTable';
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";
function BankAccount({
  embedded = false,
  onSummaryChange,
  onBusyChange
}) {
  const accountListRef = useRef(null);

  // DB에서 조회한 회사계좌 목록
  const [accountList, setAccountList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 검색창에 입력한 조건
  const [bankFilter, setBankFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 조회 버튼을 눌렀을 때 적용할 조건
  const [searchFilter, setSearchFilter] = useState({
    bank: "ALL",
    type: "ALL",
    keyword: ""
  });

  // 거래내역을 확인할 계좌
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountView, setAccountView] = useState("detail");
  // 계좌 등록폼 상태
  const [formOpen, setFormOpen] = useState(false);
  // [공통화] 선택 이력 조회는 계좌·카드 공통 훅을 사용합니다.
  const { payments: accountPayments, loading: paymentsLoading, error: paymentsError } = useFinanceHistory(getBankAccountPayments, accountView === "history" && !formOpen ? selectedAccountId : null, "계좌 거래내역을 불러오지 못했습니다.");



  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [accountForm, setAccountForm] = useState({
    account_number: "",
    bank_name: "",
    account_name: "",
    account_type: "",
    balance: "0",
    currency: "KRW",
    employee_id: ""
  });

  // null이면 신규 등록, ID가 있으면 해당 계좌 수정
  const [editingAccountId, setEditingAccountId] = useState(null);

  // 관리 사원 선택 목록
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState("");

  // 회사계좌 상태 변경 진행 여부와 오류
  const [accountStatusSaving, setAccountStatusSaving] = useState(false);
  const [accountStatusError, setAccountStatusError] = useState("");
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getBankAccounts();

        // DB 컬럼명을 화면에서 사용하는 이름으로 변환합니다.
        const accounts = data.map(account => ({
          id: account.account_id,
          accountName: account.account_name,
          bankName: account.bank_name,
          accountNumber: account.account_number,
          accountType: account.account_type || "-",
          currency: account.currency || "미지정",
          balance: Number(account.balance ?? 0),
          managerId: account.employee_id,
          managerName: account.manager_name || "미지정",
          status: account.account_status || "미지정",
          lastTransactionDate: account.last_transaction || "-"
        }));
        setAccountList(accounts);
      } catch (err) {
        console.error("회사계좌 조회 오류:", err);
        setError("회사계좌 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  // 선택한 계좌가 바뀌면 거래내역을 조회합니다.


  // 관리 사원 목록 조회
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getFinanceEmployees();
        setEmployeeOptions(data);
      } catch (err) {
        console.error("관리 사원 조회 오류:", err);
        setEmployeesError("관리 사원 목록을 불러오지 못했습니다.");
      } finally {
        setEmployeesLoading(false);
      }
    }
    loadEmployees();
  }, []);

  // 원화 기준 총 잔액 합산 (외화 제외)
  const totalKrwBalance = accountList.filter(acc => acc.currency === 'KRW').reduce((sum, acc) => sum + acc.balance, 0);
  useEffect(() => {
    onSummaryChange?.({
      loading,
      error,
      count: accountList.length,
      balance: totalKrwBalance
    });
  }, [accountList, loading, error, totalKrwBalance, onSummaryChange]);
  const interactionBusy = formOpen || selectedAccountId !== null || saving || accountStatusSaving;
  useEffect(() => {
    onBusyChange?.(interactionBusy);
  }, [interactionBusy, onBusyChange]);

  // 테이블 규격 정의
  const accountTableTitle = "회사 계좌 목록 현황";

  // 중복을 제거한 은행·용도 목록
  const bankOptions = [...new Set(accountList.map(acc => acc.bankName).filter(Boolean))];
  const typeOptions = [...new Set(accountList.map(acc => acc.accountType).filter(type => type && type !== "-"))];

  // 조회 버튼 또는 Enter를 누르면 검색 조건을 적용합니다.
  function handleAccountSearch(e) {
    e.preventDefault();
    setSearchFilter({
      bank: bankFilter,
      type: typeFilter,
      keyword: searchKeyword.trim()
    });
  }

  // 적용된 조건에 맞는 계좌만 표시합니다.
  const filteredAccounts = accountList.filter(account => {
    const { bank, type, keyword } = searchFilter;
    const searchText = keyword.toLowerCase();
  
    // 전체 은행이거나 선택한 은행인지 확인
    const bankMatches =
      bank === "ALL" || account.bankName === bank;
  
    // 전체 용도이거나 선택한 용도인지 확인
    const typeMatches =
      type === "ALL" || account.accountType === type;
  
    // 계좌명 또는 계좌번호에 검색어가 있는지 확인
    const nameMatches =
      account.accountName.toLowerCase().includes(searchText);
  
    const numberMatches =
      account.accountNumber.toLowerCase().includes(searchText);
  
    return bankMatches && typeMatches && (nameMatches || numberMatches);
  });

  // 목록 수정은 이 배열에서만 합니다.
  // width: 열 너비 / label: 제목 / field: 표시할 계좌 데이터 / render: 버튼·배지 등 별도 표시
  // 항목을 이동하거나 삭제하면 제목과 내용이 함께 변경됩니다.
  const accountColumns = [
    { key: 'id', label: 'ID', field: 'id' },
    { key: 'bank', label: '은행명', render: acc => <strong>{acc.bankName}</strong> },
    { key: 'number', label: '계좌번호', field: 'accountNumber' },
    { key: 'manager', label: '관리자', field: 'managerName' },
    { key: 'name', label: '계좌명', render: acc => <span title={acc.accountName}>{acc.accountName}</span> },
    {
      key: 'status', width: '80px', label: '상태',
      render: acc => <FinanceStatusBadge tone={acc.status === "STOP" || acc.status.includes("동결") ? "status-danger" : "status-success"}>
        {acc.status === "ACTIVE" ? "사용" : acc.status === "STOP" ? "사용 중지" : acc.status}
      </FinanceStatusBadge>
    },
    {
      key: 'actions', width: '180px', label: '관리',
      render: acc => <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <button type="button" disabled={saving || accountStatusSaving} onClick={() => openAccountDetail(acc.id)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>상세</button>
        <button type="button" disabled={saving || accountStatusSaving} onClick={() => openAccountHistory(acc.id)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>거래내역</button>
        <button type="button" disabled={saving || accountStatusSaving} onClick={() => openEditAccountForm(acc)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>수정</button>
      </div>
    }
  ];

  // 제목과 셀을 같은 설정으로 생성하므로 순서가 어긋나지 않습니다.
  const accountHeaders = accountColumns.map(column => column.label);
  const tAccountData = filteredAccounts.map(acc => ({
    content: accountColumns.map(column => <React.Fragment key={column.key}>
      {column.render ? column.render(acc) : (acc[column.field] ?? '-')}
    </React.Fragment>)
  }));

  // BasicTable은 thead 없이 첫 tr에 제목을 표시합니다.
  // 공통 파일 대신 이 목록의 DOM에만 인라인 너비·여백을 적용합니다.
  useEffect(() => {
    const container = accountListRef.current;
    if (!container) return;
    function applyLayout() {
      const table = container.querySelector('table');
      if (!table) return;
      Object.assign(table.style, {
        width: '100%', minWidth: '0', maxWidth: '100%',
        tableLayout: 'fixed', boxSizing: 'border-box'
      });
      const headers = table.rows[0]?.cells;
      const cols = table.querySelectorAll('colgroup > col');
      accountColumns.forEach((column, index) => {
        if (headers?.[index]) Object.assign(headers[index].style, {
          width: column.width || 'auto', minWidth: '0', boxSizing: 'border-box'
        });
        if (cols[index]) Object.assign(cols[index].style, { width: column.width || 'auto', minWidth: '0' });
      });
      table.querySelectorAll('th, td').forEach(cell => Object.assign(cell.style, {
        padding: '8px 10px', boxSizing: 'border-box',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }));
      table.querySelectorAll('button').forEach(button => Object.assign(button.style, {
        minHeight: '30px', height: '30px', padding: '6px 8px', fontSize: '12px',
        lineHeight: '16px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: '0',
        boxSizing: 'border-box', cursor: button.disabled ? 'default' : 'pointer'
      }));
      const card = container.querySelector('.attendance-card');
      if (card) Object.assign(card.style, { paddingBottom: '12px', minWidth: '0' });
      const title = card?.querySelector('h4');
      if (title) Object.assign(title.style, { marginTop: '0', marginBottom: '10px' });
      const shell = container.querySelector('.table-shell');
      if (shell) Object.assign(shell.style, { width: '100%', maxWidth: '100%', minWidth: '0', boxSizing: 'border-box' });
    }
    applyLayout();
    // 페이지 전환으로 교체되는 행에도 같은 여백을 적용합니다.
    const observer = new MutationObserver(applyLayout);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  // 선택한 계좌의 정보
  const selectedAccount = accountList.find(acc => acc.id === selectedAccountId);

  // 신규 계좌 등록폼 열기
  function openAccountForm() {
    if (saving || accountStatusSaving) return;
    setEditingAccountId(null); // 신규 등록 모드

    setAccountForm({
      account_number: "",
      bank_name: "",
      account_name: "",
      account_type: "",
      balance: "0",
      currency: "KRW",
      employee_id: ""
    });
    setFormError("");
    setSelectedAccountId(null);
    setFormOpen(true);
  }

  // 입력값 변경
  function handleAccountChange(e) {
    const {
      name,
      value
    } = e.target;
    setAccountForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // 회사계좌 신규 등록 및 수정
  async function handleAccountSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const isEditing = editingAccountId !== null;
    setSaving(true);
    setFormError("");
    try {
      const selectedEmployee = employeeOptions.find(employee => Number(employee.employee_id) === Number(accountForm.employee_id));
      if (isEditing) {
        // 수정 API에는 변경 가능한 기본정보만 보냅니다.
        const result = await updateBankAccount(editingAccountId, {
          account_number: accountForm.account_number,
          bank_name: accountForm.bank_name,
          account_name: accountForm.account_name,
          account_type: accountForm.account_type,
          employee_id: accountForm.employee_id
        });

        // 기존 계좌의 기본정보만 교체합니다.
        setAccountList(prev => prev.map(acc => acc.id === editingAccountId ? {
          ...acc,
          accountNumber: accountForm.account_number.trim(),
          bankName: accountForm.bank_name.trim(),
          accountName: accountForm.account_name.trim(),
          accountType: accountForm.account_type.trim() || "-",
          managerId: accountForm.employee_id === "" ? null : Number(accountForm.employee_id),
          managerName: accountForm.employee_id === "" ? "미지정" : selectedEmployee?.name || acc.managerName
        } : acc));
        alert(result.message);
      } else {
        const result = await createBankAccount(accountForm);
        const newAccount = {
          id: result.account_id,
          accountName: accountForm.account_name.trim(),
          bankName: accountForm.bank_name.trim(),
          accountNumber: accountForm.account_number.trim(),
          accountType: accountForm.account_type.trim() || "-",
          currency: accountForm.currency,
          balance: Number(accountForm.balance || 0),
          managerId: accountForm.employee_id === "" ? null : Number(accountForm.employee_id),
          managerName: selectedEmployee?.name || "미지정",
          status: "사용",
          lastTransactionDate: "-"
        };
        setAccountList(prev => [newAccount, ...prev]);
        alert("회사계좌가 등록되었습니다.");
      }

      // 저장한 계좌가 보이도록 검색 조건을 초기화합니다.
      setBankFilter("ALL");
      setTypeFilter("ALL");
      setSearchKeyword("");
      setSearchFilter({
        bank: "ALL",
        type: "ALL",
        keyword: ""
      });
      setFormOpen(false);
      setEditingAccountId(null);
    } catch (err) {
      setFormError(getFinanceError(err, isEditing ? "회사계좌 수정에 실패했습니다." : "회사계좌 등록에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  // 선택한 계좌 정보를 기존 입력폼에 채웁니다.
  function openEditAccountForm(acc) {
    if (saving || accountStatusSaving) return;
    if (selectedAccountId !== acc.id) setAccountView("detail");
    setEditingAccountId(acc.id);
    setAccountForm({
      account_number: acc.accountNumber,
      bank_name: acc.bankName,
      account_name: acc.accountName,
      account_type: acc.accountType === "-" ? "" : acc.accountType,
      balance: String(acc.balance),
      currency: acc.currency,
      employee_id: acc.managerId == null ? "" : String(acc.managerId)
    });
    setFormError("");
    setSelectedAccountId(acc.id);
    setFormOpen(true);
  }

  // 선택한 회사계좌의 사용 상태를 변경합니다.
  async function handleAccountStatusChange(account) {
    if (saving || accountStatusSaving) return;
    const nextStatus = ["사용", "ACTIVE"].includes(account.status) ? "STOP" : "사용";
    setAccountStatusSaving(true);
    setAccountStatusError("");
    try {
      const result = await updateBankAccountStatus(account.id, nextStatus);

      // 선택한 계좌의 상태만 변경합니다.
      setAccountList(prev => prev.map(item => item.id === account.id ? {
        ...item,
        status: result.account_status
      } : item));
      alert(result.message);
    } catch (err) {
      setAccountStatusError(getFinanceError(err, "회사계좌 상태 변경에 실패했습니다."));
    } finally {
      setAccountStatusSaving(false);
    }
  }

  // 거래내역과 수정 폼을 동시에 열지 않고 공통 모달로 표시합니다.
  function openAccountDetail(accountId) {
    if (saving || accountStatusSaving) return;
    setFormOpen(false);
    setAccountView("detail");
    setAccountStatusError("");
    setSelectedAccountId(accountId);
  }
  function openAccountHistory(accountId) {
    setAccountView("history");
    if (saving || accountStatusSaving) return;
    setFormOpen(false);
    // [공통화] 이력 초기화·로딩 처리는 useFinanceHistory에서 수행합니다.
    setAccountStatusError("");
    setSelectedAccountId(accountId);
  }
  function closeAccountHistory() {
    if (saving || accountStatusSaving) return;
    setSelectedAccountId(null);
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving || accountStatusSaving) return;
    setFormOpen(false);
  }
  return <div className={`border-container finance-accounts finance-resource${embedded ? " finance-resource-embedded" : ""}`}>
    {/* 1. 헤더 & 액션 버튼 영역 */}
    <header className="dashboard-header finance-resource-header">
      {!embedded && <span className="subtitle">회사 계좌 관리</span>}
      <div className="dashboard-top">
        <button type="button" className="register-btn" disabled={saving || accountStatusSaving} onClick={openAccountForm}>
          + 계좌 등록
        </button>
      </div>
    </header>

    {!embedded && <hr />}

    {!embedded && <>
      {/* 2. 전사 잔액 요약 영역 (KPI 카드 구역) */}
      <section className="finance-account-summary">
        <h3>자금 현황 요약</h3>
        <p>
          <strong>등록 계좌 수:</strong> {accountList.length}개 |{" "}
          <strong>원화 계좌 총 잔액:</strong>{" "}
          {totalKrwBalance.toLocaleString()}원
        </p>
      </section>

      <hr />

    </>}

    {/* 3. 검색 및 필터 구역 */}
    {/* 검색 및 필터 */}
    <section className="finance-resource-filters">
      <FinanceSearchForm className="finance-card-search finance-resource-search" onSubmit={handleAccountSearch} filters={[
        { id: 'bankFilter', label: '은행 구분: ', value: bankFilter, onChange: setBankFilter, options: [{ value: 'ALL', label: '전체 은행' }, ...bankOptions.map(value => ({ value, label: value }))] },
        { id: 'typeFilter', label: '용도 구분: ', value: typeFilter, onChange: setTypeFilter, options: [{ value: 'ALL', label: '전체 용도' }, ...typeOptions.map(value => ({ value, label: value }))] }
      ]} keyword={{ id: 'account-search-keyword', placeholder: '계좌명 또는 계좌번호 검색', value: searchKeyword, onChange: setSearchKeyword }} />
    </section>


    {loading && <p>회사계좌 목록을 불러오는 중입니다.</p>}

    {error && <p role="alert">{error}</p>}

    {!loading && !error && filteredAccounts.length === 0 && <p>
      {accountList.length === 0 ? "등록된 회사계좌가 없습니다." : "검색 조건에 맞는 계좌가 없습니다."}
    </p>}

    {formOpen && <div className="finance-registration-modal">
      <ModalBase title={editingAccountId === null ? "회사계좌 신규 등록" : "회사계좌 정보 수정"} onClose={closeRegistrationModal} layout={<form onSubmit={handleAccountSubmit}>

        <fieldset disabled={saving}>
          {[{
            name: "bank_name",
            label: "은행명",
            required: true,
            maxLength: 50
          }, {
            name: "account_number",
            label: "계좌번호",
            required: true,
            maxLength: 50
          }, {
            name: "account_name",
            label: "계좌명",
            required: true,
            maxLength: 100
          }, {
            name: "account_type",
            label: "용도 구분",
            maxLength: 30
          }].map(field => <div key={field.name}>
            <label htmlFor={`account-${field.name}`}>
              {field.label}{field.required ? " *" : ""}
            </label>

            <input id={`account-${field.name}`} name={field.name} type="text" value={accountForm[field.name]} onChange={handleAccountChange} required={field.required} maxLength={field.maxLength} />
          </div>)}

          <div>
            <label htmlFor="account-currency">통화 *</label>
            <select id="account-currency" name="currency" value={accountForm.currency} onChange={handleAccountChange} disabled={editingAccountId !== null} required>
              <option value="KRW">KRW — 원화</option>
              <option value="USD">USD — 미국 달러</option>
              <option value="JPY">JPY — 일본 엔</option>
              <option value="EUR">EUR — 유로</option>
            </select>
          </div>

          <div>
            <label htmlFor="account-balance">초기 잔액 *</label>
            <input id="account-balance" name="balance" type="number" min="0" step="1" value={accountForm.balance} onChange={handleAccountChange} disabled={editingAccountId !== null} required />
          </div>

          <div>
            <label htmlFor="account-employee">관리 사원</label>

            <select id="account-employee" name="employee_id" value={accountForm.employee_id} onChange={handleAccountChange} disabled={employeesLoading || Boolean(employeesError)}>
              <option value="">미지정</option>

              {employeeOptions.map(employee => <option key={employee.employee_id} value={employee.employee_id}>
                {employee.name} / {employee.department_name || "부서 미지정"}
                {" / "}{employee.employee_number}
              </option>)}
            </select>

            {employeesLoading && <p>관리 사원 목록을 불러오는 중입니다.</p>}
            {employeesError && <p role="alert">{employeesError}</p>}
          </div>

          <p>
            {editingAccountId === null ? "관리 사원은 선택 항목이며, 계좌 상태는 사용으로 등록됩니다." : "수정 시 잔액과 통화는 기존 값을 유지합니다."}
          </p>

          {formError && <p role="alert">{formError}</p>}

          <button type="submit">
            {saving ? "저장 중..." : "저장"}
          </button>

          <button type="button" onClick={closeRegistrationModal}>
            취소
          </button>
        </fieldset>
      </form>} />
    </div>}

    {/* 4. 규격화된 PaginationTable 연동 */}
    <div className="finance-resource-list" ref={accountListRef} style={{ width: '100%', minWidth: 0 }}>
      <PaginationTable key={JSON.stringify(searchFilter)} title={accountTableTitle} th={accountHeaders} allData={tAccountData} itemsPerPage={5} />
    </div>

    {selectedAccount && !formOpen && <FinanceResourceModal
      key={accountView}
      title={accountView === "detail" ? "회사계좌 상세정보" : "회사계좌 거래내역"}
      onClose={closeAccountHistory} busy={saving || accountStatusSaving}
      actions={<>
        {accountView === "detail" && <button type="button" disabled={saving || accountStatusSaving} onClick={() => openAccountHistory(selectedAccount.id)}>거래내역</button>}
        <button type="button" className="erp-primary-button" disabled={saving || accountStatusSaving} onClick={() => openEditAccountForm(selectedAccount)}>수정</button>
        {accountView === "detail" && <button type="button" disabled={saving || accountStatusSaving || !["사용", "ACTIVE", "STOP"].includes(selectedAccount.status)} onClick={() => handleAccountStatusChange(selectedAccount)}>
          {accountStatusSaving ? "변경 중..." : selectedAccount.status === "STOP" ? "사용 재개" : "사용 중지"}
        </button>}
      </>}>
      {accountView === "detail" ? <FinanceResourceDetails rows={[
        ["계좌 ID", selectedAccount.id], ["은행명", selectedAccount.bankName],
        ["계좌번호", selectedAccount.accountNumber], ["계좌명", selectedAccount.accountName],
        ["용도 구분", selectedAccount.accountType],
        ["현재 잔액", `${selectedAccount.balance.toLocaleString()} ${selectedAccount.currency}`],
        ["통화", selectedAccount.currency], ["담당자", selectedAccount.managerName],
        ["최근 거래일시", selectedAccount.lastTransactionDate],
        ["상태", selectedAccount.status === "ACTIVE" ? "사용" : selectedAccount.status === "STOP" ? "사용 중지" : selectedAccount.status]
      ]} /> : <>
        <div style={{ marginBottom: 8, overflowWrap: 'anywhere' }}>
          <p style={{ margin: 0 }}>계좌번호: {selectedAccount.accountNumber}</p>
        </div>
        {paymentsLoading ? <p>거래내역을 불러오는 중입니다.</p> : paymentsError ? <p role="alert">{paymentsError}</p> : <FinancePaymentHistory className="finance-account-history" payments={accountPayments} showPartner amountSuffix="" statusLabel="상태" enablePeriodFilter currency={selectedAccount.currency} currentBalance={selectedAccount.balance} />}
      </>}
      {accountStatusError && <p role="alert">{accountStatusError}</p>}
    </FinanceResourceModal>}

  </div>;
}
export default BankAccount;
