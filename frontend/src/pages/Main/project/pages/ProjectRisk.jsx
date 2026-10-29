import React, { useState } from 'react';

export default function ProjectRisk() {
  const projects = 'projects';
  const risks = 'risks';
  const addRisk = 'addRisk';
  const updateRisk = 'updateRisk';
  const removeRisk = 'removeRisk';
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
        </select>
        <input placeholder="이슈 내용" value={title} onChange={e => setTitle(e.target.value)} required />
        <select value={level} onChange={e => setLevel(e.target.value)}><option>낮음</option><option>보통</option><option>높음</option></select>
        <button type="submit">등록</button>
      </form>

      <h3>등록된 리스크·이슈 목록</h3>
      <table className="project-summary-table">
        <thead><tr><th>프로젝트명</th><th>이슈 내용</th><th>위험도</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>

        </tbody>
      </table>
    </div>
  );
}
