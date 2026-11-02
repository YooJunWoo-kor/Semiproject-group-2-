// 일정관리 전용 날짜 및 일정 계산 함수
export const departments = ['개발팀', '기획팀', '인사팀', '영업팀', '마케팅팀', '디자인팀', '상품기획팀', '연구개발팀', '품질관리팀'];
export const types = ['회의', '업무', '교육', '행사', '휴가', '출장', '기타'];

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 두 일정의 날짜가 겹치는지 확인합니다.
function intersect(a, b) {
  return a.startDate <= b.endDate && a.endDate >= b.startDate;
}

// 시간이 비어 있으면 날짜 기준으로만 비교합니다.
function timeIntersect(a, b) {
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) return true;
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

// 담당자와 참석자 이름을 모읍니다.
function names(item) {
  const attendees = (item.attendees || []).map(person =>
    typeof person === 'string' ? person : person.name
  );
  return [item.manager, ...attendees].filter(Boolean);
}

// 같은 시간에 회의실이나 담당자가 겹치는 일정을 찾습니다.
export function conflicts(entry, schedules = []) {
  return schedules.flatMap(item => {
    if (entry.id != null && String(item.id) === String(entry.id)) return [];
    if (!intersect(entry, item) || !timeIntersect(entry, item)) return [];
    const result = [];
    if (entry.room && entry.room === item.room) result.push({...item, conflictType:'room'});
    if (names(entry).some(name => names(item).includes(name))) result.push({...item, conflictType:'person'});
    return result;
  });
}

