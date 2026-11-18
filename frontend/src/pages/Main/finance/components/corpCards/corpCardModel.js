// [MVC] 카드 검색·요약과 상태 표시 및 입력 기본값을 계산합니다.
export function createCorpCardForm() {
  return {
    card_name: "",
    department_id: "",
    employee_id: "",
    monthly_limit: "",
  };
}
export function getCorpCardStatusLabel(status) {
  if (status === "ACTIVE") return "사용";
  if (status === "STOP") return "사용 중지";
  return status;
}
export function getCorpCardStatusTone(status) {
  if (status === "STOP") return "status-danger";
  return "";
}
export function getNextCorpCardStatus(status) {
  if (["사용", "ACTIVE"].includes(status)) return "STOP";
  return "사용";
}
export function getCorpCardStatusActionLabel(card, savingId) {
  if (savingId === card.id) return "변경 중...";
  if (card.status === "STOP") return "사용 재개";
  return "사용 중지";
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
      card.cardName.toLowerCase().includes(keyword) || card.managerName.toLowerCase().includes(keyword);
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
