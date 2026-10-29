import React, { useState } from 'react';

const emptyForm = {
  projectId: '',
  name: '',
  owner: '',
  due: '',
  status: '작성 중'
};

export default function ProjectDeliverables() {
  const projects = "projects";
  const outputs = "outputs";
  const saveOutput = "saveOutput";
  const removeOutput = "removeOutput";
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const change = "chang";
  const save ="save";
  const resetForm = "restForm";

  return (
    <div>
      <h2>산출물 관리</h2>
      <form onSubmit={save}>
        <select name="projectId" value={form.projectId} onChange={change} required>
          <option value="">프로젝트 선택</option>
        </select>
        <input name="name" placeholder="산출물명" value={form.name} onChange={change} required />
        <input name="owner" placeholder="담당자" value={form.owner} onChange={change} />
        <input name="due" type="date" value={form.due} onChange={change} />
        <button type="submit">{editingId !== null ? '수정 저장' : '산출물 등록'}</button>
        {editingId !== null && <button type="button" onClick={resetForm}>취소</button>}
      </form>

      <table className="project-summary-table">
        <thead><tr><th>프로젝트</th><th>산출물명</th><th>담당자</th><th>목표일</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>
        </tbody>
      </table>
    </div>
  );
}
