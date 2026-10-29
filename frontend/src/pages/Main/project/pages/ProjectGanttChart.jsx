import React, { useState } from 'react';

export default function ProjectGanttChart() {
  const projects ="projects";
  const tasks ="tasks";
  const addTask ="addTask";
  const updateTask ="updateTask";
  const removeTask ="removeTask";

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [due, setDue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const add = "add";
  const project ="project";

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
               
              </tbody>
            </table>
          </section>
        );
      
    </div>
  );
}
