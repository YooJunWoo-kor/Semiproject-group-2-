// 조회·월 선택·분류 필터와 화면 연결을 담당합니다.
import usePaymentClassification from "./usePaymentClassification";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLoginUser } from "../../../../../utils/authStorage";
import { getPaymentManagement } from "../../../../../utils/financeService";
import {
  currentMonth,
  getPaymentFilterGroups,
  mergePaymentManagementData,
  getExpenseGroups,
} from "./paymentManagementModel";

export default function usePaymentManagementController({
  embedded = false,
  onOpenApprovals,
  onOpenTrades,
  onBusyChange,
}) {
  const navigate = useNavigate();
  const user = getLoginUser();
  const permitted = user?.role === "MASTER" || Number(user?.department_id) === 1;
  const direction = "전체";
  const [tradeType, setTradeType] = useState("ALL");
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [month, setMonth] = useState(currentMonth);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [tradeRequest, setTradeRequest] = useState(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [filterReset, setFilterReset] = useState(0);
  const {
    selectedRow,
    classification,
    setClassification,
    password,
    setPassword,
    saving,
    saveError,
    classificationGroups,
    openDetail,
    closeDetail,
    handleClassification,
  } = usePaymentClassification({
    data,
    user,
    setRefresh,
  });
  const expenseGroups = getExpenseGroups(data);
  useEffect(() => {
    onBusyChange?.(saving || selectedRow !== null || workflowBusy || tradeBusy);
  }, [saving, selectedRow, workflowBusy, tradeBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  function openApprovals(options = {}) {
    if (onOpenApprovals)
      onOpenApprovals({
        ...options,
        expenseGroups: expenseGroups,
      });
    else setWorkflow(options);
  }
  function openTrades(options = {}) {
    if (embedded)
      setTradeRequest({
        ...options,
        requestId: Date.now(),
      });
    else if (onOpenTrades) onOpenTrades(options);
    else navigate("/main/finance/items");
  }
  useEffect(() => {
    if (!permitted || workflow) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    // 전체 화면은 기존 입금·출금 API의 같은 조회 월 결과를 함께 사용합니다.
    const request = Promise.all(
      ["출금", "입금"].map((value) =>
        getPaymentManagement({
          month,
          direction: value,
        }),
      ),
    ).then(([expense, income]) => mergePaymentManagementData(expense, income));
    request
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(getFinanceError(err, "결제 관리 정보를 불러오지 못했습니다."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [direction, month, refresh, permitted, workflow]);

  // 선택한 탭에 맞는 세부 항목 목록을 만듭니다.

  const filterGroups = getPaymentFilterGroups(data, tradeType);
  const categoryItems = filterGroups.flatMap((group) => group.items);
  // 선택이 없으면 분류 제한 없이 조회합니다. 처음 열 때 체크박스는 비워 둡니다.
  useEffect(() => {
    setSelectedCodes([]);
    setTradeType("ALL");
  }, [month]);
  const selectedItems = categoryItems.filter((item) => selectedCodes.includes(item.key));
  function closeWorkflow() {
    setWorkflow(null);
  }
  function openTradeRegistration() {
    openTrades({
      create: true,
      tradeType: "매입",
    });
  }
  function handleTradeTypeChange(value) {
    setTradeType(value);
    setSelectedCodes([]);
  }
  function handleMonthSubmit(event) {
    event.preventDefault();
    setMonth(monthInput);
    setRefresh((value) => value + 1);
  }
  function resetFilters() {
    const now = currentMonth();
    setMonthInput(now);
    setMonth(now);
    setSelectedCodes([]);
    setTradeType("ALL");
    setFilterReset((value) => value + 1);
    setRefresh((value) => value + 1);
  }
  function refreshData() {
    setRefresh((value) => value + 1);
  }
  function openSelectedApproval() {
    const documentId = Number(selectedRow.source_id);
    closeDetail();
    openApprovals({
      documentId,
    });
  }
  function openSelectedTrade() {
    const transactionId = Number(selectedRow.source_id);
    closeDetail();
    openTrades({
      transactionId,
    });
  }
  function handleOverviewGroupSelect(direction, keys, selected) {
    let nextTradeType = "PURCHASE";
    if (direction === "입금") nextTradeType = "SALES";
    setTradeType(nextTradeType);
    if (selected) {
      setSelectedCodes([]);
      return;
    }
    setSelectedCodes(keys);
  }
  return {
    permitted,
    direction,
    tradeType,
    monthInput,
    setMonthInput,
    month,
    refresh,
    data,
    loading,
    error,
    selectedCodes,
    setSelectedCodes,
    selectedRow,
    classification,
    setClassification,
    password,
    setPassword,
    saving,
    saveError,
    workflow,
    workflowBusy,
    setWorkflowBusy,
    tradeRequest,
    tradeBusy,
    setTradeBusy,
    filterReset,
    expenseGroups,
    filterGroups,
    selectedItems,
    classificationGroups,
    openDetail,
    closeDetail,
    handleClassification,
    closeWorkflow,
    openTradeRegistration,
    handleTradeTypeChange,
    handleMonthSubmit,
    resetFilters,
    refreshData,
    openSelectedApproval,
    openSelectedTrade,
    handleOverviewGroupSelect,
  };
}
