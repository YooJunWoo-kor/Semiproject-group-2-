import React, { useState } from 'react';
export default function ProjectDeliverables({ projects, outputs, setOutputs }) {
  const [form, setForm] = useState({ projectId: '', name: '', owner: '', due: '', status: '작성 중' });
  const [editingId, setEditingId] = useState(null);
  const change = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const save = e => {
    e.preventDefault(); if (!form.projectId || !form.name.trim()) return;
    if (editingId !== null) setOutputs(prev => prev.map(o => o.id === editingId ? { ...form, id: editingId, projectId: Number(form.projectId) } : o));
    else setOutputs(prev => [...prev, { ...form, id: Date.now(), projectId: Number(form.projectId) }]);
    setEditingId(null); setForm({ projectId: '', name: '', owner: '', due: '', status: '작성 중' });
  };
  return <div><h2>산출물 관리</h2><form onSubmit={save}>
    <select name="projectId" value={form.projectId} onChange={change} required>
      <option value="">프로젝트 선택</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
    <input name="name"
      placeholder="산출물명"
      value={form.name}
      onChange={change} required />
    <input name="owner"
      placeholder="담당자"
      value={form.owner}
      onChange={change} />
    <input name="due"
      type="date"
      value={form.due}
      onChange={change} />
    <select name="status"
      value={form.status}
      onChange={change}>{['작성 중', '검토 중', '승인 완료'].map(x => <option key={x}>{x}</option>)}
    </select>
    <button type="submit">{editingId !== null ? '수정 저장' : '산출물 등록'}</button>
    {editingId !== null && <button type="button"
      onClick={() => {
        setEditingId(null);
        setForm({ projectId: '', name: '', owner: '', due: '', status: '작성 중' });
      }}>취소</button>}
  </form>
    <table className="project-summary-table">
      <thead>
        <tr>
          <th>프로젝트</th>
          <th>산출물명</th>
          <th>담당자</th>
          <th>목표일</th>
          <th>상태</th>
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        {outputs.map(o => <tr key={o.id}><td>{projects.find(p => String(p.id) === String(o.projectId))?.name || '-'}</td>
          <td>{o.name}</td>
          <td>{o.owner || '-'}</td>
          <td>{o.due || '-'}</td>
          <td>{o.status || '-'}</td>
          <td>
            <button onClick={() => {
              setEditingId(o.id);
              setForm({ projectId: String(o.projectId), name: o.name, owner: o.owner || '', due: o.due || '', status: o.status || '작성 중' });
            }}>수정</button>
            <button onClick={() => { if (window.confirm('산출물을 삭제할까요?')) setOutputs(prev => prev.filter(x => x.id !== o.id)); }}>삭제</button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
