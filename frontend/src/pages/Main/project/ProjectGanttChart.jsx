import React, { useState } from 'react';

export default function ProjectGanttChart({ projects, tasks, setTasks }) {
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [due, setDue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const add = e => {
    e.preventDefault();
    if (!projectId || !name.trim() || !due) return;
    setTasks(prev => [...prev, { id: Date.now(), projectId: Number(projectId), name: name.trim(), start: '', due, status: '예정', progress: 0, priority: '보통' }]);
    setName(''); setDue('');
  };
  const save = id => {
    if (!draft.name?.trim() || !draft.due)
      return; setTasks(prev => prev.map(t => t.id === id ? { ...draft, progress: Math.max(0, Math.min(100, Number(draft.progress) || 0)) } : t));
      setEditingId(null);
  };
  
  return <div><h2>작업 분류 구조 관리</h2>
    <form onSubmit={add}>
      <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
        <option value="">프로젝트 선택</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input placeholder="작업명" value={name} onChange={e => setName(e.target.value)} required />
      <input type="date" value={due} onChange={e => setDue(e.target.value)} required />
      <button type="submit">작업 추가</button>
    </form>
    {projects.map(p => <section key={p.id}>
      <h3>{p.name}</h3>
      <table className="project-summary-table">
        <thead>
          <tr>
            <th>작업명</th>
            <th>목표일</th>
            <th>상태</th>
            <th>공정률</th>
            <th>우선순위</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {tasks.filter(t => String(t.projectId) === String(p.id)).map(t => <tr key={t.id}>{editingId === t.id ? <>
            <td>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </td>
            <td>
              <input type="date" value={draft.due || ''} onChange={e => setDraft({ ...draft, due: e.target.value })} />
            </td>
            <td>
              <select value={draft.status} onChange={e =>
                setDraft({
                  ...draft, status: e.target.value, progress: e.target.value === '완료' ?
                    100 : e.target.value === '예정' ? 0 : draft.progress
                })}>{['예정', '진행 중', '완료', '보류'].map(v =>
                  <option key={v}>{v}</option>)}
              </select>
            </td>
            <td>
              <input type="number" min="0" max="100" value={draft.progress}
                onChange={e => setDraft({ ...draft, progress: e.target.value })} />
            </td>
            <td>
              <select value={draft.priority || '보통'}
                onChange={e => setDraft({ ...draft, priority: e.target.value })}>{['긴급', '높음', '보통', '낮음'].map(v => <option key={v}>{v}</option>)}
              </select>
            </td>
            <td>
              <button onClick={() => save(t.id)}>저장</button>
              <button onClick={() => setEditingId(null)}>취소</button>
            </td>
          </> : <><td>{t.name}</td>
            <td>{t.due}</td><td>{t.status}</td>
            <td>{t.progress}%</td>
            <td>{t.priority || '보통'}</td>
            <td>
              <button onClick={() => { setEditingId(t.id); setDraft({ ...t }); }}>수정</button>
              <button onClick={() => { if (window.confirm('작업을 삭제할까요?')) setTasks(prev => prev.filter(x => x.id !== t.id)); }}>삭제</button>
            </td></>}</tr>)}
        </tbody>
      </table>
    </section>)}
  </div>;
}
