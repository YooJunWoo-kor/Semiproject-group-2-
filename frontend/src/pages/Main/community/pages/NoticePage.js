import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import { noticeCategories } from './communityConfig';

const emptyForm = { title: '', category: noticeCategories[0], content: '', author: '관리자', important: false };

export default function NoticePage({ communityItems }) {
  const { items, addItem, updateItem, removeItem } = communityItems;
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'form' | 'detail'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // 검색 필터링
  const filtered = items.filter((item) => {
    const searchText = (item.title + ' ' + item.content).toLowerCase();
    return searchText.includes(query.trim().toLowerCase());
  });

  const tableHeaders = ['중요', '분류', '제목', '작성자', '작성일', '조회수'];

  const tableData = filtered.map((item) => ({
    content: [
      item.important ? <span style={{ color: '#ef4444', fontWeight: 'bold' }}>[공지]</span> : '-',
      item.category,
      <span
        style={{ cursor: 'pointer', fontWeight: 600, color: '#2563eb' }}
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
      <header className="dashboard-header">
        <span className="subtitle">공지사항</span>
        <div className="dashboard-top">
          {view === 'list' && (
            <button
              type="button"
              className="register-btn"
              onClick={() => {
                setForm(emptyForm);
                setView('form');
              }}
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

      {view === 'list' && (
        <>
          <section style={{ margin: '16px 0' }}>
            <label htmlFor="search" style={{ marginRight: '8px', fontWeight: 600 }}>검색: </label>
            <input
              id="search"
              type="text"
              placeholder="제목 또는 내용 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </section>

          <PaginationTable
            title="공지사항 목록"
            th={tableHeaders}
            allData={tableData}
            itemsPerPage={5}
          />
        </>
      )}

      {/* 상세 보기 */}
      {view === 'detail' && selected && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>{selected.title}</h3>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            작성자: {selected.author} | 분류: {selected.category} | 작성일: {selected.createdAt?.slice(0, 10)}
          </p>
          <hr />
          <div style={{ minHeight: '120px', margin: '20px 0', whiteSpace: 'pre-wrap' }}>{selected.content}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              style={{ color: '#ef4444' }}
              onClick={() => {
                if (window.confirm('삭제하시겠습니까?')) {
                  removeItem(selected.id);
                  setView('list');
                }
              }}
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* 작성 폼 */}
      {view === 'form' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem(form);
            setView('list');
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}
        >
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>제목</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>내용</label>
            <textarea
              rows={6}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
          <button type="submit" className="register-btn" style={{ alignSelf: 'flex-start' }}>
            저장
          </button>
        </form>
      )}
    </div>
  );
}