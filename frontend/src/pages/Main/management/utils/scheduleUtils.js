export const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateOf = s => new Date(`${s}T12:00:00`);

export const addDays = (s, n) => {
    const d = dateOf(s); d.setDate(d.getDate() + n);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addMonths = (s, n) => { const d = dateOf(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const duration = s => Math.round((dateOf(s.endDate) - dateOf(s.startDate)) / 86400000);

export const occurrences = (s, from, to) => {
    if (!s.startDate || !s.endDate || !from || !to || from > to)
        return [];
    const mode = s.repeat || '없음', limit = s.repeatUntil || addMonths(s.startDate, 12);

    const result = []; let start = s.startDate, span = duration(s), i = 0;

    while (i < 1500 && start <= to && (mode === '없음' || start <= limit)) {
        const end = addDays(start, span);
        if (end >= from) result.push({ ...s, startDate: start, endDate: end, occurrenceDate: start, instanceKey: `${s.id}-${start}` });
        if (mode === '없음') break;
        const next = mode === '매일' ? addDays(start, 1) : mode === '매주' ? addDays(start, 7) : mode === '매월' ? addMonths(s.startDate, ++i) : mode === '매년' ? addMonths(s.startDate, 12 * (++i)) : null;
        if (!next || next <= start) break;
        start = next; if (mode === '매일' || mode === '매주') i++;
    }
    return result;
};
export const overlaps = (a, b) => a.startDate <= b.endDate &&
    b.startDate <= a.endDate &&
    (!a.startTime || !a.endTime || !b.startTime || !b.endTime ||
        (a.startTime < b.endTime && b.startTime < a.endTime));

export const conflicts = (candidate, items) => {
    const from = candidate.startDate;

    const to =
        candidate.repeat && candidate.repeat !== '없음'
            ? (candidate.repeatUntil || addMonths(candidate.startDate, 12))
            : candidate.endDate;

    const end = to > candidate.endDate ? to : candidate.endDate;

    const candidateEvents = occurrences(candidate, from, end);

    const people = item => [
        item.manager,
        ...(item.attendees || []).map(person =>
            typeof person === 'string' ? person : person.name
        )
    ]
        .map(name => String(name || '').trim())
        .filter(Boolean);

    return items
        .filter(item => String(item.id) !== String(candidate.id))
        .flatMap(item => {
            const sharedRoom =
                candidate.type === '회의' &&
                item.type === '회의' &&
                Boolean(candidate.room?.trim()) &&
                candidate.room.trim() === item.room?.trim();

            const sharedPerson = people(candidate).some(name =>
                people(item).includes(name)
            );
            if (!sharedRoom && !sharedPerson) {
                return [];
            }
            const existingEvents = occurrences(item, from, end);
            const hasOverlap = candidateEvents.some(a =>
                existingEvents.some(b => overlaps(a, b)));
            if (!hasOverlap) {
                return [];
            }
            const results = [];
            if (sharedRoom) {
                results.push({
                    ...item,
                    conflictType: 'room'
                })
            }
            if (sharedPerson) {
                results.push({
                    ...item,
                    conflictType: 'person'
                })
            }
            return results;
        });
};
export const departments = ['개발팀', '기획팀', '인사팀', '영업팀', '마케팅팀', '디자인팀', '상품기획팀', '연구개발팀', '품질관리팀'];
export const types = ['회의', '교육', '사내 행사', '휴가', '기타'];
