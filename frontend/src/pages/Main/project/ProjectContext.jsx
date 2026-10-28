import React, { createContext, useContext, useEffect, useState } from 'react';
import { sampleProjects, sampleTasks } from './data/projectDummyData';

const ProjectContext = createContext(null);
const STORAGE_KEY = 'erp.project.v1';

function loadData() {
  const basicData = {
    projects: sampleProjects,
    tasks: sampleTasks,
    outputs: [],
    resources: [],
    budgets: {},
    expenses: [],
    risks: []
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return basicData;

    const parsed = JSON.parse(saved);

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : basicData.projects,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : basicData.tasks,
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      budgets: parsed.budgets || {},
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : []
    };
  } catch (error) {
    console.log('프로젝트 데이터 불러오기 실패', error);
    return basicData;
  }
}

export function ProjectProvider({ children }) {
  const [initialData] = useState(loadData);

  const [projects, setProjects] = useState(initialData.projects);
  const [tasks, setTasks] = useState(initialData.tasks);
  const [outputs, setOutputs] = useState(initialData.outputs);
  const [resources, setResources] = useState(initialData.resources);
  const [budgets, setBudgets] = useState(initialData.budgets);
  const [expenses, setExpenses] = useState(initialData.expenses);
  const [risks, setRisks] = useState(initialData.risks);

  useEffect(() => {
    const data = {
      projects,
      tasks,
      outputs,
      resources,
      budgets,
      expenses,
      risks
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [projects, tasks, outputs, resources, budgets, expenses, risks]);

  function saveProject(project) {
    if (project.id) {
      setProjects(projects.map(item =>
        Number(item.id) === Number(project.id) ? project : item
      ));
      return project.id;
    }

    const newProject = {
      ...project,
      id: Date.now()
    };

    setProjects([...projects, newProject]);
    return newProject.id;
  }

  function removeProject(id) {
    setProjects(projects.filter(item => Number(item.id) !== Number(id)));
    setTasks(tasks.filter(item => Number(item.projectId) !== Number(id)));
    setOutputs(outputs.filter(item => Number(item.projectId) !== Number(id)));
    setResources(resources.filter(item => Number(item.projectId) !== Number(id)));
    setExpenses(expenses.filter(item => Number(item.projectId) !== Number(id)));
    setRisks(risks.filter(item => Number(item.projectId) !== Number(id)));

    const nextBudgets = { ...budgets };
    delete nextBudgets[id];
    setBudgets(nextBudgets);
  }

  function addTask(task) {
    const newTask = {
      ...task,
      id: Date.now(),
      projectId: Number(task.projectId),
      progress: Number(task.progress || 0)
    };

    setTasks([...tasks, newTask]);
  }

  function updateTask(id, changedTask) {
    setTasks(tasks.map(task => {
      if (Number(task.id) !== Number(id)) return task;

      let progress = Number(changedTask.progress || 0);
      if (changedTask.status === '완료') progress = 100;
      if (changedTask.status === '예정') progress = 0;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;

      return {
        ...task,
        ...changedTask,
        projectId: Number(changedTask.projectId),
        progress
      };
    }));
  }

  function removeTask(id) {
    setTasks(tasks.filter(task => Number(task.id) !== Number(id)));
  }

  function addResource(resource) {
    const newResource = {
      ...resource,
      id: Date.now(),
      projectId: Number(resource.projectId),
      days: Number(resource.days),
      capacity: Number(resource.capacity)
    };

    setResources([...resources, newResource]);
  }

  function removeResource(id) {
    setResources(resources.filter(item => Number(item.id) !== Number(id)));
  }

  function saveOutput(output) {
    const savedOutput = {
      ...output,
      id: output.id || Date.now(),
      projectId: Number(output.projectId)
    };

    if (output.id) {
      setOutputs(outputs.map(item =>
        Number(item.id) === Number(output.id) ? savedOutput : item
      ));
    } else {
      setOutputs([...outputs, savedOutput]);
    }
  }

  function removeOutput(id) {
    setOutputs(outputs.filter(item => Number(item.id) !== Number(id)));
  }

  function saveBudget(projectId, amount) {
    setBudgets({
      ...budgets,
      [projectId]: Number(amount)
    });
  }

  function addExpense(expense) {
    const newExpense = {
      ...expense,
      id: Date.now(),
      projectId: Number(expense.projectId),
      amount: Number(expense.amount)
    };

    setExpenses([...expenses, newExpense]);
  }

  function removeExpense(id) {
    setExpenses(expenses.filter(item => Number(item.id) !== Number(id)));
  }

  function addRisk(risk) {
    const newRisk = {
      ...risk,
      id: Date.now(),
      projectId: Number(risk.projectId),
      status: '미해결'
    };

    setRisks([...risks, newRisk]);
  }

  function updateRisk(id, changedRisk) {
    setRisks(risks.map(risk =>
      Number(risk.id) === Number(id)
        ? { ...risk, ...changedRisk }
        : risk
    ));
  }

  function removeRisk(id) {
    setRisks(risks.filter(item => Number(item.id) !== Number(id)));
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      tasks,
      outputs,
      resources,
      budgets,
      expenses,
      risks,
      saveProject,
      removeProject,
      addTask,
      updateTask,
      removeTask,
      addResource,
      removeResource,
      saveOutput,
      removeOutput,
      saveBudget,
      addExpense,
      removeExpense,
      addRisk,
      updateRisk,
      removeRisk
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
