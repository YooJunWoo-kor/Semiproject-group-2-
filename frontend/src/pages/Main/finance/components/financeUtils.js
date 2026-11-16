//재무 공통 기능: 오류 문구·한국 날짜·카드 데이터 변환.
export function getFinanceError(error, fallbackMessage) {
  return error.response?.data?.message || fallbackMessage;
}

export function koreaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function toFinanceCard(card) {
  return {
    id: card.card_id,
    cardName: card.card_name,
    departmentId: card.department_id,
    department: card.department_name || '미지정',
    managerId: card.employee_id,
    managerName: card.manager_name || '미지정',
    currentUsage: Number(card.monthly_usage ?? 0),
    monthlyLimit: Number(card.monthly_limit ?? 0),
    remainingLimit: Number(card.remaining_limit ?? 0),
    status: card.card_status || '미지정'
  };
}
