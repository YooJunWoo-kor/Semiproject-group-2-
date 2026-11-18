// 입출금 응답 병합, 분류 목록 및 표시값 계산을 담당합니다.
export const won = (value) =>
  `${Number(value || 0).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}원`;
export function currentMonth() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}
export function total(rows) {
  return rows.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100;
}
// 선택한 탭에 맞는 세부 항목 목록을 만듭니다.
export function getPaymentFilterGroups(data, tradeType) {
  if (!data) return [];
  const groups = [];
  if (tradeType !== "SALES") {
    data.overview.expense.groups.forEach((group) => {
      groups.push({
        ...group,
        direction: "출금",
        heading: `지출 · ${group.label}`,
      });
    });
  }
  if (tradeType !== "PURCHASE") {
    data.overview.income.groups.forEach((group) => {
      groups.push({
        ...group,
        direction: "입금",
        heading: `수입 · ${group.label}`,
      });
    });
  }
  return groups.map((group) => ({
    ...group,
    key: `${group.direction}:${group.id}`,
    items: group.items.map((item) => ({
      ...item,
      key: `${group.direction}:${item.code}`,
    })),
  }));
}
export function mergePaymentManagementData(expense, income) {
  return {
    range: expense.range,
    entries: [
      ...expense.entries.map((row) => ({
        ...row,
        payment_direction: "출금",
        record_view: "completed",
      })),
      ...income.entries.map((row) => ({
        ...row,
        payment_direction: "입금",
        record_view: "completed",
      })),
    ],
    scheduled: [
      ...expense.scheduled.map((row) => ({
        ...row,
        payment_direction: "출금",
        record_view: "scheduled",
      })),
      ...income.scheduled.map((row) => ({
        ...row,
        payment_direction: "입금",
        record_view: "scheduled",
      })),
    ],
    overview: {
      expense,
      income,
    },
  };
}
export function getClassificationGroups(data, selectedRow) {
  if (!data) return [];
  if (selectedRow?.payment_direction === "입금") return data.overview.income.groups;
  return data.overview.expense.groups;
}
export function getExpenseGroups(data) {
  if (!data) return [];
  return data.overview.expense.groups.filter((group) => group.id !== "unclassified");
}
export function getCategoryDropdownLabel(selected, allSelected) {
  if (selected.length === 0) return "세부 항목 선택";
  if (allSelected) return "전체 항목";
  if (selected.length > 1) return selected[0].label + " 외 " + (selected.length - 1) + "개";
  return selected[0].label;
}
export function getLinkedSourceLabel(row) {
  if (row.source_type === "approval") return "결재 문서";
  if (row.source_type === "transaction") return "매입·매출 거래";
  return "입출금";
}
export function getClassificationDetailRows(selectedRow) {
  let recordView = "입출금 예정";
  if (selectedRow.record_view === "completed") recordView = "완료";
  return [
    ["기준일", selectedRow.payment_date],
    ["금액", won(selectedRow.amount)],
    ["내역 구분", recordView],
    ["결제수단", selectedRow.payment_method || "-"],
    ["현재 분류", `${selectedRow.group_label} / ${selectedRow.category_label}`],
    ["연결 번호", `${getLinkedSourceLabel(selectedRow)} #${selectedRow.source_id}`],
  ].map((content) => ({
    content,
  }));
}
