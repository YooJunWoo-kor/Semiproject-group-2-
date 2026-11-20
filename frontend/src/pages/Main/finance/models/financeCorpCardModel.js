// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 카드 상태 표시·검색·요약·입력 검증·저장 후 목록 갱신을 담당합니다.
import { getFinanceResourceStatusActionLabel } from "../utils/financeDataUtils";
import { toFinanceFormId, toFinanceSelectedId, findFinanceOption, applyFinanceResourceSave, } from "../utils/financeDataUtils";

// 카드 검색·요약과 상태 표시 및 입력 기본값을 계산합니다.
export function createCorpCardForm() {
  return {
    card_name: "",
    department_id: "",
    employee_id: "",
    monthly_limit: "",
  };
}
export { getFinanceResourceStatusLabel as getCorpCardStatusLabel } from "../utils/financeDataUtils";
export function getCorpCardStatusTone(status) {
  if (status === "사용" || status === "ACTIVE") return "status-success";
  if (status === "STOP") return "status-danger";
  return "";
}
export { getNextFinanceResourceStatus as getNextCorpCardStatus } from "../utils/financeDataUtils";
export function getCorpCardStatusActionLabel(card, savingId) {
  return getFinanceResourceStatusActionLabel(card.status, savingId === card.id);
}
export function getCorpCardListView(cardList, searchFilter) {
  // DB 목록에 있는 부서명으로 선택 항목을 만듭니다.
  const departmentOptions = [...new Set(cardList.map((card) => card.department))];

  // 검색 조건에 맞는 카드만 표시합니다.
  const filteredCards = cardList.filter((card) => {
    const matchesDepartment =
      searchFilter.department === "ALL" || card.department === searchFilter.department;
    const keyword = searchFilter.keyword.trim().toLowerCase();
    const matchesKeyword =
      card.cardName.toLowerCase().includes(keyword) ||
      card.managerName.toLowerCase().includes(keyword);
    return matchesDepartment && matchesKeyword;
  });
  return {
    departmentOptions,
    filteredCards,
  };
}
export function getCorpCardSummary(cardList, loading, loadError) {
  return {
    loading,
    error: loadError,
    count: cardList.length,
    usage: cardList.reduce((sum, card) => sum + card.currentUsage, 0),
    remaining: cardList
      .filter((card) => ["사용", "ACTIVE"].includes(card.status))
      .reduce((sum, card) => sum + card.remainingLimit, 0),
  };
}

// Model: 카드 입력 검증과 저장 후 표시 데이터 계산.
export function toCorpCardForm(card) {
  return {
    card_name: card.cardName,
    department_id: toFinanceFormId(card.departmentId),
    employee_id: toFinanceFormId(card.managerId),
    monthly_limit: String(card.monthlyLimit),
  };
}
export function validateCorpCardForm(form, isEditing) {
  if (form.card_name.trim() === "" || form.card_name.trim().length > 50)
    return "카드명은 1~50자로 입력해 주세요.";

  if (!isEditing) {
    const monthlyLimit = Number(form.monthly_limit);
    if (form.monthly_limit.trim() === "" || !Number.isSafeInteger(monthlyLimit) || monthlyLimit < 0)
      return "월 한도는 0 이상의 정수로 입력해 주세요.";
  }
  return "";
}
export function getCorpCardUpdateData(form) {
  return {
    card_name: form.card_name.trim(),
    department_id: form.department_id,
    employee_id: form.employee_id,
  };
}
export function applyCorpCardSave(rows, form, savedId, isEditing, departments, employees) {
  const department = findFinanceOption(departments, "department_id", form.department_id);
  const employee = findFinanceOption(employees, "employee_id", form.employee_id);
  const saved = {
    id: savedId,
    cardName: form.card_name.trim(),
    departmentId: toFinanceSelectedId(form.department_id),
    department: department?.department_name || "미지정",
    managerId: toFinanceSelectedId(form.employee_id),
    managerName: employee?.name || "미지정",
  };
  if (!isEditing) {
    const monthlyLimit = Number(form.monthly_limit);
    Object.assign(saved, {
      currentUsage: 0,
      monthlyLimit,
      remainingLimit: monthlyLimit,
      status: "사용",
    });
  }
  return applyFinanceResourceSave(rows, saved, isEditing);
}
