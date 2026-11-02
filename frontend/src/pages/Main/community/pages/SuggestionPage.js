import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const STATUSES = ['접수', '검토 중', '처리 완료'];
const emptyForm = {
  title: '',
  author: '임시 사용자',
  content: '',
  status: '접수',
  result: '',
};

export default function SuggestionPage({ communityItems }) {
  const { items, addItem, updateItem, removeItem } = communityItems;
  const safeItems = items || [];
  const location = useLocation();
  const initialSelected = safeItems.find((item) => item.id === location.state?.selectedItemId) || null;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [view, setView] = useState(initialSelected ? 'detail' : 'list');
  const [selected, setSelected] = useState(initialSelected);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  const filteredItems = safeItems.filter((item) => {
    const searchText = `${item.title || ''} ${item.author || ''} ${item.content || ''}`.toLowerCase();
    const matchesQuery = searchText.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === '전체' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function openForm(item) {
    setForm(item ? { ...item } : emptyForm);
    setView(item ? 'edit' : 'write');
    setMessage('');
  }

  function save(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      setMessage('제목, 작성자, 내용은 필수입니다.');
      return;
    }

    const date = new Date().toISOString().slice(0, 10);

    if (view === 'edit') {
      const savedItem = { ...form, updatedAt: date };
      updateItem(savedItem);
      setSelected(savedItem);
      setView('detail');
      setMessage('건의사항이 수정되었습니다.');
      return;
    }

    addItem({
      ...form,
      id: Date.now(),
      createdAt: date,
      updatedAt: date,
    });
    setView('list');
    setMessage('건의사항이 등록되었습니다.');
  }

  function remove(itemToRemove = selected) {
    if (!itemToRemove || !window.confirm('이 건의사항을 삭제할까요?')) {
      return;
    }

    removeItem(itemToRemove.id);
    if (selected && selected.id === itemToRemove.id) {
      setSelected(null);
      setView('list');
    }
    setMessage('건의사항이 삭제되었습니다.');
  }

  function changeStatus(nextStatus) {
    const savedItem = {
      ...selected,
      status: nextStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    updateItem(savedItem);
    setSelected(savedItem);
    setMessage('처리 상태가 저장되었습니다.');
  }

  const showDetail = view === 'detail' && selected !== null;
  const showForm = view === 'write' || view === 'edit';

  return (
    <main className="community-page">
      <h1>업무 개선 건의</h1>
      <nav><Link to="/main/community">커뮤니티 메인</Link></nav>

      {message ? <p role="status">{message}</p> : null}

      {view === 'list' ? (
        <section>
          <h2>건의사항 목록</h2>
          <div>
            <label>
              제목·작성자·내용 검색
              <input value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              처리 상태
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {['전체', ...STATUSES].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => openForm(null)}>건의 등록</button>
          </div>

          <ul>
            {filteredItems.map((item) => (
              <li key={item.id}>
                <strong>[{item.status || '접수'}] </strong>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setView('detail');
                    setMessage('');
                  }}
                >
                  {item.title}
                </button>
                <span> — {item.author} </span>
                <small>{item.updatedAt || item.createdAt || '-'}</small>
                <button type="button" onClick={() => openForm(item)}>수정/처리</button>
                <button className="danger-button" type="button" onClick={() => remove(item)}>삭제</button>
              </li>
            ))}
          </ul>

          {filteredItems.length === 0 ? <p>등록된 게시글이 없습니다.</p> : null}
        </section>
      ) : null}

      {showDetail ? (
        <article>
          <h2>{selected.title}</h2>
          <p>{selected.author} | {selected.createdAt || '-'}</p>
          <p>{selected.content}</p>
          {selected.result ? <p>처리 결과: {selected.result}</p> : null}
          <label>
            처리 상태
            <select value={selected.status || '접수'} onChange={(event) => changeStatus(event.target.value)}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <br />
          <button type="button" onClick={() => openForm(selected)}>수정</button>
          <button type="button" onClick={remove}>삭제</button>
          <button type="button" onClick={() => setView('list')}>목록</button>
        </article>
      ) : null}

      {showForm ? (
        <form onSubmit={save}>
          <h2>{view === 'edit' ? '건의사항 수정' : '건의사항 등록'}</h2>
          <label>
            제목*
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            작성자*
            <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
          </label>
          <label>
            내용*
            <textarea rows="7" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </label>
          <label>
            처리 상태
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            처리 결과
            <textarea rows="4" value={form.result || ''} onChange={(event) => setForm({ ...form, result: event.target.value })} />
          </label>
          <button type="submit">저장</button>
          <button type="button" onClick={() => setView(selected ? 'detail' : 'list')}>취소</button>
        </form>
      ) : null}
    </main>
  );
}
