import React, { useState } from "react";
import { Link } from "react-router-dom";
import { noticeCategories } from "./communityConfig";
import useCommunityItems from "./useCommunityItems";

const emptyForm = { title: "", category: noticeCategories[0], content: "", author: "임시 관리자", important: false };

function NoticePage() {
  // 1. 게시판별 글 목록과 공통 추가/수정/삭제 기능을 준비합니다.
  const { items, addItem, updateItem, removeItem } = useCommunityItems("notices");
  const [query, setQuery] = useState(""); //검색창에 입력한 검색어
  const [view, setView] = useState("list"); //현재 표시할 화면
  const [selected, setSelected] = useState(null); //사용자가 선택한 게시글
  const [form, setForm] = useState(emptyForm); //게시글 작성 , 수정 입력값
  const [message, setMessage] = useState(""); //저장,삭제, 결과 안내

  const filtered = items
    .filter((item) => {
      const searchText = `${item.title} ${item.category}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    })
    .sort((a, b) => Number(b.important) - Number(a.important));
  const openForm = (item) => {
    setForm(item ? { ...item } : emptyForm);
    setView(item ? "edit" : "write");
    setMessage("");
  };

  // 3. 폼 내용을 검사하고, 신규 글은 추가하고 기존 글은 갱신합니다.
  const save = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim() || !form.author.trim()) {
      setMessage("제목, 내용, 작성자는 필수입니다.");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);

    if (view === "edit") {
      const savedItem = { ...form, updatedAt: date };
      updateItem(savedItem);
      setSelected(savedItem);
      setView("detail");
      setMessage("공지가 수정되었습니다.");
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
    setMessage("공지가 등록되었습니다.");
  };

  // 목록에서 부르면 전달된 글을, 상세 화면에서 부르면 기본값인 selected 글을 삭제합니다.
  const remove = (itemToRemove = selected) => {
    if (!itemToRemove || !window.confirm("이 공지를 삭제할까요?")) {
      return;
    }

    removeItem(itemToRemove.id);
    if (selected && selected.id === itemToRemove.id) {
      setSelected(null);
      setView("list");
    }
    setMessage("공지가 삭제되었습니다.");
  };
  const showDetail = view === "detail" && selected !== null;
  const showForm = view === "write" || view === "edit";

  return (
    <main className="community-page">
      <h1>공지사항</h1>

      <nav>
        <Link to="/main/community">커뮤니티 메인</Link>
      </nav>

      {message ? <p role="status">{message}</p> : null}

      {view === "list" ? (
        <section>
          <h2>공지 목록</h2>

          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목 또는 분류"
            />
          </label>

          <button type="button" onClick={() => openForm(null)}>
            공지 등록
          </button>

          <ul>
            {filtered.map((item) => (
              <li key={item.id}>
                {item.important ? <strong>[중요] </strong> : null}
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
                <small> {item.updatedAt}</small>
              
                {/* 목록에서도 바로 수정할 수 있고, 삭제 버튼은 확인창을 거칩니다. */}
                <button type="button" onClick={() => openForm(item)}>수정</button>
                <button className="danger-button" type="button" onClick={() => remove(item)}>삭제</button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? <p>등록된 공지가 없습니다.</p> : null}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>{selected.category} | {selected.author}</p>
          <p>작성 {selected.createdAt} / 수정 {selected.updatedAt}</p>
          <p>{selected.content}</p>

          <button type="button" onClick={() => openForm(selected)}>수정</button>
          <button type="button" onClick={remove}>삭제</button>
          <button type="button" onClick={() => setView("list")}>목록</button>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === "edit" ? "공지 수정" : "공지 등록"}</h2>

          <label>
            제목*
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <br />

          <label>
            분류
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {noticeCategories.map((categoryItem) => (
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
            <input
              type="checkbox"
              checked={form.important}
              onChange={(event) => setForm({ ...form, important: event.target.checked })}
            />
            중요 공지
          </label>
          <br />

          <label>
            내용*
            <textarea
              rows="7"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
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

export default NoticePage;
