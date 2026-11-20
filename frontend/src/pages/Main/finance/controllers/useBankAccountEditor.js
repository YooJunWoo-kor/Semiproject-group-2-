// 담당 화면: 자금관리 → 회사계좌
// 역할: 계좌 등록·기본정보 수정·관리 사원 선택을 담당합니다.
// 계좌 등록·기본정보 수정 및 관리 사원 조회를 담당합니다.
import { createBankAccountForm, toBankAccountForm, getBankAccountUpdateData, applyBankAccountSave, } from "../models/financeBankAccountModel";
import { getFinanceError } from "../utils/financeDataUtils";
import { useEffect, useState } from "react";
import { createBankAccount, updateBankAccount, getFinanceEmployees, } from "../../../../utils/financeService";

export default function useBankAccountEditor({
  accountStatusSaving,
  selectedAccountId,
  setAccountList,
  setAccountView,
  setBankFilter,
  setSearchFilter,
  setSearchKeyword,
  setSelectedAccountId,
  setTypeFilter,
}) {
  // 계좌 등록폼 상태
  const [formOpen, setFormOpen] = useState(false);
  // [공통화] 선택 이력 조회는 계좌·카드 공통 훅을 사용합니다.

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [accountForm, setAccountForm] = useState(createBankAccountForm);

  // null이면 신규 등록, ID가 있으면 해당 계좌 수정
  const [editingAccountId, setEditingAccountId] = useState(null);

  // 관리 사원 선택 목록
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState("");

  // 회사계좌 상태 변경 진행 여부와 오류

  // 선택한 계좌가 바뀌면 거래내역을 조회합니다.

  // 관리 사원 목록 조회
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getFinanceEmployees();
        setEmployeeOptions(data);
      } catch (err) {
        console.error("관리 사원 조회 오류:", err);
        setEmployeesError("관리 사원 목록을 불러오지 못했습니다.");
      } finally {
        setEmployeesLoading(false);
      }
    }
    loadEmployees();
  }, []);

  // 원화 기준 총 잔액 합산 (외화 제외)

  // 신규 계좌 등록폼 열기
  function openAccountForm() {
    if (saving || accountStatusSaving) return;
    setEditingAccountId(null); // 신규 등록 모드

    setAccountForm(createBankAccountForm());
    setFormError("");
    setSelectedAccountId(null);
    setFormOpen(true);
  }

  // 입력값 변경
  function handleAccountChange(e) {
    const { name, value } = e.target;
    setAccountForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // 회사계좌 신규 등록 및 수정
  async function handleAccountSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const isEditing = editingAccountId !== null;
    setSaving(true);
    setFormError("");
    try {
      if (isEditing) {
        const result = await updateBankAccount(
          editingAccountId,
          getBankAccountUpdateData(accountForm),
        );
        setAccountList((previous) =>
          applyBankAccountSave(previous, accountForm, editingAccountId, true, employeeOptions),
        );
        alert(result.message);
      } else {
        const result = await createBankAccount(accountForm);
        setAccountList((previous) =>
          applyBankAccountSave(previous, accountForm, result.account_id, false, employeeOptions),
        );
        alert("회사계좌가 등록되었습니다.");
      }

      // 저장한 계좌가 보이도록 검색 조건을 초기화합니다.
      setBankFilter("ALL");
      setTypeFilter("ALL");
      setSearchKeyword("");
      setSearchFilter({
        bank: "ALL",
        type: "ALL",
        keyword: "",
      });
      setFormOpen(false);
      setEditingAccountId(null);
    } catch (err) {
      let message = "회사계좌 등록에 실패했습니다.";
      if (isEditing) message = "회사계좌 수정에 실패했습니다.";
      setFormError(getFinanceError(err, message));
    } finally {
      setSaving(false);
    }
  }

  // 선택한 계좌 정보를 기존 입력폼에 채웁니다.
  function openEditAccountForm(acc) {
    if (saving || accountStatusSaving) return;
    if (selectedAccountId !== acc.id) setAccountView("detail");
    setEditingAccountId(acc.id);
    setAccountForm(toBankAccountForm(acc));
    setFormError("");
    setSelectedAccountId(acc.id);
    setFormOpen(true);
  }

  // 선택한 회사계좌의 사용 상태를 변경합니다.

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving || accountStatusSaving) return;
    setFormOpen(false);
  }
  // 화면에 전달할 상태와 동작
  return {
    formOpen,
    setFormOpen,
    saving,
    formError,
    accountForm,
    editingAccountId,
    employeeOptions,
    employeesLoading,
    employeesError,
    openAccountForm,
    handleAccountChange,
    handleAccountSubmit,
    openEditAccountForm,
    closeRegistrationModal,
  };
}
