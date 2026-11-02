import React, { useState } from 'react';
import './ProjectManagementPage.css';
import ProjectGanttChart from './ProjectGanttChart';
import ProjectResource from './ProjectResource';
import ProjectBudget from './ProjectBudget';
import ProjectRisk from './ProjectRisk';
import ProjectHome from './ProjectHome';
import ProjectDeliverables from './ProjectDeliverables';

// 연습용 초기 데이터
const sampleProjects = [
  { id: 1, name: '비건 선케어 라인 출시', owner: '제품개발팀', status: '진행 중', start: '2026-10-01', due: '2026-11-30', memo: '원료 적합성 검토' },
  { id: 2, name: '앰플 용기 리뉴얼', owner: '상품기획팀', status: '검토', start: '2026-10-20', due: '2026-12-18', memo: '샘플 평가' }
];

const sampleTasks = [
  { id: 101, projectId: 1, name: '원료 적합성 검토', start: '2026-10-01', due: '2026-10-25', status: '완료', progress: 100, priority: '보통' },
  { id: 102, projectId: 1, name: '시제품 제작', start: '2026-10-15', due: '2026-11-05', status: '진행 중', progress: 60, priority: '높음' }
];

const emptyProject = { name: '', owner: '', status: '검토', start: '', due: '', memo: '' };

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState(sampleProjects);
  const [tasks, setTasks] = useState(sampleTasks);
  const [page, setPage] = useState('홈');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [resources, setResources] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [risks, setRisks] = useState([]);

  const selected = projects.find(p => p.id === selectedId);
  const projectTasks = tasks.filter(t => t.projectId === selectedId);
  const projectRisks = risks.filter(
    r => String(r.projectId) === String(selectedId));
  const progress = projectTasks.length
    ? Math.round(projectTasks.reduce((sum, t) => sum + Number(t.progress), 0) / projectTasks.length)
    : 0;

  function openProject(project) {
    setSelectedId(project.id);
    setEditing(null);
  }

  function saveProject(e) {
    e.preventDefault();
    if (!editing.name.trim() || !editing.owner.trim() || !editing.due) return;
    if (editing.start && editing.due < editing.start) {
      alert('목표일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    if (editing.id) {
      setProjects(projects.map(p => p.id === editing.id ? editing : p));
    } else {
      setProjects([...projects, { ...editing, id: Date.now() }]);
    }
    setEditing(null);
  }

  function deleteProject(id) {
    if (!window.confirm('프로젝트를 삭제할까요?')) return;
    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    setOutputs(outputs.filter(o => o.projectId !== id));
    setResources(resources.filter(r => r.projectId !== id));
    setExpenses(expenses.filter(e => e.projectId !== id));
    setRisks(risks.filter(r => r.projectId !== id));
    setBudgets(old => {
      const next = { ...old };
      delete next[id];
      return next;
    });
    setSelectedId(null);
  }

  const menus = ['프로젝트 관리', '작업 분류 구조', '인력·공수', '산출물 관리', '예산·비용', '리스크·이슈'];

  return (
    <div className="project-page">
      <h1
        className="project-title"
        onClick={() => {
          setPage('홈');
          setSelectedId(null);
          setEditing(null);
        }}
        title="프로젝트 홈으로 이동"
      >
        프로젝트 관리
      </h1>
      <div className="project-layout">
        <aside className="project-sidebar">
          <button className={page === '홈' ? 'active project-home-link' : 'project-home-link'}
            onClick={() => { setPage('홈'); setSelectedId(null); setEditing(null); }}>프로젝트 홈</button>
          {menus.map(menu => (
            <button key={menu} className={page === menu ? 'active' : ''}
              onClick={() => { setPage(menu); setSelectedId(null); setEditing(null); }}>{menu}</button>
          ))}
        </aside>
        <main className="project-content">

          {editing ? (
            <form onSubmit={saveProject}>
              <h2>{editing.id ? '프로젝트 수정' : '프로젝트 등록'}</h2>
              <label>프로젝트명 <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required /></label>
              <label>담당 부서 <input value={editing.owner} onChange={e => setEditing({ ...editing, owner: e.target.value })} required /></label>
              <label>시작일 <input type="date" value={editing.start} onChange={e => setEditing({ ...editing, start: e.target.value })} /></label>
              <label>목표일 <input type="date" value={editing.due} onChange={e => setEditing({ ...editing, due: e.target.value })} required /></label>
              <label>상태
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                  <option>검토</option>
                  <option>진행 중</option>
                  <option>완료</option>
                  <option>보류</option>
                </select>
              </label>
              <label>메모 <input value={editing.memo} onChange={e => setEditing({ ...editing, memo: e.target.value })} /></label>
              <button type="submit">저장</button>
              <button type="button" onClick={() => setEditing(null)}>취소</button>
            </form>
          ) : selected ? (
            <div>
              <h2>{selected.name}</h2>
              {/* 프로젝트 마감 알림 */}
              {(() => {
                if (!selected.due) return null;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const dueDate = new Date(selected.due + 'T00:00:00');
                const days = Math.round((dueDate - today) / 86400000);

                const completed = selected.status === '완료';
                const urgent = !completed && days >= 0 && days <= 7;
                const delayed = !completed && days < 0;

                return (
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
                );
              })()}
              <h3>프로젝트 기본 정보</h3>

              <table className="project-summary-table">
                <tbody>
                  <tr>
                    <th>담당 부서</th>
                    <td>{selected.owner}</td>
                  </tr>

                  <tr>
                    <th>진행 상태</th>
                    <td>{selected.status}</td>
                  </tr>

                  <tr>
                    <th>시작일</th>
                    <td>{selected.start}</td>
                  </tr>

                  <tr>
                    <th>목표일</th>
                    <td>{selected.due}</td>
                  </tr>

                  <tr>
                    <th>메모</th>
                    <td>{selected.memo || '-'}</td>
                  </tr>

                  <tr>
                    <th>작업 분류 구조 평균 공정률</th>
                    <td>{progress}%</td>
                  </tr>
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                style={{ marginTop: '16px' }}
              >
                목록으로
              </button>
              {/* 다른 메뉴에서 등록한 동일 프로젝트의 데이터를 읽어 보여줍니다. */}

              <section style={{ marginTop: '24px' }}>
                <h3>예산·비용 현황</h3>

                {(() => {
                  const budget = Number(budgets[selected.id] || 0);

                  const items = expenses.filter(
                    e => String(e.projectId) === String(selected.id)
                  );

                  const used = items.reduce(
                    (sum, e) => sum + Number(e.amount || 0), 0
                  );

                  const remaining = budget - used;
                  const rate = budget > 0
                    ? Math.round(used / budget * 100)
                    : 0;

                  return (
                    <>
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
                            <td style={{
                              color: remaining < 0 ? '#dc2626' : 'inherit',
                              fontWeight: remaining < 0 ? 'bold' : 'normal'
                            }}>
                              {remaining.toLocaleString()}원
                            </td>
                            <td>{budget > 0 ? `${rate}%` : '미설정'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <h4>지출 내역</h4>

                      <table className="project-summary-table">
                        <thead>
                          <tr>
                            <th>지출 항목</th>
                            <th>금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={2}>등록된 비용이 없습니다.</td>
                            </tr>
                          ) : (
                            items.map(e => (
                              <tr key={e.id}>
                                <td>{e.category}</td>
                                <td>{Number(e.amount).toLocaleString()}원</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </section>


              <section style={{ marginTop: '24px' }}>
                <h3>리스크·이슈 현황</h3>

                <table className="project-summary-table">
                  <thead>
                    <tr>
                      <th>리스크·이슈명</th>
                      <th>위험도</th>
                      <th>상태</th>
                    </tr>
                  </thead>

                  <tbody>
                    {projectRisks.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          등록된 리스크·이슈가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      projectRisks.map(r => (
                        <tr key={r.id}>
                          <td>{r.title}</td>
                          <td>{r.level}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              <section style={{ marginTop: '24px' }}>
                <h3>작업 분류 구조 현황</h3>
                <table className="project-summary-table">
                  <thead>
                    <tr>
                      <th>작업명</th>
                      <th>목표일</th>
                      <th>상태</th>
                      <th>공정률</th>
                      <th>우선순위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTasks.length ? projectTasks.map(t =>
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.due || '-'}</td>
                        <td>{t.status}</td>
                        <td>{t.progress}%</td>
                        <td>{t.priority || '보통'}</td>
                      </tr>) : <tr>
                      <td colSpan={5}>등록된 작업이 없습니다.</td>
                    </tr>}
                  </tbody>
                </table>
              </section>
              <section style={{ marginTop: '24px' }}>
                <h3>투입 인력·공수 현황</h3>
                <table className="project-summary-table">
                  <thead>
                    <tr>
                      <th>담당자</th>
                      <th>상세 업무</th>
                      <th>투입 M/D</th>
                      <th>가용 M/D</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.filter(r => String(r.projectId) === String(selected.id)).length ?
                      resources.filter(r => String(r.projectId) === String(selected.id)).map(r =>
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.workDetail || '-'}</td>
                          <td>{r.days}</td>
                          <td>{r.capacity}</td>
                          <td>{Number(r.days) > Number(r.capacity) ? '과부하' : '정상'}
                          </td></tr>) : <tr><td colSpan={5}>등록된 인력이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </section>
              <section style={{ marginTop: '24px' }}>
                <h3>산출물 현황</h3>
                <table className="project-summary-table">
                  <thead>
                    <tr>
                      <th>산출물명</th>
                      <th>담당자</th>
                      <th>목표일</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.filter(o => String(o.projectId) === String(selected.id)).length ? outputs.filter(o => String(o.projectId) === String(selected.id)).map(o => <tr key={o.id}><td>{o.name}</td><td>{o.owner || '-'}</td><td>{o.due || '-'}</td><td>{o.status || '-'}</td></tr>) : <tr><td colSpan={4}>등록된 산출물이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </section>
            </div>
          ) : (
            <div>
              {page === '홈' && <ProjectHome projects={projects} tasks={tasks} onSelect={openProject} />}


              {page === '프로젝트 관리' && (
                <>
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
                          <td colSpan={5}>
                            등록된 프로젝트가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        projects.map(p => (
                          <tr key={p.id}>
                            <td>
                              <button
                                type="button"
                                onClick={() => openProject(p)}>
                                {p.name}
                              </button>
                            </td>
                            <td>{p.owner}</td>
                            <td>{p.status}</td>
                            <td>{p.due || '-'}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setEditing({ ...p })}>
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProject(p.id)}>
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {page === '작업 분류 구조' && <ProjectGanttChart projects={projects} tasks={tasks} setTasks={setTasks} />}
              {page === '인력·공수' && <ProjectResource projects={projects} records={resources} setRecords={setResources} />}
              {page === '산출물 관리' && <ProjectDeliverables projects={projects} outputs={outputs} setOutputs={setOutputs} />}
              {page === '예산·비용' && <ProjectBudget projects={projects} budgets={budgets} setBudgets={setBudgets} expenses={expenses} setExpenses={setExpenses} />}
              {page === '리스크·이슈' && <ProjectRisk projects={projects} risks={risks} setRisks={setRisks} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
