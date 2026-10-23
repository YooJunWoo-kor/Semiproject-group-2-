import React, { useState } from "react";
import { Link } from "react-router-dom";
import { noticeCategories } from "./communityConfig";
import { loadItems, saveItems } from "./communityStorage";
import DataDistributor from "./DataComponent/DataDistributor";

const emptyForm = { title: "", category: noticeCategories[0], content: "", author: "임시 관리자", important: false };

function NoticePage() {
  const data = [
    {id : 1, content : "Na", name : "Noti1" }
    ,{id : 2, content : "Nb", name : "Noti2" }
    ,{id : 3, content : "Nc", name : "Noti3" }
    ,{id : 4, content : "Nd", name : "Noti4" }
    ,{id : 5, content : "Ne", name : "Noti5" }
    ,{id : 6, content : "Nf", name : "Noti6" }
  ]


  const [items, setItems] = useState(() => loadItems("notices")); //공지사항 게시글 목록
  const [query, setQuery] = useState(""); //검색창에 입력한 검색어
  const [view, setView] = useState("list"); //현재 표시할 화면
  const [selected, setSelected] = useState(null); //사용자가 선택한 게시글
  const [form, setForm] = useState(emptyForm); //게시글 작성 , 수정 입력값
  const [message, setMessage] = useState(""); //저장,삭제, 결과 안내

  const addItem = (item) => {
    const nextItems = [item, ...items];
    saveItems("notices", nextItems);
    setItems(nextItems);
  };

  const updateItem = (item) => {
    const nextItems = items.map((oldItem) => oldItem.id === item.id ? item : oldItem);
    saveItems("notices", nextItems);
    setItems(nextItems);
  };

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    saveItems("notices", nextItems);
    setItems(nextItems);
  };
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

  const remove = () => {
    if (!window.confirm("이 공지를 삭제할까요?")) {
      return;
    }

    removeItem(selected.id);
    setSelected(null);
    setView("list");
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
              <li>
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

      <DataDistributor data = {data}/>
      
    </main>
  );
}

export default NoticePage;
