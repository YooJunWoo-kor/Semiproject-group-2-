//거래 등록·수정·삭제 및 입력 폼 상태를 담당합니다.
import { getTradeApprovalStatus } from "./itemUtils";
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import {
  getItemCategories,
  getApprovals,
  getPartners,
  createItem,
  updateItem,
  deleteItem,
} from "../../../../../utils/financeService";


export default function useItemEditor({
  approvedDocuments,
  attachmentBusy,
  initialCreate,
  initialTradeType,
  itemList,
  onDataChange,
  paymentSaving,
  selectedItemId,
  setActiveTab,
  setApprovalsError,
  setApprovedDocuments,
  setItemList,
  setPaymentRefresh,
  setPaymentTarget,
  setSearchTerm,
  setSelectedItemId,
  setSettlementFilter,
  today,
}) {
  const selectedItem = itemList.find((item) => item.id === selectedItemId);
  // 등록폼 표시 여부
  const [formOpen, setFormOpen] = useState(initialCreate);

  // 저장 진행 여부와 오류 메시지
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 등록폼에서 선택할 거래처 목록
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [itemCategories, setItemCategories] = useState({
    purchase: [],
    sales: [],
  });
  const [categoryError, setCategoryError] = useState("");
  useEffect(() => {
    let cancelled = false;
    getItemCategories()
      .then((data) => {
        if (!cancelled) setItemCategories(data);
      })
      .catch(() => {
        if (!cancelled)
          setCategoryError("분류 목록을 불러오지 못했습니다. 백엔드 재시작 후 새로고침해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 신규 거래 입력값
  const [itemForm, setItemForm] = useState({
    partner_id: "",
    category_code: "",
    trade_type: initialTradeType === "매출" ? "매출" : "매입",
    trade_date: "",
    due_date: "",
    // 정산 마감일
    item_name: "",
    standard: "",
    quantity: "1",
    unit_price: "",
    vat: "0",
  });

  // null이면 신규 등록, ID가 있으면 해당 품목 수정
  const [editingItemId, setEditingItemId] = useState(null);
  const [linkingApproval, setLinkingApproval] = useState(null);

  // 등록폼에서 선택할 거래처 목록 조회
  useEffect(() => {
    async function loadPartnerOptions() {
      try {
        const data = await getPartners();
        setPartnerOptions(data);
      } catch (err) {
        console.error("거래처 목록 조회 오류:", err);
        setFormError("거래처 목록을 불러오지 못했습니다.");
      }
    }
    loadPartnerOptions();
  }, []);

  // 신규 등록폼 열기
  function openItemForm(tradeType) {
    if (saving || paymentSaving || attachmentBusy) return;
    setLinkingApproval(null);
    setPaymentTarget(null); // 입금·출금 입력폼 닫기
    setEditingItemId(null); // 신규 등록 모드

    setItemForm({
      partner_id: "",
      category_code: "",
      trade_type: tradeType === "매출" ? "매출" : "매입",
      trade_date: "",
      due_date: "",
      // 새 등록폼을 열면 마감일 초기화
      item_name: "",
      standard: "",
      quantity: "1",
      unit_price: "",
      vat: "0",
    });
    setFormError("");
    setSelectedItemId(null);
    setFormOpen(true);
  }
  function openApprovedTradeForm(item) {
    if (
      saving ||
      paymentSaving ||
      attachmentBusy ||
      !item.isApprovalDocument ||
      item.isPayrollDraft ||
      getTradeApprovalStatus(item, approvedDocuments) !== "APPROVED"
    )
      return;
    if (!Number.isSafeInteger(item.totalAmount) || item.totalAmount <= 0) {
      alert("원본 승인 금액이 미등록입니다. 금액이 있는 기안서부터 등록해주세요.");
      return;
    }
    setLinkingApproval(item);
    setEditingItemId(null);
    setPaymentTarget(null);
    setFormError("");
    setItemForm({
      partner_id: "",
      category_code: "",
      trade_type: "매입",
      trade_date: today,
      due_date: item.dueDate || "",
      item_name: item.documentType === "비용" ? item.itemName : "",
      standard: "",
      quantity: "1",
      unit_price: item.documentType === "비용" ? String(item.totalAmount) : "",
      vat: "0",
    });
    setFormOpen(true);
  }

  // [비용 간편등록 추가] 승인 비용만 원본 금액으로 등록합니다.
  const isExpenseRegistration = linkingApproval?.isSourceDraft && linkingApproval.documentType === "비용";

  // 입력칸의 name에 해당하는 값을 변경합니다.
  function handleItemChange(e) {
    const { name, value } = e.target;
    setItemForm((prev) => {
      const nextForm = { ...prev, [name]: value };
      if (isExpenseRegistration && name === "vat") {
        nextForm.unit_price = String(linkingApproval.totalAmount - Number(value));
      }
      if (name === "trade_type") {
        nextForm.category_code = "";
      }
      return nextForm;
    });
  }

  async function handleItemSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const isEditing = editingItemId !== null;
    if (linkingApproval) {
      const total = Number(itemForm.quantity) * Number(itemForm.unit_price) + Number(itemForm.vat);
      if (itemForm.trade_type !== "매입" || total !== linkingApproval.totalAmount) {
        setFormError("수량 × 단가 + 부가세 합계가 원본 승인 금액과 같아야 합니다.");
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      // 수정과 신규 등록을 구분합니다.
      let result;
      if (isEditing) {
        result = await updateItem(editingItemId, itemForm);
      } else {
        let payload = itemForm;
        if (linkingApproval) {
          payload = {
            ...itemForm,
            source_type: linkingApproval.originType,
            source_id: linkingApproval.originId,
          };
        }
        result = await createItem(payload);
      }
      const partner = partnerOptions.find((item) => Number(item.partner_id) === Number(itemForm.partner_id));
      const existingItem = isEditing ? itemList.find((item) => item.id === editingItemId) : null;
      const quantity = Number(itemForm.quantity);
      const unitPrice = Number(itemForm.unit_price);
      const supplyAmount = quantity * unitPrice;
      const vat = Number(itemForm.vat);
      const savedItem = {
        id: isEditing ? editingItemId : result.item_id,
        transactionId: result.transaction_id,
        linkedSourceType: result.linked_source_type || existingItem?.linkedSourceType || null,
        linkedSourceId: result.linked_source_id || existingItem?.linkedSourceId || null,
        approvalStatus:
          result.approval_status || (linkingApproval ? "승인" : existingItem?.approvalStatus) || null,
        partnerId: Number(itemForm.partner_id),
        type: itemForm.trade_type === "매출" ? "SALES" : "PURCHASE",
        date: itemForm.trade_date,
        categoryCode: result.category_code || itemForm.category_code || "unclassified",
        itemName: itemForm.item_name.trim(),
        spec: itemForm.standard.trim() || "-",
        // 기존 거래처를 유지하면 저장 당시의 거래처명도 유지합니다.
        customer:
          result.company_name ||
          (existingItem && Number(existingItem.partnerId) === Number(itemForm.partner_id)
            ? existingItem.customer
            : partner?.company_name || "-"),
        unitPrice,
        quantity,
        supplyAmount,
        vat,
        totalAmount: supplyAmount + vat,
        status: existingItem?.status || "미정산",
        closingDay: partner?.closing_day ?? null,
        dueDate: itemForm.due_date || "",
      };
      setItemList((prev) => {
        if (isEditing) {
          return prev.map((item) => {
            if (item.id === editingItemId) return savedItem;
            return item;
          });
        }
        return [savedItem, ...prev];
      });
      if (linkingApproval) {
        setApprovedDocuments((previous) =>
          previous.map((document) =>
            String(document.document_id) === String(linkingApproval.sourceDocumentId)
              ? {
                  ...document,
                  linked_transaction_id: result.transaction_id,
                }
              : document,
          ),
        );
      }
      setLinkingApproval(null);
      setActiveTab("ALL");
      setSearchTerm("");
      setSettlementFilter("ALL");
      setSelectedItemId(savedItem.id);
      setPaymentRefresh((prev) => prev + 1);
      onDataChange?.();
      setFormOpen(false);
      setEditingItemId(null);
      alert(isEditing ? "거래 품목이 수정되었습니다." : "거래 품목이 등록되었습니다.");
    } catch (err) {
      setFormError(
        getFinanceError(err, isEditing ? "거래 품목 수정에 실패했습니다." : "거래 품목 등록에 실패했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 거래 품목 삭제
  async function handleItemDelete() {
    if (!selectedItem || selectedItem.isApprovalDocument || saving || paymentSaving || attachmentBusy) return;
    const confirmed = window.confirm(
      `"${selectedItem.itemName}" 품목을 삭제하시겠습니까?\n` +
        "이 거래의 마지막 품목이면 거래 정보도 함께 삭제됩니다.",
    );
    if (!confirmed) return;
    const itemId = selectedItem.id;
    setSaving(true);
    try {
      // 서버에서 삭제에 성공한 뒤 화면 목록도 변경합니다.
      await deleteItem(itemId);
      onDataChange?.();
      setItemList((prev) => prev.filter((item) => item.id !== itemId));

      // 삭제한 품목의 상세정보와 수정폼을 닫습니다.
      setSelectedItemId(null);
      setFormOpen(false);
      setEditingItemId(null);
      setFormError("");
      try {
        setApprovedDocuments(await getApprovals());
      } catch {
        setApprovalsError("거래는 삭제되었지만 원본 목록 재조회에 실패했습니다. 새로고침해주세요.");
      }
      alert("거래 품목이 삭제되었습니다.");
    } catch (err) {
      alert(getFinanceError(err, "거래 품목 삭제에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  // 선택한 품목의 기존 내용을 입력폼에 채웁니다.
  function openEditItemForm(item) {
    if (item.isApprovalDocument || saving || paymentSaving || attachmentBusy) return;
    setLinkingApproval(null);
    setPaymentTarget(null);
    setEditingItemId(item.id);
    setItemForm({
      partner_id: String(item.partnerId),
      category_code: item.categoryCode || "unclassified",
      trade_type: item.type === "SALES" ? "매출" : "매입",
      trade_date: item.date,
      due_date: item.dueDate || "",
      item_name: item.itemName,
      standard: item.spec === "-" ? "" : item.spec,
      quantity: String(item.quantity),
      unit_price: String(item.unitPrice),
      vat: String(item.vat),
    });
    setFormError("");
    setFormOpen(true);
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving || paymentSaving || attachmentBusy) return;
    setFormOpen(false);
  }
  return {
    formOpen,
    setFormOpen,
    saving,
    formError,
    partnerOptions,
    itemCategories,
    categoryError,
    itemForm,
    editingItemId,
    linkingApproval,
    openItemForm,
    openApprovedTradeForm,
    isExpenseRegistration,
    handleItemChange,
    handleItemSubmit,
    handleItemDelete,
    openEditItemForm,
    closeRegistrationModal,
  };
}
