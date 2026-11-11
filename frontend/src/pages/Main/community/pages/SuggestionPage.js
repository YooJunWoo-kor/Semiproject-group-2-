// [수정] 개선 건의 본문 화면과 글쓰기·수정 모달 연결
import React, { useState, useEffect, useRef } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';
import { getSuggestionPosts, addSuggestionPost, updateSuggestionPost, deleteSuggestionPost, addSuggestionComment, deleteSuggestionComment } from '../../../../utils/communityApi';

export default function SuggestionPage() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');
    // [추가] 선택된 글이 있으면 본문 화면, 없으면 목록
    const [selectedId, setSelectedId] = useState(null);
    const selected = items.find(item => item.post_id === selectedId);
    const [modal, setModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('기타');
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    // [추가] 개선 건의 댓글 입력값
    const [comment, setComment] = useState('');
    useEffect(() => { setComment(''); }, [selectedId]);
    const saveComment = event => {
        event.preventDefault();
        if (!comment.trim() || !selected) { setMessage('댓글 내용을 입력해 주세요.'); return; }
        let employee;
        try { employee = getLoginUser(); } catch { setMessage('로그인 정보를 확인해 주세요.'); return; }
        if (!employee?.name) { setMessage('로그인 직원 정보를 확인해 주세요.'); return; }
        run(() => addSuggestionComment(selected.post_id, { content: comment.trim(), author: employee.name }), () => setComment(''), '댓글이 등록되었습니다.');
    };

    useEffect(() => {
        let active = true;
        getSuggestionPosts().then(rows => { if (active) setItems(rows); })
            .catch(() => { if (active) setLoadError('개선 건의 목록을 불러오지 못했습니다.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    // [추가] DB 저장 성공과 재조회 실패를 구분하여 중복 등록 방지
    const run = async (operation, afterSuccess, successMessage, form = false) => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setFormError(''); setMessage('');
        let saved = false;
        try {
            await operation(); saved = true; afterSuccess();
            setItems(await getSuggestionPosts());
            setMessage(successMessage);
        } catch (error) {
            const text = saved ? '변경은 저장되었습니다. 목록을 다시 불러오지 못했으니 새로고침해 주세요.' : error.response?.data?.message || '처리에 실패했습니다.';
            if (form && !saved) setFormError(text); else setMessage(text);
        } finally { lock.current = false; setBusy(false); }
    };
    const openWrite = (item = null) => {
        setEditingId(item?.post_id ?? null);
        setTitle(item?.post_title || ''); setContent(item?.post_content || '');
        setCategory(item?.category || '기타'); setFormError(''); setMessage(''); setModal(true);
    };
    const closeModal = () => { if (!lock.current) setModal(false); };
    const savePost = event => {
        event.preventDefault();
        if (![title, content, category].every(value => value.trim())) { setFormError('제목, 내용과 분류를 입력해 주세요.'); return; }
        let employee;
        try { employee = getLoginUser(); } catch { setFormError('로그인 정보를 확인해 주세요.'); return; }
        if (!employee?.name) { setFormError('로그인 직원 정보를 확인해 주세요.'); return; }
        const post = { post_title: title.trim(), post_content: content.trim(), category, author: employee.name };
        run(() => editingId == null ? addSuggestionPost(post) : updateSuggestionPost(editingId, post),
            () => { setModal(false); setQuery(''); },
            editingId == null ? '개선 건의이 등록되었습니다.' : '개선 건의이 수정되었습니다.', true);
    };
    const remove = item => {
        if (busy || !window.confirm('이 개선 건의을 삭제할까요?')) return;
        run(() => deleteSuggestionPost(item.post_id), () => {
            setItems(previous => previous.filter(post => post.post_id !== item.post_id));
            if (selectedId === item.post_id) setSelectedId(null);
        }, '개선 건의이 삭제되었습니다.');
    };
    // [추가] 댓글 삭제
    const removeComment = id => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;
        run(() => deleteSuggestionComment(selected.post_id, id), () => {}, '댓글이 삭제되었습니다.');
    };
    const date = value => value ? new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '-';
    const keyword = query.trim().toLowerCase();
    const filtered = items.filter(item => `${item.post_title} ${item.post_content} ${item.author}`.toLowerCase().includes(keyword));
    const actions = item => <div className="table-actions">
        <button type="button" disabled={busy} onClick={() => openWrite(item)}>수정</button>
        <button type="button" disabled={busy} className="danger-button" onClick={() => remove(item)}>삭제</button>
    </div>;
    // [수정] 제목 클릭으로 본문 표시, 목록에 관리 버튼 추가
    const tableData = filtered.map(item => ({ content: [
        item.post_id,
        <button key={`title-${item.post_id}`} type="button" className="table-link-title" style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }} onClick={() => { setSelectedId(item.post_id); setMessage(''); }}>{item.post_title}</button>,
        item.author, date(item.created_at), (item.comments || []).length,
        <React.Fragment key={`actions-${item.post_id}`}>{actions(item)}</React.Fragment>
    ] }));
    const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '10px 12px', border: '1px solid #ccd6e5', borderRadius: 8, font: 'inherit' };
    const layout = <form onSubmit={savePost} style={{ width: 'min(520px, calc(100vw - 96px))', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16, minWidth: 0 }}>
            <label>제목<input required maxLength={200} style={inputStyle} value={title} onChange={event => setTitle(event.target.value)} /></label>
            <label>분류<select style={inputStyle} value={category} onChange={event => setCategory(event.target.value)}>
                {!['기타', '건의'].includes(category) && <option value={category}>{category}</option>}
                <option value="기타">기타</option><option value="건의">건의</option>
            </select></label>
            <label>내용<textarea required rows={8} style={{ ...inputStyle, resize: 'vertical' }} value={content} onChange={event => setContent(event.target.value)} /></label>
            {formError && <p role="alert">{formError}</p>}
            <div className="table-actions"><button type="button" onClick={closeModal}>취소</button><button type="submit" className="erp-primary-button">{busy ? '저장 중…' : editingId == null ? '등록하기' : '수정하기'}</button></div>
        </fieldset>
    </form>;

    return <div className="border-container">
        <header className="dashboard-header"><span className="subtitle">개선 건의</span><div className="dashboard-top">
            {selected ? <button type="button" disabled={busy} onClick={() => setSelectedId(null)}>목록으로</button>
                : <button type="button" className="register-btn" disabled={loading || busy || !!loadError} onClick={() => openWrite()}>+ 글쓰기</button>}
        </div></header><hr />
        {loading && <p className="no-data">개선 건의을 불러오는 중입니다.</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!modal && message && <p role="status">{message}</p>}
        {!loading && !loadError && !selected && <>
            <div className="filter-bar"><label className="search-field">검색:<input placeholder="제목, 내용 또는 작성자 검색" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
            <PaginationTable key={keyword} title="개선 건의 목록" th={['번호', '제목', '작성자', '작성일', '댓글수', '관리']} allData={tableData} itemsPerPage={10} />
        </>}
        {!loading && !loadError && selected && <article className="detail-card">
            <h3>{selected.post_title}</h3>
            <p className="subtext">작성자: {selected.author} | 분류: {selected.category} | 작성일: {date(selected.created_at)} | 최근 수정: {date(selected.updated_at)}</p><hr />
            <div className="detail-body" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.post_content}</div>
            {actions(selected)}
            {/* ===== [추가] 개선 건의 댓글 목록·입력창 시작 ===== */}
            <hr />
            <section className="comment-section">
                <h4>댓글 ({(selected.comments || []).length})</h4>
                <div className="comment-list">
                    {(selected.comments || []).map(c => <div className="comment-item" key={c.id}>
                        <div className="comment-meta"><strong>{c.author}</strong><span className="subtext"> ({date(c.created_at)})</span>
                            <button type="button" className="danger-button" disabled={busy} onClick={() => removeComment(c.id)}>삭제</button><p className="comment-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.content}</p>
                        </div>
                    </div>)}
                    {(selected.comments || []).length === 0 && <p className="no-data">등록된 댓글이 없습니다.</p>}
                </div>
                <form className="comment-input-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }} onSubmit={saveComment}>
                    <input aria-label="댓글 내용" placeholder="댓글을 입력하세요" maxLength={10000} disabled={busy} value={comment} onChange={event => setComment(event.target.value)} style={{ ...inputStyle, flex: '1 1 240px', width: 'auto' }} />
                    <button type="submit" className="register-btn" disabled={busy}>댓글 등록</button>
                </form>
            </section>
            {/* ===== [추가] 개선 건의 댓글 목록·입력창 끝 ===== */}
        </article>}
        {modal && <ModalBase onClose={closeModal} title={editingId == null ? '개선 건의 글쓰기' : '개선 건의 수정'} layout={layout} />}
    </div>;
}


