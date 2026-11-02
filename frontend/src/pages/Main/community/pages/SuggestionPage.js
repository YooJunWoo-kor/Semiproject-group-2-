import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PaginationTable from '../../../../components/PaginationTable';

function SuggestionPage({ communityItems }) {
  const { items, updateItem, removeItem } = communityItems;
  const location = useLocation();
  const initialSelected = items.find((item) => item.id === location.state?.selectedItemId) || null;

  const [query, setQuery] = useState('');
  const [view, setView] = useState(initialSelected ? 'detail' : 'list'); // 'list' | 'detail'
  const [selected, setSelected] = useState(initialSelected);
  const [comment, setComment] = useState('');

  const filtered = items.filter((item) =>
    `${item.title} ${item.author}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleOpenWriteModal = () => {
    // 나중에 공통 모달(Modal) 컴포넌트 오픈 로직을 연결할 자리입니다.
    alert('공통 글작성 모달을 띄울 예정입니다.');
  };

  const remove = (itemToRemove = selected) => {
    if (!itemToRemove || !window.confirm('이 글을 삭제할까요?')) return;

    removeItem(itemToRemove.id);
    if (selected && selected.id === itemToRemove.id) {
      setSelected(null);
      setView('list');
    }
  };

  const saveComment = () => {
    if (!comment.trim()) {
      alert('댓글 내용을 입력해 주세요.');
      return;
    }

    const newComment = {
      id: Date.now(),
      content: comment.trim(),
      author: '임시 사용자',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const savedItem = {
      ...selected,
      comments: [...(selected.comments || []), newComment],
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
    setComment('');
  };

  const removeComment = (id) => {
    if (!window.confirm('댓글을 삭제할까요?')) return;

    const savedItem = {
      ...selected,
      comments: (selected.comments || []).filter((item) => item.id !== id),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateItem(savedItem);
    setSelected(savedItem);
  };

  const tableHeaders = ['번호', '제목', '작성자', '작성일', '댓글수', '관리'];

  const tableData = filtered.map((item, index) => ({
    content: [
      filtered.length - index,
      <span
        className="table-link-title"
        onClick={() => {
          setSelected(item);
          setView('detail');
        }}
      >
        {item.title}
      </span>,
      item.author,
      item.createdAt || item.updatedAt || '-',
      (item.comments || []).length,
      <div className="table-actions">
        <button type="button" onClick={handleOpenWriteModal}>
          수정
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => remove(item)}
        >
          삭제
        </button>
      </div>,
    ],
  }));

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">개선 건의</span>
        <div className="dashboard-top">
          {view === 'list' && (
            <button
              type="button"
              className="register-btn"
              onClick={handleOpenWriteModal}
            >
              + 글쓰기
            </button>
          )}
          {view !== 'list' && (
            <button type="button" onClick={() => setView('list')}>
              목록으로
            </button>
          )}
        </div>
      </header>

      <hr />

      {/* 2. 목록 뷰 */}
      {view === 'list' && (
        <>
          <div className="filter-bar">
            <label className="search-field">
              검색:
              <input
                type="text"
                placeholder="제목 또는 작성자 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <PaginationTable
            title="자유게시판 목록"
            th={tableHeaders}
            allData={tableData}
            itemsPerPage={10}
          />
        </>
      )}

      {/* 3. 상세 보기 뷰 */}
      {view === 'detail' && selected && (
        <article className="detail-card">
          <header>
            <h3>{selected.title}</h3>
            <span className="subtext">
              작성자: {selected.author} | 작성일: {selected.createdAt} | 최근수정: {selected.updatedAt}
            </span>
          </header>

          <hr />

          <div className="detail-body">
            {selected.content}
          </div>

          <div className="table-actions">
            <button type="button" onClick={handleOpenWriteModal}>
              수정
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => remove(selected)}
            >
              삭제
            </button>
          </div>

          <hr />

          {/* 댓글 영역 */}
          <section className="comment-section">
            <h4>댓글 ({(selected.comments || []).length})</h4>
            <div className="comment-list">
              {(selected.comments || []).map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-meta">
                    <strong>{c.author}</strong>
                    <span className="subtext">({c.createdAt})</span>
                    <p className="comment-text">{c.content}</p>
                  </div>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeComment(c.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
              {(selected.comments || []).length === 0 && (
                <p className="no-data">등록된 댓글이 없습니다.</p>
              )}
            </div>

            <div className="comment-input-wrap">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="댓글을 입력하세요"
              />
              <button type="button" className="register-btn" onClick={saveComment}>
                댓글 등록
              </button>
            </div>
          </section>
        </article>
      )}
    </div>
  );
}

export default SuggestionPage;