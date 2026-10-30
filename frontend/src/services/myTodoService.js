// 개인 일정과 별도로 할 일을 저장
const STORAGE_KEY = 'erp.personal-todos.v1';

// 저장된 할 일 불러오기
export function loadMyTodos() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(todo =>
      todo &&
      typeof todo.id === 'string' &&
      typeof todo.title === 'string' &&
      typeof todo.completed === 'boolean'
    );
  } catch {
    return [];
  }
}

// 할 일 목록 저장하기
export function saveMyTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}