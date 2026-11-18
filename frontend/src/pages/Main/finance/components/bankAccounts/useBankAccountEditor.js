// 계좌 등록·기본정보 수정 및 관리 사원 조회를 담당합니다.
import { createBankAccountForm } from "./bankAccountModel";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import {
  createBankAccount,
  updateBankAccount,
  getFinanceEmployees,
} from "../../../../../utils/financeService";

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
      const selectedEmployee = employeeOptions.find(
        (employee) => Number(employee.employee_id) === Number(accountForm.employee_id),
      );
      if (isEditing) {
        // 수정 API에는 변경 가능한 기본정보만 보냅니다.
        const result = await updateBankAccount(editingAccountId, {
          account_number: accountForm.account_number,
          bank_name: accountForm.bank_name,
          account_name: accountForm.account_name,
          account_type: accountForm.account_type,
          employee_id: accountForm.employee_id,
        });

        // 기존 계좌의 기본정보만 교체합니다.
        setAccountList((prev) =>
          prev.map((acc) => {
            if (acc.id !== editingAccountId) return acc;
            let managerId = null;
            let managerName = "미지정";
            if (accountForm.employee_id !== "") {
              managerId = Number(accountForm.employee_id);
              managerName = selectedEmployee?.name || acc.managerName;
            }
            return {
              ...acc,
              accountNumber: accountForm.account_number.trim(),
              bankName: accountForm.bank_name.trim(),
              accountName: accountForm.account_name.trim(),
              accountType: accountForm.account_type.trim() || "-",
              managerId,
              managerName,
            };
          }),
        );
        alert(result.message);
      } else {
        const result = await createBankAccount(accountForm);
        const newAccount = {
          id: result.account_id,
          accountName: accountForm.account_name.trim(),
          bankName: accountForm.bank_name.trim(),
          accountNumber: accountForm.account_number.trim(),
          accountType: accountForm.account_type.trim() || "-",
          currency: accountForm.currency,
          balance: Number(accountForm.balance || 0),
          managerId: accountForm.employee_id === "" ? null : Number(accountForm.employee_id),
          managerName: selectedEmployee?.name || "미지정",
          status: "사용",
          lastTransactionDate: "-",
        };
        setAccountList((prev) => [newAccount, ...prev]);
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
      setFormError(
        getFinanceError(err, isEditing ? "회사계좌 수정에 실패했습니다." : "회사계좌 등록에 실패했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 계좌 정보를 기존 입력폼에 채웁니다.
  function openEditAccountForm(acc) {
    if (saving || accountStatusSaving) return;
    if (selectedAccountId !== acc.id) setAccountView("detail");
    setEditingAccountId(acc.id);
    setAccountForm({
      account_number: acc.accountNumber,
      bank_name: acc.bankName,
      account_name: acc.accountName,
      account_type: acc.accountType === "-" ? "" : acc.accountType,
      balance: String(acc.balance),
      currency: acc.currency,
      employee_id: acc.managerId == null ? "" : String(acc.managerId),
    });
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
