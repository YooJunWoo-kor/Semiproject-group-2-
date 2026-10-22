const STORAGE_NAME = "cosmetics-erp-community:";
const FILE_DATABASE = "cosmetics-erp-files";
const FILE_STORE = "attachments";

// localStorage에서 게시판 데이터를 불러옵니다.
export function loadItems(name) {
  const savedItems = localStorage.getItem(STORAGE_NAME + name);

  if (savedItems) {
    const items = JSON.parse(savedItems);

    // 이전 버전에서 저장된 Q&A 예시만 삭제합니다.
    if (name === "questions") {
      const exampleTitles = [
        "비타민 C 원료 보관 조건이 궁금합니다",
        "완제품 미생물 검사 주기를 확인해 주세요",
      ];

      const nextItems = items.filter((item) => {
        return !exampleTitles.includes(item.title);
      });

      localStorage.setItem(STORAGE_NAME + name, JSON.stringify(nextItems));
      return nextItems;
    }

    return items;
  }

  return [];
}

// 게시판 데이터를 localStorage에 저장합니다.
export function saveItems(name, items) {
  localStorage.setItem(STORAGE_NAME + name, JSON.stringify(items));
}

function openFileDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_DATABASE, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(FILE_STORE)) {
        database.createObjectStore(FILE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("첨부파일 저장소를 열 수 없습니다."));
  });
}

// 첨부파일은 용량 문제로 IndexedDB에 따로 저장합니다.
export async function saveFile(file) {
  const database = await openFileDatabase();
  const fileInfo = {
    id: Date.now(),
    name: file.name,
    type: file.type,
    size: file.size,
  };

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).put({ id: fileInfo.id, file });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(new Error("첨부파일을 저장할 수 없습니다."));
  });

  database.close();
  return fileInfo;
}

export async function deleteFile(id) {
  if (!id) {
    return;
  }

  const database = await openFileDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(new Error("첨부파일을 삭제할 수 없습니다."));
  });

  database.close();
}

export async function downloadFile(fileInfo) {
  const database = await openFileDatabase();

  const savedFile = await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, "readonly");
    const request = transaction.objectStore(FILE_STORE).get(fileInfo.id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("첨부파일을 불러올 수 없습니다."));
  });

  database.close();

  if (!savedFile) {
    throw new Error("저장된 첨부파일이 없습니다.");
  }

  const fileUrl = URL.createObjectURL(savedFile.file);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileInfo.name;
  link.click();
  URL.revokeObjectURL(fileUrl);
}
