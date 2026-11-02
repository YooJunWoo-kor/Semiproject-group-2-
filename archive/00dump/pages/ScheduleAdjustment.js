import React, { useState } from "react";

export default function ScheduleAdjustment({ schedules, onClose, onSave }) {
  const [id, setId] = useState(schedules[0] ? String(schedules[0].id) : "");
  const selected = schedules.find((item) => String(item.id) === id);
  const [startDate, setStartDate] = useState(selected?.startDate || "");
  const [endDate, setEndDate] = useState(selected?.endDate || "");

  function choose(value) {
    setId(value);
    const item = schedules.find((s) => String(s.id) === value);
    setStartDate(item?.startDate || "");
    setEndDate(item?.endDate || "");
  }
  function submit(e) {
    e.preventDefault();
    if (!id || !startDate || !endDate || endDate < startDate) return;
    onSave({ id: Number(id), startDate, endDate });
  }

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal adjustment-modal" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
      <div className="modal-header">
        <div>
          <p className="eyebrow">PROJECT SCHEDULE</p>
          <h2 id="adjust-title">프로젝트 기간 조정</h2>
          <p className="modal-subtitle">대상 일정을 선택하고 기간을 변경하세요.</p>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <form onSubmit={submit}>
        <label className="field">대상 일정
          <select value={id} onChange={(e) => choose(e.target.value)}>
            {schedules.map((s) =>
              <option value={s.id} key={s.id}>{s.title}</option>)}
          </select>
        </label>
        <div className="form-grid adjustment-dates">
          <label className="field">변경 시작일
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">변경 종료일
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <p className="hint">현재는 화면 내 일정 데이터만 변경됩니다. 새로고침 후에도 저장하려면 백엔드 API와 DB 연결이 필요합니다.</p>
        <div className="modal-footer">
          <span />
          <div>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              취소</button>
            <button type="submit" className="btn btn-primary" disabled={!selected || endDate < startDate}>
              기간 저장</button>
          </div>
        </div>
      </form>
    </section>
  </div>
}