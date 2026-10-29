// 예전 데이터에 없는 필드는 기본값을 채워 줍니다.
export function normalizeSchedule(item) {
  return {
    ...item,
    type: item.type || '기타',
    repeat: item.repeat || '없음',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    room: item.room || '',
    attendees: item.attendees || [],
    color: item.color || '#eaf1ff'
  };
}

