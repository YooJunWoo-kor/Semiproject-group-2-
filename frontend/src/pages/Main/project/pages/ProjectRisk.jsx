import React, { useState } from 'react';
import { useProject } from '../ProjectContext';

export default function ProjectRisk() {
  const { projects, risks, addRisk, updateRisk, removeRisk } = useProject();
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('보통');

  function add(e) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    addRisk({ projectId, title: title.trim(), level, status: '미해결' });
    setTitle('');
  }

  return (
    <div>
      <h2>리스크 · 이슈 관리</h2>
      <form onSubmit={add}>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
          <option value="">프로젝트 선택</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <input placeholder="이슈 내용" value={title} onChange={e => setTitle(e.target.value)} required />
        <select value={level} onChange={e => setLevel(e.target.value)}><option>낮음</option><option>보통</option><option>높음</option></select>
        <button type="submit">등록</button>
      </form>

      <h3>등록된 리스크·이슈 목록</h3>
      <table className="project-summary-table">
        <thead><tr><th>프로젝트명</th><th>이슈 내용</th><th>위험도</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>
          {risks.length === 0 ? <tr><td colSpan={5}>등록된 리스크·이슈가 없습니다.</td></tr> : risks.map(risk => (
            <tr key={risk.id}>
              <td>{projects.find(project => String(project.id) === String(risk.projectId))?.name || '-'}</td>
              <td>{risk.title}</td><td>{risk.level}</td>
              <td>
                <select value={risk.status} onChange={e => updateRisk(risk.id, { status: e.target.value })}>
                  <option>미해결</option><option>대응 중</option><option>해결</option>
                </select>
              </td>
              <td><button type="button" onClick={() => removeRisk(risk.id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
