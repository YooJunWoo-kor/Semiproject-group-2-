// 급여 공제액 조회와 납부 등록을 담당합니다.
import { koreaDate } from "../financeUtils";
import { useEffect, useState } from "react";
import { API_BASE_URL, getLoginUser } from "../../../../../utils/authStorage";

export default function usePayrollDeductions({
  deductionMonth,
  onDataChange,
  payrollCanPay,
  payrollWon,
  setPayrollRefresh,
}) {
  const [deductionRefresh, setDeductionRefresh] = useState(0);
  const [deductionData, setDeductionData] = useState(null);
  const [deductionLoading, setDeductionLoading] = useState(false);
  const [deductionSaving, setDeductionSaving] = useState(false);
  const [deductionError, setDeductionError] = useState("");
  const [deductionNotice, setDeductionNotice] = useState("");
  const [deductionForm, setDeductionForm] = useState({
    account_id: "",
    payment_date: "",
    password: "",
  });
  useEffect(() => {
    setDeductionForm({
      account_id: "",
      payment_date: koreaDate(),
      password: "",
    });
    setDeductionNotice("");
    setDeductionError("");
  }, [deductionMonth]);
  useEffect(() => {
    const controller = new AbortController();
    setDeductionData(null);
    setDeductionError("");
    setDeductionLoading(Boolean(deductionMonth));
    if (!deductionMonth) return () => controller.abort();
    async function loadDeduction() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payroll-deductions/${deductionMonth}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "공제액을 불러오지 못했습니다.");
        if (!Array.isArray(data.items) || !Array.isArray(data.history))
          throw new Error("공제액 조회 응답을 확인해 주세요.");
        if (!controller.signal.aborted) setDeductionData(data);
      } catch (error) {
        if (!controller.signal.aborted) setDeductionError(error.message);
      } finally {
        if (!controller.signal.aborted) setDeductionLoading(false);
      }
    }
    loadDeduction();
    return () => controller.abort();
  }, [deductionMonth, deductionRefresh]);
  async function handleDeductionPayment(event) {
    event.preventDefault();
    if (deductionSaving || deductionLoading || !deductionMonth || !payrollCanPay) return;
    const user = getLoginUser();
    const employeeId = Number(user?.employee_id ?? user?.employeeKey);
    const pending = (deductionData?.items || []).filter(
      (row) => row.status === "납부대기" && Number(row.amount) > 0,
    );
    const amount = Number(deductionData?.pending_total);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      setDeductionError("로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }
    if (
      !deductionForm.account_id ||
      !deductionForm.payment_date ||
      !deductionForm.password ||
      !pending.length ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      setDeductionError("회사계좌, 납부일, 비밀번호와 공제액을 확인해 주세요.");
      return;
    }
    setDeductionSaving(true);
    setDeductionError("");
    setDeductionNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/finance/payroll-deductions/${deductionMonth}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: Number(deductionForm.account_id),
          payment_date: deductionForm.payment_date,
          employee_id: employeeId,
          password: deductionForm.password,
          expected_amount: amount,
          expected_salary_payment_ids: pending.map((row) => Number(row.salary_payment_id)),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "공제액 납부 등록에 실패했습니다.");
      setDeductionNotice(`${result.message} ${payrollWon(result.amount)} · 출금 이력 #${result.payment_id}`);
      setDeductionRefresh((value) => value + 1);
      setPayrollRefresh((value) => value + 1);
      onDataChange?.();
    } catch (error) {
      setDeductionError(
        error.message || "응답을 확인하지 못했습니다. 새로고침해 납부 이력을 먼저 확인해 주세요.",
      );
    } finally {
      setDeductionForm((previous) => ({
        ...previous,
        password: "",
      }));
      setDeductionSaving(false);
    }
  }

  // 전표 상세와 입력 폼은 한 번에 하나씩 표시합니다.
  return {
    deductionData,
    deductionLoading,
    deductionSaving,
    deductionError,
    deductionNotice,
    deductionForm,
    setDeductionForm,
    handleDeductionPayment,
  };
}
