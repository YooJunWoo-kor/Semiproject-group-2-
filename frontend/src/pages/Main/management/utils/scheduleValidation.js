// 일정 입력값 검사를 담당하는 공통 함수입니다.
// 문제가 없으면 빈 문자열('')을 반환합니다.
export function validateSchedule(form) {
  if (!form.title?.trim() || !form.manager?.trim()) {
    return '일정명과 담당자를 입력해 주세요.';
  }

  if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
    return '시작일과 종료일을 확인해 주세요.';
  }

  if (form.startTime && form.endTime &&
      form.startDate === form.endDate && form.endTime <= form.startTime) {
    return '종료 시간은 시작 시간보다 늦어야 합니다.';
  }

  if (form.room) {
    if (!form.startTime || !form.endTime) {
      return '회의실 시작 시간과 종료 시간을 입력해 주세요.';
    }
    if (form.startDate !== form.endDate) {
      return '회의실 예약은 하루 단위로 등록해 주세요.';
    }
    // HH:MM 형태, 09:00~20:00 범위, 30분 단위 검사
    const isMeetingTime = time => {
      if (!/^\d{2}:\d{2}$/.test(time)) return false;
      const [hour, minute] = time.split(':').map(Number);
      const total = hour * 60 + minute;
      return total >= 9 * 60 && total <= 20 * 60 &&
        (minute === 0 || minute === 30);
    };
    if (!isMeetingTime(form.startTime) || !isMeetingTime(form.endTime)) {
      return '회의실 예약은 09:00~20:00 사이에서 30분 단위로 선택해 주세요.';
    }
    if (form.endTime <= form.startTime) {
      return '회의실 종료 시간은 시작 시간보다 늦어야 합니다.';
    }
  }

  return '';
}
