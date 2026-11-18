import useItemData from "./useItemData";
import useItemFilters from "./useItemFilters";
import usePayrollDeductions from "./usePayrollDeductions";
import usePayrollPayments from "./usePayrollPayments";
import useItemPayments from "./useItemPayments";
import useItemEditor from "./useItemEditor";
import { useEffect, useState } from "react";

// 공통 선택 상태와 기능별 Controller 연결을 담당합니다.
export default function useItemsController({
  embedded = false,
  initialCreate = false,
  initialTradeType = "매입",
  initialTransactionId = null,
  onBusyChange,
  compact = false,
  scope = null,
  tradeRequest = null,
  onDataChange,
  onClassify,
  categoryFilter = null,
  categorySummary = null,
}) {
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  // 3. 우측 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState("week"); // 'week' | 'month'

  // 4. 선택된 품목 ID
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [additionalBusy, setAdditionalBusy] = useState(false);
  const [payrollRefresh, setPayrollRefresh] = useState(0);
  const [deductionMonth, setDeductionMonth] = useState("");
  // 사용자 컴퓨터의 오늘 날짜를 YYYY-MM-DD 형식으로 만듭니다.
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  // [MVC 6단계] 목록 조회와 공통 계좌 데이터를 연결합니다.
  const {
    storedItemList,
    setItemList,
    approvedDocuments,
    setApprovedDocuments,
    approvalsLoading,
    approvalsError,
    setApprovalsError,
    additionalError,
    payrollLoading,
    payrollError,
    loading,
    error,
    paymentAccounts,
    accountsLoading,
    accountsError,
    refreshApprovalAttachments,
    itemList,
  } = useItemData({
    payrollRefresh,
    scope,
  });
  // [MVC 6단계] 필터와 합계 계산 결과를 연결합니다.
  const {
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
    scopeRecordSource,
    scopedList,
    filteredList,
    filteredTotal,
    totalSalesAmount,
    totalPurchaseAmount,
    operatingProfit,
    calendarEvents,
    matchingRecords,
  } = useItemFilters({
    itemList,
    approvedDocuments,
    scope,
    today,
  });
  // [MVC 5단계] 월 급여 상세와 지급 처리를 연결합니다.
  const {
    payrollRows,
    payrollDetailLoading,
    payrollDetailError,
    payrollPaymentSaving,
    payrollPaymentError,
    payrollPaymentNotice,
    payrollPayForm,
    setPayrollPayForm,
    payrollMonth,
    payrollMoneyKeys,
    payrollWon,
    payrollUnpaidRows,
    payrollNetPending,
    payrollCanPay,
    handlePayrollPayment,
  } = usePayrollPayments({
    itemList,
    onDataChange,
    payrollRefresh,
    selectedItemId,
    setPayrollRefresh,
  });
  // [MVC 5단계] 공제액 상세와 납부 처리를 연결합니다.
  const {
    deductionData,
    deductionLoading,
    deductionSaving,
    deductionError,
    deductionNotice,
    deductionForm,
    setDeductionForm,
    handleDeductionPayment,
  } = usePayrollDeductions({
    deductionMonth,
    onDataChange,
    payrollCanPay,
    payrollWon,
    setPayrollRefresh,
  });
  // 입금·출금 처리 대상 거래
  const [paymentTarget, setPaymentTarget] = useState(null);

  // 거래 편집·급여 화면에서도 사용하는 지급 처리 상태

  const [paymentSaving, setPaymentSaving] = useState(false);
  // 입금·출금 저장 후 이력을 다시 조회하는 데 사용합니다.
  const [paymentRefresh, setPaymentRefresh] = useState(0);

  // 정산 상태 필터

  const {
    formOpen,
    setFormOpen,
    saving,
    formError,
    partnerOptions,
    itemCategories,
    categoryError,
    itemForm,
    editingItemId,
    linkingApproval,
    openItemForm,
    openApprovedTradeForm,
    isExpenseRegistration,
    handleItemChange,
    handleItemSubmit,
    handleItemDelete,
    openEditItemForm,
    closeRegistrationModal,
  } = useItemEditor({
    approvedDocuments,
    attachmentBusy,
    initialCreate,
    initialTradeType,
    itemList,
    onDataChange,
    paymentSaving,
    selectedItemId,
    setActiveTab,
    setApprovalsError,
    setApprovedDocuments,
    setItemList,
    setPaymentRefresh,
    setPaymentTarget,
    setSearchTerm,
    setSelectedItemId,
    setSettlementFilter,
    today,
  });
  // [MVC 4단계] 입출금 입력과 이력 조회는 전용 훅에 맡깁니다.
  const {
    paymentForm,
    paymentError,
    paymentSummary,
    paymentLoading,
    paymentHistoryError,
    paymentCards,
    cardsLoading,
    cardsError,
    openPaymentForm,
    handlePaymentChange,
    handlePaymentSubmit,
    closePaymentModal,
  } = useItemPayments({
    approvedDocuments,
    attachmentBusy,
    isExpenseRegistration,
    itemList,
    linkingApproval,
    onDataChange,
    paymentRefresh,
    paymentSaving,
    paymentTarget,
    saving,
    selectedItemId,
    setFormOpen,
    setItemList,
    setPaymentRefresh,
    setPaymentSaving,
    setPaymentTarget,
  });
  // 입출금·급여·공제액 화면에서 함께 사용하는 회사계좌 목록

  const [handledRequestId, setHandledRequestId] = useState(null);
  useEffect(() => {
    if (!tradeRequest || handledRequestId === tradeRequest.requestId) return;
    if (tradeRequest.create) {
      setHandledRequestId(tradeRequest.requestId);
      openItemForm(tradeRequest.tradeType);
    } else if (tradeRequest.transactionId != null && !loading) {
      const item = storedItemList.find(
        (row) => Number(row.transactionId) === Number(tradeRequest.transactionId),
      );
      if (item) {
        setHandledRequestId(tradeRequest.requestId);
        setSelectedItemId(item.id);
      }
    }
  }, [tradeRequest, loading, storedItemList, handledRequestId]);
  const [initialTransactionOpened, setInitialTransactionOpened] = useState(false);
  useEffect(() => {
    onBusyChange?.(
      saving ||
        paymentSaving ||
        attachmentBusy ||
        payrollPaymentSaving ||
        additionalBusy ||
        deductionSaving ||
        Boolean(deductionMonth) ||
        formOpen ||
        paymentTarget !== null ||
        selectedItemId !== null,
    );
  }, [
    saving,
    paymentSaving,
    attachmentBusy,
    payrollPaymentSaving,
    additionalBusy,
    deductionSaving,
    deductionMonth,
    formOpen,
    paymentTarget,
    selectedItemId,
    onBusyChange,
  ]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {
    if (loading || initialTransactionOpened || initialTransactionId == null) return;
    const item = storedItemList.find((row) => Number(row.transactionId) === Number(initialTransactionId));
    if (item) {
      setInitialTransactionOpened(true);
      setSelectedItemId(item.id);
    }
  }, [loading, storedItemList, initialTransactionId, initialTransactionOpened]);
  // 선택한 ID와 일치하는 품목 정보를 찾습니다.
  const selectedItem = itemList.find((item) => item.id === selectedItemId);
  // 원본 결재와 거래로 연결된 문서 모두 같은 첨부를 조회합니다.
  function getAttachmentDocumentId() {
    if (selectedItem?.isApprovalDocument) {
      return selectedItem.sourceDocumentId;
    }
    if (selectedItem?.linkedSourceType === "draft") {
      return `draft-${selectedItem.linkedSourceId}`;
    }
    if (selectedItem?.linkedSourceType === "approval") {
      return selectedItem.linkedSourceId;
    }
    return null;
  }
  const attachmentDocumentId = getAttachmentDocumentId();
  const attachmentDocument = approvedDocuments.find(
    (document) => String(document.document_id) === String(attachmentDocumentId),
  );
  // 전표 상세와 입력 폼은 한 번에 하나씩 표시합니다.
  function openVoucher(itemId) {
    if (saving || paymentSaving || attachmentBusy || payrollPaymentSaving || deductionSaving) return;
    const item = itemList.find((row) => row.id === itemId);
    setDeductionMonth(item?.isPayrollDeduction ? item.date : "");
    setFormOpen(false);
    setPaymentTarget(null);
    setSelectedItemId(itemId);
  }
  function closeVoucher() {
    if (saving || paymentSaving || attachmentBusy || payrollPaymentSaving || deductionSaving) return;
    setDeductionMonth("");
    setSelectedItemId(null);
  }
  function handleAdditionalPayrollPaid() {
    setPayrollRefresh((value) => value + 1);
    onDataChange?.();
    closeVoucher();
  }
  return {
    onClassify,
    embedded,
    compact,
    scope,
    categoryFilter,
    categorySummary,
    activeTab,
    attachmentBusy,
    setAttachmentBusy,
    approvalFilter,
    setApprovalFilter,
    overdueOnly,
    setOverdueOnly,
    selectedTradeType,
    searchTerm,
    setSearchTerm,
    calendarType,
    setCalendarType,
    setSelectedItemId,
    approvedDocuments,
    approvalsLoading,
    approvalsError,
    additionalError,
    setAdditionalBusy,
    payrollLoading,
    payrollError,
    payrollRows,
    payrollDetailLoading,
    payrollDetailError,
    payrollPaymentSaving,
    payrollPaymentError,
    payrollPaymentNotice,
    payrollPayForm,
    setPayrollPayForm,
    deductionMonth,
    deductionData,
    deductionLoading,
    deductionSaving,
    deductionError,
    deductionNotice,
    deductionForm,
    setDeductionForm,
    loading,
    error,
    formOpen,
    saving,
    formError,
    partnerOptions,
    itemCategories,
    categoryError,
    itemForm,
    editingItemId,
    linkingApproval,
    paymentTarget,
    paymentForm,
    paymentSaving,
    paymentError,
    paymentSummary,
    paymentLoading,
    paymentHistoryError,
    settlementFilter,
    setSettlementFilter,
    paymentAccounts,
    accountsLoading,
    accountsError,
    today,
    matchingRecords,
    scopeRecordSource,
    scopedList,
    filteredList,
    filteredTotal,
    paymentCards,
    cardsLoading,
    cardsError,
    totalSalesAmount,
    totalPurchaseAmount,
    operatingProfit,
    calendarEvents,
    openItemForm,
    openApprovedTradeForm,
    isExpenseRegistration,
    handleItemChange,
    handleItemSubmit,
    handleItemDelete,
    selectedItem,
    attachmentDocumentId,
    attachmentDocument,
    payrollMonth,
    payrollMoneyKeys,
    payrollWon,
    payrollUnpaidRows,
    payrollNetPending,
    payrollCanPay,
    handlePayrollPayment,
    handleDeductionPayment,
    openEditItemForm,
    openPaymentForm,
    handlePaymentChange,
    handlePaymentSubmit,
    openVoucher,
    closeVoucher,
    closePaymentModal,
    closeRegistrationModal,
    handleTradeTabChange,
    handleAdditionalPayrollPaid,
    refreshApprovalAttachments,
  };
}
