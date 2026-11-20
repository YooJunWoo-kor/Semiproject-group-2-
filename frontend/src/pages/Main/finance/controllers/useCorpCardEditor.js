// 담당 화면: 자금관리 → 법인카드
// 역할: 카드 등록·기본정보 수정·부서/관리자 조회을 담당합니다.
// [MVC] 카드 등록·기본정보 수정과 부서·관리자 조회를 담당합니다.
import { createCorpCardForm, toCorpCardForm, validateCorpCardForm, getCorpCardUpdateData, applyCorpCardSave, } from "../models/financeCorpCardModel";
import { getFinanceError } from "../utils/financeDataUtils";
import { useEffect, useState } from "react";
import { createCorporateCard, getCorporateCardOptions, updateCorporateCard, } from "../../../../utils/financeService";

export default function useCorpCardEditor({
  limitSaving,
  setCardList,
  setCardView,
  setDepartmentFilter,
  setLimitTarget,
  setSearchFilter,
  setSearchKeyword,
  setSelectedCardId,
  statusSavingId,
}) {
  // null이면 신규 등록, ID가 있으면 해당 카드의 기본정보 수정
  const [editingCardId, setEditingCardId] = useState(null);

  // 등록·수정폼의 표시 여부와 입력값
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardFormError, setCardFormError] = useState("");
  const [cardForm, setCardForm] = useState(createCorpCardForm);

  // 등록폼에서 선택할 전체 부서와 사원 목록
  const [formDepartments, setFormDepartments] = useState([]);
  const [formEmployees, setFormEmployees] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  // 상태를 변경 중인 카드 ID와 오류 메시지

  useEffect(() => {
    if (!cardFormOpen) return;
    let cancelled = false;
    async function loadFormOptions() {
      setOptionsLoading(true);
      setOptionsError("");
      setFormDepartments([]);
      setFormEmployees([]);
      try {
        const data = await getCorporateCardOptions();
        if (!cancelled) {
          setFormDepartments(data.departments);
          setFormEmployees(data.employees);
        }
      } catch (err) {
        if (!cancelled)
          setOptionsError(getFinanceError(err, "부서와 관리자 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }
    loadFormOptions();
    return () => {
      cancelled = true;
    };
  }, [cardFormOpen]);

  // 화면이 처음 열릴 때 법인카드 목록을 조회합니다.

  // 신규 카드 등록폼을 엽니다.
  function openCardForm() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setEditingCardId(null);
    setCardView("detail");
    setCardForm(createCorpCardForm());
    setCardFormError("");
    setOptionsError("");
    setOptionsLoading(true);
    setLimitTarget(null);
    setSelectedCardId(null);
    setCardFormOpen(true);
  }

  // 기존 카드의 기본정보를 등록폼에 채워 수정 모드로 엽니다.
  function openEditCardForm(card) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardView("detail");
    setEditingCardId(card.id);
    setCardForm(toCorpCardForm(card));
    setCardFormError("");
    
    // 이미 열려 있는 폼에서는 선택 목록을 그대로 사용합니다.
    if (!cardFormOpen) {
      setOptionsError("");
      setOptionsLoading(true);
    }
    setLimitTarget(null);
    setSelectedCardId(card.id);
    setCardFormOpen(true);
  }

  // 입력칸의 name에 맞는 값만 변경합니다.
  function handleCardFormChange(e) {
    const { name, value } = e.target;
    setCardForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // 신규 등록은 POST, 기존 카드 수정은 PUT으로 저장합니다.
  async function handleCardSubmit(e) {
    e.preventDefault();
    if (cardSaving) return;
    if (optionsLoading || optionsError) {
      setCardFormError(
        "부서·관리자 목록을 확인한 뒤 저장해 주세요. 오류가 나면 취소 후 다시 열어 주세요.",
      );
      return;
    }
    const isEditing = editingCardId !== null;
    const validationError = validateCorpCardForm(cardForm, isEditing);
    if (validationError) {
      setCardFormError(validationError);
      return;
    }
    const basicData = getCorpCardUpdateData(cardForm);
    setCardSaving(true);
    setCardFormError("");
    try {
      let result;
      if (isEditing) result = await updateCorporateCard(editingCardId, basicData);
      else
        result = await createCorporateCard({
          ...basicData,
          monthly_limit: cardForm.monthly_limit,
        });

      let savedId = result.card_id;
      if (isEditing) savedId = editingCardId;
      setCardList((previous) =>
        applyCorpCardSave(previous, cardForm, savedId, isEditing, formDepartments, formEmployees),
      );
      setDepartmentFilter("ALL");
      setSearchKeyword("");
      setSearchFilter({
        department: "ALL",
        keyword: "",
      });
      setSelectedCardId(savedId);
      setCardFormOpen(false);
      setEditingCardId(null);
      let successMessage = "법인카드가 등록되었습니다.";
      if (isEditing) successMessage = "법인카드 정보가 수정되었습니다.";
      alert(result.message || successMessage);
    } catch (err) {
      let message = "법인카드 등록에 실패했습니다.";
      if (isEditing) message = "법인카드 정보 수정에 실패했습니다.";
      setCardFormError(getFinanceError(err, message));
    } finally {
      setCardSaving(false);
    }
  }

  // 선택한 카드의 현재 한도를 입력폼에 채웁니다.

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
  }
  // 화면에 전달할 상태와 동작
  return {
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
  };
}
