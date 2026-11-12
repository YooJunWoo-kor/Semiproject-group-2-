import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';

import {
    getTechLibraryPosts,
    addTechLibraryPost,
    updateTechLibraryPost,
    deleteTechLibraryPost,
    addTechLibraryComment,
    updateTechLibraryComment,
    deleteTechLibraryComment
} from '../../../../utils/communityApi';

const categories = [
    '기타',
    '품질관리(QC/QA)',
    '생산·제조',
    '영업·마케팅',
    '연구개발(R&D)',
    '원료 및 성분',
    '인허가·규제',
    '제품·패키징'
];

export default function TechLibraryPage() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');

    // [수정] 주소의 postId로 상세에 표시할 글을 찾습니다.
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedId = searchParams.get('postId');
    const selected = items.find(item => String(item.post_id) === selectedId);

    const [modal, setModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('기타');
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const [comment, setComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingComment, setEditingComment] = useState('');

    // [추가] 상세를 열면 주소에 번호를 넣고, 목록으로 갈 때는 지웁니다.
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
    }, [selectedId]);

    useEffect(() => {
        let active = true;

        getTechLibraryPosts()
            .then(rows => {
                if (active) setItems(rows);
            })
            .catch(() => {
                if (active) {
                    setLoadError('업무자료실 목록을 불러오지 못했습니다.');
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
            setItems(await getTechLibraryPosts());
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

    // [수정] 글 수정 창에서 공통 필드를 읽습니다.
    const openWrite = (item = null) => {
        setEditingId(item?.post_id ?? null);
        setTitle(item?.title || '');
        setContent(item?.content || '');
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

        const employeeId = Number(employee?.employee_id ?? employee?.employeeKey);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            setFormError('로그인 직원 정보를 확인해 주세요.');
            return;
        }

        // [수정] 등록·수정 요청에 title과 content를 전달합니다.
        const post = {
            title: title.trim(),
            content: content.trim(),
            category,
            employee_id: employeeId
        };

        run(
            () => editingId === null
                ? addTechLibraryPost(post)
                : updateTechLibraryPost(editingId, post),
            () => {
                setModal(false);
                setQuery('');
            },
            editingId === null
                ? '업무자료실이 등록되었습니다.'
                : '업무자료실이 수정되었습니다.',
            true
        );
    };

    const remove = item => {
        if (busy || !window.confirm('이 업무자료실을 삭제할까요?')) return;

        run(
            () => deleteTechLibraryPost(item.post_id),
            () => {
                setItems(previous =>
                    previous.filter(post => post.post_id !== item.post_id)
                );

                if (selectedId === String(item.post_id)) {
                    selectPost(null);
                }
            },
            '업무자료실이 삭제되었습니다.'
        );
    };

    const openDetail = item => {
        selectPost(item.post_id);
        setMessage('');
    };

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

        const employeeId = Number(employee?.employee_id ?? employee?.employeeKey);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            setMessage('로그인 직원 정보를 확인해 주세요.');
            return;
        }

        run(
            () => addTechLibraryComment(selected.post_id, {
                content: comment.trim(),
                employee_id: employeeId
            }),
            () => setComment(''),
            '댓글이 등록되었습니다.'
        );
    };

    // [수정] 글 번호는 post_id, 댓글 번호는 comment_id를 사용합니다.
    const editComment = (event, c) => {
        event.preventDefault();

        if (!editingComment.trim()) return;

        run(
            () => updateTechLibraryComment(selected.post_id, c.comment_id, {
                content: editingComment.trim()
            }),
            () => setEditingCommentId(null),
            '댓글이 수정되었습니다.'
        );
    };

    const removeComment = c => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;

        run(
            () => deleteTechLibraryComment(selected.post_id, c.comment_id),
            () => setEditingCommentId(null),
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
            (item.comments || []).length,
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
                <span className="subtitle">업무자료실</span>

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

            {loading && <p className="no-data">업무자료실을 불러오는 중입니다.</p>}
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
                        title="업무자료실 목록"
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
                        <h4>댓글 ({(selected.comments || []).length})</h4>

                        <div className="comment-list">
                            {(selected.comments || []).map(c => (
                                <div className="comment-item" key={c.comment_id}>
                                    <div className="comment-meta">
                                        <strong>
                                            {c.employee_name || '작성자 미확인'}
                                        </strong>
                                        <span className="subtext">
                                            {' ('}{dateTime(c.created_at)}{')'}
                                            {c.updated_at && ' | 수정: ' + dateTime(c.updated_at)}
                                        </span>

                                        {editingCommentId === c.comment_id ? (
                                            <form onSubmit={event => editComment(event, c)}>
                                                <input
                                                    aria-label="댓글 수정 내용"
                                                    required
                                                    onInput={validateText}
                                                    maxLength={10000}
                                                    style={inputStyle}
                                                    value={editingComment}
                                                    onChange={event =>
                                                        setEditingComment(event.target.value)
                                                    }
                                                    disabled={busy}
                                                />
                                                <button type="submit" disabled={busy}>
                                                    저장
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => setEditingCommentId(null)}
                                                >
                                                    취소
                                                </button>
                                            </form>
                                        ) : (
                                            <>
                                                <p
                                                    className="comment-text"
                                                    style={{
                                                        whiteSpace: 'pre-wrap',
                                                        overflowWrap: 'anywhere'
                                                    }}
                                                >
                                                    {c.content}
                                                </p>

                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setEditingCommentId(c.comment_id);
                                                            setEditingComment(c.content);
                                                        }}
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => removeComment(c)}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {(selected.comments || []).length === 0 && (
                                <p className="no-data">등록된 댓글이 없습니다.</p>
                            )}
                        </div>

                        <form
                            className="comment-input-wrap"
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 10,
                                alignItems: 'center'
                            }}
                            onSubmit={saveComment}
                        >
                            <input
                                required
                                onInput={validateText}
                                aria-label="댓글 내용"
                                placeholder="댓글을 입력하세요"
                                maxLength={10000}
                                disabled={busy}
                                value={comment}
                                onChange={event => setComment(event.target.value)}
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
                    title={editingId === null ? '업무자료실 글쓰기' : '업무자료실 수정'}
                    layout={layout}
                />
            )}
        </div>
    );
}