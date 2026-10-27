import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useCommunityItems from './useCommunityItems';

// 등록 폼의 기본값입니다. 신규 등록과 기존 건 수정에서 함께 사용합니다.
const EMPTY_FORM = {
  title: '',
  author: '임시 사용자',
  content: '',
  status: '접수',
  result: '',
};
const STATUSES = ['접수', '검토 중', '처리 완료'];

export default function SuggestionPage() {
  // 1. 공통 훅에서 저장된 글 목록과 글 관리 기능을 가져옵니다.
  const { items, addItem, updateItem, removeItem } = useCommunityItems('suggestions');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('list');
  const [message, setMessage] = useState('');

  // 2. 검색어와 상태 조건에 맞는 글만 화면에 보여줍니다.
  const filteredItems = useMemo(() => items.filter((item) => {
    const searchText = `${item.title} ${item.author} ${item.content}`.toLowerCase();
    const matchesQuery = searchText.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === '전체' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [items, query, statusFilter]);

  // item이 있으면 수정 폼, 없으면 기본값이 채워진 신규 등록 폼을 엽니다.
  function openForm(item) {
    setSelected(item || null);
    setForm(item ? { ...EMPTY_FORM, ...item } : { ...EMPTY_FORM });
    setMode(item ? 'edit' : 'create');
    setMessage('');
  }

  // 등록/수정 공통 저장 함수입니다. 입력값을 확인한 뒤 기존 글을 갱신하거나 새 글을 추가합니다.
  function save(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      setMessage('제목, 작성자, 건의 내용은 필수입니다.');
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    // 수정/처리 화면에서는 상태와 처리 결과도 함께 저장됩니다.
    if (mode === 'edit' && selected) {
      const updatedItem = { ...selected, ...form, updatedAt: date };
      updateItem(updatedItem);
      setSelected(updatedItem);
      setMode('detail');
      setMessage('건의 내용과 처리 정보가 저장되었습니다.');
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),
      createdAt: date,
      updatedAt: date,
    };
    addItem(newItem);
    setSelected(newItem);
    setMode('detail');
    setMessage('건의사항이 등록되었습니다.');
  }

  // 브라우저 확인창에서 사용자가 확인한 경우에만 목록에서 삭제합니다.
  function remove(item) {
    if (!window.confirm(`「${item.title}」 건의사항을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`)) {
      return;
    }
    removeItem(item.id);
    if (selected && selected.id === item.id) {
      setSelected(null);
      setMode('list');
    }
    setMessage('건의사항이 삭제되었습니다.');
  }

  function showDetail(item) {
    setSelected(item);
    setMode('detail');
    setMessage('');
  }

  return (
    <div className="workspace-page suggestion-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">COMMUNITY · SUGGESTIONS</span>
          <h1>업무 개선 건의</h1>
          <p>건의 내용을 확인하고 진행 상태와 처리 결과를 관리합니다.</p>
          <Link className="suggestion-home-link" to="/main/community">커뮤니티 메인</Link>
        </div>
        <button className="erp-primary-button" type="button" onClick={() => openForm(null)}>
          건의 등록
        </button>
      </header>

      {message && <p className="connection-status" role="status">{message}</p>}

      {/* 목록 모드: 검색/상태 필터와 건의 목록 표를 보여줍니다. */}
      {mode === 'list' && (
        <>
          <div className="filter-bar suggestion-filters">
            <label className="search-field">
              제목·작성자·내용 검색
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어를 입력하세요" />
            </label>
            <label>
              처리 상태
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {['전체', ...STATUSES].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <span className="suggestion-count">총 {filteredItems.length}건</span>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>건의 제목</th>
                  <th>작성자</th>
                  <th>등록일</th>
                  <th>처리 상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button className="suggestion-title-button" type="button" onClick={() => showDetail(item)}>
                        {item.title}
                      </button>
                    </td>
                    <td>{item.author}</td>
                    <td>{item.createdAt || '-'}</td>
                    <td><span className={`status-badge ${item.status === '처리 완료' ? 'status-complete' : item.status === '검토 중' ? 'status-review' : 'status-pending'}`}>{item.status || '접수'}</span></td>
                    <td className="suggestion-actions">
                      <button type="button" onClick={() => openForm(item)}>수정/처리</button>
                      <button className="danger-button" type="button" onClick={() => remove(item)}>삭제</button>
                    </td>
                  </tr>
                ))}
                {!filteredItems.length && <tr><td colSpan="5" className="no-data">조건에 맞는 건의사항이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 상세 모드: 선택한 건의 내용과 현재 처리 상태/결과를 보여줍니다. */}
      {mode === 'detail' && selected && (
        <article className="detail-card suggestion-detail">
          <div className="page-header">
            <div>
              <span className="eyebrow">건의 상세</span>
              <h2>{selected.title}</h2>
              <p>{selected.author} · 등록 {selected.createdAt || '-'} · 수정 {selected.updatedAt || '-'}</p>
            </div>
            <span className={`status-badge ${selected.status === '처리 완료' ? 'status-complete' : selected.status === '검토 중' ? 'status-review' : 'status-pending'}`}>{selected.status || '접수'}</span>
          </div>
          <dl>
            <div><dt>건의 내용</dt><dd className="suggestion-content">{selected.content}</dd></div>
            <div><dt>처리 상태</dt><dd>{selected.status || '접수'}</dd></div>
            <div><dt>처리 결과</dt><dd className="suggestion-content">{selected.result || '아직 처리 결과가 등록되지 않았습니다.'}</dd></div>
          </dl>
          <div className="button-row">
            <button type="button" onClick={() => openForm(selected)}>수정/처리</button>
            <button className="danger-button" type="button" onClick={() => remove(selected)}>삭제</button>
            <button type="button" onClick={() => setMode('list')}>목록</button>
          </div>
        </article>
      )}

      {/* 등록/수정 모드: 상태와 처리 결과를 입력하고 저장합니다. */}
      {(mode === 'create' || mode === 'edit') && (
        <form className="erp-form" onSubmit={save}>
          <div>
            <span className="eyebrow">{mode === 'edit' ? 'UPDATE' : 'NEW SUGGESTION'}</span>
            <h2>{mode === 'edit' ? '건의 수정 및 처리' : '새 건의 등록'}</h2>
          </div>
          <div className="form-grid">
            <label>
              제목 *
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              작성자 *
              <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
            </label>
            <label>
              처리 상태
              <select value={form.status || '접수'} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="full-field">
              건의 내용 *
              <textarea rows="6" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            </label>
            <label className="full-field">
              처리 결과 및 답변
              <textarea rows="4" value={form.result || ''} onChange={(event) => setForm({ ...form, result: event.target.value })} placeholder="검토 내용이나 조치 결과를 적어주세요." />
            </label>
          </div>
          {message && <p className="connection-status is-error" role="alert">{message}</p>}
          <div className="button-row">
            <button type="button" onClick={() => setMode(selected ? 'detail' : 'list')}>취소</button>
            <button type="submit">{mode === 'edit' ? '수정 내용 저장' : '건의 등록'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

