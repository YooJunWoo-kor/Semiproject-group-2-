// [수정] DB의 게시판별 컬럼명과 employee_id 연결 / 첨부파일 기능 없음
// [수정] 업무자료실 본문 화면과 글쓰기·수정 모달 연결
import React, { useState, useEffect, useRef } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';
import { getTechLibraryPosts, addTechLibraryPost, updateTechLibraryPost, deleteTechLibraryPost, addTechLibraryComment, updateTechLibraryComment, deleteTechLibraryComment } from '../../../../utils/communityApi';
export default function TechLibraryPage() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');
    // [추가] 선택된 글이 있으면 본문 화면, 없으면 목록
    const [selectedId, setSelectedId] = useState(null);
    const selected = items.find(item => item.tl_id === selectedId);
    const [modal, setModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('기타');
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    // [추가] 업무자료실 댓글 입력값
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingComment, setEditingComment] = useState('');
    const [comment, setComment] = useState('');
    useEffect(() => {
        setComment('');
        setEditingCommentId(null);
    }, [selectedId]);
    const saveComment = event => {
        event.preventDefault();
        if (!comment.trim() || !selected) {
            setMessage('댓글 내용을 입력해 주세요.');
            return;
        }
        let employee;
        try {
            employee = getLoginUser();
        } catch {
            setMessage('로그인 정보를 확인해 주세요.');
            return;
        }
        if (!Number.isInteger(Number(employee?.employee_id ?? employee?.employeeKey)) || Number(employee?.employee_id ?? employee?.employeeKey) <= 0) {
            setMessage('로그인 직원 정보를 확인해 주세요.');
            return;
        }
        run(() => addTechLibraryComment(selected.tl_id, {
            content: comment.trim(),
            employee_id: Number(employee.employee_id ?? employee.employeeKey)
        }), () => setComment(''), '댓글이 등록되었습니다.');
    };
    useEffect(() => {
        let active = true;
        getTechLibraryPosts().then(rows => {
            if (active) setItems(rows);
        }).catch(() => {
            if (active) setLoadError('업무자료실 목록을 불러오지 못했습니다.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    // [추가] DB 저장 성공과 재조회 실패를 구분하여 중복 등록 방지
    const run = async (operation, afterSuccess, successMessage, form = false) => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setFormError('');
        setMessage('');
        let saved = false;
        try {
            await operation();
            saved = true;
            afterSuccess();
            setItems(await getTechLibraryPosts());
            setMessage(successMessage);
        } catch (error) {
            const text = saved ? '변경은 저장되었습니다. 목록을 다시 불러오지 못했으니 새로고침해 주세요.' : error.response?.data?.message || '처리에 실패했습니다.';
            if (form && !saved) setFormError(text);else setMessage(text);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };
    const openWrite = (item = null) => {
        setEditingId(item?.tl_id ?? null);
        setTitle(item?.tl_title || '');
        setContent(item?.tl_content || '');
        setCategory(item?.category || '기타');
        setFormError('');
        setMessage('');
        setModal(true);
    };
    const closeModal = () => {
        if (!lock.current) setModal(false);
    };
    const savePost = event => {
        event.preventDefault();
        if (![title, content, category].every(value => value.trim())) {
            setFormError('제목, 내용과 분류를 입력해 주세요.');
            return;
        }
        let employee;
        try {
            employee = getLoginUser();
        } catch {
            setFormError('로그인 정보를 확인해 주세요.');
            return;
        }
        if (!Number.isInteger(Number(employee?.employee_id ?? employee?.employeeKey)) || Number(employee?.employee_id ?? employee?.employeeKey) <= 0) {
            setFormError('로그인 직원 정보를 확인해 주세요.');
            return;
        }
        const post = {
            tl_title: title.trim(),
            tl_content: content.trim(),
            category,
            employee_id: Number(employee.employee_id ?? employee.employeeKey)
        };
        run(() => editingId == null ? addTechLibraryPost(post) : updateTechLibraryPost(editingId, post), () => {
            setModal(false);
            setQuery('');
        }, editingId == null ? '업무자료실이 등록되었습니다.' : '업무자료실이 수정되었습니다.', true);
    };
    const remove = item => {
        if (busy || !window.confirm('이 업무자료실을 삭제할까요?')) return;
        run(() => deleteTechLibraryPost(item.tl_id), () => {
            setItems(previous => previous.filter(post => post.tl_id !== item.tl_id));
            if (selectedId === item.tl_id) setSelectedId(null);
        }, '업무자료실이 삭제되었습니다.');
    };
    const openDetail = item => {
        setSelectedId(item.tl_id);
        setMessage('');
    };
    const editComment = (event, c) => {
        event.preventDefault();
        if (!editingComment.trim()) return;
        run(() => updateTechLibraryComment(selected.tl_id, c.tl_cmt_id, {
            content: editingComment.trim()
        }), () => setEditingCommentId(null), '댓글이 수정되었습니다.');
    };
    const removeComment = c => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;
        run(() => deleteTechLibraryComment(selected.tl_id, c.tl_cmt_id), () => setEditingCommentId(null), '댓글이 삭제되었습니다.');
    };
    const dateTime = value => value ? new Date(value).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul'
    }) : '-';
    // [추가] 공백만 입력한 경우도 브라우저 입력란 안내로 표시합니다.
    const validateText = event => event.currentTarget.setCustomValidity(event.currentTarget.value && !event.currentTarget.value.trim() ? '공백을 제외한 내용을 입력하세요.' : '');
    const date = value => value ? new Date(value).toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
    }) : '-';
    const keyword = query.trim().toLowerCase();
    const filtered = items.filter(item => `${item.tl_title} ${item.tl_content} ${item.employee_name || '작성자 미확인'}`.toLowerCase().includes(keyword));
    const actions = item => <div className="table-actions">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => openWrite(item)}>수정</button>
                <button
                    type="button"
                    disabled={busy}
                    className="danger-button"
                    onClick={() => remove(item)}>삭제</button>
        </div>;
    // [수정] 제목 클릭으로 본문 표시, 목록에 관리 버튼 추가
    const tableData = filtered.map(item => ({
        content: [item.tl_id, item.category, <button
            key={`title-${item.tl_id}`}
            type="button"
            className="table-link-title"
            style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
            textAlign: 'left'
        }}
            disabled={busy}
            onClick={() => openDetail(item)}>{item.tl_title}</button>, item.employee_name || '작성자 미확인', date(item.created_at), (item.comments || []).length, <React.Fragment key={`actions-${item.tl_id}`}>{actions(item)}</React.Fragment>]
    }));
    const inputStyle = {
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: 6,
        padding: '10px 12px',
        border: '1px solid #ccd6e5',
        borderRadius: 8,
        font: 'inherit'
    };
    const layout = <form
        onSubmit={savePost}
        style={{
        width: 'min(520px, calc(100vw - 96px))',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto'
    }}>
                <fieldset
                    disabled={busy}
                    style={{
            border: 0,
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: 16,
            minWidth: 0
        }}>
                        <label>제목<input
                            required
                            onInput={validateText}
                            maxLength={200}
                            style={inputStyle}
                            value={title}
                            onChange={event => setTitle(event.target.value)} /></label>
                        <label>분류<select
                            style={inputStyle}
                            value={category}
                            onChange={event => setCategory(event.target.value)}>
                                {!["기타", "품질관리(QC/QA)", "생산·제조", "영업·마케팅", "연구개발(R&D)", "원료 및 성분", "인허가·규제", "제품·패키징"].includes(category) && <option value={category}>{category}</option>}
                                {["기타", "품질관리(QC/QA)", "생산·제조", "영업·마케팅", "연구개발(R&D)", "원료 및 성분", "인허가·규제", "제품·패키징"].map(value => <option
                                    key={value}
                                    value={value}>{value}</option>)}
                        </select></label>
                        <label>내용<textarea
                            required
                            onInput={validateText}
                            rows={8}
                            style={{
                    ...inputStyle,
                    resize: 'vertical'
                }}
                            value={content}
                            onChange={event => setContent(event.target.value)} /></label>
                        {formError && <p role="alert">{formError}</p>}
                        <div className="table-actions"><button
                            type="button"
                            onClick={closeModal}>취소</button><button
                            type="submit"
                            className="erp-primary-button">{busy ? '저장 중…' : editingId == null ? '등록하기' : '수정하기'}</button></div>
                </fieldset>
        </form>;
    return <div className="border-container">
                <header className="dashboard-header"><span className="subtitle">업무자료실</span><div className="dashboard-top">
                        {selected ? <button
                            type="button"
                            disabled={busy}
                            onClick={() => setSelectedId(null)}>목록으로</button> : <button
                            type="button"
                            className="register-btn"
                            disabled={loading || busy || !!loadError}
                            onClick={() => openWrite()}>+ 글쓰기</button>}
                </div></header><hr />
                {loading && <p className="no-data">업무자료실을 불러오는 중입니다.</p>}
                {loadError && <p role="alert">{loadError}</p>}
                {!modal && message && <p role="status">{message}</p>}
                {!loading && !loadError && !selected && <>
                        <div className="filter-bar"><label className="search-field">검색:<input
                            placeholder="제목, 내용 또는 작성자 검색"
                            value={query}
                            onChange={event => setQuery(event.target.value)} /></label></div>
                        <PaginationTable
                            key={keyword}
                            title="업무자료실 목록"
                            th={['번호', '분류', '제목', '작성자', '작성일', '댓글수', '관리']}
                            allData={tableData}
                            itemsPerPage={10} />
                </>}
                {!loading && !loadError && selected && <article className="detail-card">
                        <h3>{selected.tl_title}</h3>
                        <p className="subtext">작성자: {selected.employee_name || '작성자 미확인'} | 분류: {selected.category} | 작성일: {date(selected.created_at)} | 최근 수정: {date(selected.updated_at)}</p><hr />
                        <div
                            className="detail-body"
                            style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
            }}>{selected.tl_content}</div>
                        {actions(selected)}
                        {/* ===== [추가] 업무자료실 댓글 목록·입력창 시작 ===== */}
                        <hr />
                        <section className="comment-section">
                                <h4>댓글 ({(selected.comments || []).length})</h4>
                                <div className="comment-list">
                                        {(selected.comments || []).map(c => <div
                                            className="comment-item"
                                            key={c.tl_cmt_id}>
                                                <div className="comment-meta"><strong>{c.employee_name || '작성자 미확인'}</strong><span className="subtext"> ({dateTime(c.created_at)}) {c.updated_at && ' | 수정: ' + dateTime(c.updated_at)}</span>
                                                        {editingCommentId === c.tl_cmt_id ? <form onSubmit={event => editComment(event, c)}>
                                                                <input
                                                                    aria-label="댓글 수정 내용"
                                                                    required
                                                                    onInput={validateText}
                                                                    maxLength={10000}
                                                                    style={inputStyle}
                                                                    value={editingComment}
                                                                    onChange={event => setEditingComment(event.target.value)}
                                                                    disabled={busy} />
                                                                <button
                                                                    type="submit"
                                                                    disabled={busy}>저장</button><button
                                                                    type="button"
                                                                    disabled={busy}
                                                                    onClick={() => setEditingCommentId(null)}>취소</button>
                                                        </form> : <>
                                                                <p
                                                                    className="comment-text"
                                                                    style={{
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'anywhere'
                                }}>{c.content}</p>
                                                                <div className="table-actions"><button
                                                                    type="button"
                                                                    disabled={busy}
                                                                    onClick={() => {
                                        setEditingCommentId(c.tl_cmt_id);
                                        setEditingComment(c.content);
                                    }}>수정</button><button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => removeComment(c)}>삭제</button></div>
                                                        </>}
                                                </div>
                                        </div>)}
                                        {(selected.comments || []).length === 0 && <p className="no-data">등록된 댓글이 없습니다.</p>}
                                </div>
                                <form
                                    className="comment-input-wrap"
                                    style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center'
                }}
                                    onSubmit={saveComment}>
                                        <input
                                            required
                                            onInput={validateText}
                                            aria-label="댓글 내용"
                                            placeholder="댓글을 입력하세요"
                                            maxLength={10000}
                                            disabled={busy}
                                            value={comment}
                                            onChange={event => setComment(event.target.value)}
                                            style={{
                        ...inputStyle,
                        flex: '1 1 240px',
                        width: 'auto'
                    }} />
                                        <button
                                            type="submit"
                                            className="register-btn"
                                            disabled={busy}>댓글 등록</button>
                                </form>
                        </section>
                        {/* ===== [추가] 업무자료실 댓글 목록·입력창 끝 ===== */}
                </article>}
                {modal && <ModalBase
                    onClose={closeModal}
                    title={editingId == null ? '업무자료실 글쓰기' : '업무자료실 수정'}
                    layout={layout} />}
        </div>;
}
