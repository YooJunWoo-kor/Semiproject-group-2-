import React, { useState } from "react";
import { Link } from "react-router-dom";
import { resourceCategories } from "./communityConfig";
import {
  deleteFile,
  downloadFile,
  loadItems,
  saveFile,
  saveItems,
} from "./communityStorage";

const emptyForm = { title: "", category: resourceCategories[0], content: "", author: "임시 사용자", attachment: null };

function TechLibraryPage() {
  const [items, setItems] = useState(() => loadItems("resources"));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const addItem = (item) => {
    const nextItems = [item, ...items];
    saveItems("resources", nextItems);
    setItems(nextItems);
  };

  const updateItem = (item) => {
    const nextItems = items.map((oldItem) => oldItem.id === item.id ? item : oldItem);
    saveItems("resources", nextItems);
    setItems(nextItems);
  };

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    saveItems("resources", nextItems);
    setItems(nextItems);
  };
  const filtered = items.filter((item) => {
    const searchText = `${item.title} ${item.content} ${item.author}`.toLowerCase();
    const matchesSearch = searchText.includes(query.toLowerCase());
    const matchesCategory = category === "전체" || item.category === category;
    return matchesSearch && matchesCategory;
  });
  const openForm = (item) => {
    setForm(item ? { ...item } : emptyForm);
    setFile(null);
    setView(item ? "edit" : "write");
    setMessage("");
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim() || !form.author.trim()) {
      setMessage("제목, 내용, 작성자는 필수입니다.");
      return;
    }

    try {
      let attachment = form.attachment;

      if (file) {
        attachment = await saveFile(file);

        if (form.attachment ? form.attachment.id : null) {
          await deleteFile(form.attachment.id);
        }
      }

      const date = new Date().toISOString().slice(0, 10);

      if (view === "edit") {
        const savedItem = {
          ...form,
          attachment,
          updatedAt: date,
        };

        updateItem(savedItem);
        setSelected(savedItem);
        setView("detail");
        setMessage("자료가 수정되었습니다.");
        return;
      }

      const newItem = {
        ...form,
        attachment,
        id: Date.now(),
        createdAt: date,
        updatedAt: date,
      };

      addItem(newItem);
      setView("list");
      setMessage("자료가 등록되었습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const remove = async () => {
    if (!window.confirm("이 자료와 첨부파일을 삭제할까요?")) {
      return;
    }

    try {
      if (selected.attachment ? selected.attachment.id : null) {
        await deleteFile(selected.attachment.id);
      }

      removeItem(selected.id);
      setSelected(null);
      setView("list");
      setMessage("자료가 삭제되었습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const download = async () => {
    try {
      await downloadFile(selected.attachment);
      setMessage("첨부파일 다운로드를 시작했습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };
  const showDetail = view === "detail" && selected !== null;
  const showForm = view === "write" || view === "edit";
  const showCurrentFile = form.attachment !== null && file === null;

  return (
    <main className="community-page">
      <h1>업무 자료실</h1>
      <nav><Link to="/main/community">커뮤니티 메인</Link></nav>

      <p><small>작성한 자료는 브라우저 저장소에 임시 저장됩니다.</small></p>

      {message ? <p role="status">{message}</p> : null}

      {view === "list" ? (
        <section>
          <h2>자료 목록</h2>

          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 내용 또는 작성자"
            />
          </label>

          <label>
            카테고리
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>전체</option>
              {resourceCategories.map((categoryItem) => (
                <option key={categoryItem}>{categoryItem}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => openForm(null)}>자료 등록</button>

          <ul>
            {filtered.map((item) => (
              <li key={item.id}>
                <span>[{item.category}] </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setView("detail");
                    setMessage("");
                  }}
                >
                  {item.title}
                </button>
                <span> — {item.author} </span>
                <small>{item.updatedAt}</small>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? <p>등록된 자료가 없습니다.</p> : null}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>{selected.category} | {selected.author}</p>
          <p>작성 {selected.createdAt} / 수정 {selected.updatedAt}</p>
          <p>{selected.content}</p>

          <p>
            첨부파일: {selected.attachment ? (
              <button type="button" onClick={download}>
                {selected.attachment.name} 다운로드
              </button>
            ) : "없음"}
          </p>

          <button type="button" onClick={() => openForm(selected)}>수정</button>
          <button type="button" onClick={remove}>삭제</button>
          <button type="button" onClick={() => setView("list")}>목록</button>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === "edit" ? "자료 수정" : "자료 등록"}</h2>

          <label>
            자료 제목*
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <br />

          <label>
            카테고리*
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {resourceCategories.map((categoryItem) => (
                <option key={categoryItem}>{categoryItem}</option>
              ))}
            </select>
          </label>
          <br />

          <label>
            작성자*
            <input
              value={form.author}
              onChange={(event) => setForm({ ...form, author: event.target.value })}
            />
          </label>
          <br />

          <label>
            내용 및 설명*
            <textarea
              rows="7"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
            />
          </label>
          <br />

          <label>
            첨부파일
            <input
              type="file"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </label>

          {showCurrentFile ? <span> 현재: {form.attachment.name}</span> : null}
          <br />

          <button type="submit">저장</button>
          <button type="button" onClick={() => setView(selected ? "detail" : "list")}>취소</button>
        </form>
      ) : null}
    </main>
  );
}

export default TechLibraryPage;
