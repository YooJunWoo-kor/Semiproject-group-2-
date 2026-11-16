/*
 * 공통 유효성 검사 (외부 패키지/React 의존성 없음)
 * 반환: boolean (유효하면 true, 유효하지 않으면 false)
 * 안내 메시지는 호출하는 화면에서 처리합니다.
 * required 기본값은 false. 필수 항목은 { required: true }를 전달하세요.
 * 입력값을 변경하지 않습니다. 저장 시 앞뒤 공백 제거는 호출하는 화면에서 처리하세요.
 * 예: validateEmail(email, { required: true })
 * 예: validateLength(title, { required: true, max: 100, label: '제목' })
 * 예: validateDateRange(startDate, endDate, { required: true })
 */

const isEmpty = value => value == null || (typeof value === 'string' && value.trim() === '');
const isText = value => typeof value === 'string';

// 일반적인 이메일 형식 검사입니다. 실제 메일 수신 여부는 확인하지 않습니다.
export function validateEmail(value, { required = false } = {}) {
  if (isEmpty(value)) return required ? false : true;
  if (!isText(value)) return false;
  const email = value.trim();
  const parts = email.split('@');
  if (parts.length !== 2 || email.length > 254 || parts[0].length > 64) {
    return false;
  }
  const [local, domain] = parts;
  const localValid = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)
    && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
  const labels = domain.split('.');
  const domainValid = labels.length >= 2 && labels.every(part =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(part));
  return localValid && domainValid ? true : false;
}

// 국내 휴대전화·지역번호·070·080 및 대표번호(15xx/16xx/18xx)를 지원합니다.
// 숫자만 또는 올바른 위치의 하이픈을 허용하며, 국제전화·내선번호는 제외합니다.
export function validatePhone(value, { required = false } = {}) {
  if (isEmpty(value)) return required ? false : true;
  if (!isText(value)) return false;
  const phone = value.trim();
  const patterns = [
    /^010(?:\d{8}|-\d{4}-\d{4})$/,
    /^01[16789](?:\d{7,8}|-\d{3,4}-\d{4})$/,
    /^02(?:\d{7,8}|-\d{3,4}-\d{4})$/,
    /^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])(?:\d{7,8}|-\d{3,4}-\d{4})$/,
    /^070(?:\d{8}|-\d{4}-\d{4})$/,
    /^080(?:\d{7}|-\d{3}-\d{4})$/,
    /^1[568]\d{2}(?:\d{4}|-\d{4})$/
  ];
  return patterns.some(pattern => pattern.test(phone))
    ? true : false;
}

// 국내 사업자등록번호 10자리 및 검증번호 검사. 실제 등록/휴폐업 조회는 아닙니다.
export function validateBusinessNumber(value, { required = false } = {}) {
  if (isEmpty(value)) return required ? false : true;
  if (!isText(value) || !/^(?:\d{10}|\d{3}-\d{2}-\d{5})$/.test(value.trim())) {
    return false;
  }
  const digits = value.trim().replace(/-/g, '').split('').map(Number);
  if (digits.every(digit => digit === 0)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0)
    + Math.floor(digits[8] * 5 / 10);
  return (10 - sum % 10) % 10 === digits[9]
    ? true : false;
}

// 기본적으로 공백을 포함합니다. trim: true이면 앞뒤 공백을 제외합니다.
// Unicode 코드 포인트 기준: 한글 1글자=1, 복합 이모지는 여러 글자로 계산될 수 있습니다.
//회사명·고객명 등 일반 정보:100자
//주소:200자
//품목명:150자
//품목 추가 설명;300자
//입금 계좌 / 지급 안내:200자
//비고:2,000자

export function validateLength(value, {
  required = false, min = 0, max = Infinity, trim = false
} = {}) {
  if (!Number.isInteger(min) || min < 0
    || !(max === Infinity || Number.isInteger(max)) || max < min) {
    return false; // 잘못된 글자 수 옵션도 false를 반환합니다.
  }
  if (isEmpty(value)) return required ? false : true;
  if (!isText(value)) return false;
  const length = Array.from(trim ? value.trim() : value).length;
  if (length < min) return false;
  if (length > max) return false;
  return true;
}

// YYYY-MM-DD만 허용하며 2월 30일 같은 존재하지 않는 날짜도 거부합니다.
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

// required: true이면 두 날짜 모두 필수. allowSameDay: false이면 같은 날짜도 거부합니다.
export function validateDateRange(start, end, {
  required = false, allowSameDay = true
} = {}) {
  if (required && isEmpty(start)) return false;
  if (required && isEmpty(end)) return false;
  for (const value of [start, end]) {
    if (!isEmpty(value) && (!isText(value) || !isValidDate(value.trim()))) {
      return false;
    }
  }
  if (isEmpty(start) || isEmpty(end)) return true;
  if (start.trim() > end.trim()) return false;
  if (!allowSameDay && start.trim() === end.trim()) return false;
  return true;
}


// HH:mm 형식만 허용합니다. 예: 09:00, 18:30
function isValidTime(value) {
  return typeof value === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

// 시작 시간과 종료 시간의 순서를 검사합니다.
// 같은 날 이용하는 시간을 기준으로 하며, 자정을 넘는 예약은 허용하지 않습니다.
export function validateTimeRange(start, end, {
  required = false,
  allowSameTime = false
} = {}) {
  if (required && isEmpty(start)) {
    return false;
  }

  if (required && isEmpty(end)) {
    return false;
  }

  for (const value of [start, end]) {
    if (!isEmpty(value) && !isValidTime(value)) {
      return false;
    }
  }

  if (isEmpty(start) || isEmpty(end)) return true;

  if (start.trim() > end.trim()) {
    return false;
  }

  if (!allowSameTime && start.trim() === end.trim()) {
    return false;
  }

  return true;
}

// 회의실 예약이 운영시간 안에 들어오는지 검사합니다.
export function validateMeetingRoomHours(start, end, {
  openTime = '09:00',
  closeTime = '18:00'
} = {}) {
  const hoursResult = validateTimeRange(openTime, closeTime, {
    required: true
  });

  if (!hoursResult) return hoursResult;

  const reservationResult = validateTimeRange(start, end, {
    required: true
  });

  if (!reservationResult) return reservationResult;

  if (start.trim() < openTime.trim() || end.trim() > closeTime.trim()) {
    return false;
  }

  return true;
}

// 같은 회의실·날짜의 기존 예약과 시간이 겹치는지 검사합니다.
// reservations에는 취소된 예약을 제외한 목록을 전달해주세요.
// 수정 중인 예약은 excludeId로 제외할 수 있습니다.
export function validateMeetingRoomOverlap({
  roomId,
  date,
  start,
  end,
  reservations = [],
  excludeId = null
}) {
  if (roomId === null || roomId === undefined || roomId === '') {
    return false;
  }

  const dateResult = validateDateRange(date, date, {
    required: true
  });

  if (!dateResult) return dateResult;

  const timeResult = validateTimeRange(start, end, {
    required: true
  });

  if (!timeResult) return timeResult;

  if (!Array.isArray(reservations)) {
    return false;
  }

  const sameRoomReservations = reservations.filter(reservation => {
    const isExcluded = excludeId !== null
      && excludeId !== undefined
      && String(reservation.id) === String(excludeId);

    return !isExcluded
      && String(reservation.roomId) === String(roomId)
      && reservation.date === date.trim();
  });

  for (const reservation of sameRoomReservations) {
    if (
      !isValidTime(reservation.start)
      || !isValidTime(reservation.end)
      || reservation.start.trim() >= reservation.end.trim()
    ) {
      return false;
    }

    // 앞 예약의 종료 시간과 다음 예약의 시작 시간이 같으면 허용합니다.
    const overlaps = start.trim() < reservation.end.trim()
      && end.trim() > reservation.start.trim();

    if (overlaps) {
      return false;
    }
  }

  return true;
}
