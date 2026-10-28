import { useState } from 'react';
import communityDummy from '../data/communityDummy.json';

// 게시판에서 사용하는 저장소 이름과 JSON 배열 이름을 연결합니다.
function getDummyItems(storageName) {
  const dummyNames = {
    notices: 'notices',
    'free-posts': 'freePosts',
    resources: 'resources',
    questions: 'questions',
    suggestions: 'suggestions',
  };
  const dummyName = dummyNames[storageName];

  if (!dummyName) {
    return [];
  }

  return Array.isArray(communityDummy[dummyName])
    ? communityDummy[dummyName]
    : [];
}

// 여러 게시판에서 반복되는 글 목록 관리를 한 곳에 모은 공통 기능입니다.
// storageName을 전달하면 게시판마다 서로 다른 목록을 사용합니다.
export default function useCommunityItems(storageName) {
  const [items, setItems] = useState(function () {
    return getDummyItems(storageName).map(function (item) {
      return { ...item };
    });
  });

  function updateList(makeNextItems) {
    const nextItems = makeNextItems(items);
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
