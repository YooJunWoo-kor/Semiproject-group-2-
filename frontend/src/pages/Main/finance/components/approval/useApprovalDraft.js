// 기안 입력, 사원 목록 조회 및 기안 등록을 담당합니다.
import { createApprovalDraftForm, toApproval } from "./approvalModel";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import { getApprovals, getFinanceEmployees, createApproval } from "../../../../../utils/financeService";

export default function useApprovalDraft({
  initialDraftOpen,
  setApprovalList,
  setDepartmentFilter,
  setError,
  setSearchFilter,
  setSelectedApprovalId,
  setStatusFilter,
}) {
  // 기안 등록폼
  const [draftOpen, setDraftOpen] = useState(initialDraftOpen);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftForm, setDraftForm] = useState(createApprovalDraftForm);

  // 작성자와 결재자로 선택할 사원 목록
  const [draftEmployees, setDraftEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
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

  function closeDraftForm() {
    if (!draftSaving) setDraftOpen(false);
  }

  // 새로운 기안 입력폼을 엽니다.
  function openDraftForm() {
    setDraftForm(createApprovalDraftForm());
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
      [name]: value,
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
        department: "ALL",
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
        setError("기안은 등록되었습니다. 목록을 불러오지 못했으므로 F5를 눌러 확인해 주세요.");
      }
      alert(result.message);
    } catch (err) {
      setDraftError(getFinanceError(err, "결재 기안 등록에 실패했습니다."));
    } finally {
      setDraftSaving(false);
    }
  }
  return {
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
  };
}
