import React from "react";

export default function ScheduleDetail({ schedule, onClose, onEdit, onDelete }) {
  return <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div><div>
        <p>SCHEDULE DETAIL</p>
        <h2 id="detail-title">일정 상세 조회</h2>
      </div>
        <button onClick={onClose}>×</button>
      </div>
      <div>
        <h3>{schedule.title}</h3>
        <span>{schedule.status}</span>
      </div>
      <p>{schedule.description || "등록된 설명이 없습니다."}</p>
      <div>
        <div><label>담당 부서</label><strong>{schedule.department}</strong></div>
        <div><label>담당자</label><strong>{schedule.manager}</strong></div>
        <div><label>협업 부서</label><strong>{schedule.collaboratingDepartment || "없음"}</strong></div>
        <div><label>시작일</label><strong>{schedule.startDate}</strong></div>
        <div><label>종료일</label><strong>{schedule.endDate}</strong></div>
        <div><label>우선순위</label><strong>{schedule.priority}</strong></div>
        <div><label>일정 ID</label><strong>#{schedule.id}</strong></div>
      </div>
      <div>
        <button onClick={onDelete}>삭제</button>
        <div>
          <button onClick={onClose}>닫기</button>
          <button onClick={onEdit}>수정</button>
        </div>
      </div>
    </section>
  </div>;
}