import React, { useState } from 'react';
import { useProject } from '../ProjectContext';

const emptyForm = {
  projectId: '',
  name: '',
  owner: '',
  due: '',
  status: '작성 중'
};

export default function ProjectDeliverables() {
  const { projects, outputs, saveOutput, removeOutput } = useProject();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const change = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = e => {
    e.preventDefault();
    if (!form.projectId || !form.name.trim()) return;

    saveOutput({
      ...form,
      id: editingId ?? undefined,
      name: form.name.trim()
    });

    resetForm();
  };

  return (
    <div>
      <h2>산출물 관리</h2>
      <form onSubmit={save}>
        <select name="projectId" value={form.projectId} onChange={change} required>
          <option value="">프로젝트 선택</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <input name="name" placeholder="산출물명" value={form.name} onChange={change} required />
        <input name="owner" placeholder="담당자" value={form.owner} onChange={change} />
        <input name="due" type="date" value={form.due} onChange={change} />
        <select name="status" value={form.status} onChange={change}>
          {['작성 중', '검토 중', '승인 완료'].map(status => <option key={status}>{status}</option>)}
        </select>
        <button type="submit">{editingId !== null ? '수정 저장' : '산출물 등록'}</button>
        {editingId !== null && <button type="button" onClick={resetForm}>취소</button>}
      </form>

      <table className="project-summary-table">
        <thead><tr><th>프로젝트</th><th>산출물명</th><th>담당자</th><th>목표일</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>
          {outputs.length === 0 ? (
            <tr><td colSpan={6}>등록된 산출물이 없습니다.</td></tr>
          ) : outputs.map(output => (
            <tr key={output.id}>
              <td>{projects.find(project => String(project.id) === String(output.projectId))?.name || '-'}</td>
              <td>{output.name}</td><td>{output.owner || '-'}</td><td>{output.due || '-'}</td><td>{output.status || '-'}</td>
              <td>
                <button type="button" onClick={() => {
                  setEditingId(output.id);
                  setForm({
                    projectId: String(output.projectId),
                    name: output.name,
                    owner: output.owner || '',
                    due: output.due || '',
                    status: output.status || '작성 중'
                  });
                }}>수정</button>
                <button type="button" onClick={() => {
                  if (window.confirm('산출물을 삭제할까요?')) removeOutput(output.id);
                }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
