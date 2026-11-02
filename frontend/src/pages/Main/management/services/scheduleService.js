// 현재는 API 호출 없이 화면에 필요한 일정 데이터 형태만 통일합니다.
export function normalizeSchedule(item = {}) {
  return {
    title: '', department: '개발팀', manager: '', 
    startDate: '', endDate: '', startTime: '', endTime: '',
    status: '예정', priority: '보통', description: '', color: '#eaf1ff',
    type: '기타', room: '', attendees: [],
    ...item,
    attendees: Array.isArray(item.attendees) ? item.attendees : []
  };
}

// 새 일정을 목록에 추가합니다.
export function addSchedule(schedules, entry) {
  const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [...schedules, { ...entry, id }];
}

// 같은 ID의 일정을 수정합니다.
export function updateSchedule(schedules, entry) {
  return schedules.map(item => item.id === entry.id ? entry : item);
}

// 선택한 일정을 삭제합니다.
export function removeSchedule(schedules, id) {
  return schedules.filter(item => item.id !== id);
}

