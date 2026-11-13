import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';

import {
    getQnAPosts,
    addQnAPost,
    updateQnAPost,
    deleteQnAPost,
    addQnAComment,
    updateQnAComment,
    deleteQnAComment
} from '../../../../utils/communityApi';

const categories = ['질문', '기타'];

export default function QnAPage() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');

    // [수정] 주소에 있는 글 번호로 상세에 표시할 글을 찾습니다.
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedId = searchParams.get('postId');
    const selected = items.find(item => String(item.post_id) === selectedId);

    const [modal, setModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('질문');
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const [comment, setComment] = useState('');
    const [replyToId, setReplyToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingComment, setEditingComment] = useState('');

    // [추가] 제목을 누르면 상세 주소를 방문 기록에 추가합니다.
    const selectPost = postId => {
        const nextParams = new URLSearchParams(searchParams);

        if (postId === null) {
            nextParams.delete('postId');
        } else {
            nextParams.set('postId', String(postId));
        }

        setSearchParams(nextParams, { replace: postId === null });
    };

    useEffect(() => {
        setComment('');
        setEditingCommentId(null);
        setReplyToId(null);
        setReplyContent('');
    }, [selectedId]);

    useEffect(() => {
        let active = true;

        getQnAPosts()
            .then(rows => {
                if (active) setItems(rows);
            })
            .catch(() => {
                if (active) {
                    setLoadError('Q&A 목록을 불러오지 못했습니다.');
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    // 글과 댓글의 중복 요청을 막고 처리 후 목록을 갱신합니다.
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
            setItems(await getQnAPosts());
            setMessage(successMessage);
        } catch (error) {
            const text = saved
                ? '변경은 저장되었습니다. 목록을 다시 불러오지 못했으니 새로고침해 주세요.'
                : error.response?.data?.message || '처리에 실패했습니다.';

            if (form && !saved) {
                setFormError(text);
            } else {
                setMessage(text);
            }
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    // [수정] 새 API의 필드를 글 수정 창에 넣습니다.
    const openWrite = (item = null) => {
        setEditingId(item?.post_id ?? null);
        setTitle(item?.title || '');
        setContent(item?.content || '');
        setCategory(item?.category || '질문');
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

        const employeeId = Number(employee?.employee_id ?? employee?.employeeKey);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            setFormError('로그인 직원 정보를 확인해 주세요.');
            return;
        }

        // [수정] 새 글 등록과 수정에 title과 content를 전달합니다.
        const post = {
            title: title.trim(),
            content: content.trim(),
            category,
            employee_id: employeeId
        };

        run(
            () => editingId === null
                ? addQnAPost(post)
                : updateQnAPost(editingId, post),
            () => {
                setModal(false);
                setQuery('');
            },
            editingId === null
                ? '질문이 등록되었습니다.'
                : '질문이 수정되었습니다.',
            true
        );
    };

    const remove = item => {
        if (busy || !window.confirm('이 질문을 삭제할까요?')) return;

        run(
            () => deleteQnAPost(item.post_id),
            () => {
                setItems(previous =>
                    previous.filter(post => post.post_id !== item.post_id)
                );

                if (selectedId === String(item.post_id)) {
                    selectPost(null);
                }
            },
            '질문이 삭제되었습니다.'
        );
    };

    const openDetail = item => {
        selectPost(item.post_id);
        setMessage('');
    };

    const closeReply = () => {
        setReplyToId(null);
        setReplyContent('');
    };

    // [수정] 일반 댓글과 답글을 같은 API로 등록합니다.
    const saveComment = (event, parentId = null) => {
        event.preventDefault();
        const isReply = parentId !== null;
        const text = (isReply ? replyContent : comment).trim();

        if (!text || !selected) {
            setMessage(isReply ? '답글 내용을 입력해 주세요.' : '댓글 내용을 입력해 주세요.');
            return;
        }

        let employee;
        try {
            employee = getLoginUser();
        } catch {
            setMessage('로그인 정보를 확인해 주세요.');
            return;
        }

        const employeeId = Number(employee?.employee_id ?? employee?.employeeKey);
        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            setMessage('로그인 직원 정보를 확인해 주세요.');
            return;
        }

        run(
            () => addQnAComment(selected.post_id, {
                content: text,
                employee_id: employeeId,
                parent_comment_id: parentId
            }),
            () => {
                if (isReply) closeReply();
                else setComment('');
            },
            isReply ? '답글이 등록되었습니다.' : '댓글이 등록되었습니다.'
        );
    };

    // [수정] 글 번호는 post_id, 댓글 번호는 comment_id를 사용합니다.
    const editComment = (event, c) => {
        event.preventDefault();

        if (!editingComment.trim()) return;

        run(
            () => updateQnAComment(selected.post_id, c.comment_id, {
                content: editingComment.trim()
            }),
            () => setEditingCommentId(null),
            '댓글이 수정되었습니다.'
        );
    };

    const removeComment = c => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;

        run(
            () => deleteQnAComment(selected.post_id, c.comment_id),
            () => {
                setEditingCommentId(null);
                if (replyToId === c.comment_id) closeReply();
            },
            '댓글이 삭제되었습니다.'
        );
    };

    const date = value =>
        value
            ? new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
            : '-';

    const dateTime = value =>
        value
            ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
            : '-';

    const validateText = event => {
        const input = event.currentTarget;

        input.setCustomValidity(
            input.value && !input.value.trim()
                ? '공백을 제외한 내용을 입력하세요.'
                : ''
        );
    };

    const keyword = query.trim().toLowerCase();

    const filtered = items.filter(item =>
        `${item.title} ${item.content} ${item.employee_name || '작성자 미확인'}`
            .toLowerCase()
            .includes(keyword)
    );

    const actions = item => (
        <div className="table-actions">
            <button
                type="button"
                disabled={busy}
                onClick={() => openWrite(item)}
            >
                수정
            </button>
            <button
                type="button"
                disabled={busy}
                className="danger-button"
                onClick={() => remove(item)}
            >
                삭제
            </button>
        </div>
    );

    // [추가] 삭제 안내 줄은 댓글 수에서 제외합니다.
    const countComments = comments =>
        (comments || []).filter(c => c.deleted_at == null).length;

    const comments = selected?.comments || [];
    const rootComments = comments.filter(c => c.parent_comment_id == null);
    const repliesByParent = new Map();

    for (const c of comments) {
        if (c.parent_comment_id == null || c.deleted_at != null) continue;
        const replies = repliesByParent.get(c.parent_comment_id) || [];
        replies.push(c);
        repliesByParent.set(c.parent_comment_id, replies);
    }

    const renderComment = c => {
        const isReply = c.parent_comment_id != null;
        const editing = editingCommentId === c.comment_id;

        if (c.deleted_at != null) {
            return (
                <div className="comment-item" key={c.comment_id}>
                    <p className="subtext">삭제된 댓글입니다</p>
                </div>
            );
        }

        return (
            <div className="comment-item" key={c.comment_id}
                style={isReply ? { marginLeft: 24 } : undefined}>
                <div className="comment-meta">
                    {isReply && <span aria-hidden="true">↳ </span>}
                    <strong>{c.employee_name || '작성자 미확인'}</strong>
                    <span className="subtext">
                        {' ('}{dateTime(c.created_at)}{')'}
                        {c.updated_at && ' | 수정: ' + dateTime(c.updated_at)}
                    </span>
                </div>
                {editing ? (
                    <form onSubmit={event => editComment(event, c)}>
                        <input
                            aria-label="댓글 수정 내용"
                            required
                            onInput={validateText}
                            maxLength={10000}
                            style={inputStyle}
                            value={editingComment}
                            onChange={event => setEditingComment(event.target.value)}
                            disabled={busy}
                        />
                        <div className="table-actions">
                            <button type="submit" disabled={busy}>저장</button>
                            <button type="button" disabled={busy}
                                onClick={() => setEditingCommentId(null)}>취소</button>
                        </div>
                    </form>
                ) : (
                    <>
                        <p className="comment-text"
                            style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {c.content}
                        </p>
                        <div className="table-actions">
                            {!isReply && (
                                <button type="button" disabled={busy} onClick={() => {
                                    if (replyToId === c.comment_id) return;
                                    setReplyToId(c.comment_id);
                                    setReplyContent('');
                                }}>답글</button>
                            )}
                            <button type="button" disabled={busy} onClick={() => {
                                setEditingCommentId(c.comment_id);
                                setEditingComment(c.content);
                            }}>수정</button>
                            <button type="button" disabled={busy} className="danger-button"
                                onClick={() => removeComment(c)}>삭제</button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const tableData = filtered.map((item, index) => ({
        content: [
            filtered.length - index,
            item.category,
            <button
                key={`title-${item.post_id}`}
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
                onClick={() => openDetail(item)}
            >
                {item.title}
            </button>,
            item.employee_name || '작성자 미확인',
            date(item.created_at),
            countComments(item.comments),
            <React.Fragment key={`actions-${item.post_id}`}>
                {actions(item)}
            </React.Fragment>
        ]
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

    const layout = (
        <form
            onSubmit={savePost}
            style={{
                width: 'min(520px, calc(100vw - 96px))',
                maxHeight: 'calc(100vh - 180px)',
                overflowY: 'auto'
            }}
        >
            <fieldset
                disabled={busy}
                style={{
                    border: 0,
                    padding: 0,
                    margin: 0,
                    display: 'grid',
                    gap: 16,
                    minWidth: 0
                }}
            >
                <label>
                    제목
                    <input
                        required
                        onInput={validateText}
                        maxLength={200}
                        style={inputStyle}
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                    />
                </label>

                <label>
                    분류
                    <select
                        style={inputStyle}
                        value={category}
                        onChange={event => setCategory(event.target.value)}
                    >
                        {!categories.includes(category) && (
                            <option value={category}>{category}</option>
                        )}
                        {categories.map(value => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                </label>

                <label>
                    내용
                    <textarea
                        required
                        onInput={validateText}
                        rows={8}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        value={content}
                        onChange={event => setContent(event.target.value)}
                    />
                </label>

                {formError && <p role="alert">{formError}</p>}

                <div className="table-actions">
                    <button type="button" onClick={closeModal}>취소</button>
                    <button type="submit" className="erp-primary-button">
                        {busy ? '저장 중…' : editingId === null ? '등록하기' : '수정하기'}
                    </button>
                </div>
            </fieldset>
        </form>
    );

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">Q&A</span>

                <div className="dashboard-top">
                    {selected ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => selectPost(null)}
                        >
                            목록으로
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="register-btn"
                            disabled={loading || busy || !!loadError}
                            onClick={() => openWrite()}
                        >
                            + 글쓰기
                        </button>
                    )}
                </div>
            </header>

            <hr />

            {loading && <p className="no-data">Q&A를 불러오는 중입니다.</p>}
            {loadError && <p role="alert">{loadError}</p>}
            {!modal && message && <p role="status">{message}</p>}

            {!loading && !loadError && !selected && (
                <>
                    <div className="filter-bar">
                        <label className="search-field">
                            검색:
                            <input
                                placeholder="제목, 내용 또는 작성자 검색"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                            />
                        </label>
                    </div>

                    <PaginationTable
                        key={keyword}
                        title="Q&A 목록"
                        th={['번호', '분류', '제목', '작성자', '작성일', '댓글수', '관리']}
                        allData={tableData}
                        itemsPerPage={10}
                    />
                </>
            )}

            {!loading && !loadError && selected && (
                <article className="detail-card">
                    <h3>{selected.title}</h3>

                    <p className="subtext">
                        작성자: {selected.employee_name || '작성자 미확인'}
                        {' | 분류: '}{selected.category}
                        {' | 작성일: '}{date(selected.created_at)}
                        {' | 최근 수정: '}{date(selected.updated_at)}
                    </p>

                    <hr />

                    <div
                        className="detail-body"
                        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                    >
                        {selected.content}
                    </div>

                    {actions(selected)}

                    <hr />

                    <section className="comment-section">
                        <h4>댓글 ({countComments(comments)})</h4>
                        <div className="comment-list">
                            {rootComments.map(root => (
                                <div key={root.comment_id}>
                                    {renderComment(root)}
                                    {(repliesByParent.get(root.comment_id) || []).map(renderComment)}
                                    {replyToId === root.comment_id && root.deleted_at == null && (
                                        <form className="comment-input-wrap"
                                            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginLeft: 24 }}
                                            onSubmit={event => saveComment(event, root.comment_id)}>
                                            <input
                                                aria-label="답글 내용"
                                                placeholder="답글을 입력하세요"
                                                required
                                                onInput={validateText}
                                                maxLength={10000}
                                                value={replyContent}
                                                onChange={event => setReplyContent(event.target.value)}
                                                disabled={busy}
                                                style={{ ...inputStyle, flex: '1 1 240px', width: 'auto' }}
                                            />
                                            <button type="button" disabled={busy} onClick={closeReply}>취소</button>
                                            <button type="submit" className="register-btn" disabled={busy}>
                                                답글 등록
                                            </button>
                                        </form>
                                    )}
                                </div>
                            ))}
                            {rootComments.length === 0 && (
                                <p className="no-data">등록된 댓글이 없습니다.</p>
                            )}
                        </div>
                        <form className="comment-input-wrap"
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}
                            onSubmit={saveComment}>
                            <input
                                aria-label="댓글 내용"
                                placeholder="댓글을 입력하세요"
                                required
                                onInput={validateText}
                                maxLength={10000}
                                value={comment}
                                onChange={event => setComment(event.target.value)}
                                disabled={busy}
                                style={{ ...inputStyle, flex: '1 1 240px', width: 'auto' }}
                            />
                            <button type="submit" className="register-btn" disabled={busy}>
                                댓글 등록
                            </button>
                        </form>
                    </section>
                </article>
            )}

            {modal && (
                <ModalBase
                    onClose={closeModal}
                    title={editingId === null ? 'Q&A 글쓰기' : 'Q&A 수정'}
                    layout={layout}
                />
            )}
        </div>
    );
}