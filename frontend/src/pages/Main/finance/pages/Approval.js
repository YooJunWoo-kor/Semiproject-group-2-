import React, { useEffect, useRef, useState } from "react";
import PaginationTable from "../../../../components/PaginationTable";
import { getApprovals, getApprovalSteps, getFinanceEmployees, createApproval, decideApproval, uploadApprovalAttachment, getApprovalAttachments, downloadApprovalAttachment } from "../../../../utils/financeService";
import { getLoginUser } from "../../../../utils/authStorage";
import ModalBase from "../../../../components/ModalBase";
import '../components/Finance.css';
import ApprovalPayments from "../components/ApprovalPayments";
import { ENABLE_DRAFT_MOCK, getApprovedMockDrafts, isMockDraftId } from "../mock/approvedDrafts";

// DB 응답을 화면에 표시할 이름으로 변환합니다.
function toApproval(item) {
  return {
    id: item.document_id,
    isMockDraft: item.is_mock_draft === true,
    isSourceDraft: item.source_type === "draft",
    isLinkedTrade: Boolean(item.linked_transaction_id),
    sourceDraftId: item.source_draft_id ?? null,
    employeeId: item.employee_id,
    department: item.department_name || "미지정",
    requester: item.requester_name || "미지정",
    title: item.title,
    content: item.content || "",
    amount: item.amount == null ? null : Number(item.amount),
    paymentMethod: item.payment_methods || "미등록",
    deadline: item.due_date || "-",
    attachmentCount: Number(item.attachment_count ?? 0),
    status: item.approval_status || "미지정",
    documentType: item.document_type || "-",
    createdAt: item.created_at || "-"

  };
}

function Approval({ embedded = false, allowCreate = true, initialDocumentId = null, initialDraftOpen = false, expenseGroups = [], onBusyChange }) {
  const loginUser = getLoginUser();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const paymentBusyRef = useRef(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const approvalModalRef = useRef(null);
  const [decisionOpinion, setDecisionOpinion] = useState("");
  const [decisionPassword, setDecisionPassword] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [stepsRefresh, setStepsRefresh] = useState(0);
  const decisionLock = useRef(false);

  // 증빙파일 첨부 상태
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPassword, setAttachmentPassword] = useState("");
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMessage, setAttachmentMessage] = useState("");
  const attachmentInputRef = useRef(null);
  const attachmentLock = useRef(false);
  const [attachmentList, setAttachmentList] = useState([]);
  const [attachmentListLoading, setAttachmentListLoading] = useState(false);
  const [attachmentListError, setAttachmentListError] = useState("");
  const [attachmentListRefresh, setAttachmentListRefresh] = useState(0);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const downloadLock = useRef(false);

  // DB에서 불러온 결재 문서
  const [storedApprovalList, setApprovalList] = useState([]);
  // 실제 목록을 다시 조회해도 더미는 원본 기안서 ID별로 한 번만 표시합니다.
  const approvalList = [...getApprovedMockDrafts().map(toApproval), ...storedApprovalList];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 입력 중인 검색 조건
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // 검색 버튼을 눌렀을 때 적용할 조건
  const [searchFilter, setSearchFilter] = useState({
    status: "ALL",
    department: "ALL"
  });

  // 상세보기에서 선택한 문서 ID
  const [selectedApprovalId, setSelectedApprovalId] = useState(initialDocumentId);

  // 선택한 문서의 결재 처리 이력
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState("");

  // 기안 등록폼
  const [draftOpen, setDraftOpen] = useState(initialDraftOpen);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState("");

  const [draftForm, setDraftForm] = useState({
    employee_id: "",
    approver_id: "",
    title: "",
    content: "",
    amount: "",
    due_date: "",
    document_type: "비용",
    category_code: ""
  });

  // 작성자와 결재자로 선택할 사원 목록
  const [draftEmployees, setDraftEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");

  useEffect(() => {
    onBusyChange?.(draftSaving || decisionSaving || attachmentSaving || downloadingFileId !== null || paymentBusy || (embedded && (draftOpen || selectedApprovalId !== null)));
  }, [draftSaving, decisionSaving, attachmentSaving, downloadingFileId, paymentBusy, embedded, draftOpen, selectedApprovalId, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // 화면이 처음 열릴 때 결재 문서를 조회합니다.
  useEffect(() => {
    let cancelled = false;

    async function loadApprovals() {
      try {
        const data = await getApprovals();

        // DB 컬럼명을 화면에서 사용할 이름으로 바꿉니다.
        const approvals = data.map(toApproval);

        if (!cancelled) {
          setApprovalList(approvals);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            "결재 문서 목록을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadApprovals();

    return () => {
      cancelled = true;
    };
  }, []);

  // 기안 입력폼을 열면 사원 목록을 조회합니다.
  useEffect(() => {
    if (!draftOpen) return;

    let cancelled = false;

    async function loadEmployees() {
      setEmployeesLoading(true);
      setEmployeesError("");

      try {
        const data = await getFinanceEmployees();

        if (!cancelled) {
          setDraftEmployees(data);
        }
      } catch (err) {
        if (!cancelled) {
          setEmployeesError("사원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setEmployeesLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [draftOpen]);

  // 선택한 문서가 바뀌면 결재 처리 이력을 조회합니다.
  useEffect(() => {
    let cancelled = false;

    setApprovalSteps([]);
    setStepsError("");

    if (selectedApprovalId === null || isMockDraftId(selectedApprovalId) || String(selectedApprovalId).startsWith("draft-")) {
      setStepsLoading(false);
      return;
    }

    async function loadSteps() {
      setStepsLoading(true);

      try {
        const data = await getApprovalSteps(selectedApprovalId);

        if (!cancelled) {
          setApprovalSteps(data);
        }
      } catch (err) {
        if (!cancelled) {
          setStepsError(
            err.response?.data?.message ||
            "결재 처리 이력을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setStepsLoading(false);
        }
      }
    }

    loadSteps();

    // 다른 문서를 선택하면 이전 요청의 결과는 무시합니다.
    return () => {
      cancelled = true;
    };
  }, [selectedApprovalId, stepsRefresh]);

  // 다른 문서를 열면 이전 의견과 비밀번호를 지웁니다.
  useEffect(() => {
    setPaymentFormOpen(false);
    setDecisionOpinion("");
    setDecisionPassword("");
    setDecisionError("");
    setDecisionMessage("");
    setAttachmentFile(null);
    setAttachmentPassword("");
    setAttachmentError("");
    setAttachmentMessage("");
    setDownloadError("");
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }, [selectedApprovalId]);

  // 문서를 열거나 업로드를 완료하면 첨부파일 목록을 다시 조회합니다.
  useEffect(() => {
    let cancelled = false;
    setAttachmentList([]);
    setAttachmentListError("");
    if (selectedApprovalId === null || isMockDraftId(selectedApprovalId) || String(selectedApprovalId).startsWith("draft-")) {
      if (String(selectedApprovalId).startsWith("draft-")) setAttachmentListError("기안서의 증빙파일은 내업무 관리에서 확인해주세요.");
      setAttachmentListLoading(false);
      return;
    }
    async function loadAttachments() {
      setAttachmentListLoading(true);
      try {
        const data = await getApprovalAttachments(selectedApprovalId);
        if (!cancelled) setAttachmentList(data);
      } catch (error) {
        if (!cancelled) setAttachmentListError(error.response?.data?.message ||
          "첨부파일 목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setAttachmentListLoading(false);
      }
    }
    loadAttachments();
    return () => { cancelled = true; };
  }, [selectedApprovalId, attachmentListRefresh]);

  // 목록에 있는 부서명으로 검색 선택 항목을 만듭니다.
  const departmentOptions = [
    ...new Set(approvalList.map((item) => item.department))
  ];

  // 상태와 부서 조건을 모두 만족하는 문서만 표시합니다.
  const filteredApprovals = approvalList.filter((item) => {
    const matchesStatus =
      searchFilter.status === "ALL" ||
      item.status === searchFilter.status;

    const matchesDepartment =
      searchFilter.department === "ALL" ||
      item.department === searchFilter.department;

    return matchesStatus && matchesDepartment;
  });

  function handleSearch(e) {
    e.preventDefault();

    setSearchFilter({
      status: statusFilter,
      department: departmentFilter
    });
  }

  // 요약은 검색 조건과 관계없이 전체 문서 기준입니다.
  const pendingCount = approvalList.filter(
    (item) => item.status === "대기"
  ).length;

  const approvedAmount = approvalList
    .filter((item) => item.status === "승인")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const rejectedCount = approvalList.filter(
    (item) => item.status === "반려"
  ).length;

  const approvalHeaders = [
    "결재 번호",
    "상신 부서",
    "결재 요청자",
    "승인 내역 (제목)",
    "신청 금액",
    "등록된 결제수단",
    "증빙",
    "처리 마감일",
    "진행 상태",
    "관리"
  ];

  // 선택한 문서의 정보를 찾습니다.
  const selectedApproval = approvalList.find(
    (item) => item.id === selectedApprovalId);

  const tApprovalData = filteredApprovals.map((item) => {
    const statusClass =
      item.status === "대기"
        ? "status-pending"
        : item.status === "반려"
          ? "status-danger"
          : "status-success";

    return {
      content: [
        item.id,
        item.department,
        item.requester,
        <strong>{item.title}</strong>,
        item.amount == null ? "미등록" : `${item.amount.toLocaleString()}원`,
        item.paymentMethod,
        item.attachmentCount > 0
          ? `${item.attachmentCount}건`
          : "미첨부",
        item.deadline,
        <span className={`status-badge ${statusClass}`}>
          {item.status}
        </span>,
        <button
          type="button"
          disabled={decisionSaving || attachmentSaving || downloadingFileId !== null || paymentBusy}
          onClick={() => openApprovalDetail(item.id)}
        >
          상세
        </button>
      ]
    };
  });

  const currentStep = approvalSteps.find((step) => step.step_status !== "승인");
  const canDecide = selectedApproval?.status === "대기" &&
    !stepsLoading && !stepsError && currentStep?.step_status === "대기" &&
    Number(currentStep.employee_id) === Number(loginUser?.employee_id);

  async function handleDecision(decision) {
    if (decisionLock.current || attachmentLock.current || downloadLock.current || paymentBusyRef.current || !canDecide) return;
    if (!decisionPassword) {
      setDecisionError("결재를 처리하려면 로그인 비밀번호를 입력해 주세요.");
      return;
    }
    if (decision === "반려" && !decisionOpinion.trim()) {
      setDecisionError("반려 사유를 입력해 주세요.");
      return;
    }

    decisionLock.current = true;
    setDecisionSaving(true);
    setDecisionError("");
    setDecisionMessage("");
    try {
      const result = await decideApproval(selectedApprovalId, {
        employee_id: loginUser.employee_id,
        password: decisionPassword,
        decision,
        opinion: decisionOpinion.trim()
      });
      // 서버에서 확정한 상태를 즉시 반영합니다. 지급·계좌 잔액은 변경하지 않습니다.
      setApprovalList((previous) => previous.map((item) =>
        item.id === selectedApprovalId ? { ...item, status: result.approval_status } : item
      ));
      setApprovalSteps([]);
      setDecisionOpinion("");
      setDecisionMessage(result.message);
      setStepsRefresh((previous) => previous + 1);
      try {
        const data = await getApprovals();
        setApprovalList(data.map(toApproval));
        setError("");
      } catch {
        setError("결재 처리는 완료됐지만 목록 재조회에 실패했습니다. 새로고침해 확인해 주세요.");
      }
    } catch (err) {
      setDecisionError(err.response?.data?.message ||
        "처리 결과를 확인하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.");
      // 중복 요청이나 통신 오류가 나면 실제 DB 상태와 결재 순서를 다시 확인합니다.
      setStepsRefresh((previous) => previous + 1);
      try {
        const data = await getApprovals();
        setApprovalList(data.map(toApproval));
      } catch {
        setError("최신 결재 상태를 불러오지 못했습니다. 새로고침해 확인해 주세요.");
      }
    } finally {
      setDecisionPassword("");
      decisionLock.current = false;
      setDecisionSaving(false);
    }
  }

  const canAttach = selectedApproval?.status === "대기" &&
    Number(loginUser?.employee_id) > 0 &&
    Number(selectedApproval.employeeId) === Number(loginUser?.employee_id);

  async function handleAttachmentSubmit(event) {
    event.preventDefault();
    if (attachmentLock.current || decisionLock.current || downloadLock.current || paymentBusyRef.current || !canAttach) return;
    setAttachmentError("");
    setAttachmentMessage("");

    if (!attachmentFile) {
      setAttachmentError("첨부할 파일을 선택해 주세요.");
      return;
    }
    if (!/\.(pdf|jpe?g|png)$/i.test(attachmentFile.name)) {
      setAttachmentError("PDF, JPG, JPEG, PNG 파일만 첨부할 수 있습니다.");
      return;
    }
    if (attachmentFile.size > 10 * 1024 * 1024) {
      setAttachmentError("파일은 최대 10MB까지 첨부할 수 있습니다.");
      return;
    }
    if (Array.from(attachmentFile.name).length > 255) {
      setAttachmentError("원본 파일명은 255자 이내로 작성해 주세요.");
      return;
    }
    if (!attachmentPassword) {
      setAttachmentError("작성자 계정의 로그인 비밀번호를 입력해 주세요.");
      return;
    }

    const documentId = selectedApprovalId;
    attachmentLock.current = true;
    setAttachmentSaving(true);
    try {
      const result = await uploadApprovalAttachment(
        documentId, attachmentFile, loginUser.employee_id, attachmentPassword
      );
      // 업로드 성공 뒤에는 다시 전송되지 않도록 파일 선택을 비웁니다.
      setAttachmentFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      setApprovalList((previous) => previous.map((item) =>
        item.id === documentId ? { ...item, attachmentCount: item.attachmentCount + 1 } : item
      ));
      setAttachmentMessage(result.message || "증빙파일이 첨부되었습니다.");
      setAttachmentListRefresh((previous) => previous + 1);
      try {
        const data = await getApprovals();
        setApprovalList(data.map(toApproval));
        setError("");
      } catch {
        setAttachmentMessage("파일은 첨부되었습니다. 목록 재조회에 실패했으므로 F5로 첨부 건수를 확인해 주세요.");
      }
    } catch (err) {
      setAttachmentError(err.response?.data?.message ||
        "첨부 결과를 확인하지 못했습니다. F5로 첨부 건수를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setAttachmentPassword("");
      attachmentLock.current = false;
      setAttachmentSaving(false);
    }
  }

  async function handleAttachmentDownload(file) {
    if (downloadLock.current || attachmentLock.current || decisionLock.current || paymentBusyRef.current) return;
    downloadLock.current = true;
    setDownloadingFileId(file.file_id);
    setDownloadError("");
    let objectUrl;
    let link;
    try {
      const blob = await downloadApprovalAttachment(selectedApprovalId, file.file_id);
      objectUrl = window.URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.original_name || "첨부파일";
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      setDownloadError(error.response?.data?.message ||
        "첨부파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      link?.remove();
      // 브라우저가 다운로드를 시작한 뒤 임시 URL을 해제합니다.
      if (objectUrl) window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      downloadLock.current = false;
      setDownloadingFileId(null);
    }
  }

  function handlePaymentBusyChange(value) {
    paymentBusyRef.current = value;
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
    if (decisionLock.current || attachmentLock.current || downloadLock.current || paymentBusyRef.current || draftSaving) return;
    setDraftOpen(false);
    setSelectedApprovalId(documentId);
  }

  function closeApprovalDetail() {
    if (decisionLock.current || attachmentLock.current || downloadLock.current || paymentBusyRef.current) return;
    if (paymentFormOpen) {
      setPaymentFormOpen(false);
      return;
    }
    setSelectedApprovalId(null);
  }

  // 문서 상세와 지급 입력을 전환하면 모달의 맨 위로 돌아갑니다.
  useEffect(() => {
    const dialog = approvalModalRef.current?.querySelector(".modal-boder");
    if (dialog) dialog.scrollTop = 0;
  }, [paymentFormOpen, selectedApprovalId]);

  function closeDraftForm() {
    if (!draftSaving) setDraftOpen(false);
  }

  // 새로운 기안 입력폼을 엽니다.
  function openDraftForm() {
    setDraftForm({
      employee_id: "",
      approver_id: "",
      title: "",
      content: "",
      amount: "",
      due_date: "",
      document_type: "비용",
    category_code: ""
    });

    setDraftError("");
    setEmployeesError("");
    setEmployeesLoading(true);
    setSelectedApprovalId(null);
    setDraftOpen(true);
  }

  // 입력한 항목의 값만 변경합니다.
  function handleDraftChange(e) {
    const { name, value } = e.target;

    setDraftForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  // 기안을 저장합니다.
  async function handleDraftSubmit(e) {
    e.preventDefault();

    if (draftSaving || employeesLoading || employeesError) return;

    if (draftForm.title.trim() === "") {
      setDraftError("제목을 입력해 주세요.");
      return;
    }

    setDraftSaving(true);
    setDraftError("");

    try {
      const result = await createApproval(draftForm);

      // 등록이 완료되면 입력폼을 닫습니다.
      setDraftOpen(false);

      // 검색 조건을 초기화합니다.
      setStatusFilter("ALL");
      setDepartmentFilter("ALL");
      setSearchFilter({
        status: "ALL",
        department: "ALL"
      });

      // 저장된 문서 목록을 다시 조회합니다.
      try {
        const data = await getApprovals();

        const approvals = data.map(toApproval);

        setApprovalList(approvals);
        setError("");
        setSelectedApprovalId(result.document_id);
      } catch (refreshError) {
        // 저장은 완료됐으므로 같은 문서를 다시 등록하지 않습니다.
        setError(
          "기안은 등록되었습니다. 목록을 불러오지 못했으므로 F5를 눌러 확인해 주세요."
        );
      }

      alert(result.message);
    } catch (err) {
      setDraftError(
        err.response?.data?.message ||
        "결재 기안 등록에 실패했습니다."
      );
    } finally {
      setDraftSaving(false);
    }
  }

  return (
    <div className="border-container">
      <header className="dashboard-header">
        <span className="subtitle">{embedded ? "기존 결재·이력" : "결제(지출) 관리"}</span>

        {allowCreate && <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            disabled={draftOpen || draftSaving || decisionSaving || attachmentSaving || downloadingFileId !== null || paymentBusy}
            onClick={openDraftForm}
          >
            + 지출 결재 기안
          </button>
        </div>}
      </header>

      {ENABLE_DRAFT_MOCK && (
        <p role="status">기안서 연동 미리보기: 승인된 더미 1건이 포함되어 있습니다. 아래 승인 금액 합계에도 더미 금액이 포함됩니다.</p>
      )}

      {draftOpen && (
        <div className="finance-registration-modal">
          <ModalBase title="지출 결재 기안" onClose={closeDraftForm} layout={(
            <form onSubmit={handleDraftSubmit}>
              <fieldset disabled={draftSaving}>
                {/* 작성자와 결재자는 같은 사원 목록을 사용합니다. */}
                {[
                  { name: "employee_id", label: "작성자" },
                  { name: "approver_id", label: "결재자" }
                ].map((field) => (
                  <div key={field.name}>
                    <label htmlFor={`draft-${field.name}`}>
                      {field.label} *
                    </label>

                    <select
                      id={`draft-${field.name}`}
                      name={field.name}
                      value={draftForm[field.name]}
                      onChange={handleDraftChange}
                      disabled={employeesLoading || Boolean(employeesError)}
                      required
                    >
                      <option value="">선택해 주세요</option>

                      {draftEmployees.filter((employee) =>
                        field.name !== "approver_id" || Number(employee.can_approve) === 1
                      ).map((employee) => (
                        <option
                          key={employee.employee_id}
                          value={employee.employee_id}
                        >
                          {employee.name} / {employee.department_name || "부서 미지정"}
                          {" / "}{employee.employee_number}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div>
                  <label htmlFor="draft-title">제목 *</label>
                  <input
                    id="draft-title"
                    name="title"
                    type="text"
                    value={draftForm.title}
                    onChange={handleDraftChange}
                    maxLength={150}
                    required
                  />
                </div>

                {expenseGroups.length > 0 && <div>
                  <label htmlFor="draft-category">지출 분류 / 세부 항목 *</label>
                  <select id="draft-category" name="category_code" value={draftForm.category_code}
                    onChange={handleDraftChange} required>
                    <option value="">선택해 주세요</option>
                    {expenseGroups.map(group => <optgroup key={group.id} label={group.label}>
                      {group.items.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </optgroup>)}
                  </select>
                </div>}

                <div>
                  <label htmlFor="draft-type">문서 유형 *</label>
                  <select
                    id="draft-type"
                    name="document_type"
                    value={draftForm.document_type}
                    onChange={handleDraftChange}
                    required
                  >
                    <option value="일반">일반</option>
                    <option value="비용">비용</option>
                    <option value="구매">구매</option>
                    <option value="급여">급여</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="draft-amount">신청 금액 *</label>
                  <input
                    id="draft-amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="1"
                    value={draftForm.amount}
                    onChange={handleDraftChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="draft-due-date">처리 마감일</label>
                  <input
                    id="draft-due-date"
                    name="due_date"
                    type="date"
                    value={draftForm.due_date}
                    onChange={handleDraftChange}
                  />
                </div>

                <div>
                  <label htmlFor="draft-content">내용</label>
                  <textarea
                    id="draft-content"
                    name="content"
                    rows={5}
                    value={draftForm.content}
                    onChange={handleDraftChange}
                  />
                </div>

                <p>기안은 대기 상태로 등록됩니다.</p>

                {employeesLoading && <p>사원 목록을 불러오는 중입니다.</p>}
                {employeesError && <p role="alert">{employeesError}</p>}
                {draftError && <p role="alert">{draftError}</p>}

                <button
                  type="submit"
                  disabled={employeesLoading || Boolean(employeesError)}
                >
                  {draftSaving ? "저장 중..." : "저장"}
                </button>

                <button
                  type="button"
                  onClick={closeDraftForm}
                >
                  취소
                </button>
              </fieldset>
            </form>
          )} />
        </div>
      )}

      <p>내업무 승인 기안서는 조회용으로 함께 표시됩니다. 금액이 미등록인 문서는 승인 금액 합계에서 제외됩니다.</p>
      <div>
        <strong>승인 대기:</strong> {pendingCount}건
        {" | "}
        <strong>승인 문서 금액 합계:</strong>{" "}
        {approvedAmount.toLocaleString()}원
        {" | "}
        <strong>반려:</strong> {rejectedCount}건
      </div>

      <hr />

      <section>
        <form
          className="finance-card-search"
          onSubmit={handleSearch}
        >
          <label htmlFor="approval-status">결재 상태: </label>
          <select
            id="approval-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">전체 보기</option>
            <option value="대기">대기</option>
            <option value="승인">승인</option>
            <option value="반려">반려</option>
          </select>

          <label htmlFor="approval-department">부서 선택: </label>
          <select
            id="approval-department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">전체 부서</option>

            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <button type="submit">조회</button>
        </form>
      </section>

      <br />

      {loading && <p>결재 문서를 불러오는 중입니다.</p>}
      {error && <p role="alert">{error}</p>}

      <PaginationTable
        key={JSON.stringify(searchFilter)}
        title="결제 지출 승인 목록"
        th={approvalHeaders}
        allData={tApprovalData}
        itemsPerPage={5}
      />

      {selectedApproval && !draftOpen && (
        <div ref={approvalModalRef} className="finance-registration-modal finance-approval-detail">
          <ModalBase
            title={paymentFormOpen ? "지출 지급 등록" : "결재 문서 상세정보"}
            onClose={closeApprovalDetail}
            layout={(
              <section aria-label="결재 문서 상세정보">
                <div hidden={paymentFormOpen}>


                  <div className="table-shell">
                    <table className="finance-approval-fields">
                      <tbody>
                        {[
                          ["문서 ID", selectedApproval.id],
                          ["제목", selectedApproval.title],
                          ["문서 유형", selectedApproval.documentType],
                          ["상신 부서", selectedApproval.department],
                          ["작성자", selectedApproval.requester],
                          [
                            "신청 금액",
                            selectedApproval.amount == null ? "미등록" : `${selectedApproval.amount.toLocaleString()}원`
                          ],
                          ["등록된 결제수단", selectedApproval.paymentMethod],
                          ["처리 마감일", selectedApproval.deadline],
                          ["진행 상태", selectedApproval.status],
                          ["작성일시", selectedApproval.createdAt],
                          ["첨부파일 수", `${selectedApproval.attachmentCount}건`]
                        ].map(([label, value]) => (
                          <tr key={label}>
                            <th scope="row">{label}</th>
                            <td>{value}</td>
                          </tr>
                        ))}

                        <tr>
                          <th scope="row">내용</th>
                          <td style={{ whiteSpace: "pre-wrap" }}>
                            {selectedApproval.content || "작성된 내용이 없습니다."}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedApproval.isMockDraft || selectedApproval.isSourceDraft || selectedApproval.isLinkedTrade ? (
                  <p role="status">{selectedApproval.isLinkedTrade ? "거래로 연결된 문서입니다. 거래·정산 탭의 전표에서 지급해주세요." : selectedApproval.isSourceDraft ? "내업무 관리에서 최종 승인된 기안서입니다. 품목관리에서 거래정보를 등록한 뒤 지급할 수 있습니다." : "더미 기안서 표시 예시입니다. 실제 지급 등록과 첨부파일 기능은 사용할 수 없습니다."}</p>
                ) : <ApprovalPayments
                  key={selectedApproval.id}
                  embedded
                  paymentFormOpen={paymentFormOpen}
                  onFormOpenChange={setPaymentFormOpen}
                  approval={selectedApproval}
                  loginUser={loginUser}
                  blocked={decisionSaving || attachmentSaving || downloadingFileId !== null}
                  onBusyChange={handlePaymentBusyChange}
                  onPaid={handlePaymentSaved}
                />}                <div hidden={paymentFormOpen}>


                  <section className="finance-registration-modal" aria-label="증빙파일 첨부">
                    <h3>증빙파일</h3>
                    <button type="button"
                      disabled={selectedApproval.isSourceDraft || selectedApproval.isMockDraft || attachmentListLoading || attachmentSaving || downloadingFileId !== null}
                      onClick={() => setAttachmentListRefresh((previous) => previous + 1)}>
                      목록 새로고침
                    </button>
                    {attachmentListLoading ? <p>첨부파일 목록을 불러오는 중입니다.</p> :
                      attachmentListError ? <p role="alert">{attachmentListError}</p> :
                        attachmentList.length === 0 ? <p>등록된 첨부파일이 없습니다.</p> : (
                          <div className="table-shell finance-approval-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th scope="col">파일명</th>
                                  <th scope="col">크기</th>
                                  <th scope="col">첨부일시</th>
                                  <th scope="col">다운로드</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attachmentList.map((file) => (
                                  <tr key={file.file_id}>
                                    <td>{file.original_name}</td>
                                    <td>{(Number(file.file_size || 0) / 1024).toLocaleString(
                                      "ko-KR", { maximumFractionDigits: 1 }
                                    )} KB</td>
                                    <td>{file.created_at || "-"}</td>
                                    <td>
                                      <button type="button"
                                        aria-label={`${file.original_name} 다운로드`}
                                        disabled={downloadingFileId !== null || attachmentSaving || decisionSaving || paymentBusy}
                                        onClick={() => handleAttachmentDownload(file)}>
                                        {downloadingFileId === file.file_id ? "다운로드 중..." : "다운로드"}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    {downloadError && <p role="alert">{downloadError}</p>}
                    {canAttach ? (
                      <form onSubmit={handleAttachmentSubmit}>
                        <fieldset disabled={attachmentSaving || decisionSaving || downloadingFileId !== null || paymentBusy}>
                          <div>
                            <label htmlFor="approval-attachment-file">증빙파일</label>
                            <input
                              ref={attachmentInputRef}
                              id="approval-attachment-file"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(event) => {
                                setAttachmentFile(event.target.files?.[0] || null);
                                setAttachmentError("");
                                setAttachmentMessage("");
                              }}
                            />
                            <p>PDF, JPG, JPEG, PNG / 최대 10MB / 한 번에 1개</p>
                          </div>
                          <div>
                            <label htmlFor="approval-attachment-password">작성자 로그인 비밀번호 확인</label>
                            <input
                              id="approval-attachment-password"
                              type="password"
                              autoComplete="current-password"
                              value={attachmentPassword}
                              onChange={(event) => setAttachmentPassword(event.target.value)}
                            />
                          </div>
                          <button type="submit">
                            {attachmentSaving ? "첨부 중..." : "증빙파일 첨부"}
                          </button>
                        </fieldset>
                      </form>
                    ) : (
                      <p>기안 작성자가 대기 상태의 문서에 증빙파일을 첨부할 수 있습니다.</p>
                    )}
                    {attachmentError && <p role="alert">{attachmentError}</p>}
                    {attachmentMessage && <p role="status">{attachmentMessage}</p>}
                  </section>

                  <h3>결재자 및 처리 이력</h3>

                  {stepsLoading ? (
                    <p>결재 처리 이력을 불러오는 중입니다.</p>
                  ) : stepsError ? (
                    <p role="alert">{stepsError}</p>
                  ) : approvalSteps.length === 0 ? (
                    <p>{selectedApproval.isSourceDraft ? "기안서의 결재 이력은 내업무 관리에서 확인해주세요." : "등록된 결재 단계가 없습니다."}</p>
                  ) : (
                    <div className="table-shell finance-approval-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">결재 순서</th>
                            <th scope="col">결재자</th>
                            <th scope="col">부서</th>
                            <th scope="col">처리 상태</th>
                            <th scope="col">처리일시</th>
                            <th scope="col">의견</th>
                          </tr>
                        </thead>

                        <tbody>
                          {approvalSteps.map((step) => (
                            <tr key={step.step_id}>
                              <td>{step.step_order}</td>
                              <td>{step.approver_name || "미지정"}</td>
                              <td>{step.department_name || "미지정"}</td>
                              <td>{step.step_status || "-"}</td>
                              <td>{step.action_at || "-"}</td>
                              <td style={{ whiteSpace: "pre-wrap" }}>
                                {step.opinion || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {selectedApproval.status === "대기" && !stepsLoading && !stepsError && (
                    canDecide ? (
                      <section aria-label="결재 처리">
                        <h3>결재 처리</h3>
                        <fieldset disabled={decisionSaving || attachmentSaving || downloadingFileId !== null || paymentBusy}>
                          <div>
                            <label htmlFor="decision-opinion">결재 의견 (반려 시 필수, 최대 500자)</label>
                            <textarea id="decision-opinion" maxLength={500}
                              value={decisionOpinion} onChange={(e) => setDecisionOpinion(e.target.value)} />
                          </div>
                          <div>
                            <label htmlFor="decision-password">로그인 비밀번호 확인</label>
                            <input id="decision-password" type="password" autoComplete="current-password"
                              value={decisionPassword} onChange={(e) => setDecisionPassword(e.target.value)} />
                          </div>
                          <p>지정된 결재자만 처리할 수 있습니다. 승인은 실제 지급과 별도로 처리됩니다.</p>
                          <button type="button" className="erp-primary-button"
                            onClick={() => handleDecision("승인")}>승인</button>
                          <button type="button" onClick={() => handleDecision("반려")}>반려</button>
                        </fieldset>
                      </section>
                    ) : <p>현재 순서의 지정 결재자만 승인·반려할 수 있습니다. 결재자와 로그인 계정을 확인해 주세요.</p>
                  )}
                  {decisionSaving && <p role="status">결재를 저장하는 중입니다.</p>}
                  {decisionError && <p role="alert">{decisionError}</p>}
                  {decisionMessage && <p role="status">{decisionMessage}</p>}
                </div>

              </section>
            )}
          />
        </div>
      )}

    </div>
  );
}

export default Approval;