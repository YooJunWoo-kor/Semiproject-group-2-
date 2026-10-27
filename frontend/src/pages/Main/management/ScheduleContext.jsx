import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialSchedules } from './data/schedules';
import { todayISO, occurrences, conflicts } from './utils/scheduleUtils';

const ScheduleContext = createContext(null);

// 예전 데이터에 없는 필드는 기본값을 채워 줍니다.
function normalize(item) {
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

export function ScheduleProvider({ children }) {
  // 1. 일정 데이터
  const [schedules, setSchedules] = useState(() => initialSchedules.map(normalize));

  // 2. 검색 및 필터
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('전체');
  const [type, setType] = useState('전체');

  // 3. 팝업 상태
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [draft, setDraft] = useState({});

  const selected = schedules.find(item => String(item.id) === String(selectedId)) || null;
  const editing = schedules.find(item => item.id === editingId) || null;

  // 4. 검색 결과
  const filtered = useMemo(() => {
    return schedules.filter(item => {
      const matchesDepartment = department === '전체' || item.department === department;
      const matchesType = type === '전체' || item.type === type;
      const fields = [item.title, item.manager, item.collaboratingDepartment, item.description];
      const matchesKeyword = fields.some(value => String(value || '').toLowerCase().includes(keyword.toLowerCase()));
      return matchesDepartment && matchesType && matchesKeyword;
    });
  }, [schedules, keyword, department, type]);

  // 5. 일정 등록 및 수정
  function saveSchedule(data) {
    const entry = normalize(data);
    if (entry.id != null) {
      setSchedules(previous => previous.map(item => item.id === entry.id ? entry : item));
    } else {
      const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSchedules(previous => [...previous, { ...entry, id }]);
    }
    setFormOpen(false);
    setEditingId(null);
    setSelectedId(null);
  }

  // 6. 일정 삭제
  function deleteSchedule(id) {
    setSchedules(previous => previous.filter(item => item.id !== id));
    setSelectedId(null);
  }

  // 7. 일정 기간 변경
  function adjust({ id, startDate, endDate }) {
    setSchedules(previous => previous.map(item => (
      String(item.id) === String(id) ? { ...item, startDate, endDate } : item
    )));
    setAdjustmentOpen(false);
  }

  // 8. 등록·수정 팝업 열기
  function openCreate(defaults = {}) {
    setEditingId(null);
    setSelectedId(null);
    setDraft(defaults);
    setFormOpen(true);
  }

  function openEdit(id) {
    setEditingId(id);
    setDraft({});
    setSelectedId(null);
    setFormOpen(true);
  }

  // 9. 반복 일정과 중복 검사
  function events(from, to, source = filtered) {
    return source.flatMap(item => occurrences(item, from, to))
      .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
  }

  function checkConflicts(entry) {
    return conflicts(entry, schedules);
  }

  // 10. 다른 화면에서 사용할 값과 함수
  const value = {
    schedules, filtered,
    keyword, setKeyword, department, setDepartment, type, setType,
    selected, setSelectedId, editing,
    openCreate, openEdit, formOpen, setFormOpen,
    adjustmentOpen, setAdjustmentOpen,
    saveSchedule, deleteSchedule, adjust, draft,
    events, conflicts: checkConflicts, today: todayISO()
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedules() {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('ScheduleProvider가 필요합니다.');
  return context;
}
