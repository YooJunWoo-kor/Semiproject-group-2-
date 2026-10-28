import React, { useState } from 'react';
import { useProject } from '../ProjectContext';

export default function ProjectGanttChart() {
  const {
    projects,
    tasks,
    addTask,
    updateTask,
    removeTask
  } = useProject();

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [due, setDue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const add = e => {
    e.preventDefault();

    if (!projectId || !name.trim() || !due) return;

    addTask({
      projectId,
      name: name.trim(),
      start: '',
      due,
      status: '예정',
      progress: 0,
      priority: '보통'
    });

    setName('');
    setDue('');
  };

  const save = id => {
    if (!draft.name?.trim() || !draft.due) return;

    updateTask(id, {
      ...draft,
      name: draft.name.trim()
    });

    setEditingId(null);
    setDraft({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  return (
    <div>
      <h2>작업 분류 구조 관리</h2>

      <form onSubmit={add}>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          required
        >
          <option value="">프로젝트 선택</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <input
          placeholder="작업명"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <input
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          required
        />

        <button type="submit">작업 추가</button>
      </form>

      {projects.map(project => {
        const projectTasks = tasks.filter(
          task => String(task.projectId) === String(project.id)
        );

        return (
          <section key={project.id}>
            <h3>{project.name}</h3>

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
                {projectTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6}>등록된 작업이 없습니다.</td>
                  </tr>
                ) : (
                  projectTasks.map(task => (
                    <tr key={task.id}>
                      {editingId === task.id ? (
                        <>
                          <td>
                            <input
                              value={draft.name || ''}
                              onChange={e => setDraft({ ...draft, name: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={draft.due || ''}
                              onChange={e => setDraft({ ...draft, due: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              value={draft.status || '예정'}
                              onChange={e => setDraft({
                                ...draft,
                                status: e.target.value,
                                progress: e.target.value === '완료'
                                  ? 100
                                  : e.target.value === '예정'
                                    ? 0
                                    : draft.progress
                              })}
                            >
                              {['예정', '진행 중', '완료', '보류'].map(value => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={draft.progress ?? 0}
                              onChange={e => setDraft({ ...draft, progress: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              value={draft.priority || '보통'}
                              onChange={e => setDraft({ ...draft, priority: e.target.value })}
                            >
                              {['긴급', '높음', '보통', '낮음'].map(value => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button type="button" onClick={() => save(task.id)}>저장</button>
                            <button type="button" onClick={cancelEdit}>취소</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{task.name}</td>
                          <td>{task.due || '-'}</td>
                          <td>{task.status}</td>
                          <td>{task.progress}%</td>
                          <td>{task.priority || '보통'}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(task.id);
                                setDraft({ ...task });
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('작업을 삭제할까요?')) {
                                  removeTask(task.id);
                                }
                              }}
                            >
                              삭제
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
