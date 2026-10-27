import React, { useState } from "react";
import { Link } from "react-router-dom";
import useCommunityItems from "./useCommunityItems";

const emptyForm = { title: "", author: "임시 사용자", content: "" };

function FreeBoardPage() {
  // 1. 게시판별 글 목록과 공통 추가/수정/삭제 기능을 준비합니다.
  const { items, addItem, updateItem, removeItem } = useCommunityItems("free-posts");
  const [query, setQuery] = useState(""); //사용자가 입력한 검색어
  const [view, setView] = useState("list"); //현재 표시할 화면
  const [selected, setSelected] = useState(null); //사용자가 선택한 게시글
  const [form, setForm] = useState(emptyForm); //글쓰기 ,수정 입력 데이터
  const [comment, setComment] = useState(""); //현재 작성중인 댓글
  const [message, setMessage] = useState(""); //등록,수정, 삭제 안내 메세지
  // 2. 검색어와 필요한 분류/상태 조건으로 목록을 좁힙니다.
  const filtered = items.filter((item) => `${item.title} ${item.author}`.toLowerCase().includes(query.toLowerCase()));
  
  const openForm = (item) => {
    setForm(item ? { ...item } : emptyForm);
    setView(item ? "edit" : "write");
    setMessage("");
  };

  // 3. 폼 내용을 검사하고, 신규 글은 추가하고 기존 글은 갱신합니다.
  const save = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      setMessage("제목, 작성자, 내용은 필수입니다.");
      return;
    }

    // 게시글 수정 및 수정 내용 반영
    const date = new Date().toISOString().slice(0, 10);

    if (view === "edit") {
      const savedItem = { ...form, updatedAt: date };
      updateItem(savedItem);
      setSelected(savedItem);
      setView("detail");
      setMessage("글이 수정되었습니다.");
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),
      comments: [],
      createdAt: date,
      updatedAt: date,
    };

    addItem(newItem);
    setView("list");
    setMessage("글이 등록되었습니다.");
  };

  // 목록에서 부르면 전달된 글을, 상세 화면에서 부르면 기본값인 selected 글을 삭제합니다.
  const remove = (itemToRemove = selected) => {
    if (!itemToRemove || !window.confirm("이 글을 삭제할까요?")) {
      return;
    }

    removeItem(itemToRemove.id);
    if (selected && selected.id === itemToRemove.id) {
      setSelected(null);
      setView("list");
    }
    setMessage("글이 삭제되었습니다.");
  };

  const saveComment = () => {
    if (!comment.trim()) {
      setMessage("댓글 내용을 입력해 주세요.");
      return;
    }

    // 새로운 댓글 생성
    const newComment = {
      id: Date.now(),
      content: comment.trim(),
      author: "임시 사용자",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    // 기존 게시글에 댓글 추가
    const savedItem = {
      ...selected,
      comments: [...(selected.comments || []), newComment],
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setComment("");
    setMessage("댓글이 등록되었습니다.");
  };

  const removeComment = (id) => {
    if (!window.confirm("댓글을 삭제할까요?")) {
      return;
    }

    const savedItem = {
      ...selected,
      comments: (selected.comments || []).filter((item) => item.id !== id),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setMessage("댓글이 삭제되었습니다.");
  };








  const showDetail = view === "detail" && selected !== null;
  const showForm = view === "write" || view === "edit";

  return (
    <main className="community-page">
      <h1>자유게시판</h1>
      <nav><Link to="/main/community">커뮤니티 메인</Link></nav>

      
      {message ? <p role="status">{message}</p> : null}

      {view === "list" ? (
        <section>
          <h2>게시글 목록</h2>

          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목 또는 작성자"
            />
          </label>

          <button type="button" onClick={() => openForm(null)}>글쓰기</button>

          <ul>
            {filtered.map((item) => (
              <li key={item.id}>
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
              
                {/* 목록에서도 바로 수정할 수 있고, 삭제 버튼은 확인창을 거칩니다. */}
                <button type="button" onClick={() => openForm(item)}>수정</button>
                <button className="danger-button" type="button" onClick={() => remove(item)}>삭제</button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? <p>등록된 게시글이 없습니다.</p> : null}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>{selected.author} | 작성 {selected.createdAt} / 수정 {selected.updatedAt}</p>
          <p>{selected.content}</p>

          <button type="button" onClick={() => openForm(selected)}>수정</button>
          <button type="button" onClick={remove}>삭제</button>
          <button type="button" onClick={() => setView("list")}>목록</button>

          <section>
            <h3>댓글</h3>
            <ul>
              {(selected.comments || []).map((commentItem) => (
                <li key={commentItem.id}>
                  {commentItem.content} — {commentItem.author} ({commentItem.createdAt})
                  <button type="button" onClick={() => removeComment(commentItem.id)}>
                    삭제
                  </button>
              </li>
              ))}
            </ul>

            {(selected.comments || []).length === 0 ? <p>댓글이 없습니다.</p> : null}

            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="댓글 내용"
            />
            <button type="button" onClick={saveComment}>댓글 등록</button>
          </section>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === "edit" ? "글 수정" : "새 글"}</h2>

          <label>
            제목*
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
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
            내용*
            <textarea
              rows="7"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
            />
          </label>
          <br />

          <button type="submit">저장</button>
          <button type="button" onClick={() => setView(selected ? "detail" : "list")}>취소</button>
        </form>
      ) : null}
</main>
  );
}



export default FreeBoardPage;
