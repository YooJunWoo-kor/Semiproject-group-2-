// 저장소 교체 지점: 향후 이 파일의 구현을 fetch/axios API로 변경합니다.
import { sampleProjects, sampleTasks } from '../data/projectDummyData';

export const PROJECT_STORAGE_KEY = 'erp.project.v1';

export function initialProjectData() {
  return {
    projects: sampleProjects.map(item => ({ ...item })),
    tasks: sampleTasks.map(item => ({ ...item })),
    outputs: [], resources: [], budgets: {}, expenses: [], risks: []
  };
}

export function loadProjectData() {
  const initial = initialProjectData();
  try {
    if (typeof window === 'undefined' || !window.localStorage) return initial;
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return initial;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return initial;
    return {
      projects: Array.isArray(saved.projects) ? saved.projects : initial.projects,
      tasks: Array.isArray(saved.tasks) ? saved.tasks : initial.tasks,
      outputs: Array.isArray(saved.outputs) ? saved.outputs : [],
      resources: Array.isArray(saved.resources) ? saved.resources : [],
      budgets: saved.budgets && typeof saved.budgets === 'object' && !Array.isArray(saved.budgets) ? saved.budgets : {},
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      risks: Array.isArray(saved.risks) ? saved.risks : []
    };
  } catch (error) {
    console.warn('프로젝트 저장 데이터 읽기 실패:', error);
    return initial;
  }
}

export function saveProjectData(data) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('프로젝트 데이터 저장 실패:', error);
    return false;
  }
}
