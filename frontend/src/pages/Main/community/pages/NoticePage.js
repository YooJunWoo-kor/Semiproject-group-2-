import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';

import {
    getNotices,
    addNotice,
    updateNotice,
    deleteNotice,
    addNoticeComment,
    updateNoticeComment,
    deleteNoticeComment,
    recordNoticeView
} from '../../../../utils/communityApi';

export default function NoticePage() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');

    // [수정] 주소에서 글 번호를 읽어 새로고침 후에도 상세 화면을 유지합니다.
    const [searchParams, setSearchParams] = useSearchParams();
    const postIdParam = searchParams.get('postId');
    const selectedId = postIdParam === null ? null : Number(postIdParam);
    const selected = items.find(item => item.post_id === selectedId);

    const [modal, setModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('일반공지');
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingComment, setEditingComment] = useState('');
    const [comment, setComment] = useState('');
    const [replyToId, setReplyToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    // [추가] 상세를 열면 방문 기록에 추가하고, 목록 버튼은 글 번호를 지웁니다.
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

        getNotices()
            .then(rows => {
                if (active) setItems(rows);
            })
            .catch(() => {
                if (active) {
                    setLoadError('공지사항 목록을 불러오지 못했습니다.');
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    // 저장 성공과 목록 재조회 실패를 구분합니다.
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
            setItems(await getNotices());
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

    const openWrite = (item = null) => {
        setEditingId(item?.post_id ?? null);
        setTitle(item?.title || '');
        setContent(item?.content || '');
        setCategory(item?.category || '일반공지');
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

        const post = {
            title: title.trim(),
            content: content.trim(),
            category,
            employee_id: employeeId
        };

        run(
            () => editingId == null
                ? addNotice(post)
                : updateNotice(editingId, post),
            () => {
                setModal(false);
                setQuery('');
            },
            editingId == null
                ? '공지사항이 등록되었습니다.'
                : '공지사항이 수정되었습니다.',
            true
        );
    };

    const remove = item => {
        if (busy || !window.confirm('이 공지사항을 삭제할까요?')) return;

        run(
            () => deleteNotice(item.post_id),
            () => {
                setItems(previous =>
                    previous.filter(post => post.post_id !== item.post_id)
                );

                // [수정] 상세에서 글을 삭제하면 주소의 글 번호도 지웁니다.
                if (selectedId === item.post_id) selectPost(null);
            },
            '공지사항이 삭제되었습니다.'
        );
    };

    const openDetail = async item => {
        if (lock.current) return;

        // [수정] 선택한 글 번호를 주소에 넣습니다.
        selectPost(item.post_id);
        setMessage('');
        lock.current = true;
        setBusy(true);

        try {
            const result = await recordNoticeView(item.post_id);

            setItems(previous =>
                previous.map(post =>
                    post.post_id === item.post_id
                        ? { ...post, views: result.views }
                        : post
                )
            );
        } catch {
            setMessage('본문은 표시했지만 조회수 반영에 실패했습니다.');
        } finally {
            lock.current = false;
            setBusy(false);
        }
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
            () => addNoticeComment(selected.post_id, {
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

    const editComment = (event, c) => {
        event.preventDefault();

        if (!editingComment.trim()) return;

        run(
            () => updateNoticeComment(selected.post_id, c.comment_id, {
                content: editingComment.trim()
            }),
            () => setEditingCommentId(null),
            '댓글이 수정되었습니다.'
        );
    };

    const removeComment = c => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;

        run(
            () => deleteNoticeComment(selected.post_id, c.comment_id),
            () => {
                setEditingCommentId(null);
                if (replyToId === c.comment_id) closeReply();
            },
            '댓글이 삭제되었습니다.'
        );
    };

    const dateTime = value =>
        value
            ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
            : '-';

    const date = value =>
        value
            ? new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
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

    const tableData = filtered.map(item => ({
        content: [
            item.important ? (
                <span
                    key={`badge-${item.post_id}`}
                    className="status-badge status-danger"
                >
                    공지
                </span>
            ) : '-',
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
            item.views || 0,
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
                        {!['일반공지', '중요공지'].includes(category) && (
                            <option value={category}>{category}</option>
                        )}
                        <option value="일반공지">일반공지</option>
                        <option value="중요공지">중요공지</option>
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
                        {busy ? '저장 중…' : editingId == null ? '등록하기' : '수정하기'}
                    </button>
                </div>
            </fieldset>
        </form>
    );

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">공지사항</span>
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

            {loading && <p className="no-data">공지사항을 불러오는 중입니다.</p>}
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
                        title="공지사항 목록"
                        th={['구분', '분류', '제목', '작성자', '작성일', '조회수', '관리']}
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
                    title={editingId == null ? '공지사항 글쓰기' : '공지사항 수정'}
                    layout={layout}
                />
            )}
        </div>
    );
}

// 메인 화면에서 사용하는 기존 공지사항 표시 영역입니다.
export function NoticeModule({ style = 1 }) {
    const tableHeaders = ['구분', '분류', '제목', '작성자', '작성일', '조회수'];

    // [수정] 빈 배열로 고정하던 목록을 조회 결과로 채웁니다.
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // [추가] 메인 화면에 공지사항 표가 나타나면 목록을 조회합니다.
    useEffect(() => {
        let active = true;

        async function loadNotices() {
            try {
                const notices = await getNotices();
                if (!Array.isArray(notices)) {
                    throw new Error('공지사항 목록 형식이 올바르지 않습니다.');
                }
                if (active) setItems(notices);
            } catch {
                if (active) setError('공지사항을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        }

        loadNotices();

        return () => {
            active = false;
        };
    }, []);

    // [수정] 현재 API 응답의 필드로 표를 구성합니다.
    const tableData = items.map(item => ({
        content: [
            item.important
                ? <span className="status-badge status-danger">공지</span>
                : '-',
            item.category,
            <Link
                key={`notice-title-${item.post_id}`}
                className="table-link-title"
                to={`/main/community/notice?postId=${item.post_id}`}
            >
                {item.title}
            </Link>,
            item.employee_name || '작성자 미확인',
            item.created_at
                ? new Date(item.created_at).toLocaleDateString('sv-SE', {
                    timeZone: 'Asia/Seoul'
                })
                : '-',
            item.views ?? 0
        ]
    }));

    if (loading) return <p>공지사항을 불러오는 중입니다.</p>;
    if (error) return <p role="alert">{error}</p>;

    return (
        <PaginationTable
            title="공지사항 목록"
            th={tableHeaders}
            allData={tableData}
            itemsPerPage={10}
            style={style}
        />
    );
}