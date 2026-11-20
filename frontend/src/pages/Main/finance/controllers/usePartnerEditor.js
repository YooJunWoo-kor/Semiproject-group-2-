// 담당 화면: 거래처 관리
// 역할: 거래처 입력 폼과 등록·수정·삭제을 담당합니다.
// 거래처 입력 폼과 등록·수정·삭제를 담당합니다.
import { getFinanceError } from "../utils/financeDataUtils";
import { useState } from "react";
import { createPartner, updatePartner, deletePartner } from "../../../../utils/financeService";
import { initialPartnerForm, toPartnerForm, toSavedPartner, applySavedPartner, } from "../models/financePartnerModel";

export default function usePartnerEditor({
  partnersList,
  setKeyword,
  setPartnersList,
  setSearchFilter,
  setSelectedPartnerId,
  setTradeType,
}) {
  // null이면 신규 등록, ID가 있으면 해당 거래처 수정
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState(initialPartnerForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 삭제 요청 중인지 확인
  const [deleting, setDeleting] = useState(false);
  // 신규 등록폼 열기
  function openPartnerForm() {
    setEditingPartnerId(null);
    setPartnerForm({
      ...initialPartnerForm,
    });
    setFormError("");
    setFormOpen(true);
  }

  // 입력한 항목의 값을 변경합니다.
  function handlePartnerChange(e) {
    const { name, value } = e.target;
    setPartnerForm({
      ...partnerForm,
      [name]: value,
    });
  }

  // 거래처 수정폼 열기
  function openEditPartnerForm(partner) {
    setEditingPartnerId(partner.id);
    setPartnerForm(toPartnerForm(partner));
    setFormError("");
    setFormOpen(true);
  }

  // DB에 신규 거래처를 저장합니다.
  async function handlePartnerSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const isEditing = editingPartnerId !== null;
      let result;
      if (isEditing) result = await updatePartner(editingPartnerId, partnerForm);
      else result = await createPartner(partnerForm);

      let partnerId;
      let previousPartner;
      if (isEditing) {
        partnerId = editingPartnerId;
        previousPartner = partnersList.find((item) => item.id === editingPartnerId);
      } else partnerId = result.partner_id;

      const newPartner = toSavedPartner(partnerForm, partnerId, previousPartner);
      setPartnersList((previous) => applySavedPartner(previous, newPartner, isEditing));

      // 검색 조건을 초기화해서 새 거래처가 보이게 합니다.
      setKeyword("");
      setTradeType("ALL");
      setSearchFilter({
        keyword: "",
        tradeType: "ALL",
      });

      //거래처 등록+수정
      setSelectedPartnerId(newPartner.id);
      setFormOpen(false);
      setEditingPartnerId(null);
      let successMessage = "거래처가 등록되었습니다.";
      if (isEditing) successMessage = "거래처가 수정되었습니다.";
      alert(successMessage);
    } catch (err) {
      setFormError(getFinanceError(err, "거래처 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  // 선택한 거래처 삭제
  async function handlePartnerDelete(partner) {
    if (deleting || saving) return;

    // 취소를 누르면 삭제하지 않습니다.
    const confirmed = window.confirm(
      `[${partner.id}번] ${partner.name} 거래처를 삭제하시겠습니까?`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deletePartner(partner.id);

      // DB 삭제 성공 후 화면 목록에서도 제거합니다.
      setPartnersList((prev) => prev.filter((item) => item.id !== partner.id));
      setSelectedPartnerId(null);

      // 삭제한 거래처의 수정폼이 열려 있으면 닫습니다.
      if (editingPartnerId === partner.id) {
        setFormOpen(false);
        setEditingPartnerId(null);
      }

      // 삭제 후 목록 첫 페이지로 돌아갑니다.
      setSearchFilter((prev) => ({
        ...prev,
        refresh: (prev.refresh || 0) + 1,
      }));
      alert("거래처가 삭제되었습니다.");
    } catch (err) {
      // 거래 내역이 있어 삭제가 차단된 경우도 표시합니다.
      alert(getFinanceError(err, "거래처 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving) return;
    setFormOpen(false);
  }
  // 화면에 전달할 상태와 동작
  return {
    editingPartnerId,
    formOpen,
    partnerForm,
    saving,
    formError,
    deleting,
    openPartnerForm,
    handlePartnerChange,
    openEditPartnerForm,
    handlePartnerSubmit,
    handlePartnerDelete,
    closeRegistrationModal,
  };
}
