import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProject } from '../ProjectContext';
import { emptyProject } from '../data/projectDummyData';

export default function ProjectWorkspace() {
  const {
    projects,
    tasks,
    outputs,
    resources,
    budgets,
    expenses,
    risks,
    saveProject,
    removeProject
  } = useProject();

  const location = useLocation();
  const [selectedId, setSelectedId] = useState(location.state?.selectedId ?? null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (location.state?.selectedId != null) {
      setSelectedId(location.state.selectedId);
    }
  }, [location.state]);

  const selected = projects.find(project =>
    Number(project.id) === Number(selectedId)
  );

  const projectTasks = tasks.filter(task =>
    Number(task.projectId) === Number(selectedId)
  );

  const projectRisks = risks.filter(risk =>
    Number(risk.projectId) === Number(selectedId)
  );

  const projectResources = resources.filter(resource =>
    Number(resource.projectId) === Number(selectedId)
  );

  const projectOutputs = outputs.filter(output =>
    Number(output.projectId) === Number(selectedId)
  );

  const projectExpenses = expenses.filter(expense =>
    Number(expense.projectId) === Number(selectedId)
  );

  const progress = projectTasks.length === 0
    ? 0
    : Math.round(
        projectTasks.reduce(
          (sum, task) => sum + Number(task.progress || 0),
          0
        ) / projectTasks.length
      );

  function openProject(project) {
    setSelectedId(project.id);
    setEditing(null);
  }

  function handleSaveProject(e) {
    e.preventDefault();

    if (!editing.name.trim() || !editing.owner.trim() || !editing.due) {
      return;
    }

    if (editing.start && editing.due < editing.start) {
      alert('목표일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    const id = saveProject({
      ...editing,
      name: editing.name.trim(),
      owner: editing.owner.trim()
    });

    setEditing(null);

    if (editing.id) {
      setSelectedId(id);
    }
  }

  function handleDeleteProject(id) {
    if (!window.confirm('프로젝트와 연결된 데이터를 모두 삭제할까요?')) {
      return;
    }

    removeProject(id);
    setSelectedId(null);
  }

  if (editing) {
    return (
      <div className="project-workspace">
        <form onSubmit={handleSaveProject}>
          <h2>{editing.id ? '프로젝트 수정' : '프로젝트 등록'}</h2>

          <label>
            프로젝트명
            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              required
            />
          </label>

          <label>
            담당 부서
            <input
              value={editing.owner}
              onChange={e => setEditing({ ...editing, owner: e.target.value })}
              required
            />
          </label>

          <label>
            시작일
            <input
              type="date"
              value={editing.start || ''}
              onChange={e => setEditing({ ...editing, start: e.target.value })}
            />
          </label>

          <label>
            목표일
            <input
              type="date"
              value={editing.due}
              onChange={e => setEditing({ ...editing, due: e.target.value })}
              required
            />
          </label>

          <label>
            상태
            <select
              value={editing.status}
              onChange={e => setEditing({ ...editing, status: e.target.value })}
            >
              <option>검토</option>
              <option>진행 중</option>
              <option>완료</option>
              <option>보류</option>
            </select>
          </label>

          <label>
            메모
            <input
              value={editing.memo || ''}
              onChange={e => setEditing({ ...editing, memo: e.target.value })}
            />
          </label>

          <button type="submit">저장</button>
          <button type="button" onClick={() => setEditing(null)}>취소</button>
        </form>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="project-workspace">
        <button
          type="button"
          onClick={() => setEditing({ ...emptyProject })}
        >
          + 프로젝트 등록
        </button>

        <h3>프로젝트 목록</h3>

        <table className="project-summary-table">
          <thead>
            <tr>
              <th>프로젝트명</th>
              <th>담당 부서</th>
              <th>상태</th>
              <th>목표일</th>
              <th>관리</th>
            </tr>
          </thead>

          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5}>등록된 프로젝트가 없습니다.</td>
              </tr>
            ) : (
              projects.map(project => (
                <tr key={project.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => openProject(project)}
                    >
                      {project.name}
                    </button>
                  </td>
                  <td>{project.owner}</td>
                  <td>{project.status}</td>
                  <td>{project.due || '-'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...project })}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project.id)}
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

  const budget = Number(budgets[selected.id] || 0);
  const used = projectExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );
  const remaining = budget - used;
  const rate = budget > 0 ? Math.round((used / budget) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = selected.due
    ? new Date(selected.due + 'T00:00:00')
    : null;

  const days = dueDate
    ? Math.round((dueDate - today) / 86400000)
    : null;

  const completed = selected.status === '완료';
  const urgent = !completed && days !== null && days >= 0 && days <= 7;
  const delayed = !completed && days !== null && days < 0;

  return (
    <div className="project-workspace">
      <h2>{selected.name}</h2>

      {dueDate && (
        <div style={{
          backgroundColor: delayed ? '#fee2e2' : urgent ? '#fff7ed' : '#eff6ff',
          border: `1px solid ${delayed ? '#ef4444' : urgent ? '#f59e0b' : '#93c5fd'}`,
          borderRadius: '10px',
          padding: '16px',
          margin: '16px 0'
        }}>
          <h3 style={{ marginTop: 0 }}>🔔 프로젝트 마감 알림</h3>
          <p>목표일: {selected.due}</p>
          <strong>
            {completed
              ? '완료된 프로젝트입니다.'
              : delayed
                ? `마감일이 ${Math.abs(days)}일 지났습니다.`
                : days === 0
                  ? '오늘이 마감일입니다!'
                  : `마감까지 ${days}일 남았습니다. (D-${days})`}
          </strong>
        </div>
      )}

      <h3>프로젝트 기본 정보</h3>
      <table className="project-summary-table">
        <tbody>
          <tr><th>담당 부서</th><td>{selected.owner}</td></tr>
          <tr><th>진행 상태</th><td>{selected.status}</td></tr>
          <tr><th>시작일</th><td>{selected.start || '-'}</td></tr>
          <tr><th>목표일</th><td>{selected.due || '-'}</td></tr>
          <tr><th>메모</th><td>{selected.memo || '-'}</td></tr>
          <tr><th>작업 평균 공정률</th><td>{progress}%</td></tr>
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => setSelectedId(null)}
        style={{ marginTop: '16px' }}
      >
        목록으로
      </button>

      <section style={{ marginTop: '24px' }}>
        <h3>예산·비용 현황</h3>
        <table className="project-summary-table">
          <thead>
            <tr>
              <th>총 예산</th>
              <th>집행 금액</th>
              <th>잔여 예산</th>
              <th>집행률</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{budget.toLocaleString()}원</td>
              <td>{used.toLocaleString()}원</td>
              <td>{remaining.toLocaleString()}원</td>
              <td>{budget > 0 ? `${rate}%` : '미설정'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3>리스크·이슈 현황</h3>
        <table className="project-summary-table">
          <thead><tr><th>이슈명</th><th>위험도</th><th>상태</th></tr></thead>
          <tbody>
            {projectRisks.length === 0 ? (
              <tr><td colSpan={3}>등록된 리스크·이슈가 없습니다.</td></tr>
            ) : (
              projectRisks.map(risk => (
                <tr key={risk.id}>
                  <td>{risk.title}</td>
                  <td>{risk.level}</td>
                  <td>{risk.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3>작업 현황</h3>
        <table className="project-summary-table">
          <thead><tr><th>작업명</th><th>목표일</th><th>상태</th><th>공정률</th></tr></thead>
          <tbody>
            {projectTasks.length === 0 ? (
              <tr><td colSpan={4}>등록된 작업이 없습니다.</td></tr>
            ) : (
              projectTasks.map(task => (
                <tr key={task.id}>
                  <td>{task.name}</td>
                  <td>{task.due || '-'}</td>
                  <td>{task.status}</td>
                  <td>{task.progress}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3>인력·공수 현황</h3>
        <table className="project-summary-table">
          <thead><tr><th>담당자</th><th>업무</th><th>투입 M/D</th><th>가용 M/D</th></tr></thead>
          <tbody>
            {projectResources.length === 0 ? (
              <tr><td colSpan={4}>등록된 인력이 없습니다.</td></tr>
            ) : (
              projectResources.map(resource => (
                <tr key={resource.id}>
                  <td>{resource.name}</td>
                  <td>{resource.workDetail || '-'}</td>
                  <td>{resource.days}</td>
                  <td>{resource.capacity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3>산출물 현황</h3>
        <table className="project-summary-table">
          <thead><tr><th>산출물명</th><th>담당자</th><th>목표일</th><th>상태</th></tr></thead>
          <tbody>
            {projectOutputs.length === 0 ? (
              <tr><td colSpan={4}>등록된 산출물이 없습니다.</td></tr>
            ) : (
              projectOutputs.map(output => (
                <tr key={output.id}>
                  <td>{output.name}</td>
                  <td>{output.owner || '-'}</td>
                  <td>{output.due || '-'}</td>
                  <td>{output.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
