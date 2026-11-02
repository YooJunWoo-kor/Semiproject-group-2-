import React, { useState } from "react";
import { Link } from "react-router-dom";
import { loadItems, saveItems } from "./communityStorage";
import DataDistributor from "./DataComponent/DataDistributor";

const emptyForm = {
  title: "",
  author: "임시 사용자",
  content: "",
  status: "접수",
  result: "",
};

function SuggestionPage() {
  const [items, setItems] = useState(() => loadItems("suggestions"));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [admin, setAdmin] = useState({ status: "접수", result: "" });
  const [message, setMessage] = useState("");

  const addItem = (item) => {
    const nextItems = [item, ...items];
    saveItems("suggestions", nextItems);
    setItems(nextItems);
  };

  const updateItem = (item) => {
    const nextItems = items.map((oldItem) =>
      oldItem.id === item.id ? item : oldItem
    );

    saveItems("suggestions", nextItems);
    setItems(nextItems);
  };

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);

    saveItems("suggestions", nextItems);
    setItems(nextItems);
  };

  const filtered = items.filter((item) => {
    const matchesTitle = item.title
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesStatus = status === "전체" || item.status === status;

    return matchesTitle && matchesStatus;
  });

  const openDetail = (item) => {
    setSelected(item);
    setAdmin({ status: item.status, result: item.result });
    setView("detail");
    setMessage("");
  };

  const openForm = (item) => {
    setForm(item ? { ...item } : emptyForm);
    setView(item ? "edit" : "write");
    setMessage("");
  };

  const save = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      setMessage("제목, 작성자, 건의 내용은 필수입니다.");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);

    if (view === "edit") {
      const savedItem = { ...form, updatedAt: date };

      updateItem(savedItem);
      setSelected(savedItem);
      setAdmin({ status: savedItem.status, result: savedItem.result });
      setView("detail");
      setMessage("건의사항이 수정되었습니다.");
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),
      createdAt: date,
      updatedAt: date,
    };

    addItem(newItem);
    setView("list");
    setMessage("건의사항이 등록되었습니다.");
  };

  const remove = () => {
    if (!window.confirm("이 건의사항을 삭제할까요?")) {
      return;
    }

    removeItem(selected.id);
    setSelected(null);
    setView("list");
    setMessage("건의사항이 삭제되었습니다.");
  };

  const saveResult = () => {
    const savedItem = {
      ...selected,
      status: admin.status,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setMessage("처리 상태가 저장되었습니다.");
  };

  const showDetail = view === "detail" && selected !== null;
  const showForm = view === "write" || view === "edit";

  return (
    <main className="community-page suggestion-page">
      <h1>업무 개선 건의</h1>

      <nav>
        <Link to="/main/community">커뮤니티 메인</Link>
      </nav>

      {message ? <p role="status">{message}</p> : null}

      {view === "list" ? (
        <section>
          <h2>건의 목록</h2>

          <label>
            제목 검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label>
            처리 상태
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {["전체", "접수", "검토 중", "처리 완료"].map((statusItem) => (
                <option key={statusItem}>{statusItem}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => openForm(null)}>
            건의 등록1
          </button>

          {filtered.length === 0 ? (
            <p>등록된 건의사항이 없습니다.</p>
          ) : (
            <DataDistributor
              data={filtered.map((item) => ({
                id: item.id,
                content: item.content,
                name: item.author,
              }))}
              isSuggestion={true}
            />
          )}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>
            {selected.author} | 작성 {selected.createdAt} / 수정{" "}
            {selected.updatedAt}
          </p>
          <p>{selected.content}</p>

          <button type="button" onClick={() => openForm(selected)}>
            건의 수정
          </button>
          <button type="button" onClick={remove}>
            건의 삭제
          </button>
          <button type="button" onClick={() => setView("list")}>
            목록
          </button>

          <section>
            <h3>관리자 처리</h3>

            <label>
              처리 상태
              <select
                value={admin.status}
                onChange={(event) =>
                  setAdmin({ ...admin, status: event.target.value })
                }
              >
                {["접수", "검토 중", "처리 완료"].map((statusItem) => (
                  <option key={statusItem}>{statusItem}</option>
                ))}
              </select>
            </label>
            <br />

            <button type="button" onClick={saveResult}>
              처리 상태 저장
            </button>
          </section>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === "edit" ? "건의 수정" : "건의 등록"}</h2>

          <label>
            제목*
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <br />

          <label>
            작성자*
            <input
              value={form.author}
              onChange={(event) =>
                setForm({ ...form, author: event.target.value })
              }
            />
          </label>
          <br />

          <label>
            건의 내용*
            <textarea
              rows="7"
              value={form.content}
              onChange={(event) =>
                setForm({ ...form, content: event.target.value })
              }
            />
          </label>
          <br />

          <button type="submit">저장</button>
          <button
            type="button"
            onClick={() => setView(selected ? "detail" : "list")}
          >
            취소
          </button>
        </form>
      ) : null}
    </main>
  );
}

export default SuggestionPage;