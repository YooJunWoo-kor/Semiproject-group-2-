// 거래 입출금 등록, 법인카드 선택 및 지급 이력 조회를 담당합니다.
import { getTradeApprovalStatus } from "./itemUtils";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import {
  createPayment,
  getTransactionPayments,
  getCorporateCards,
} from "../../../../../utils/financeService";

export default function useItemPayments({
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
}) {
  const selectedItem = itemList.find((item) => item.id === selectedItemId);
  // 입금·출금 입력값
  const [paymentForm, setPaymentForm] = useState({
    payment_date: "",
    amount: "",
    payment_method: "계좌이체",
    account_id: "",
    // 회사계좌 ID
    card_id: "", // 법인카드 ID
  });
  const [paymentError, setPaymentError] = useState("");

  // 선택한 거래의 정산 정보
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");

  // 법인카드 선택 목록: 폼을 열거나 정산을 저장하면 최신 한도를 조회합니다.
  const [paymentCards, setPaymentCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState("");
  const paymentTransactionId = paymentTarget?.transactionId ?? null;
  useEffect(() => {
    let cancelled = false;
    setPaymentCards([]);
    setCardsError("");
    if (paymentTransactionId === null) {
      setCardsLoading(false);
      return;
    }
    async function loadPaymentCards() {
      setCardsLoading(true);
      try {
        const data = await getCorporateCards();
        if (!cancelled) {
          setPaymentCards(data.filter((card) => ["사용", "ACTIVE"].includes(card.card_status)));
        }
      } catch (err) {
        if (!cancelled) {
          setCardsError("법인카드 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    }
    loadPaymentCards();
    return () => {
      cancelled = true;
    };
  }, [paymentTransactionId, paymentRefresh]);

  // 선택한 품목이 속한 거래 ID
  const selectedTransactionId = selectedItem?.transactionId;

  // 거래 선택 또는 입금·출금 저장 후 정산 정보 조회
  useEffect(() => {
    let cancelled = false;
    setPaymentSummary(null);
    setPaymentHistoryError("");
    if (selectedTransactionId == null) {
      setPaymentLoading(false);
      return;
    }
    setPaymentLoading(true);
    async function loadPaymentHistory() {
      try {
        const data = await getTransactionPayments(selectedTransactionId);

        // 다른 거래를 선택했다면 이전 조회 결과를 반영하지 않습니다.
        if (!cancelled) {
          setPaymentSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentHistoryError(getFinanceError(err, "입금·출금 이력을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false);
        }
      }
    }
    loadPaymentHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedTransactionId, paymentRefresh]);

  // 입금·출금 입력폼 열기
  function openPaymentForm(item) {
    if (
      item.isApprovalDocument ||
      getTradeApprovalStatus(item, approvedDocuments) === "UNAPPROVED" ||
      saving ||
      paymentSaving ||
      attachmentBusy
    )
      return;
    // 처리 대상을 따로 보관합니다.
    // 다른 품목을 선택해도 정산할 거래가 바뀌지 않습니다.
    setPaymentTarget({
      transactionId: item.transactionId,
      customer: item.customer,
      type: item.type,
    });
    setPaymentForm({
      payment_date: "",
      amount: "",
      payment_method: "계좌이체",
      account_id: "",
      card_id: "",
    });
    setPaymentError("");
    setFormOpen(false);
  }

  // 입금·출금 입력값 변경
  function handlePaymentChange(e) {
    const { name, value } = e.target;
    setPaymentForm((prev) => {
      const nextForm = { ...prev, [name]: value };
      if (isExpenseRegistration && name === "vat") {
        nextForm.unit_price = String(linkingApproval.totalAmount - Number(value));
      }
      // 결제수단이 바뀌면 이전 계좌·카드 선택을 초기화합니다.
      if (name === "payment_method") {
        nextForm.account_id = "";
        nextForm.card_id = "";
      }
      return nextForm;
    });
  }

  // 입금·출금 저장
  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!paymentTarget || paymentSaving) return;
    if (paymentForm.payment_method === "법인카드") {
      if (paymentTarget.type !== "PURCHASE") {
        setPaymentError("법인카드는 매입 거래의 출금에만 사용할 수 있습니다.");
        return;
      }
      if (cardsLoading || cardsError || !paymentForm.card_id) {
        setPaymentError("사용할 법인카드를 선택해 주세요. 목록 조회 실패 시 폼을 다시 열어 주세요.");
        return;
      }
    }
    setPaymentSaving(true);
    setPaymentError("");
    try {
      const result = await createPayment(paymentTarget.transactionId, paymentForm);

      // 같은 거래에 속한 모든 품목의 정산 상태를 변경합니다.
      setItemList((prev) =>
        prev.map((item) => {
          if (Number(item.transactionId) === Number(result.transaction_id)) {
            return { ...item, status: result.settlement_status };
          }
          return item;
        }),
      );
      // 저장 후 정산 이력과 남은 금액을 다시 조회합니다.
      setPaymentRefresh((prev) => prev + 1);
      onDataChange?.();
      setPaymentTarget(null);
      alert(`${result.message}\n남은 금액: ${Number(result.remaining_amount).toLocaleString()}원`);
    } catch (err) {
      setPaymentError(getFinanceError(err, "입금·출금 등록에 실패했습니다."));
    } finally {
      setPaymentSaving(false);
    }
  }

  function closePaymentModal() {
    if (saving || paymentSaving || attachmentBusy) return;
    setPaymentTarget(null);
  }
  return {
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
  };
}
