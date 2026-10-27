import React from "react";

export default function ScheduleDetail({ schedule, onClose, onEdit, onDelete }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="modal-header"><div>
        <p className="eyebrow">SCHEDULE DETAIL</p>
        <h2 id="detail-title">일정 상세 조회</h2>
      </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="detail-title-row">
        <h3>{schedule.title}</h3>
        <span className={`badge ${schedule.status === "완료" ? "badge-green" : schedule.status === "지연" ? "badge-red" : schedule.status === "진행 중" ? "badge-blue" : "badge-gray"}`}>{schedule.status}</span>
      </div>
      <p className="detail-description">{schedule.description || "등록된 설명이 없습니다."}</p>
      <div className="detail-grid">
        <div><label>담당 부서</label><strong>{schedule.department}</strong></div>
        <div><label>담당자</label><strong>{schedule.manager}</strong></div>
        <div><label>협업 부서</label><strong>{schedule.collaboratingDepartment || "없음"}</strong></div>
        <div><label>시작일</label><strong>{schedule.startDate}</strong></div>
        <div><label>종료일</label><strong>{schedule.endDate}</strong></div>
        <div><label>우선순위</label><strong>{schedule.priority}</strong></div>
        <div><label>일정 ID</label><strong>#{schedule.id}</strong></div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-danger-outline" onClick={onDelete}>삭제</button>
        <div>
          <button className="btn btn-outline" onClick={onClose}>닫기</button>
          <button className="btn btn-primary" onClick={onEdit}>수정</button>
        </div>
      </div>
    </section>
  </div>;
}