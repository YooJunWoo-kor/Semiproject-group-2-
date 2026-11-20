// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 거래처 변환·검색·마감 달력·잔액 표시·등록/수정 값 계산을 담당합니다.
//거래처 변환·검색·정기 마감 달력과 표시값을 계산합니다.
import { TOGLE_COLORS } from "../../../../utils/authStorage";

export const partnerCalendarColors = Object.entries(TOGLE_COLORS || {})
  .filter(
    ([key, color]) => /^(0|[1-9]\d*)$/.test(key) && Number(key) <= 255 && typeof color === "string",
  )
  .map(([key, color]) => ({
    typeId: Number(key),
    color,
  }));
export function getPartnerCalendarTypeId(partner) {
  const value = partner.calendarTypeId;
  let selected = null;
  if (value !== "" && value != null) selected = Number(value);

  if (selected !== null && partnerCalendarColors.some((option) => option.typeId === selected))
    return selected;

  if (partner.settlementType === "입금 마감") return 0;

  return 2;
}

// 신규 거래처 입력폼의 초기값
export const initialPartnerForm = {
  company_name: "",
  tax_id: "",
  representative_name: "",
  company_phone: "",
  company_address: "",
  memo: "",
  trade_role: "매입",
  company_type: "",
  closing_day: "",
  calendar_type_id: "",
  bank_name: "",
  account_number: "",
  account_holder: "",
};
// 로컬 날짜로 현재 조회 월을 만듭니다.
export {
  currentFinanceLocalMonth as currentPartnerMonth,
  shiftFinanceLocalMonth as shiftPartnerMonth,
} from "../utils/financeDataUtils";
export function filterPartnerMonth(rows, month, allPeriods) {
  if (allPeriods) return rows;

  return rows.filter((row) => String(row.trade_date || "").slice(0, 7) === month);
}
export function toPartner(item) {
  return {
    id: item.partner_id,
    name: item.company_name,
    type: item.trade_role || "-",
    bizNumber: item.tax_id || "-",
    ceo: item.representative_name || "-",
    contact: item.company_phone || "-",
    address: item.company_address || "-",
    companyType: item.company_type || "-",
    memo: item.memo || "-",
    // DB 연결
    // 매입은 출금, 매출은 입금으로 표시
    settlementType: getPartnerSettlementType(item.trade_role),
    // 매월 정기 마감일
    closingDay: item.closing_day,
    calendarTypeId: item.calendar_type_id == null ? "" : String(item.calendar_type_id),
    // 달력용 날짜는 다음 단계에서 연결
    closingDate: "",
    // 거래처 계좌정보
    bankInfo: {
      bank: item.bank_name || "-",
      account: item.account_number || "-",
      holder: item.account_holder || "-",
    },
    // 백엔드에서 계산한 금액을 숫자로 변환합니다.
    receivableAmount: Number(item.receivable_amount),
    payableAmount: Number(item.payable_amount),
    missingItems: Number(item.missing_items),
  };
}
export function buildPartnerCalendarEvents(partnersList) {
  // 캘린더 이벤트 매핑 (BasicCalendar / WeeklyCalendar 공통 인터페이스 규격)
  // 정기 마감일로 매월 달력 일정을 만듭니다.
  const calendarEvents = [];
  const currentYear = new Date().getFullYear();

  // 작년부터 내년까지의 마감 일정을 생성합니다.
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let month = 0; month < 12; month++) {
      // 해당 월의 마지막 날짜
      const lastDay = new Date(year, month + 1, 0).getDate();
      partnersList.forEach((item) => {
        const closingDay = Number(item.closingDay);

        // 마감일이 없거나 잘못된 값이면 건너뜁니다.
        if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) return;

        // 31은 말일로 처리합니다.
        // 29일, 30일도 해당 월에 없으면 말일로 처리합니다.
        const day = Math.min(closingDay, lastDay);
        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const date = `${year}-${mm}-${dd}`;
        calendarEvents.push({
          id: `${item.id}-${date}`,
          title: `[${item.settlementType}] ${item.name}`,
          start: date,
          end: date,
          typeId: getPartnerCalendarTypeId(item),
          description: "거래처 정기 정산 마감 일정",
        });
      });
    }
  }

  // 선택한 거래처의 정보를 찾습니다.
  return calendarEvents;
}
export function filterPartners(partnersList, searchFilter) {
  return partnersList.filter((item) => {
    const searchText = searchFilter.keyword.toLowerCase();

    // 거래처명 또는 사업자번호에 검색어가 포함되는지 확인
    const matchesKeyword =
      item.name.toLowerCase().includes(searchText) ||
      item.bizNumber.toLowerCase().includes(searchText);

    // DB의 거래 역할 값은 "매입", "매출"입니다.
    const matchesType = searchFilter.tradeType === "ALL" || item.type === searchFilter.tradeType;
    return matchesKeyword && matchesType;
  });
}
export function getPartnerClosingDayLabel(partner) {
  if (!partner.closingDay) return "-";
  if (Number(partner.closingDay) === 31) return "매월 말일";
  return "매월 " + partner.closingDay + "일";
}
export function getPartnerSettlementType(role) {
  if (role === "매입") return "출금 마감";
  if (role === "매출") return "입금 마감";
  return "-";
}
export function getPartnerBalanceLabel(partner, type) {
  if (partner.missingItems > 0) return "확인 필요";
  let amount = partner.payableAmount;
  if (type === "매출") amount = partner.receivableAmount;
  return amount.toLocaleString() + "원";
}
export function getPartnerRemainingLabel(rows) {
  if (rows.some((row) => row.remaining_amount == null)) return "확인 필요";
  return rows.reduce((sum, row) => sum + Number(row.remaining_amount), 0).toLocaleString() + "원";
}

// 화면 표시값을 수정 폼 값으로 변환합니다. React 상태나 API를 사용하지 않습니다.
export function toPartnerForm(partner) {
  function inputValue(value) {
    if (value === "-" || value == null) return "";
    return value;
  }
  return {
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
  };
}

// 신규/수정 저장 후 사용할 화면 데이터. 기존 조회 금액은 유지합니다.
export function toSavedPartner(partnerForm, partnerId, previousPartner) {
  let receivableAmount = 0;
  let payableAmount = 0;
  let missingItems = 0;
  if (previousPartner) {
    receivableAmount = previousPartner.receivableAmount;
    payableAmount = previousPartner.payableAmount;
    missingItems = previousPartner.missingItems;
  }
  let closingDay = null;
  if (partnerForm.closing_day !== "") closingDay = Number(partnerForm.closing_day);
  return {
    id: partnerId,
    name: partnerForm.company_name.trim(),
    type: partnerForm.trade_role,
    bizNumber: partnerForm.tax_id.trim() || "-",
    ceo: partnerForm.representative_name.trim() || "-",
    contact: partnerForm.company_phone.trim() || "-",
    address: partnerForm.company_address.trim() || "-",
    companyType: partnerForm.company_type.trim() || "-",
    memo: partnerForm.memo.trim() || "-",
    settlementType: getPartnerSettlementType(partnerForm.trade_role),
    closingDay: closingDay,
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
}
export function applySavedPartner(partners, savedPartner, isEditing) {
  if (!isEditing) return [savedPartner, ...partners];
  return partners.map((partner) => {
    if (partner.id === savedPartner.id) return savedPartner;
    return partner;
  });
}
