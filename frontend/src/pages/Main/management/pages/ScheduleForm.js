import React, { useEffect, useState } from "react";

const blankSchedule = {
  title: "",
  department: "개발팀",
  manager: "",
  collaboratingDepartment: "",
  startDate: "2026-10-22",
  endDate: "2026-10-22",
  status: "예정",
  priority: "보통",
  description: "",
  color: "#eaf1ff",
  projectId: ""
};

export default function ScheduleForm({ schedule, projects = [], onClose, onSave }) {
  const [form, setForm] = useState(schedule || blankSchedule);
  const [error, setError] = useState("");

  useEffect(() => { setForm(schedule || blankSchedule); }, [schedule]);

  function change(e) { setForm((prev) => ({ ...prev, [e.target.name]: e.target.value })); }
  function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.manager.trim()) { setError("일정명과 담당자를 입력해 주세요."); return; }
    if (form.endDate < form.startDate) { setError("종료일은 시작일보다 빠를 수 없습니다."); return; }
    setError("");
    onSave({ ...form, title: form.title.trim(), manager: form.manager.trim() });
  }

  return <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div><div><p>SCHEDULE MANAGEMENT</p><h2 id="form-title">{schedule ? "일정 수정" : "새 일정 등록"}</h2><p>일정 정보를 입력해 주세요.</p></div><button onClick={onClose}>×</button></div>
      <form onSubmit={submit}>
        <div>
          <label>일정명 <b>*</b>
            <input name="title" value={form.title} onChange={change} placeholder="예: 주간 업무 회의" />
          </label>
          <label>담당 부서
            <select name="department" 
            value={form.department} 
            onChange={change}>
              <option>개발팀</option>
              <option>기획팀</option>
              <option>인사팀</option>
              <option>영업팀</option>
              <option>마케팅팀</option>
              <option>디자인팀</option>
              <option>상품기획팀</option>
              <option>연구개발팀</option>
              <option>품질관리팀</option>
            </select>
          </label>
          <label>연결 프로젝트
            <select
              name="projectId"
              value={form.projectId ?? ""}
              onChange={change}>
              <option value="">프로젝트 미지정</option>

              {projects.map(project => (
                <option
                  key={project.id}
                  value={String(project.id)}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>담당자 <b>*</b>
            <input name="manager" value={form.manager} onChange={change} placeholder="예: 김OO" />
          </label>
          <label>협업 부서
            <input name="collaboratingDepartment" value={form.collaboratingDepartment || ""} onChange={change} placeholder="예: 마케팅팀, 디자인팀 (없으면 비워 두세요)" />
          </label>
          <label>시작일<input type="date" name="startDate" value={form.startDate} onChange={change} /></label>
          <label>종료일<input type="date" name="endDate" value={form.endDate} onChange={change} /></label>
          <label>상태
            <select name="status" value={form.status} onChange={change}>
              <option>예정</option>
              <option>진행 중</option>
              <option>완료</option>
              <option>지연</option>
            </select>
          </label>
          <label>우선순위
            <select name="priority" value={form.priority} onChange={change}>
              <option>낮음</option>
              <option>보통</option>
              <option>높음</option>
            </select>
          </label>
          <div>
            <span>일정 색상</span>
            <div>
              <input
                type="color"
                name="color"
                aria-label="일정 색상 선택"
                value={/^#[0-9A-Fa-f]{6}$/.test(form.color || "") ? form.color : "#eaf1ff"}
                onChange={change}
              />
              <input
                type="text"
                name="color"
                aria-label="색상 코드 입력"
                value={form.color || "#eaf1ff"}
                onChange={change}
                placeholder="#EAF1FF"
                maxLength="7"
              />
              <span>미리보기</span>
            </div>
            <small>색상표에서 선택하거나 HEX 색상 코드(예: #EAF1FF)를 입력하세요.</small>
          </div>
          <label>상세 설명
            <textarea name="description" value={form.description} onChange={change} rows="3" placeholder="일정의 목적이나 공유할 내용을 입력하세요." /></label>
        </div>
        {error && <p>{error}</p>}
        <div>
          <span>
            <b>*</b> 필수 입력 항목</span>
          <div>
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit">{schedule ? "수정 완료" : "등록하기"}</button>
          </div>
        </div>
      </form>
    </section>
  </div>
}