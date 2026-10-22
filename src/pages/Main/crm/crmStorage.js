import { useState } from 'react';

const STORAGE_KEY = 'cosmetics-erp-crm';
const EMPTY_DATA = { customers: [], purchases: [], partners: [], consultations: [], claims: [] };

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...EMPTY_DATA, ...(saved || {}) };
  } catch {
    return { ...EMPTY_DATA };
  }
}

export function useCrmData() {
  const [data, setDataState] = useState(readData);
  const setData = (updater) => {
    setDataState((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  return [data, setData];
}
