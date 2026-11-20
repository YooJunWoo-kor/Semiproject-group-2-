// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 문서/고객/품목 기본값·저장 스냅샷·거래처/계좌 선택·저장 요청값 구성을 담당합니다.
import { localDate } from "../utils/financeDocumentUtils";

let itemId = 0;
export const newItem = () => ({
  id: ++itemId,
  name: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  taxRate: "10",
});
export const emptyParty = () => ({
  name: "",
  email: "",
  address: "",
  city: "",
  country: "대한민국",
  phone: "",
  businessNumber: "",
});
export const initialDocument = (type) => ({
  business: emptyParty(),
  customer: emptyParty(),
  // 확정 번호는 저장 시 서버에서 발급합니다.
  number: "",
  partnerId: "",
  date: localDate(),
  extraDate: "",
  method: "계좌이체",
  currency: "KRW",
  account: "",
  note: "",
  items: [newItem()],
});
export function documentSnapshot(document) {
  return {
    ...document.snapshot_json.data,
    number: document.document_number,
  };
}
export function updateDocumentParty(data, key, field, value) {
  return {
    ...data,
    [key]: {
      ...data[key],
      [field]: value,
    },
  };
}
export function updateDocumentItem(data, id, key, value) {
  return {
    ...data,
    items: data.items.map((item) => {
      if (item.id === id)
        return {
          ...item,
          [key]: value,
        };
      return item;
    }),
  };
}
export function selectDocumentPartner(data, id, partners) {
  const partner = partners.find((value) => String(value.partner_id) === id);
  let customer = data.customer;
  if (partner)
    customer = {
      ...emptyParty(),
      name: partner.company_name || "",
      address: partner.company_address || "",
      phone: partner.company_phone || "",
      businessNumber: partner.tax_id || "",
    };

  return {
    ...data,
    partnerId: id,
    customer,
  };
}
export function getDocumentAccountLabel(account) {
  return [account.bank_name, account.account_number, account.account_name]
    .filter(Boolean)
    .join(" / ");
}
export function selectDocumentAccount(data, id, accounts) {
  const account = accounts.find((row) => String(row.account_id) === id);
  let label = "";
  if (account) label = getDocumentAccountLabel(account);
  return {
    ...data,
    accountId: id,
    account: label,
  };
}
export function getFinanceDocumentPayload(type, employeeId, data) {
  return {
    document_type: type,
    employee_id: employeeId,
    partner_id: data.partnerId || null,
    data,
  };
}
