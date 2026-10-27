import React, { useState } from 'react';

export default function ProjectRisk({ projects, risks, setRisks }) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('보통');

  function add(e) {
    e.preventDefault();
    const id = Number(projectId);

    // 프로젝트와 이슈 내용을 모두 입력해야 등록합니다.
    if (!id || !title.trim()) return;

    setRisks([
      ...risks,
      {
        id: Date.now(),
        projectId: id,
        title: title.trim(),
        level,
        status: '미해결'
      }
    ]);
    setTitle('');
  }

  function changeStatus(riskId, status) {
    setRisks(risks.map(r =>
      r.id === riskId ? { ...r, status } : r
    ));
  }

  function deleteRisk(riskId) {
    setRisks(risks.filter(r => r.id !== riskId));
  }

  return (
    <div>
      <h2>리스크 · 이슈 관리</h2>

      <form onSubmit={add}>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          required
        >
          <option value="">프로젝트 선택</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <input
          placeholder="이슈 내용"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <select value={level} onChange={e => setLevel(e.target.value)}>
          <option>낮음</option>
          <option>보통</option>
          <option>높음</option>
        </select>

        <button type="submit">등록</button>
      </form>

      <h3>등록된 리스크·이슈 목록</h3>
      <table className="project-summary-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>이슈 내용</th>
            <th>위험도</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {risks.length === 0 ? (
            <tr>
              <td colSpan={5}>등록된 리스크·이슈가 없습니다.</td>
            </tr>
          ) : (
            risks.map(r => (
              <tr key={r.id}>
                <td>{projects.find(p => Number(p.id) === Number(r.projectId))?.name || '-'}</td>
                <td>{r.title}</td>
                <td>{r.level}</td>
                <td>
                  <select
                    value={r.status}
                    onChange={e => changeStatus(r.id, e.target.value)}
                  >
                    <option>미해결</option>
                    <option>대응 중</option>
                    <option>해결</option>
                  </select>
                </td>
                <td>
                  <button type="button" onClick={() => deleteRisk(r.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
