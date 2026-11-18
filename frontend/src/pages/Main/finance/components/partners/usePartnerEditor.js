// 거래처 입력 폼과 등록·수정·삭제를 담당합니다.
import { getFinanceError } from "../financeUtils";
import { useState } from "react";
import { createPartner, updatePartner, deletePartner } from "../../../../../utils/financeService";
import { initialPartnerForm } from "./partnerModel";

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
    function inputValue(value) {
      return value === "-" || value == null ? "" : value;
    }
    setEditingPartnerId(partner.id);

    // 선택한 거래처 정보를 기존 입력폼에 채웁니다.
    setPartnerForm({
      company_name: partner.name,
      tax_id: inputValue(partner.bizNumber),
      representative_name: inputValue(partner.ceo),
      company_phone: inputValue(partner.contact),
      company_address: inputValue(partner.address),
      memo: inputValue(partner.memo),
      trade_role: partner.type,
      company_type: inputValue(partner.companyType),
      closing_day: partner.closingDay ?? "",
      calendar_type_id: partner.calendarTypeId ?? "",
      bank_name: inputValue(partner.bankInfo.bank),
      account_number: inputValue(partner.bankInfo.account),
      account_holder: inputValue(partner.bankInfo.holder),
    });
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
      if (isEditing) {
        result = await updatePartner(editingPartnerId, partnerForm);
      } else {
        result = await createPartner(partnerForm);
      }

      let receivableAmount = 0;
      let payableAmount = 0;
      let missingItems = 0;
      if (isEditing) {
        const previousPartner = partnersList.find((item) => item.id === editingPartnerId);
        receivableAmount = previousPartner.receivableAmount;
        payableAmount = previousPartner.payableAmount;
        missingItems = previousPartner.missingItems;
      }

      // 저장에 성공한 데이터를 화면용 이름으로 변환합니다.
      const newPartner = {
        id: isEditing ? editingPartnerId : result.partner_id,
        name: partnerForm.company_name.trim(),
        type: partnerForm.trade_role,
        bizNumber: partnerForm.tax_id.trim() || "-",
        ceo: partnerForm.representative_name.trim() || "-",
        contact: partnerForm.company_phone.trim() || "-",
        address: partnerForm.company_address.trim() || "-",
        companyType: partnerForm.company_type.trim() || "-",
        memo: partnerForm.memo.trim() || "-",
        settlementType: partnerForm.trade_role === "매입" ? "출금 마감" : "입금 마감",
        closingDay: partnerForm.closing_day === "" ? null : Number(partnerForm.closing_day),
        calendarTypeId: partnerForm.calendar_type_id,
        closingDate: "",
        // 수정 시 기존 계산 금액을 유지하고, 신규 등록은 0원입니다.
        receivableAmount,
        payableAmount,
        missingItems,
        bankInfo: {
          bank: partnerForm.bank_name.trim() || "-",
          account: partnerForm.account_number.trim() || "-",
          holder: partnerForm.account_holder.trim() || "-",
        },
      };
      if (isEditing) {
        // 수정한 ID의 거래처만 교체합니다.
        setPartnersList((prev) => prev.map((item) => (item.id === editingPartnerId ? newPartner : item)));
      } else {
        // 신규 등록일 때만 행을 추가합니다.
        setPartnersList((prev) => [newPartner, ...prev]);
      }

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
      alert(isEditing ? "거래처가 수정되었습니다." : "거래처가 등록되었습니다.");
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
    const confirmed = window.confirm(`[${partner.id}번] ${partner.name} 거래처를 삭제하시겠습니까?`);
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
