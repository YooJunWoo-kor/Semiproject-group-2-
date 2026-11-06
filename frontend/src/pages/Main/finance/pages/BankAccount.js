import React, { useEffect, useState } from 'react';
import { getBankAccounts, getBankAccountPayments, createBankAccount, updateBankAccount, getFinanceEmployees, updateBankAccountStatus } from "../../../../utils/financeService";
import ModalBase from '../../../../components/ModalBase';
import '../FinanceRegistration.css';
import PaginationTable from '../../../../components/PaginationTable';

function BankAccount() {

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

  const [accountPayments, setAccountPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // 계좌 등록폼 상태
  const [formOpen, setFormOpen] = useState(false);
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
        const accounts = data.map((account) => ({
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
  useEffect(() => {
    let cancelled = false;

    if (selectedAccountId === null) return;

    setAccountPayments([]);
    setPaymentsError("");
    setPaymentsLoading(true);

    async function loadAccountPayments() {
      try {
        const data = await getBankAccountPayments(selectedAccountId);

        // 다른 계좌를 선택했다면 이전 조회 결과는 반영하지 않습니다.
        if (!cancelled) {
          setAccountPayments(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentsError(
            err.response?.data?.message ||
            "계좌 거래내역을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false);
        }
      }
    }

    loadAccountPayments();

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

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
  const totalKrwBalance = accountList
    .filter((acc) => acc.currency === 'KRW')
    .reduce((sum, acc) => sum + acc.balance, 0);

  // 테이블 규격 정의
  const accountTableTitle = "회사 계좌 목록 현황";
  const accountHeaders = [
    "계좌 ID",
    "은행명",
    "계좌번호",
    "계좌별칭(계좌명)",
    "용도 구분",
    "현재 잔액",
    "통화",
    "관리 책임자",
    "최근 거래일시",
    "상태",
    "관리"
  ];

  // 중복을 제거한 은행·용도 목록
  const bankOptions = [...new Set(
    accountList.map((acc) => acc.bankName).filter(Boolean)
  )];

  const typeOptions = [...new Set(
    accountList
      .map((acc) => acc.accountType)
      .filter((type) => type && type !== "-")
  )];

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
  const filteredAccounts = accountList.filter((acc) => {
    const matchesBank =
      searchFilter.bank === "ALL" ||
      acc.bankName === searchFilter.bank;

    const matchesType =
      searchFilter.type === "ALL" ||
      acc.accountType === searchFilter.type;

    const keyword = searchFilter.keyword.toLowerCase();

    const matchesKeyword =
      acc.accountName.toLowerCase().includes(keyword) ||
      acc.accountNumber.toLowerCase().includes(keyword);

    return matchesBank && matchesType && matchesKeyword;
  });

  // 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tAccountData = filteredAccounts.map((acc) => {
    const formattedBalance = `${acc.balance.toLocaleString()} ${acc.currency}`;

    return {
      content: [
        acc.id,
        <strong>{acc.bankName}</strong>,
        acc.accountNumber,
        acc.accountName,
        acc.accountType,
        formattedBalance,
        acc.currency,
        acc.managerName,
        acc.lastTransactionDate,
        <span
          className={`status-badge ${acc.status === "STOP" || acc.status.includes("동결")
            ? "status-danger"
            : "status-success"
            }`}>
          {acc.status === "STOP" ? "사용 중지" : acc.status}
        </span>,
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setAccountPayments([]);
              setPaymentsError("");
              setPaymentsLoading(true);
              setSelectedAccountId(acc.id);
            }}
            disabled={selectedAccountId === acc.id}
          >
            거래내역
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => openEditAccountForm(acc)}
          >
            수정
          </button>
        </div>
      ]
    };
  });

  // 선택한 계좌의 정보
  const selectedAccount = accountList.find(
    (acc) => acc.id === selectedAccountId);

  // 신규 계좌 등록폼 열기
  function openAccountForm() {
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
    const { name, value } = e.target;

    setAccountForm((prev) => ({
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
      const selectedEmployee = employeeOptions.find(
        (employee) =>
          Number(employee.employee_id) ===
          Number(accountForm.employee_id)
      );
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
        setAccountList((prev) =>
          prev.map((acc) =>
            acc.id === editingAccountId
              ? {
                ...acc,
                accountNumber: accountForm.account_number.trim(),
                bankName: accountForm.bank_name.trim(),
                accountName: accountForm.account_name.trim(),
                accountType: accountForm.account_type.trim() || "-",
                managerId: accountForm.employee_id === "" ? null : Number(accountForm.employee_id),
                managerName: accountForm.employee_id === "" ? "미지정" : selectedEmployee?.name || acc.managerName
              }
              : acc
          )
        );

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

        setAccountList((prev) => [newAccount, ...prev]);

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
      setFormError(
        err.response?.data?.message ||
        (isEditing
          ? "회사계좌 수정에 실패했습니다."
          : "회사계좌 등록에 실패했습니다.")
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 계좌 정보를 기존 입력폼에 채웁니다.
  function openEditAccountForm(acc) {
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
    setSelectedAccountId(null);
    setFormOpen(true);
  }

  // 선택한 회사계좌의 사용 상태를 변경합니다.
  async function handleAccountStatusChange(account) {
    if (accountStatusSaving) return;

    const nextStatus =
      ["사용", "ACTIVE"].includes(account.status) ? "STOP" : "사용";

    setAccountStatusSaving(true);
    setAccountStatusError("");

    try {
      const result = await updateBankAccountStatus(
        account.id,
        nextStatus
      );

      // 선택한 계좌의 상태만 변경합니다.
      setAccountList((prev) =>
        prev.map((item) =>
          item.id === account.id
            ? { ...item, status: result.account_status }
            : item
        )
      );

      alert(result.message);
    } catch (err) {
      setAccountStatusError(
        err.response?.data?.message ||
        "회사계좌 상태 변경에 실패했습니다."
      );
    } finally {
      setAccountStatusSaving(false);
    }
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving) return;
    setFormOpen(false);
  }

  return (
    <div className="sub-container">
      {/* 1. 헤더 & 액션 버튼 영역 */}
      <header className="dashboard-header">
        <span className="subtitle">회사 계좌 관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={openAccountForm}
          >
            + 법인 계좌 신규 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 전사 잔액 요약 영역 (KPI 카드 구역) */}
      <section>
        <h3>자금 현황 요약</h3>
        <p>
          <strong>등록 계좌 수:</strong> {accountList.length}개 |{" "}
          <strong>원화 계좌 총 잔액:</strong>{" "}
          {totalKrwBalance.toLocaleString()}원
        </p>
      </section>

      <hr />

      {/* 3. 검색 및 필터 구역 */}
      {/* 검색 및 필터 */}
      <section>
        <form onSubmit={handleAccountSearch}>
          <label htmlFor="bankFilter">은행 구분: </label>
          <select
            id="bankFilter"
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
          >
            <option value="ALL">전체 은행</option>

            {bankOptions.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>

          <label htmlFor="typeFilter">용도 구분: </label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">전체 용도</option>

            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label htmlFor="searchKeyword">검색: </label>
          <input
            id="searchKeyword"
            type="text"
            placeholder="계좌명 또는 계좌번호 검색"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />

          <button type="submit">조회</button>
        </form>
      </section>

      <br />

      {loading && <p>회사계좌 목록을 불러오는 중입니다.</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && filteredAccounts.length === 0 && (
        <p>
          {accountList.length === 0
            ? "등록된 회사계좌가 없습니다."
            : "검색 조건에 맞는 계좌가 없습니다."}
        </p>
      )}

      {formOpen && (
        <div className="finance-registration-modal">
          <ModalBase
            title={editingAccountId === null ? "회사계좌 신규 등록" : "회사계좌 정보 수정"}
            onClose={closeRegistrationModal}
  
            layout={(
              <form onSubmit={handleAccountSubmit}>
              
                <fieldset disabled={saving}>
                  {[
                    {
                      name: "bank_name",
                      label: "은행명",
                      required: true,
                      maxLength: 50
                    },
                    {
                      name: "account_number",
                      label: "계좌번호",
                      required: true,
                      maxLength: 50
                    },
                    {
                      name: "account_name",
                      label: "계좌명",
                      required: true,
                      maxLength: 100
                    },
                    {
                      name: "account_type",
                      label: "용도 구분",
                      maxLength: 30
                    }
                  ].map((field) => (
                    <div key={field.name}>
                      <label htmlFor={`account-${field.name}`}>
                        {field.label}{field.required ? " *" : ""}
                      </label>
              
                      <input
                        id={`account-${field.name}`}
                        name={field.name}
                        type="text"
                        value={accountForm[field.name]}
                        onChange={handleAccountChange}
                        required={field.required}
                        maxLength={field.maxLength}
                      />
                    </div>
                  ))}
              
                  <div>
                    <label htmlFor="account-currency">통화 *</label>
                    <select
                      id="account-currency"
                      name="currency"
                      value={accountForm.currency}
                      onChange={handleAccountChange}
                      disabled={editingAccountId !== null}
                      required
                    >
                      <option value="KRW">KRW — 원화</option>
                      <option value="USD">USD — 미국 달러</option>
                      <option value="JPY">JPY — 일본 엔</option>
                      <option value="EUR">EUR — 유로</option>
                    </select>
                  </div>
              
                  <div>
                    <label htmlFor="account-balance">초기 잔액 *</label>
                    <input
                      id="account-balance"
                      name="balance"
                      type="number"
                      min="0"
                      step="1"
                      value={accountForm.balance}
                      onChange={handleAccountChange}
                      disabled={editingAccountId !== null}
                      required
                    />
                  </div>
              
                  <div>
                    <label htmlFor="account-employee">관리 사원</label>
              
                    <select
                      id="account-employee"
                      name="employee_id"
                      value={accountForm.employee_id}
                      onChange={handleAccountChange}
                      disabled={employeesLoading || Boolean(employeesError)}
                    >
                      <option value="">미지정</option>
              
                      {employeeOptions.map((employee) => (
                        <option
                          key={employee.employee_id}
                          value={employee.employee_id}
                        >
                          {employee.name} / {employee.department_name || "부서 미지정"}
                          {" / "}{employee.employee_number}
                        </option>
                      ))}
                    </select>
              
                    {employeesLoading && <p>관리 사원 목록을 불러오는 중입니다.</p>}
                    {employeesError && <p role="alert">{employeesError}</p>}
                  </div>
              
                  <p>
                    {editingAccountId === null
                      ? "관리 사원은 선택 항목이며, 계좌 상태는 사용으로 등록됩니다."
                      : "수정 시 잔액과 통화는 기존 값을 유지합니다."}
                  </p>
              
                  {formError && <p role="alert">{formError}</p>}
              
                  <button type="submit">
                    {saving ? "저장 중..." : "저장"}
                  </button>
              
                  <button
                    type="button"
                    onClick={closeRegistrationModal}
                  >
                    취소
                  </button>
                </fieldset>
              </form>
            )}
          />
        </div>
      )}

      {/* 4. 규격화된 PaginationTable 연동 */}
      <PaginationTable
        key={JSON.stringify(searchFilter)}
        title={accountTableTitle}
        th={accountHeaders}
        allData={tAccountData}
        itemsPerPage={5}
      />

      {selectedAccount && (
        <section>
          <h3>회사계좌 거래내역</h3>

          <p>
            {selectedAccount.bankName} / {selectedAccount.accountName}
          </p>
          <p>계좌번호: {selectedAccount.accountNumber}</p>
          <p>
            현재 잔액: {selectedAccount.balance.toLocaleString()}{" "}
            {selectedAccount.currency}
          </p>

          {paymentsLoading ? (
            <p>거래내역을 불러오는 중입니다.</p>
          ) : paymentsError ? (
            <p role="alert">{paymentsError}</p>
          ) : accountPayments.length === 0 ? (
            <p>이 계좌에 연결된 입금·출금 이력이 없습니다.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">처리 날짜</th>
                  <th scope="col">거래처</th>
                  <th scope="col">구분</th>
                  <th scope="col">결제수단</th>
                  <th scope="col">금액</th>
                  <th scope="col">상태</th>
                </tr>
              </thead>

              <tbody>
                {accountPayments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{payment.payment_date}</td>
                    <td>{payment.company_name || "-"}</td>
                    <td>{payment.payment_direction}</td>
                    <td>{payment.payment_method}</td>
                    <td>{Number(payment.amount).toLocaleString()}</td>
                    <td>{payment.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p>
            계좌 상태:{" "}
            {selectedAccount.status === "STOP"
              ? "사용 중지"
              : selectedAccount.status}
          </p>

          {accountStatusError && (
            <p role="alert">{accountStatusError}</p>
          )}

          <button
            type="button"
            disabled={
              accountStatusSaving ||
              !["사용", "ACTIVE", "STOP"].includes(selectedAccount.status)
            }
            onClick={() => handleAccountStatusChange(selectedAccount)}
          >
            {accountStatusSaving
              ? "변경 중..."
              : selectedAccount.status === "STOP"
                ? "사용 재개"
                : "사용 중지"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedAccountId(null)}
          >
            닫기
          </button>
        </section>
      )}

    </div>
  );
}

export default BankAccount;