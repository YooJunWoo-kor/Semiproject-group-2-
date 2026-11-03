import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';

export default function NoticePage({ communityItems }) {
  const { items, removeItem } = communityItems;
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selected, setSelected] = useState(null);

  // 검색 필터링
  const filtered = items.filter((item) => {
    const searchText = `${item.title} ${item.content}`.toLowerCase();
    return searchText.includes(query.trim().toLowerCase());
  });

  const handleOpenWriteModal = () => {
    // 나중에 공통 모달(Modal) 컴포넌트 오픈 로직을 연결할 자리입니다.
    alert('공통 글작성 모달을 띄울 예정입니다.');
  };

  const remove = (targetId) => {
    if (!window.confirm('해당 공지글을 삭제하시겠습니까?')) return;
    removeItem(targetId);
    if (selected && selected.id === targetId) {
      setSelected(null);
      setView('list');
    }
  };

  // PaginationTable 헤더 정의
  const tableHeaders = ['구분', '분류', '제목', '작성자', '작성일', '조회수'];

  // PaginationTable 규격 데이터 매핑
  const tableData = filtered.map((item) => ({
    content: [
      item.important ? <span className="status-badge status-danger">공지</span> : '-',
      item.category,
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
      item.createdAt ? item.createdAt.slice(0, 10) : '-',
      item.views || 0,
    ],
  }));

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">공지사항</span>
        <div className="dashboard-top">
          {view === 'list' && (
            <button
              type="button"
              className="register-btn"
              onClick={handleOpenWriteModal}
            >
              + 공지글 작성
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
                id="search"
                type="text"
                placeholder="제목 또는 내용 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <PaginationTable
            title="공지사항 목록"
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
              작성자: {selected.author} | 분류: {selected.category} | 작성일: {selected.createdAt?.slice(0, 10)} | 조회수: {selected.views || 0}
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
              onClick={() => remove(selected.id)}
            >
              삭제
            </button>
          </div>
        </article>
      )}
    </div>
  );
}