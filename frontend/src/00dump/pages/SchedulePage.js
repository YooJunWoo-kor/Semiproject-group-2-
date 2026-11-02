import React, { useMemo, useState } from "react";
import { initialSchedules } from "../data/schedules";
import ScheduleStats from "./ScheduleStats";
import ScheduleCalendar from "./ScheduleCalendar";
import ScheduleList from "./ScheduleList";
import ScheduleDetail from "./ScheduleDetail";
import ScheduleForm from "./ScheduleForm";
import ScheduleAdjustment from "./ScheduleAdjustment";
import DeadlineAlerts from "./DeadlineAlerts";

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">W</div>
        <div className="brand">WORK<span>FLOW</span></div>
        <p className="side-caption">사내 업무 시스템</p>
        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active">▦ <span>일정관리</span></div>
        <div className="nav-item">▤ <span>프로젝트</span></div>
        <div className="nav-item">♙ <span>조직 / 구성원</span></div>
        <div className="sidebar-bottom">
          <div className="avatar">김</div>
          <div><strong>김OO</strong><small>개발팀 · 사용자</small></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="breadcrumb">워크스페이스</span><span className="crumb-sep">/</span><strong>일정관리</strong></div>
          <div className="topbar-right"><span className="status-dot" /> 시스템 정상 <span className="top-avatar">김</span></div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">WORK MANAGEMENT</p>
              <h1>일정관리</h1>
              <p className="subtitle">팀의 주요 일정과 프로젝트 진행 상황을 관리하세요.</p>
            </div>
            <div className="heading-actions">
              <button className="btn btn-outline" onClick={() => setAdjustmentOpen(true)}>기간 조정</button>
              <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setFormOpen(true); }}>＋ 일정 등록</button>
            </div>
          </div>

          <ScheduleStats schedules={schedules} />

          <DeadlineAlerts schedules={schedules} onSelect={setSelectedSchedule} />

          <div className="section-heading">
            <div><h2>월간 일정</h2><p>캘린더에서 날짜를 선택하거나 일정을 눌러 상세 내용을 확인하세요.</p></div>
            <div className="legend"><span><i className="legend-dot blue" />진행 중</span><span><i className="legend-dot gray" />예정</span><span><i className="legend-dot red" />지연</span><span><i className="legend-dot green" />완료</span></div>
          </div>
          <ScheduleCalendar
            schedules={filteredSchedules}
            month={month}
            setMonth={setMonth}
            onSelect={setSelectedSchedule}
          />

          <div className="section-heading list-heading">
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
          <footer className="footer">WORKFLOW ERP <span>© 2026 · 내부 업무용 일정관리</span></footer>
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