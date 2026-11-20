// 담당 화면: 결재·이력 / 승인 지급
// 역할: 결재 목록 조회·검색·문서 선택 및 기안/승인 컨트롤러 연결을 담당합니다.
// 공통 문서 선택, 목록 조회 및 기능별 Controller 연결을 담당합니다.
import { getApprovalListView, toApproval } from "../models/financeApprovalModel";
import useApprovalDraft from "./useApprovalDraft";
import useApprovalDecision from "./useApprovalDecision";
import { getFinanceError } from "../utils/financeDataUtils";
import { useEffect, useState } from "react";
import { getApprovals } from "../../../../utils/financeService";
import { getLoginUser } from "../../../../utils/authStorage";

export default function useApprovalsController({
  embedded = false,
  allowCreate = true,
  initialDocumentId = null,
  initialDraftOpen = false,
  expenseGroups = [],
  onBusyChange,
}) {
  const loginUser = getLoginUser();
  // 화면 상태
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [approvalModalElement, setApprovalModalElement] = useState(null);
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  // DB에서 불러온 결재 문서
  const [storedApprovalList, setApprovalList] = useState([]);
  // 서버에서 조회한 결재 문서만 표시합니다.
  const approvalList = [...storedApprovalList];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 입력 중인 검색 조건
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // 검색 버튼을 눌렀을 때 적용할 조건
  const [searchFilter, setSearchFilter] = useState({
    status: "ALL",
    department: "ALL",
  });

  // 상세보기에서 선택한 문서 ID
  const [selectedApprovalId, setSelectedApprovalId] = useState(initialDocumentId);

  // 선택한 문서의 정보를 찾습니다.
  const selectedApproval = approvalList.find((item) => item.id === selectedApprovalId);
  const {
    decisionOpinion,
    setDecisionOpinion,
    decisionPassword,
    setDecisionPassword,
    decisionSaving,
    decisionError,
    decisionMessage,
    approvalSteps,
    stepsLoading,
    stepsError,
    canDecide,
    handleDecision,
  } = useApprovalDecision({
    attachmentSaving,
    loginUser,
    paymentBusy,
    selectedApproval,
    selectedApprovalId,
    setApprovalList,
    setError,
    setPaymentFormOpen,
  });
  const {
    draftOpen,
    setDraftOpen,
    draftSaving,
    draftError,
    draftForm,
    draftEmployees,
    employeesLoading,
    employeesError,
    closeDraftForm,
    openDraftForm,
    handleDraftChange,
    handleDraftSubmit,
  } = useApprovalDraft({
    initialDraftOpen,
    setApprovalList,
    setDepartmentFilter,
    setError,
    setSearchFilter,
    setSelectedApprovalId,
    setStatusFilter,
  });
  useEffect(() => {
    onBusyChange?.(
      draftSaving ||
        decisionSaving ||
        attachmentSaving ||
        paymentBusy ||
        (embedded && (draftOpen || selectedApprovalId !== null)),
    );
  }, [
    draftSaving,
    decisionSaving,
    attachmentSaving,
    paymentBusy,
    embedded,
    draftOpen,
    selectedApprovalId,
    onBusyChange,
  ]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // 화면이 처음 열릴 때 결재 문서를 조회합니다.
  useEffect(() => {
    let cancelled = false;
    async function loadApprovals() {
      try {
        const data = await getApprovals();

        // DB 컬럼명을 화면에서 사용할 이름으로 바꿉니다.
        const approvals = data.map(toApproval);
        if (!cancelled) setApprovalList(approvals);
      } catch (err) {
        if (!cancelled) setError(getFinanceError(err, "결재 문서 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadApprovals();
    return () => {
      cancelled = true;
    };
  }, []);
  const { departmentOptions, filteredApprovals, pendingCount, approvedAmount, rejectedCount } =
    getApprovalListView(approvalList, searchFilter);
  function handleSearch(e) {
    e.preventDefault();
    setSearchFilter({
      status: statusFilter,
      department: departmentFilter,
    });
  }
  const canAttach =
    selectedApproval?.status === "대기" &&
    Number(loginUser?.employee_id) > 0 &&
    Number(selectedApproval.employeeId) === Number(loginUser?.employee_id);
  function handlePaymentBusyChange(value) {
    setPaymentBusy(value);
  }
  async function handlePaymentSaved() {
    try {
      const data = await getApprovals();
      setApprovalList(data.map(toApproval));
      setError("");
    } catch {
      setError("지급은 등록되었지만 문서 목록 재조회에 실패했습니다. 새로고침해 확인해 주세요.");
    }
  }
  function openApprovalDetail(documentId) {
    if (decisionSaving || attachmentSaving || paymentBusy || draftSaving) return;
    setDraftOpen(false);
    setSelectedApprovalId(documentId);
  }
  function closeApprovalDetail() {
    if (decisionSaving || attachmentSaving || paymentBusy) return;
    if (paymentFormOpen) {
      setPaymentFormOpen(false);
      return;
    }
    setSelectedApprovalId(null);
  }

  // 문서 상세와 지급 입력을 전환하면 모달의 맨 위로 돌아갑니다.
  useEffect(() => {
    const dialog = approvalModalElement?.querySelector(".modal-boder");
    if (dialog) dialog.scrollTop = 0;
  }, [paymentFormOpen, selectedApprovalId, approvalModalElement]);
  async function refreshApprovalAttachments() {
    const data = await getApprovals();
    setApprovalList(data.map(toApproval));
  }
  // 화면에 전달할 상태와 동작
  return {
    embedded,
    allowCreate,
    expenseGroups,
    loginUser,
    paymentBusy,
    paymentFormOpen,
    setPaymentFormOpen,
    setApprovalModalElement,
    decisionOpinion,
    setDecisionOpinion,
    decisionPassword,
    setDecisionPassword,
    decisionSaving,
    decisionError,
    decisionMessage,
    attachmentSaving,
    setAttachmentSaving,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    searchFilter,
    approvalSteps,
    stepsLoading,
    stepsError,
    draftOpen,
    draftSaving,
    draftError,
    draftForm,
    draftEmployees,
    employeesLoading,
    employeesError,
    departmentOptions,
    filteredApprovals,
    handleSearch,
    pendingCount,
    approvedAmount,
    rejectedCount,
    selectedApproval,
    canDecide,
    handleDecision,
    canAttach,
    handlePaymentBusyChange,
    handlePaymentSaved,
    openApprovalDetail,
    closeApprovalDetail,
    closeDraftForm,
    openDraftForm,
    handleDraftChange,
    handleDraftSubmit,
    refreshApprovalAttachments,
  };
}
