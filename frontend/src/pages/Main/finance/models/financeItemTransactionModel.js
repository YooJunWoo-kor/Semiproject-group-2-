// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 거래 금액 계산·폼 변환·등록/입출금 검증·저장 요청값 및 목록 갱신을 담당합니다.
// 품목·입출금 Model: 입력값 변환, 계산, 검증과 목록 갱신만 담당합니다.
export function calculateItemAmounts(form) {
  const quantity = Number(form.quantity);
  const unitPrice = Number(form.unit_price);
  const supplyAmount = quantity * unitPrice;
  const vat = Number(form.vat);
  return {
    quantity,
    unitPrice,
    supplyAmount,
    vat,
    totalAmount: supplyAmount + vat,
  };
}
export function createItemForm(tradeType) {
  let type = "매입";
  if (tradeType === "매출") type = "매출";
  return {
    partner_id: "",
    category_code: "",
    trade_type: type,
    trade_date: "",
    due_date: "",
    item_name: "",
    standard: "",
    quantity: "1",
    unit_price: "",
    vat: "0",
  };
}
export function toApprovedItemForm(item, today) {
  const form = {
    ...createItemForm("매입"),
    trade_date: today,
    due_date: item.dueDate || "",
  };
  if (item.documentType === "비용") {
    form.item_name = item.itemName;
    form.unit_price = String(item.totalAmount);
  }
  return form;
}
export function toItemForm(item) {
  let tradeType = "매입";
  if (item.type === "SALES") tradeType = "매출";
  let standard = item.spec;
  if (standard === "-") standard = "";
  return {
    partner_id: String(item.partnerId),
    category_code: item.categoryCode || "unclassified",
    trade_type: tradeType,
    trade_date: item.date,
    due_date: item.dueDate || "",
    item_name: item.itemName,
    standard,
    quantity: String(item.quantity),
    unit_price: String(item.unitPrice),
    vat: String(item.vat),
  };
}

// 승인 비용의 부가세 변경 시 원본 합계가 유지되도록 공급가를 조정합니다.
export function changeFinanceFormValue(form, name, value, isExpenseRegistration, approval) {
  const next = {
    ...form,
    [name]: value,
  };
  if (isExpenseRegistration && name === "vat")
    next.unit_price = String(approval.totalAmount - Number(value));

  return next;
}
export function changeItemForm(form, name, value, isExpenseRegistration, approval) {
  const next = changeFinanceFormValue(form, name, value, isExpenseRegistration, approval);
  if (name === "trade_type") next.category_code = "";
  return next;
}
export function validateApprovedItemForm(form, approval) {
  if (!approval) return "";
  const { totalAmount } = calculateItemAmounts(form);
  if (form.trade_type !== "매입" || totalAmount !== approval.totalAmount)
    return "수량 × 단가 + 부가세 합계가 원본 승인 금액과 같아야 합니다.";

  return "";
}
export function getItemCreatePayload(form, approval) {
  if (!approval) return form;
  return {
    ...form,
    source_type: approval.originType,
    source_id: approval.originId,
  };
}
export function toSavedItem(form, result, existingItem, approval, savedId, partners) {
  const partner = partners.find((item) => Number(item.partner_id) === Number(form.partner_id));
  let customer = partner?.company_name || "-";
  if (existingItem && Number(existingItem.partnerId) === Number(form.partner_id))
    customer = existingItem.customer;
  if (result.company_name) customer = result.company_name;
  let type = "PURCHASE";
  if (form.trade_type === "매출") type = "SALES";
  let approvalStatus = existingItem?.approvalStatus;
  if (approval) approvalStatus = "승인";
  return {
    id: savedId,
    transactionId: result.transaction_id,
    linkedSourceType: result.linked_source_type || existingItem?.linkedSourceType || null,
    linkedSourceId: result.linked_source_id || existingItem?.linkedSourceId || null,
    approvalStatus: result.approval_status || approvalStatus || null,
    partnerId: Number(form.partner_id),
    type,
    date: form.trade_date,
    categoryCode: result.category_code || form.category_code || "unclassified",
    itemName: form.item_name.trim(),
    spec: form.standard.trim() || "-",
    customer,
    ...calculateItemAmounts(form),
    status: existingItem?.status || "미정산",
    closingDay: partner?.closing_day ?? null,
    dueDate: form.due_date || "",
  };
}
export function applySavedItem(rows, savedItem, isEditing) {
  if (!isEditing) return [savedItem, ...rows];
  return rows.map((item) => {
    if (item.id === savedItem.id) return savedItem;
    return item;
  });
}
export function linkItemApproval(documents, approval, transactionId) {
  return documents.map((document) => {
    if (String(document.document_id) === String(approval.sourceDocumentId))
      return {
        ...document,
        linked_transaction_id: transactionId,
      };

    return document;
  });
}
export function createItemPaymentForm() {
  return {
    payment_date: "",
    amount: "",
    payment_method: "계좌이체",
    account_id: "",
    card_id: "",
  };
}
export function changeItemPaymentForm(form, name, value, isExpenseRegistration, approval) {
  const next = changeFinanceFormValue(form, name, value, isExpenseRegistration, approval);
  if (name === "payment_method") {
    next.account_id = "";
    next.card_id = "";
  }
  return next;
}
export function validateItemPaymentForm(form, target, cardsLoading, cardsError) {
  if (form.payment_method !== "법인카드") return "";
  if (target.type !== "PURCHASE") return "법인카드는 매입 거래의 출금에만 사용할 수 있습니다.";
  if (cardsLoading || cardsError || !form.card_id)
    return "사용할 법인카드를 선택해 주세요. 목록 조회 실패 시 폼을 다시 열어 주세요.";

  return "";
}
export function applyItemSettlement(rows, result) {
  return rows.map((item) => {
    if (Number(item.transactionId) === Number(result.transaction_id))
      return {
        ...item,
        status: result.settlement_status,
      };

    return item;
  });
}
