// 담당 화면: 지출·거래 관리
// 역할: 월 급여 상세 조회 및 지급 등록을 담당합니다.
import { payrollMoneyKeys, payrollWon, createPayrollPaymentForm, canPayPayroll, getPayrollPaymentSummary, validatePayrollPayment, getPayrollPaymentPayload, } from "../models/financePayrollModel";
import { koreaDate } from "../utils/financeDataUtils";
import { useEffect, useState } from "react";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";

// 월 급여 상세 조회와 지급 등록을 담당합니다.
export default function usePayrollPayments({
  itemList,
  onDataChange,
  payrollRefresh,
  selectedItemId,
  setPayrollRefresh,
}) {
  const selectedItem = itemList.find((item) => item.id === selectedItemId);
  // 화면 상태
  const [payrollRows, setPayrollRows] = useState([]);
  const [payrollDetailLoading, setPayrollDetailLoading] = useState(false);
  const [payrollDetailError, setPayrollDetailError] = useState("");
  const [payrollPaymentSaving, setPayrollPaymentSaving] = useState(false);
  const [payrollPaymentError, setPayrollPaymentError] = useState("");
  const [payrollPaymentNotice, setPayrollPaymentNotice] = useState("");
  const [payrollPayForm, setPayrollPayForm] = useState(createPayrollPaymentForm);
  let payrollMonth = "";
  if (selectedItem?.isPayroll && !selectedItem.isPayrollDeduction) payrollMonth = selectedItem.date;

  useEffect(() => {
    setPayrollPayForm(createPayrollPaymentForm(koreaDate()));
    setPayrollPaymentError("");
    setPayrollPaymentNotice("");
  }, [payrollMonth]);
  useEffect(() => {
    const controller = new AbortController();
    setPayrollRows([]);
    setPayrollDetailError("");
    setPayrollDetailLoading(Boolean(payrollMonth));
    if (!payrollMonth) return () => controller.abort();
    async function loadPayrollDetail() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payrolls/${payrollMonth}/details`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("급여 상세를 불러오지 못했습니다.");
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error("급여 상세 응답을 확인해 주세요.");
        if (!controller.signal.aborted) setPayrollRows(rows);
      } catch (error) {
        if (!controller.signal.aborted) setPayrollDetailError(error.message);
      } finally {
        if (!controller.signal.aborted) setPayrollDetailLoading(false);
      }
    }
    loadPayrollDetail();
    return () => controller.abort();
  }, [payrollMonth, payrollRefresh]);
  const { unpaidRows: payrollUnpaidRows, pendingAmount: payrollNetPending } =
    getPayrollPaymentSummary(payrollRows);
  const payrollCanPay = canPayPayroll(getLoginUser());
  async function handlePayrollPayment(event) {
    event.preventDefault();
    if (payrollPaymentSaving || payrollDetailLoading || !payrollMonth || !payrollCanPay) return;
    const currentUser = getLoginUser();
    const validationError = validatePayrollPayment(payrollPayForm, currentUser, payrollNetPending);
    if (validationError) {
      setPayrollPaymentError(validationError);
      return;
    }
    setPayrollPaymentSaving(true);
    setPayrollPaymentError("");
    setPayrollPaymentNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/finance/payrolls/${payrollMonth}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          getPayrollPaymentPayload(
            payrollPayForm,
            currentUser,
            payrollUnpaidRows,
            payrollNetPending,
          ),
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "급여 지급 등록에 실패했습니다.");
      setPayrollPaymentNotice(
        `${result.message} 실지급 ${Number(result.amount).toLocaleString()}원 · 공제액 ${Number(result.deduction_pending).toLocaleString()}원은 별도 납부대기입니다.`,
      );
      setPayrollRefresh((value) => value + 1);
      onDataChange?.();
    } catch (error) {
      setPayrollPaymentError(
        error.message ||
        "서버 응답을 확인하지 못했습니다. 다시 등록하기 전에 새로고침해 지급 상태를 확인해 주세요.",
      );
    } finally {
      setPayrollPayForm((previous) => ({
        ...previous,
        password: "",
      }));
      setPayrollPaymentSaving(false);
    }
  }
  // 화면에 전달할 상태와 동작
  return {
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
  };
}
