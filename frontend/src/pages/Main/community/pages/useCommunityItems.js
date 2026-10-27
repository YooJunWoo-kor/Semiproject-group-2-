import { useState } from 'react';
import { loadItems, saveItems } from './communityStorage';

// 여러 게시판에서 반복되는 글 목록 관리를 한 곳에 모은 공통 기능입니다.
// storageName을 전달하면 게시판마다 서로 다른 목록을 사용합니다.
export default function useCommunityItems(storageName) {
  const [items, setItems] = useState(() => loadItems(storageName));

  function updateList(makeNextItems) {
    const nextItems = makeNextItems(items);
    saveItems(storageName, nextItems);
    setItems(nextItems);
  }

  function addItem(newItem) {
    updateList((currentItems) => [newItem, ...currentItems]);
  }

  function updateItem(updatedItem) {
    updateList((currentItems) => currentItems.map((item) => (
      item.id === updatedItem.id ? updatedItem : item
    )));
  }

  function removeItem(itemId) {
    updateList((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  return { items, addItem, updateItem, removeItem };
}