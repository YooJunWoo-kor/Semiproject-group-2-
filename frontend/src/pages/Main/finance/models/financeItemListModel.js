// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 거래·승인 문서·급여 목록 통합, 검색·필터·합계·달력 계산을 담당합니다.
// 목록 변환·필터·합계·달력 계산만 담당하는 순수 함수입니다.
import {
  getSettlementLabel,
  getTradeApprovalStatus,
  isTradeOverdue,
  compareTradeNewest,
} from "./financeItemTradeRules";
import { toApprovedTradeRows, toPayrollPurchaseRows } from "../utils/financeDataUtils";

export function buildItemList({
  storedItemList,
  approvedDocuments,
  payrollSummaries,
  additionalPayrolls,
  scope,
}) {
  const deductionRecords = [...(scope?.scheduled || []), ...(scope?.entries || [])].filter(
    (row) => row.source_type === "payroll_deduction",
  );
  const payrollDeductionRows = [
    ...new Map(
      deductionRecords.map((row) => [
        String(row.source_id),
        {
          id: `payroll-deduction-${row.source_id}`,
          transactionId: null,
          isPayroll: true,
          isPayrollDeduction: true,
          type: "PURCHASE",
          date: String(row.source_id),
          dueDate: "",
          itemName: `${row.source_id} 급여 공제액`,
          customer: "급여 공제액",
          spec: "급여 공제액 · 납부 내역",
          quantity: null,
          unitPrice: null,
          supplyAmount: Number(row.amount),
          vat: 0,
          totalAmount: Number(row.amount),
          status: "납부대기",
          closingDay: null,
        },
      ]),
    ).values(),
  ];
  const payrollItems = toPayrollPurchaseRows(payrollSummaries);
  const additionalItems = additionalPayrolls.map((row) => ({
    id: `additional-payroll-${row.draft_id}`,
    isAdditionalPayroll: true,
    additional: row,
    transactionId: null,
    type: "PURCHASE",
    date: row.payment_date,
    dueDate: row.payment_date,
    itemName: row.title,
    customer: row.employee_name || `사원 ${row.employee_id}`,
    spec: `추가급여 · ${row.pay_month}`,
    quantity: null,
    unitPrice: null,
    supplyAmount: row.amount,
    vat: 0,
    totalAmount: row.amount,
    status: row.payment_status,
    approvalStatus: "APPROVED",
    linkedSourceType: "additional_payroll",
    linkedSourceId: row.draft_id,
  }));
  const itemList = [
    ...additionalItems,
    ...payrollDeductionRows,
    ...payrollItems,
    ...toApprovedTradeRows(
      approvedDocuments,
      payrollItems.map((row) => row.date),
    ),
    ...storedItemList,
  ].sort(compareTradeNewest);
  return itemList;
}
export function matchingRecords(item, rows) {
  return rows.filter(
    (row) =>
      (item.isPayroll &&
        row.source_type === (item.isPayrollDeduction ? "payroll_deduction" : "payroll") &&
        String(row.source_id) === String(item.date)) ||
      (row.source_type === "transaction" &&
        item.transactionId != null &&
        String(row.source_id) === String(item.transactionId)) ||
      (item.isApprovalDocument &&
        row.source_type === item.originType &&
        String(row.source_id) === String(item.originId)) ||
      (item.linkedSourceType &&
        row.source_type === item.linkedSourceType &&
        String(row.source_id) === String(item.linkedSourceId)),
  );
}
export function getItemListView({
  itemList,
  scope,
  selectedTradeType,
  searchTerm,
  settlementFilter,
  approvalFilter,
  approvedDocuments,
  overdueOnly,
  today,
}) {
  function getScopeRecordSource() {
    if (!scope) return [];

    if (scope.unified) return [...scope.entries, ...scope.scheduled];

    if (scope.view === "completed") return scope.entries;

    return scope.scheduled;
  }
  const scopeRecordSource = getScopeRecordSource();
  function categoryMatches(row, item) {
    if (!scope.unified)
      return (
        (scope.groupId === "all" || row.group_id === scope.groupId) &&
        scope.selectedCodes.includes(row.category_code)
      );
    // Unclassified is separated by payment direction so expense/income filters never collide.
    const direction = row.payment_direction || (item.type === "SALES" ? "입금" : "출금");
    return (
      scope.selectedCodes.length === 0 ||
      scope.selectedCodes.includes(`${direction}:${row.category_code}`)
    );
  }
  let scopedList = itemList;
  if (scope)
    scopedList = itemList
      .filter((item) => {
        if (scope.direction !== "전체" && (scope.direction === "입금") !== (item.type === "SALES"))
          return false;
        const rows = matchingRecords(item, scopeRecordSource);
        if (rows.length) return rows.some((row) => categoryMatches(row, item));
        if (item.isPayroll || item.isAdditionalPayroll) return false;
        if (item.isApprovalDocument) {
          // 미승인 문서는 지급 일정이 없으므로 작성 월을 기준으로 표시합니다.
          const date = item.createdAt;
          return (
            scope.view !== "completed" &&
            String(date || "").slice(0, 7) === scope.month &&
            categoryMatches(
              {
                category_code: "unclassified",
                group_id: "unclassified",
              },
              item,
            )
          );
        }
        // Completed rows come from actual payments. Outstanding unclassified drafts/transactions may not yet have payment records.
        // [완료 거래 표시 수정] 통합 목록에서는 완료 거래도 거래일/마감일 기준으로 유지합니다.
        if (
          !scope.unified &&
          (scope.view === "completed" || getSettlementLabel(item.status) === "완료")
        )
          return false;
        const date = item.dueDate || (item.date !== "미등록" ? item.date : item.createdAt);
        return (
          String(date || "").slice(0, 7) === scope.month &&
          categoryMatches(
            {
              category_code: "unclassified",
              group_id: "unclassified",
            },
            item,
          )
        );
      })
      .map((item) => {
        if (!item.isPayroll) return item;
        const records = matchingRecords(item, scopeRecordSource);
        const completed = matchingRecords(item, scope.entries);
        const scheduled = matchingRecords(item, scope.scheduled);
        function getStatus() {
          if (item.isPayrollDeduction) {
            if (scheduled.length) {
              if (completed.length) return "일부 납부";

              return "납부대기";
            }
            return "납부완료";
          }
          if (scheduled.length) {
            if (completed.length) return "일부 지급";

            return "지급대기";
          }
          return "지급완료";
        }
        const status = getStatus();
        const updatedItem = {
          ...item,
          totalAmount: records.reduce((sum, row) => sum + Number(row.amount), 0),
          spec: item.spec,
        };
        if (item.isPayrollDeduction) updatedItem.spec = "급여 공제액 · 납부 내역";
        else if (scope.view === "completed") updatedItem.spec = "급여 실지급 내역 · 계좌이체";

        if (scope.unified) updatedItem.status = status;
        else if (item.isPayrollDeduction) {
          updatedItem.status = "납부대기";
          if (scope.view === "completed") updatedItem.status = "납부완료";
        }
        return updatedItem;
      });

  const filteredList = scopedList.filter((item) => {
    const matchesTab = selectedTradeType === "ALL" || item.type === selectedTradeType;
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      item.itemName.toLowerCase().includes(keyword) ||
      item.customer.toLowerCase().includes(keyword);
    const matchesSettlement =
      settlementFilter === "ALL" || getSettlementLabel(item.status) === settlementFilter;
    const matchesApproval =
      approvalFilter === "ALL" ||
      getTradeApprovalStatus(item, approvedDocuments) === approvalFilter;
    return (
      matchesTab &&
      matchesSearch &&
      matchesSettlement &&
      matchesApproval &&
      (!overdueOnly || isTradeOverdue(item, today))
    );
  });
  const filteredTotal =
    filteredList.reduce((sum, item) => sum + Math.round(Number(item.totalAmount || 0) * 100), 0) /
    100;

  // 상단 요약 집계 연산
  const totalSalesAmount = itemList
    .filter((item) => item.type === "SALES")
    .reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPurchaseAmount = itemList
    .filter((item) => item.type === "PURCHASE")
    .reduce((sum, item) => sum + item.totalAmount, 0);
  const operatingProfit = totalSalesAmount - totalPurchaseAmount;

  // 우측 달력용 이벤트 데이터
  const calendarEvents = itemList
    .filter((item) => item.dueDate)
    .map((item) => ({
      id: item.id,
      title: `[${item.type === "SALES" ? "입금" : "출금"}] ${item.customer}`,
      start: item.dueDate,
      end: item.dueDate,
      typeId: item.type === "SALES" ? 0 : 2,
    }));
  return {
    scopeRecordSource,
    scopedList,
    filteredList,
    filteredTotal,
    totalSalesAmount,
    totalPurchaseAmount,
    operatingProfit,
    calendarEvents,
  };
}
export function toStoredItem(item) {
  return {
    id: item.item_id,
    categoryCode: item.category_code || "unclassified",
    transactionId: item.transaction_id,
    linkedSourceType: item.linked_source_type || null,
    linkedSourceId: item.linked_source_id || null,
    approvalStatus: item.approval_status || null,
    partnerId: item.partner_id,
    type: item.trade_type === "매출" ? "SALES" : "PURCHASE",
    date: item.trade_date,
    itemName: item.item_name || "-",
    spec: item.standard || "-",
    customer: item.company_name || "-",
    unitPrice: Number(item.unit_price),
    quantity: Number(item.quantity),
    supplyAmount: Number(item.supply_price),
    vat: Number(item.vat),
    totalAmount: Number(item.total_amount),
    status: item.settlement_status || "-",
    closingDay: item.closing_day,
    dueDate: item.due_date || "",
  };
}
