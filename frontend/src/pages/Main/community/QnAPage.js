import React, { useState } from "react";
import { Link } from "react-router-dom";
import { loadItems, saveItems } from "./communityStorage";

const emptyForm = { title: "", author: "임시 사용자", content: "", status: "답변 대기" };

function QnAPage() {
  const [items, setItems] = useState(() => loadItems("questions")); //문의글 목록 저장
  const [query, setQuery] = useState(""); //제목,내용 등의 검색어
  const [status, setStatus] = useState("전체"); //문의 처리 상태 필터
  const [view, setView] = useState("list"); //목록, 상세, 작성 화면 구분
  const [selected, setSelected] = useState(null); //현재 선택한 문의 글
  const [form, setForm] = useState(emptyForm); // 문의글 작성, 수정 입력값
  const [answer, setAnswer] = useState(""); // 관리자 답변 입력값
  const [message, setMessage] = useState(""); //저장, 삭제 결과 안내

  const addItem = (item) => {
    const nextItems = [item, ...items];
    saveItems("questions", nextItems);
    setItems(nextItems);
  };

  const updateItem = (item) => {
    const nextItems = items.map((oldItem) => oldItem.id === item.id ? item : oldItem);
    saveItems("questions", nextItems);
    setItems(nextItems);
  };

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    saveItems("questions", nextItems);
    setItems(nextItems);
  };
  const filtered = items.filter((item) => {
    const matchesTitle = item.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "전체" || item.status === status;
    return matchesTitle && matchesStatus;
  });
  const openForm = (item) => {
    setForm(item ? { ...item } : emptyForm);
    setView(item ? "edit" : "write");
    setMessage("");
  };

  const save = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      setMessage("제목, 작성자, 질문 내용은 필수입니다.");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);

    if (view === "edit") {
      const savedItem = { ...form, updatedAt: date };
      updateItem(savedItem);
      setSelected(savedItem);
      setView("detail");
      setMessage("질문이 수정되었습니다.");
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),
      answers: [],
      createdAt: date,
      updatedAt: date,
    };

    addItem(newItem);
    setView("list");
    setMessage("질문이 등록되었습니다.");
  };

  const remove = () => {
    if (!window.confirm("질문과 답변을 모두 삭제할까요?")) {
      return;
    }

    removeItem(selected.id);
    setSelected(null);
    setView("list");
    setMessage("질문이 삭제되었습니다.");
  };

  const changeStatus = (nextStatus) => {
    const savedItem = {
      ...selected,
      status: nextStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setMessage("해결 상태가 저장되었습니다.");
  };

  const saveAnswer = () => {
    if (!answer.trim()) {
      setMessage("답변 내용을 입력해 주세요.");
      return;
    }

    const newAnswer = {
      id: Date.now(),
      content: answer.trim(),
      author: "임시 답변자",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const savedItem = {
      ...selected,
      status: "답변 완료",
      answers: [...selected.answers, newAnswer],
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setAnswer("");
    setMessage("답변이 등록되었습니다.");
  };

  const removeAnswer = (id) => {
    if (!window.confirm("답변을 삭제할까요?")) {
      return;
    }

    const nextAnswers = selected.answers.filter((item) => item.id !== id);
    const savedItem = {
      ...selected,
      answers: nextAnswers,
      status: nextAnswers.length ? selected.status : "답변 대기",
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setMessage("답변이 삭제되었습니다.");
  };
  const showDetail = view === "detail" && selected !== null;
  const showForm = view === "write" || view === "edit";








  return (
    <main className="community-page">
      <h1>질문.답변(Q&A)</h1>
      <nav><Link to="/main/community">커뮤니티 메인</Link></nav>

      
      {message ? <p role="status">{message}</p> : null}

      {view === "list" ? (
        <section>
          <h2>질문 목록</h2>

          <label>
            제목 검색
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>

          <label>
            해결 상태
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {["전체", "답변 대기", "답변 완료", "해결"].map((statusItem) => (
                <option key={statusItem}>{statusItem}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => openForm(null)}>질문 등록</button>

          <ul>
            {filtered.map((item) => (
              <li>
                <strong>[{item.status}] </strong>
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
                <span> — {item.author}</span>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? <p>등록된 질문이 없습니다.</p> : null}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>{selected.author} | 작성 {selected.createdAt} / 수정 {selected.updatedAt}</p>
          <p>{selected.content}</p>

          <label>
            해결 상태
            <select
              value={selected.status}
              onChange={(event) => changeStatus(event.target.value)}
            >
              {["답변 대기", "답변 완료", "해결"].map((statusItem) => (
                <option key={statusItem}>{statusItem}</option>
              ))}
            </select>
          </label>
          <br />

          <button type="button" onClick={() => openForm(selected)}>질문 수정</button>
          <button type="button" onClick={remove}>질문 삭제</button>
          <button type="button" onClick={() => setView("list")}>목록</button>

          <section>
            <h3>답변</h3>
            <ul>
              {selected.answers.map((answerItem) => (
                <li key={answerItem.id}>
                  {answerItem.content} — {answerItem.author} ({answerItem.createdAt})
                  <button type="button" onClick={() => removeAnswer(answerItem.id)}>삭제</button>
                </li>
              ))}
            </ul>

            {selected.answers.length === 0 ? <p>아직 답변이 없습니다.</p> : null}

            <textarea
              rows="4"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="답변 내용"
            />
            <br />
            <button type="button" onClick={saveAnswer}>답변 등록</button>
          </section>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === "edit" ? "질문 수정" : "질문 등록"}</h2>

          <label>
            제목*
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <br />

          <label>
            작성자*
            <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
          </label>
          <br />

          <label>
            질문 내용*
            <textarea rows="7" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </label>
          <br />

          <button type="submit">저장</button>
          <button type="button" onClick={() => setView(selected ? "detail" : "list")}>취소</button>
        </form>
      ) : null}
    </main>
  );
}

export default QnAPage;
