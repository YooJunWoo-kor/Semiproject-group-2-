import React, { useState } from 'react';
import { useProject } from '../ProjectContext';

export default function ProjectResource() {
  const {
    projects,
    resources,
    addResource,
    removeResource
  } = useProject();

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState(1);
  const [capacity, setCapacity] = useState(20);
  const [workDetail, setWorkDetail] = useState('');

  function add(e) {
    e.preventDefault();

    if (
      !projectId ||
      !name.trim() ||
      !workDetail.trim() ||
      Number(days) <= 0 ||
      Number(capacity) <= 0
    ) {
      return;
    }

    addResource({
      projectId,
      name: name.trim(),
      workDetail: workDetail.trim(),
      days,
      capacity
    });

    setName('');
    setWorkDetail('');
  }

  return (
    <div>
      <h2>인력 · 공수 관리</h2>
      <p>M/D는 한 사람이 하루 일하는 작업량입니다.</p>

      <form onSubmit={add}>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
          <option value="">프로젝트 선택</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <input placeholder="담당자" value={name} onChange={e => setName(e.target.value)} required />

        <label>
          상세 업무
          <input
            type="text"
            placeholder="자세한 업무를 입력하세요"
            value={workDetail}
            onChange={e => setWorkDetail(e.target.value)}
            required
          />
        </label>

        <label>
          투입 M/D
          <input type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} required />
        </label>

        <label>
          가용 M/D
          <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} required />
        </label>

        <button type="submit">등록</button>
      </form>

      <h3>등록된 인력·공수 목록</h3>

      <table className="project-summary-table">
        <thead>
          <tr>
            <th>프로젝트명</th><th>담당자</th><th>상세 업무</th><th>투입 M/D</th><th>가용 M/D</th><th>상태</th><th>관리</th>
          </tr>
        </thead>
        <tbody>
          {resources.length === 0 ? (
            <tr><td colSpan={7}>등록된 인력·공수 정보가 없습니다.</td></tr>
          ) : (
            resources.map(record => (
              <tr key={record.id}>
                <td>{projects.find(project => String(project.id) === String(record.projectId))?.name || '-'}</td>
                <td>{record.name}</td>
                <td>{record.workDetail || '-'}</td>
                <td>{record.days} M/D</td>
                <td>{record.capacity} M/D</td>
                <td>{Number(record.days) > Number(record.capacity) ? '과부하' : '정상'}</td>
                <td><button type="button" onClick={() => removeResource(record.id)}>삭제</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
