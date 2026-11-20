// 담당 화면: 지출·거래 관리
// 역할: 조회 조건·초기화·필터된 목록·달력 계산 연결을 담당합니다.
// 필터 상태와 초기화, 목록 계산 연결을 담당합니다.
import { useEffect, useState } from "react";
import { getItemListView, matchingRecords } from "../models/financeItemListModel";

export default function useItemFilters({ itemList, approvedDocuments, scope, today }) {
  // 1. 매입 / 매출 탭 필터 ('ALL' | 'SALES' | 'PURCHASE')
  const [activeTab, setActiveTab] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  let selectedTradeType = activeTab;
  if (scope?.unified) selectedTradeType = scope.tradeType || "ALL";

  // 2. 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");

  // 정산 상태 필터
  const [settlementFilter, setSettlementFilter] = useState("ALL");
  useEffect(() => {
    setActiveTab("ALL");
  }, [scope?.direction]);
  useEffect(() => {
    if (!scope?.unified) return;
    setActiveTab("ALL");
    setSearchTerm("");
    setSettlementFilter("ALL");
    setApprovalFilter("ALL");
    setOverdueOnly(false);
  }, [scope?.unified, scope?.month, scope?.filterReset]);
  function handleTradeTabChange(value) {
    if (value !== "ALL" && scope?.direction !== "전체") {
      let direction = "출금";
      if (value === "SALES") direction = "입금";
      scope?.onDirectionChange?.(direction);
    }
    setActiveTab(value);
  }
  const view = getItemListView({
    itemList,
    scope,
    selectedTradeType,
    searchTerm,
    settlementFilter,
    approvalFilter,
    approvedDocuments,
    overdueOnly,
    today,
  });
  // 화면에 전달할 상태와 동작
  return {
    ...view,
    activeTab,
    setActiveTab,
    approvalFilter,
    setApprovalFilter,
    overdueOnly,
    setOverdueOnly,
    selectedTradeType,
    searchTerm,
    setSearchTerm,
    settlementFilter,
    setSettlementFilter,
    handleTradeTabChange,
    matchingRecords,
  };
}
