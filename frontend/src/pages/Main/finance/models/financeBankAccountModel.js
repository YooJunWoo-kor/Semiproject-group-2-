// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 계좌 표시값·검색·원화 합계·입력값 변환·저장 후 목록 갱신을 담당합니다.
import {  toFinanceFormId,  toFinanceSelectedId,  findFinanceOption,  applyFinanceResourceSave,} from "../utils/financeDataUtils";

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
export { getFinanceResourceStatusLabel as getBankAccountStatusLabel } from "../utils/financeDataUtils";
export function getBankAccountStatusTone(status) {
  if (status === "STOP" || status.includes("동결")) return "status-danger";
  return "status-success";
}
export { getNextFinanceResourceStatus as getNextBankAccountStatus } from "../utils/financeDataUtils";
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
export { getFinanceResourceStatusActionLabel as getBankAccountStatusActionLabel } from "../utils/financeDataUtils";

// Model: 폼 변환과 저장 데이터 계산. API 호출과 React 상태는 사용하지 않습니다.
export function toBankAccountForm(account) {
  let accountType = account.accountType;
  if (accountType === "-") accountType = "";
  return {
    account_number: account.accountNumber,
    bank_name: account.bankName,
    account_name: account.accountName,
    account_type: accountType,
    balance: String(account.balance),
    currency: account.currency,
    employee_id: toFinanceFormId(account.managerId),
  };
}
export function getBankAccountUpdateData(form) {
  return {
    account_number: form.account_number,
    bank_name: form.bank_name,
    account_name: form.account_name,
    account_type: form.account_type,
    employee_id: form.employee_id,
  };
}
export function applyBankAccountSave(rows, form, savedId, isEditing, employees) {
  const employee = findFinanceOption(employees, "employee_id", form.employee_id);
  const managerId = toFinanceSelectedId(form.employee_id);
  let managerName = employee?.name || "미지정";
  if (isEditing) {
    const previous = rows.find((account) => account.id === savedId);
    if (!previous) return rows;
    managerName = "미지정";
    if (form.employee_id !== "") managerName = employee?.name || previous.managerName;
  }
  const saved = {
    id: savedId,
    accountNumber: form.account_number.trim(),
    bankName: form.bank_name.trim(),
    accountName: form.account_name.trim(),
    accountType: form.account_type.trim() || "-",
    managerId,
    managerName,
  };
  if (!isEditing)
    Object.assign(saved, {
      currency: form.currency,
      balance: Number(form.balance || 0),
      status: "사용",
      lastTransactionDate: "-",
    });

  return applyFinanceResourceSave(rows, saved, isEditing);
}
