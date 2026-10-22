import React, { useMemo, useState } from "react";
import { initialSchedules } from "./data/schedules";
import ScheduleStats from "./pages/ScheduleStats";
import ScheduleCalendar from "./pages/ScheduleCalendar";
import ScheduleList from "./pages/ScheduleList";
import ScheduleDetail from "./pages/ScheduleDetail";
import ScheduleForm from "./pages/ScheduleForm";
import ScheduleAdjustment from "./pages/ScheduleAdjustment";
import DeadlineAlerts from "./pages/DeadlineAlerts";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("전체");
  const [month, setMonth] = useState("2026-10");

  const filteredSchedules = useMemo(() => schedules.filter((item) => {
    const matchesKeyword =
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      (item.manager || "").toLowerCase().includes(keyword.toLowerCase()) ||
      (item.collaboratingDepartment || "").toLowerCase().includes(keyword.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(keyword.toLowerCase());
    const matchesDepartment = department === "전체" || item.department === department;
    return matchesKeyword && matchesDepartment;
  }), [schedules, keyword, department]);

  function saveSchedule(formData) {
    if (editingSchedule) {
      setSchedules((current) =>
        current.map((item) => item.id === editingSchedule.id ? { ...formData, id: item.id } : item)
      );
    } else {
      setSchedules((current) => [...current, { ...formData, id: Date.now() }]);
    }
    setFormOpen(false);
    setEditingSchedule(null);
    setSelectedSchedule(null);
  }

  function openEdit(schedule) {
    setEditingSchedule(schedule);
    setSelectedSchedule(null);
    setFormOpen(true);
  }

  function deleteSchedule(schedule) {
    if (window.confirm(`"${schedule.title}" 일정을 삭제할까요?`)) {
      setSchedules((current) => current.filter((item) => item.id !== schedule.id));
      setSelectedSchedule(null);
    }
  }

  function shiftSchedule({ id, startDate, endDate }) {
    setSchedules((current) => current.map((item) =>
      item.id === id ? { ...item, startDate, endDate } : item
    ));
    setAdjustmentOpen(false);
  }

  return (
    <div className="schedule-page">
      <aside>
        <div>W</div>
        <div>WORK<span>FLOW</span></div>
        <p>사내 업무 시스템</p>
        <div>WORKSPACE</div>
        <div>▦ <span>일정관리</span></div>
        <div>▤ <span>프로젝트</span></div>
        <div>♙ <span>조직 / 구성원</span></div>
        <div>
          <div>김</div>
          <div><strong>김OO</strong><small>개발팀 · 사용자</small></div>
        </div>
      </aside>

      <main>
        <header>
          <div><span>워크스페이스</span><span>/</span><strong>일정관리</strong></div>
          <div><span /> 시스템 정상 <span>김</span></div>
        </header>

        <section>
          <div>
            <div>
              <p>WORK MANAGEMENT</p>
              <h1>일정관리</h1>
              <p>팀의 주요 일정과 프로젝트 진행 상황을 관리하세요.</p>
            </div>
            <div>
              <button onClick={() => setAdjustmentOpen(true)}>기간 조정</button>
              <button onClick={() => { setEditingSchedule(null); setFormOpen(true); }}>＋ 일정 등록</button>
            </div>
          </div>

          <ScheduleStats schedules={schedules} />

          <DeadlineAlerts schedules={schedules} onSelect={setSelectedSchedule} />

          <div>
            <div><h2>월간 일정</h2><p>캘린더에서 날짜를 선택하거나 일정을 눌러 상세 내용을 확인하세요.</p></div>
            <div><span><i />진행 중</span><span><i />예정</span><span><i />지연</span><span><i />완료</span></div>
          </div>
          <ScheduleCalendar
            schedules={filteredSchedules}
            month={month}
            setMonth={setMonth}
            onSelect={setSelectedSchedule}
          />

          <div>
            <div><h2>일정 목록</h2><p>등록된 일정의 담당 부서와 진행 상태를 확인하세요.</p></div>
          </div>
          <ScheduleList
            schedules={filteredSchedules}
            keyword={keyword}
            setKeyword={setKeyword}
            department={department}
            setDepartment={setDepartment}
            onSelect={setSelectedSchedule}
          />
          <footer>WORKFLOW ERP <span>© 2026 · 내부 업무용 일정관리</span></footer>
        </section>
      </main>

      {selectedSchedule && (
        <ScheduleDetail
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onEdit={() => openEdit(selectedSchedule)}
          onDelete={() => deleteSchedule(selectedSchedule)}
        />
      )}
      {formOpen && (
        <ScheduleForm
          schedule={editingSchedule}
          onClose={() => { setFormOpen(false); setEditingSchedule(null); }}
          onSave={saveSchedule}
        />
      )}
      {adjustmentOpen && (
        <ScheduleAdjustment
          schedules={schedules}
          onClose={() => setAdjustmentOpen(false)}
          onSave={shiftSchedule}
        />
      )}
    </div>
  );
}