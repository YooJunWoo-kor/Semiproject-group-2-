import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadProjectData, saveProjectData } from './services/projectService';

const Context = createContext(null);

export function ProjectProvider({ children }) {
  // 최초 렌더링 시 한 번만 읽고, 이후 상태 변경 시 자동 저장합니다.
  const [initial] = useState(loadProjectData);
  const [projects, setProjects] = useState(initial.projects);
  const [tasks, setTasks] = useState(initial.tasks);
  const [outputs, setOutputs] = useState(initial.outputs);
  const [resources, setResources] = useState(initial.resources);
  const [budgets, setBudgets] = useState(initial.budgets);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [risks, setRisks] = useState(initial.risks);

  useEffect(() => {
    saveProjectData({ projects, tasks, outputs, resources, budgets, expenses, risks });
  }, [projects, tasks, outputs, resources, budgets, expenses, risks]);

  const deleteProject = (id) => {
    if (!window.confirm('프로젝트를 삭제할까요?')) return false;
    const keep = x => String(x.projectId) !== String(id);
    setProjects(v => v.filter(x => String(x.id) !== String(id)));
    setTasks(v => v.filter(keep));
    setOutputs(v => v.filter(keep));
    setResources(v => v.filter(keep));
    setExpenses(v => v.filter(keep));
    setRisks(v => v.filter(keep));
    setBudgets(v => { const next = { ...v }; delete next[id]; return next; });
    return true;
  };

  return <Context.Provider value={{
    projects, setProjects, tasks, setTasks, outputs, setOutputs,
    resources, setResources, budgets, setBudgets, expenses, setExpenses,
    risks, setRisks, deleteProject
  }}>{children}</Context.Provider>;
}

export function useProject() {
  const value = useContext(Context);
  if (!value) throw new Error('ProjectProvider가 필요합니다.');
  return value;
}
