
import React, { useState } from 'react';

export default function ProjectResource({ projects, records, setRecords }) {
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState(1);
  const [capacity, setCapacity] = useState(20);
  const [workDetail, setWorkDetail] = useState('');

  function add(e) {
    e.preventDefault();
    // 선택한 프로젝트의 ID
    const id = Number(projectId);

    // 필수 입력값 검사
    if (
      !id ||
      !name.trim() ||
      !workDetail.trim() ||
      Number(days) <= 0 ||
      Number(capacity) <= 0
    ) {
      return;
    }

    // 인력·공수 데이터 등록
    setRecords([
      ...records,
      {
        id: Date.now(),
        projectId: id,
        name: name.trim(),
        workDetail: workDetail.trim(),
        days: Number(days),
        capacity: Number(capacity)
      }
    ]);

    // 등록 후 입력창 초기화
    setName('');
    setWorkDetail('');
  }

  return (
    <div>
      <h2>인력 · 공수 관리</h2>
      <p>M/D는 한 사람이 하루 일하는 작업량입니다.</p>

      <form onSubmit={add}>
        {/* 프로젝트 선택 */}
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          required
        >
          <option value="">프로젝트 선택</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 담당자 */}
        <input
          placeholder="담당자"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* 상세 업무 */}
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

        {/* 투입 공수 */}
        <label>
          투입 M/D
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={days}
            onChange={e => setDays(e.target.value)}
            required
          />
        </label>

        {/* 가용 공수 */}
        <label>
          가용 M/D
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            required
          />
        </label>

        <button type="submit">등록</button>
      </form>

      {/* 등록된 인력·공수 목록 */}
      <h3>등록된 인력·공수 목록</h3>

      <table className="project-summary-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>담당자</th>
            <th>상세 업무</th>
            <th>투입 M/D</th>
            <th>가용 M/D</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>

        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={7}>
                등록된 인력·공수 정보가 없습니다.
              </td>
            </tr>
          ) : (
            records.map(r => (
              <tr key={r.id}>
                <td>
                  {projects.find(p => p.id === r.projectId)?.name || '-'}
                </td>

                <td>{r.name}</td>
                <td>{r.workDetail || '-'}</td>
                <td>{r.days} M/D</td>
                <td>{r.capacity} M/D</td>

                <td>
                  {Number(r.days) > Number(r.capacity)
                    ? '과부하'
                    : '정상'}
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() =>
                      setRecords(
                        records.filter(x => x.id !== r.id)
                      )
                    }
                  >
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
