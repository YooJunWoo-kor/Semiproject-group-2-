// 담당 화면: 자금관리 → 회사계좌
// 역할: 계좌 검색·목록·등록·상세·이력을 연결합니다.
// 회사계좌 목록·등록·상세·거래 이력 화면을 연결합니다.
import React from "react";
import useBankAccountsController from "../controllers/useBankAccountsController";
import createBankAccountTableData from "../components/bankAccounts/createBankAccountTableData";
import BankAccountFormModal from "../components/bankAccounts/BankAccountFormModal";
import BankAccountDetailModal from "../components/bankAccounts/BankAccountDetailModal";
import { FinanceSearchForm } from "../components/ui/FinanceDetailDisplay";
import "../styles/Finance.css";
import FinanceResourceTable from "../components/ui/FinanceResourceTable";
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";

export default function BankAccount(props) {
  // DB에서 조회한 회사계좌 목록
  const {
    embedded,
    accountList,
    loading,
    error,
    bankFilter,
    setBankFilter,
    typeFilter,
    setTypeFilter,
    searchKeyword,
    setSearchKeyword,
    searchFilter,
    accountView,
    formOpen,
    accountPayments,
    paymentsLoading,
    paymentsError,
    saving,
    formError,
    accountForm,
    editingAccountId,
    employeeOptions,
    employeesLoading,
    employeesError,
    accountStatusSaving,
    accountStatusError,
    totalKrwBalance,
    bankOptions,
    typeOptions,
    handleAccountSearch,
    filteredAccounts,
    selectedAccount,
    openAccountForm,
    handleAccountChange,
    handleAccountSubmit,
    openEditAccountForm,
    handleAccountStatusChange,
    openAccountDetail,
    openAccountHistory,
    closeAccountHistory,
    closeRegistrationModal,
  } = useBankAccountsController(props);

  // 테이블 규격 정의
  const accountTableTitle = "회사 계좌 목록 현황";

  // 중복을 제거한 은행·용도 목록
  const { accountColumns, accountHeaders, tAccountData } = createBankAccountTableData({
    accountStatusSaving,
    filteredAccounts,
    openAccountDetail,
    openAccountHistory,
    openEditAccountForm,
    saving,
  });
  return (
    <div
      className={`border-container finance-accounts finance-resource${embedded ? " finance-resource-embedded" : ""}`}
    >
      {/* 1. 헤더 & 액션 버튼 영역 */}
      <header className="dashboard-header finance-resource-header">
        {!embedded && <span className="subtitle">회사 계좌 관리</span>}
        <div className="dashboard-top">
          <button type="button" className="register-btn" disabled={saving || accountStatusSaving} onClick={openAccountForm} >
            + 계좌 등록
          </button>
        </div>
      </header>

      {!embedded && <hr />}

      {!embedded && (
        <>
          {/* 2. 전사 잔액 요약 영역 (KPI 카드 구역) */}
          <section className="finance-account-summary">
            <h3>자금 현황 요약</h3>
            <p>
              <strong>등록 계좌 수:</strong> {accountList.length}개 |{" "}
              <strong>원화 계좌 총 잔액:</strong> {totalKrwBalance.toLocaleString()}원
            </p>
          </section>

          <hr />
        </>
      )}

      {/* 3. 검색 및 필터 구역 */}
      {/* 검색 및 필터 */}
      <section className="finance-resource-filters">
        <FinanceSearchForm
          className="finance-card-search finance-resource-search"
          onSubmit={handleAccountSearch}
          filters={[
            {
              id: "bankFilter",
              label: "은행 구분: ",
              value: bankFilter,
              onChange: setBankFilter,
              options: [
                {
                  value: "ALL",
                  label: "전체 은행",
                },
                ...bankOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ],
            },
          ]}
          keyword={{
            id: "account-search-keyword",
            placeholder: "계좌명 또는 계좌번호 검색",
            value: searchKeyword,
            onChange: setSearchKeyword,
          }}
        />
      </section>

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
        <BankAccountFormModal
          accountForm={accountForm}
          closeRegistrationModal={closeRegistrationModal}
          editingAccountId={editingAccountId}
          employeeOptions={employeeOptions}
          employeesError={employeesError}
          employeesLoading={employeesLoading}
          formError={formError}
          handleAccountChange={handleAccountChange}
          handleAccountSubmit={handleAccountSubmit}
          saving={saving}
        />
      )}

      {/* 4. 규격화된 PaginationTable 연동 */}
      <FinanceResourceTable
        key={JSON.stringify(searchFilter)}
        columns={accountColumns}
        title={accountTableTitle}
        th={accountHeaders}
        allData={tAccountData}
        itemsPerPage={5}
      />

      {selectedAccount && !formOpen && (
        <BankAccountDetailModal
          accountPayments={accountPayments}
          accountStatusError={accountStatusError}
          accountStatusSaving={accountStatusSaving}
          accountView={accountView}
          closeAccountHistory={closeAccountHistory}
          handleAccountStatusChange={handleAccountStatusChange}
          openAccountHistory={openAccountHistory}
          openEditAccountForm={openEditAccountForm}
          paymentsError={paymentsError}
          paymentsLoading={paymentsLoading}
          saving={saving}
          selectedAccount={selectedAccount}
        />
      )}
    </div>
  );
}
