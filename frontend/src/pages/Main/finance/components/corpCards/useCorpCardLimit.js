// [MVC] 월 한도 입력과 한도 변경 후 목록 재조회를 담당합니다.
import { getFinanceError, toFinanceCard } from "../financeUtils";
import { useState } from "react";
import { getCorporateCards, updateCorporateCardLimit } from "../../../../../utils/financeService";
export default function useCorpCardLimit({
  cardSaving,
  limitSaving,
  limitTarget,
  setCardFormOpen,
  setCardList,
  setCardView,
  setLimitSaving,
  setLimitTarget,
  setSelectedCardId,
  statusSavingId,
}) {
  const [monthlyLimitInput, setMonthlyLimitInput] = useState("");
  const [limitError, setLimitError] = useState("");

  // 선택한 카드의 현재 한도를 입력폼에 채웁니다.
  function openLimitForm(card) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setSelectedCardId(card.id);
    setCardView("detail");
    setLimitTarget(card);
    setMonthlyLimitInput(String(card.monthlyLimit));
    setLimitError("");
  }

  // 변경한 월 한도를 저장합니다.
  async function handleLimitSubmit(e) {
    e.preventDefault();
    if (!limitTarget || limitSaving) return;
    setLimitSaving(true);
    setLimitError("");
    try {
      const result = await updateCorporateCardLimit(limitTarget.id, monthlyLimitInput);

      // DB에서 목록을 다시 조회하여 최신 사용량과 잔여 한도를 표시합니다.
      const data = await getCorporateCards();
      const cards = data.map(toFinanceCard);
      setCardList(cards);
      setLimitTarget(null);
      alert(result.message);
    } catch (err) {
      setLimitError(
        getFinanceError(
          err,
          "한도 저장 또는 최신 목록 조회에 실패했습니다. 새로고침하여 저장 결과를 확인해 주세요.",
        ),
      );
    } finally {
      setLimitSaving(false);
    }
  }

  function closeLimitModal() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setLimitTarget(null);
  }

  return {
    monthlyLimitInput,
    setMonthlyLimitInput,
    limitError,
    openLimitForm,
    handleLimitSubmit,
    closeLimitModal,
  };
}
