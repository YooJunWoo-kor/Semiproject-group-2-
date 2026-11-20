// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 대시보드 기간·통계 정의·일정 문서 선택·금액 표시 계산을 담당합니다.
export const PERIODS = [
  ["day", "일간"],
  ["week", "주간"],
  ["month", "월간"],
  ["year", "연간"],
];
export const PERIOD_TEXT = {
  day: "오늘",
  week: "이번 주",
  month: "이번 달",
  year: "올해",
};
export const numberText = (value) => Number(value || 0).toLocaleString("ko-KR");
export const dashboardStats = [
  ["cards", "법인카드"],
  ["accounts", "회사계좌"],
  ["approvals", "신규 기안"],
  ["partners", "거래처"],
  ["items", "관리 품목"],
];
export function getScheduleCandidates(data, title) {
  const matches = (data?.schedules || []).filter((schedule) => String(schedule.title) === title);
  return Array.from(new Map(matches.map((schedule) => [String(schedule.id), schedule])).values());
}
export function getDashboardDocumentId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}
export function validateDashboardResponse(result) {
  if (!result.counts || !result.ranges || !Array.isArray(result.schedules))
    return "대시보드 응답을 확인해 주세요. API 주소가 맞는지 확인해 주세요.";

  return "";
}
export function getDashboardRangeText(range) {
  if (!range) return "—";
  if (range.start === range.last) return range.start;
  return `${range.start} ~ ${range.last}`;
}
export function getDashboardAmountText(data, kind, period, loading) {
  if (loading || !data) return "—";
  return `${numberText(data[kind]?.[period])}원`;
}
