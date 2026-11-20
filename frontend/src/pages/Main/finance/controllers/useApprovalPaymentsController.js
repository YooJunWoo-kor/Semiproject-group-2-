// 담당 화면: 결재·이력 / 승인 지급
// 역할: 승인 문서의 지급 내역·지급 폼·지급 저장 및 재조회을 담당합니다.
// Controller: 지급 조회·폼 상태·저장과 재조회 흐름을 담당합니다.
import { useEffect, useState } from "react";
import { getFinanceError, koreaDate as todayInKorea } from "../utils/financeDataUtils";
import { getApprovalPayments, createApprovalPayment, getBankAccounts, getCorporateCards, } from "../../../../utils/financeService";
import { getApprovalPaymentState, createApprovalPaymentForm, changeApprovalPaymentForm, validateApprovalPayment, getApprovalPaymentPayload, } from "../models/financeApprovalModel";

export default function useApprovalPaymentsController({
  approval,
  loginUser,
  blocked,
  onBusyChange,
  onPaid,
  embedded = false,
  paymentFormOpen = false,
  onFormOpenChange,
}) {
  // 화면 상태
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [localFormOpen, setLocalFormOpen] = useState(false);
  const formOpen = embedded ? paymentFormOpen : localFormOpen;
  function setFormOpen(value) {
    if (embedded) onFormOpenChange?.(value);
    else setLocalFormOpen(value);
  }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(createApprovalPaymentForm);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [cardError, setCardError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummary(null);
    async function loadPayments() {
      try {
        const data = await getApprovalPayments(approval.id);
        if (!data?.summary || !Array.isArray(data.payments))
          throw new Error("잘못된 지급 조회 응답");
        if (!cancelled) {
          setSummary(data.summary);
          setPayments(data.payments);
        }
      } catch (err) {
        if (!cancelled) setError(getFinanceError(err, "지급 현황을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayments();
    return () => {
      cancelled = true;
    };
  }, [approval.id, approval.status, refresh]);

  // 폼을 다시 열 때마다 잔액과 카드 한도를 새로 조회합니다.
  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    setOptionsLoading(true);
    setBankAccounts([]);
    setCards([]);
    setBankError("");
    setCardError("");
    async function loadOptions() {
      const [banks, cardList] = await Promise.allSettled([getBankAccounts(), getCorporateCards()]);
      if (cancelled) return;
      if (banks.status === "fulfilled" && Array.isArray(banks.value)) setBankAccounts(banks.value);
      else setBankError("회사계좌 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      if (cardList.status === "fulfilled" && Array.isArray(cardList.value))
        setCards(cardList.value);
      else setCardError("법인카드 목록을 불러오지 못했습니다. 취소 후 다시 열어 주세요.");
      setOptionsLoading(false);
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [formOpen]);

  // 상위 모달의 닫기 버튼으로 돌아간 경우에도 비밀번호를 지웁니다.
  useEffect(() => {
    if (!formOpen)
      setForm((previous) => ({
        ...previous,
        password: "",
      }));
  }, [formOpen]);
  const { validSummary, isFinance, remaining, canPay, availableBanks, availableCards } =
    getApprovalPaymentState(summary, approval, loginUser, loading, error, bankAccounts, cards);
  function openForm() {
    if (!canPay || saving || blocked) return;
    setForm(createApprovalPaymentForm(todayInKorea(), String(remaining)));
    setFormError("");
    setMessage("");
    setOptionsLoading(true);
    setFormOpen(true);
  }
  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setForm((previous) => ({
      ...previous,
      password: "",
    }));
  }
  function changeForm(event) {
    const { name, value } = event.target;
    setForm((previous) => changeApprovalPaymentForm(previous, name, value));
    setFormError("");
  }
  async function submitPayment(event) {
    event.preventDefault();
    if (saving || blocked) return;
    setFormError("");
    const validationError = validateApprovalPayment(
      form,
      {
        canPay,
        remaining,
        availableBanks,
        availableCards,
        optionsLoading,
        bankError,
        cardError,
      },
      todayInKorea(),
    );
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    onBusyChange(true);
    try {
      const result = await createApprovalPayment(
        approval.id,
        getApprovalPaymentPayload(form, loginUser),
      );
      // 저장 성공 뒤 폼을 닫고 새로 조회합니다. 재조회 실패 시 재등록하지 않습니다.
      setFormOpen(false);
      setSummary(null);
      setMessage(result.message || "지급 내역이 등록되었습니다.");
      setRefresh((previous) => previous + 1);
      await onPaid();
    } catch (err) {
      setFormError(
        getFinanceError(
          err,
          "지급 결과를 확인하지 못했습니다. 지급 현황을 다시 조회한 뒤 확인해 주세요.",
        ),
      );
      setSummary(null);
      setRefresh((previous) => previous + 1);
    } finally {
      setForm((previous) => ({
        ...previous,
        password: "",
      }));
      setSaving(false);
      onBusyChange(false);
    }
  }
  // 화면에 전달할 상태와 동작
  return {
    formOpen,
    saving,
    formError,
    form,
    optionsLoading,
    bankError,
    cardError,
    availableBanks,
    availableCards,
    remaining,
    canPay,
    validSummary,
    isFinance,
    loading,
    error,
    summary,
    message,
    payments,
    setRefresh,
    openForm,
    closeForm,
    changeForm,
    submitPayment,
  };
}
