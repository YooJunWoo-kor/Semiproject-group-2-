// [MVC] 카드 조회·검색·선택·상태 변경과 기능별 훅을 연결합니다.
import useCorpCardLimit from "./useCorpCardLimit";
import useCorpCardEditor from "./useCorpCardEditor";
import { useFinanceHistory } from "../FinanceFunds";
import { getFinanceError, toFinanceCard } from "../financeUtils";
import { useEffect, useState } from "react";
import {
  getCorporateCards,
  getCorporateCardPayments,
  updateCorporateCardStatus,
} from "../../../../../utils/financeService";
import { getCorpCardListView, getCorpCardSummary, getNextCorpCardStatus } from "./corpCardModel";
export default function useCorpCardsController({ embedded = false, onSummaryChange, onBusyChange }) {
  // DB에서 불러온 법인카드 목록
  const [cardList, setCardList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 입력 중인 검색 조건
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 조회 버튼을 눌렀을 때 적용할 검색 조건
  const [searchFilter, setSearchFilter] = useState({
    department: "ALL",
    keyword: "",
  });

  // 상세보기에서 선택한 카드 ID
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardView, setCardView] = useState("detail");

  // 한도를 변경할 카드와 입력값
  const [limitTarget, setLimitTarget] = useState(null);
  const [limitSaving, setLimitSaving] = useState(false);
  // 상태를 변경 중인 카드 ID와 오류 메시지
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [statusError, setStatusError] = useState("");
  const {
    editingCardId,
    cardFormOpen,
    setCardFormOpen,
    cardSaving,
    cardFormError,
    cardForm,
    formDepartments,
    formEmployees,
    optionsLoading,
    optionsError,
    openCardForm,
    openEditCardForm,
    handleCardFormChange,
    handleCardSubmit,
    closeRegistrationModal,
  } = useCorpCardEditor({
    limitSaving,
    setCardList,
    setCardView,
    setDepartmentFilter,
    setLimitTarget,
    setSearchFilter,
    setSearchKeyword,
    setSelectedCardId,
    statusSavingId,
  });
  // 선택한 법인카드의 사용 이력
  // [공통화] 선택 이력 조회는 계좌·카드 공통 훅을 사용합니다.
  const {
    payments: cardPayments,
    loading: paymentsLoading,
    error: paymentsError,
  } = useFinanceHistory(
    getCorporateCardPayments,
    cardView === "history" && !cardFormOpen && !limitTarget ? selectedCardId : null,
    "법인카드 사용 이력을 불러오지 못했습니다.",
  );
  const {
    monthlyLimitInput,
    setMonthlyLimitInput,
    limitError,
    openLimitForm,
    handleLimitSubmit,
    closeLimitModal,
  } = useCorpCardLimit({
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
  });
  // 화면이 처음 열릴 때 법인카드 목록을 조회합니다.
  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        const data = await getCorporateCards();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환합니다.
        const cards = data.map(toFinanceCard);
        if (!cancelled) {
          setCardList(cards);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(getFinanceError(err, "법인카드 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadCards();

    // 다른 화면으로 이동한 뒤에는 조회 결과를 반영하지 않습니다.
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onSummaryChange?.(getCorpCardSummary(cardList, loading, loadError));
  }, [cardList, loading, loadError, onSummaryChange]);
  const interactionBusy =
    cardFormOpen ||
    selectedCardId !== null ||
    limitTarget !== null ||
    cardSaving ||
    limitSaving ||
    statusSavingId !== null;
  useEffect(() => {
    onBusyChange?.(interactionBusy);
  }, [interactionBusy, onBusyChange]);

  // DB 목록에 있는 부서명으로 선택 항목을 만듭니다.
  const { departmentOptions, filteredCards } = getCorpCardListView(cardList, searchFilter);
  // 조회 버튼 또는 Enter를 누르면 검색 조건을 적용합니다.
  function handleCardSearch(e) {
    e.preventDefault();
    setSearchFilter({
      department: departmentFilter,
      keyword: searchKeyword,
    });
  }

  // 사용 중인 카드는 중지하고, 중지된 카드는 다시 사용합니다.
  async function handleCardStatusChange(card) {
    if (statusSavingId !== null || cardSaving || limitSaving) return;
    const nextStatus = getNextCorpCardStatus(card.status);
    setStatusSavingId(card.id);
    setStatusError("");
    try {
      const result = await updateCorporateCardStatus(card.id, nextStatus);

      // 같은 카드의 상태만 변경합니다.
      setCardList((previous) =>
        previous.map((item) => {
          if (item.id === card.id) return { ...item, status: result.card_status };
          return item;
        }),
      );
      alert(result.message);
    } catch (err) {
      setStatusError(getFinanceError(err, "법인카드 상태 변경에 실패했습니다."));
    } finally {
      setStatusSavingId(null);
    }
  }

  // 선택한 ID와 일치하는 카드 정보를 찾습니다.
  const selectedCard = cardList.find((card) => card.id === selectedCardId);
  // 상세와 등록·수정·한도변경 모달은 한 번에 하나씩 표시합니다.
  function openCardHistory(cardId) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setLimitTarget(null);
    setCardView("history");
    setSelectedCardId(cardId);
  }
  function openCardDetail(cardId) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setLimitTarget(null);
    setCardView("detail");
    setSelectedCardId(cardId);
  }
  function closeCardDetail() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setSelectedCardId(null);
  }
  return {
    embedded,
    loading,
    loadError,
    departmentFilter,
    setDepartmentFilter,
    searchKeyword,
    setSearchKeyword,
    searchFilter,
    cardView,
    limitTarget,
    monthlyLimitInput,
    setMonthlyLimitInput,
    limitSaving,
    limitError,
    editingCardId,
    cardFormOpen,
    cardPayments,
    paymentsLoading,
    paymentsError,
    cardSaving,
    cardFormError,
    cardForm,
    formDepartments,
    formEmployees,
    optionsLoading,
    optionsError,
    statusSavingId,
    statusError,
    departmentOptions,
    filteredCards,
    handleCardSearch,
    handleCardStatusChange,
    openCardForm,
    openEditCardForm,
    handleCardFormChange,
    handleCardSubmit,
    openLimitForm,
    handleLimitSubmit,
    selectedCard,
    openCardHistory,
    openCardDetail,
    closeCardDetail,
    closeLimitModal,
    closeRegistrationModal,
  };
}
