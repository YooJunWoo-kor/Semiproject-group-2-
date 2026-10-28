import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { loadProjectData, saveProjectData } from './services/projectService';

const Context = createContext(null);

const sameId = (a, b) => String(a) === String(b);
const clampProgress = value => Math.max(0, Math.min(100, Number(value) || 0));
const nextId = () => Date.now();

export function ProjectProvider({ children }) {
  const [initial] = useState(loadProjectData);
  const [projects, setProjects] = useState(initial.projects);
  const [tasks, setTasks] = useState(initial.tasks);
  const [outputs, setOutputs] = useState(initial.outputs);
  const [resources, setResources] = useState(initial.resources);
  const [budgets, setBudgets] = useState(initial.budgets);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [risks, setRisks] = useState(initial.risks);

  useEffect(() => {
    saveProjectData({
      projects,
      tasks,
      outputs,
      resources,
      budgets,
      expenses,
      risks
    });
  }, [projects, tasks, outputs, resources, budgets, expenses, risks]);

  const saveProject = useCallback(project => {
    const saved = {
      ...project,
      id: project.id ?? nextId()
    };

    setProjects(prev => {
      const exists = prev.some(item => sameId(item.id, saved.id));
      return exists
        ? prev.map(item => sameId(item.id, saved.id) ? saved : item)
        : [...prev, saved];
    });

    return saved.id;
  }, []);

  const removeProject = useCallback(id => {
    const keepProject = item => !sameId(item.projectId, id);

    setProjects(prev => prev.filter(item => !sameId(item.id, id)));
    setTasks(prev => prev.filter(keepProject));
    setOutputs(prev => prev.filter(keepProject));
    setResources(prev => prev.filter(keepProject));
    setExpenses(prev => prev.filter(keepProject));
    setRisks(prev => prev.filter(keepProject));
    setBudgets(prev => {
      const next = { ...prev };
      delete next[id];
      delete next[String(id)];
      return next;
    });
  }, []);

  const addTask = useCallback(task => {
    const saved = {
      ...task,
      id: task.id ?? nextId(),
      projectId: Number(task.projectId),
      progress: clampProgress(task.progress)
    };
    setTasks(prev => [...prev, saved]);
    return saved.id;
  }, []);

  const updateTask = useCallback((id, changes) => {
    setTasks(prev => prev.map(task => {
      if (!sameId(task.id, id)) return task;

      const next = { ...task, ...changes };
      const status = next.status;
      const progress = status === '완료'
        ? 100
        : status === '예정'
          ? 0
          : clampProgress(next.progress);

      return {
        ...next,
        projectId: Number(next.projectId),
        progress
      };
    }));
  }, []);

  const removeTask = useCallback(id => {
    setTasks(prev => prev.filter(task => !sameId(task.id, id)));
  }, []);

  const addResource = useCallback(resource => {
    const saved = {
      ...resource,
      id: resource.id ?? nextId(),
      projectId: Number(resource.projectId),
      days: Number(resource.days),
      capacity: Number(resource.capacity)
    };
    setResources(prev => [...prev, saved]);
    return saved.id;
  }, []);

  const removeResource = useCallback(id => {
    setResources(prev => prev.filter(item => !sameId(item.id, id)));
  }, []);

  const saveOutput = useCallback(output => {
    const saved = {
      ...output,
      id: output.id ?? nextId(),
      projectId: Number(output.projectId)
    };

    setOutputs(prev => {
      const exists = prev.some(item => sameId(item.id, saved.id));
      return exists
        ? prev.map(item => sameId(item.id, saved.id) ? saved : item)
        : [...prev, saved];
    });

    return saved.id;
  }, []);

  const removeOutput = useCallback(id => {
    setOutputs(prev => prev.filter(item => !sameId(item.id, id)));
  }, []);

  const saveBudget = useCallback((projectId, amount) => {
    setBudgets(prev => ({
      ...prev,
      [String(projectId)]: Number(amount)
    }));
  }, []);

  const addExpense = useCallback(expense => {
    const saved = {
      ...expense,
      id: expense.id ?? nextId(),
      projectId: Number(expense.projectId),
      amount: Number(expense.amount)
    };
    setExpenses(prev => [...prev, saved]);
    return saved.id;
  }, []);

  const removeExpense = useCallback(id => {
    setExpenses(prev => prev.filter(item => !sameId(item.id, id)));
  }, []);

  const addRisk = useCallback(risk => {
    const saved = {
      ...risk,
      id: risk.id ?? nextId(),
      projectId: Number(risk.projectId),
      status: risk.status || '미해결'
    };
    setRisks(prev => [...prev, saved]);
    return saved.id;
  }, []);

  const updateRisk = useCallback((id, changes) => {
    setRisks(prev => prev.map(item =>
      sameId(item.id, id) ? { ...item, ...changes } : item
    ));
  }, []);

  const removeRisk = useCallback(id => {
    setRisks(prev => prev.filter(item => !sameId(item.id, id)));
  }, []);

  const getProjectById = useCallback(
    id => projects.find(project => sameId(project.id, id)) || null,
    [projects]
  );

  const getTasksByProject = useCallback(
    id => tasks.filter(item => sameId(item.projectId, id)),
    [tasks]
  );

  const getResourcesByProject = useCallback(
    id => resources.filter(item => sameId(item.projectId, id)),
    [resources]
  );

  const getOutputsByProject = useCallback(
    id => outputs.filter(item => sameId(item.projectId, id)),
    [outputs]
  );

  const getExpensesByProject = useCallback(
    id => expenses.filter(item => sameId(item.projectId, id)),
    [expenses]
  );

  const getRisksByProject = useCallback(
    id => risks.filter(item => sameId(item.projectId, id)),
    [risks]
  );

  const getBudgetByProject = useCallback(
    id => Number(budgets[String(id)] ?? budgets[id] ?? 0),
    [budgets]
  );

  const value = useMemo(() => ({
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
    removeRisk,

    getProjectById,
    getTasksByProject,
    getResourcesByProject,
    getOutputsByProject,
    getExpensesByProject,
    getRisksByProject,
    getBudgetByProject
  }), [
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
    removeRisk,
    getProjectById,
    getTasksByProject,
    getResourcesByProject,
    getOutputsByProject,
    getExpensesByProject,
    getRisksByProject,
    getBudgetByProject
  ]);

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
}

export function useProject() {
  const value = useContext(Context);

  if (!value) {
    throw new Error('useProject는 ProjectProvider 내부에서 사용해야 합니다.');
  }

  return value;
}
