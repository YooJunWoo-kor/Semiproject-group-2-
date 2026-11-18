// 계좌 조회·검색·선택·상태 변경과 공통 이력을 연결합니다.
import useBankAccountEditor from "./useBankAccountEditor";
import { useFinanceHistory } from "../FinanceFunds";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import {
  getBankAccounts,
  getBankAccountPayments,
  updateBankAccountStatus,
} from "../../../../../utils/financeService";
import { toBankAccount, getBankAccountListView, getNextBankAccountStatus } from "./bankAccountModel";

export default function useBankAccountsController({ embedded = false, onSummaryChange, onBusyChange }) {
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
    keyword: "",
  });

  // 거래내역을 확인할 계좌
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountView, setAccountView] = useState("detail");
  // 회사계좌 상태 변경 진행 여부와 오류
  const [accountStatusSaving, setAccountStatusSaving] = useState(false);
  const [accountStatusError, setAccountStatusError] = useState("");
  const {
    formOpen,
    setFormOpen,
    saving,
    formError,
    accountForm,
    editingAccountId,
    employeeOptions,
    employeesLoading,
    employeesError,
    openAccountForm,
    handleAccountChange,
    handleAccountSubmit,
    openEditAccountForm,
    closeRegistrationModal,
  } = useBankAccountEditor({
    accountStatusSaving,
    selectedAccountId,
    setAccountList,
    setAccountView,
    setBankFilter,
    setSearchFilter,
    setSearchKeyword,
    setSelectedAccountId,
    setTypeFilter,
  });
  // [공통화] 선택 이력 조회는 계좌·카드 공통 훅을 사용합니다.
  const {
    payments: accountPayments,
    loading: paymentsLoading,
    error: paymentsError,
  } = useFinanceHistory(
    getBankAccountPayments,
    accountView === "history" && !formOpen ? selectedAccountId : null,
    "계좌 거래내역을 불러오지 못했습니다.",
  );
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getBankAccounts();

        // DB 컬럼명을 화면에서 사용하는 이름으로 변환합니다.
        const accounts = data.map(toBankAccount);
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

  // 원화 기준 총 잔액 합산 (외화 제외)
  const { totalKrwBalance, bankOptions, typeOptions, filteredAccounts } = getBankAccountListView(
    accountList,
    searchFilter,
  );
  useEffect(() => {
    onSummaryChange?.({
      loading,
      error,
      count: accountList.length,
      balance: totalKrwBalance,
    });
  }, [accountList, loading, error, totalKrwBalance, onSummaryChange]);
  const interactionBusy = formOpen || selectedAccountId !== null || saving || accountStatusSaving;
  useEffect(() => {
    onBusyChange?.(interactionBusy);
  }, [interactionBusy, onBusyChange]);

  // 조회 버튼 또는 Enter를 누르면 검색 조건을 적용합니다.
  function handleAccountSearch(e) {
    e.preventDefault();
    setSearchFilter({
      bank: bankFilter,
      type: typeFilter,
      keyword: searchKeyword.trim(),
    });
  }

  // 선택한 계좌의 정보
  const selectedAccount = accountList.find((acc) => acc.id === selectedAccountId);

  // 선택한 회사계좌의 사용 상태를 변경합니다.
  async function handleAccountStatusChange(account) {
    if (saving || accountStatusSaving) return;
    const nextStatus = getNextBankAccountStatus(account.status);
    setAccountStatusSaving(true);
    setAccountStatusError("");
    try {
      const result = await updateBankAccountStatus(account.id, nextStatus);

      // 선택한 계좌의 상태만 변경합니다.
      setAccountList((previous) =>
        previous.map((item) => {
          if (item.id === account.id) return { ...item, status: result.account_status };
          return item;
        }),
      );
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

  return {
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
  };
}
