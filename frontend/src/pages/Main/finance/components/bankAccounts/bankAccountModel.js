// 계좌 변환, 검색·원화 합계 및 상태 표시값을 계산합니다.
export function createBankAccountForm() {
  return {
    account_number: "",
    bank_name: "",
    account_name: "",
    account_type: "",
    balance: "0",
    currency: "KRW",
    employee_id: "",
  };
}
export function getBankAccountStatusLabel(status) {
  if (status === "ACTIVE") return "사용";
  if (status === "STOP") return "사용 중지";
  return status;
}
export function getBankAccountStatusTone(status) {
  if (status === "STOP" || status.includes("동결")) return "status-danger";
  return "status-success";
}
export function getNextBankAccountStatus(status) {
  if (["사용", "ACTIVE"].includes(status)) return "STOP";
  return "사용";
}
export function toBankAccount(account) {
  return {
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
    lastTransactionDate: account.last_transaction || "-",
  };
}
export function getBankAccountListView(accountList, searchFilter) {
  // 원화 기준 총 잔액 합산 (외화 제외)
  const totalKrwBalance = accountList
    .filter((acc) => acc.currency === "KRW")
    .reduce((sum, acc) => sum + acc.balance, 0);
  // 중복을 제거한 은행·용도 목록
  const bankOptions = [...new Set(accountList.map((acc) => acc.bankName).filter(Boolean))];
  const typeOptions = [
    ...new Set(accountList.map((acc) => acc.accountType).filter((type) => type && type !== "-")),
  ];

  // 조회 버튼 또는 Enter를 누르면 검색 조건을 적용합니다.

  // 적용된 조건에 맞는 계좌만 표시합니다.
  const filteredAccounts = accountList.filter((account) => {
    const { bank, type, keyword } = searchFilter;
    const searchText = keyword.toLowerCase();

    // 전체 은행이거나 선택한 은행인지 확인
    const bankMatches = bank === "ALL" || account.bankName === bank;

    // 전체 용도이거나 선택한 용도인지 확인
    const typeMatches = type === "ALL" || account.accountType === type;

    // 계좌명 또는 계좌번호에 검색어가 있는지 확인
    const nameMatches = account.accountName.toLowerCase().includes(searchText);
    const numberMatches = account.accountNumber.toLowerCase().includes(searchText);
    return bankMatches && typeMatches && (nameMatches || numberMatches);
  });

  // 목록 수정은 이 배열에서만 합니다.
  // width: 열 너비 / label: 제목 / field: 표시할 계좌 데이터 / render: 버튼·배지 등 별도 표시
  // 항목을 이동하거나 삭제하면 제목과 내용이 함께 변경됩니다.
  return {
    totalKrwBalance,
    bankOptions,
    typeOptions,
    filteredAccounts,
  };
}
export function getBankAccountStatusActionLabel(status, saving) {
  if (saving) return "변경 중...";
  if (status === "STOP") return "사용 재개";
  return "사용 중지";
}
