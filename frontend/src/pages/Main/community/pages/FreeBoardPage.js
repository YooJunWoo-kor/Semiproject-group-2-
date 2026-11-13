import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';

import {
    getFreePosts,
    addFreePost,
    updateFreePost,
    deleteFreePost,
    addFreeComment,
    deleteFreeComment,
    updateFreeComment
} from '../../../../utils/communityApi';

function FreeBoardPage() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // 로그인 직원 정보
    console.log('로그인 직원 정보:', getLoginUser());
    const [employee] = useState(getLoginUser());

    // 게시글 목록과 검색
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');

    const selectedId = searchParams.get('postId');
    const selected = items.find(item => String(item.post_id) === selectedId);

    // 댓글 입력과 수정
    const [comment, setComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');

    // [추가] 답글 대상과 입력 내용
    const [replyToId, setReplyToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const commentSaveLock = useRef(false);

    // 글쓰기·수정 모달
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const selectPost = postId => {
        const nextParams = new URLSearchParams(searchParams);

        if (postId === null) {
            nextParams.delete('postId');
        } else {
            nextParams.set('postId', String(postId));
        }

        setSearchParams(nextParams, {
            replace: postId === null,
            state: null
        });
    };

    // 기존 통합게시판이 전달한 글 번호도 상세 주소로 옮깁니다.
    const linkedPostId = location.state?.selectedItemId;

    useEffect(() => {
        if (
            selectedId !== null ||
            !/^[1-9]\d*$/.test(String(linkedPostId))
        ) {
            return;
        }

        setSearchParams(previous => {
            const nextParams = new URLSearchParams(previous);
            nextParams.set('postId', String(linkedPostId));
            return nextParams;
        }, { replace: true, state: null });
    }, [linkedPostId, selectedId, setSearchParams]);

    useEffect(() => {
        let active = true;

        const fetchPosts = async () => {
            try {
                const posts = await getFreePosts();
                if (active) setItems(posts);
            } catch (error) {
                if (active) {
                    console.error('게시글 조회 실패:', error);
                    alert('게시글 목록을 불러오지 못했습니다.');
                }
            }
        };

        fetchPosts();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        setComment('');
        setEditingCommentId(null);
        setEditingCommentContent('');
        // [추가] 다른 글로 이동하면 이전 글의 답글 입력을 닫습니다.
        setReplyToId(null);
        setReplyContent('');
    }, [selectedId]);

    const refreshPosts = async () => {
        const posts = await getFreePosts();
        setItems(posts);
    };

    const date = value =>
        value
            ? new Date(value).toLocaleDateString('sv-SE', {
                timeZone: 'Asia/Seoul'
            })
            : '-';

    const dateTime = value =>
        value
            ? new Date(value).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul'
            })
            : '-';

    const filtered = items.filter(item =>
        `${item.title} ${item.employee_name || '작성자 미확인'}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    const handleOpenWriteModal = (item = null) => {
        setEditingItem(item);
        setTitle(item?.title || '');
        setContent(item?.content || '');
        setIsModalOpen(true);
    };

    const handleCloseWriteModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setTitle('');
        setContent('');
    };

    const savePost = async event => {
        event.preventDefault();

        const form = event.currentTarget;

        for (const input of form.querySelectorAll('[required]')) {
            input.setCustomValidity(
                input.value && !input.value.trim()
                    ? '공백을 제외한 내용을 입력하세요.'
                    : ''
            );
        }

        if (!form.reportValidity()) return;

        if (!employee) {
            alert('직원 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
            return;
        }

        const post = {
            title: title.trim(),
            content: content.trim()
        };

        try {
            if (editingItem) {
                await updateFreePost(editingItem.post_id, post);
            } else {
                await addFreePost({
                    ...post,
                    employee_id: Number(
                        employee.employee_id ?? employee.employeeKey
                    )
                });
            }
        } catch (error) {
            console.error('게시글 저장 실패:', error);
            alert('게시글 저장에 실패했습니다.');
            return;
        }

        handleCloseWriteModal();

        try {
            await refreshPosts();
            alert(
                editingItem
                    ? '게시글이 수정되었습니다.'
                    : '게시글이 등록되었습니다.'
            );
        } catch (error) {
            console.error('게시글 저장 후 재조회 실패:', error);
            alert('게시글은 저장되었습니다. 목록을 보려면 새로고침해 주세요.');
        }
    };

    const remove = async item => {
        if (!item || !window.confirm('이 글을 삭제할까요?')) return;

        try {
            await deleteFreePost(item.post_id);
        } catch (error) {
            console.error('게시글 삭제 실패:', error);
            alert('게시글 삭제에 실패했습니다.');
            return;
        }

        setItems(previous =>
            previous.filter(post => post.post_id !== item.post_id)
        );

        if (selectedId === String(item.post_id)) {
            selectPost(null);
        }

        alert('게시글이 삭제되었습니다.');
    };

    // [추가] 원댓글 아래의 답글 입력창을 엽니다.
    const openReply = commentId => {
        if (replyToId === commentId) return;

        setReplyToId(commentId);
        setReplyContent('');
    };

    const closeReply = () => {
        setReplyToId(null);
        setReplyContent('');
    };

    // [수정] 일반 댓글과 답글을 같은 함수로 등록합니다.
    const saveComment = async (parentId = null) => {
        if (commentSaveLock.current) return;

        const isReply = parentId !== null;
        const text = (isReply ? replyContent : comment).trim();
        const label = isReply ? '답글' : '댓글';

        if (!text) {
            alert(`${label} 내용을 입력해 주세요.`);
            return;
        }

        if (!employee) {
            alert('직원 정보를 불러오지 못했습니다.');
            return;
        }

        if (!selected) {
            alert('게시글을 먼저 선택해 주세요.');
            return;
        }

        commentSaveLock.current = true;
        setSavingComment(true);

        try {
            try {
                await addFreeComment(selected.post_id, {
                    content: text,
                    employee_id: Number(
                        employee.employee_id ?? employee.employeeKey
                    ),
                    parent_comment_id: parentId
                });
            } catch (error) {
                console.error(`${label} 등록 실패:`, error);
                alert(
                    error.response?.data?.message ||
                    `${label} 등록에 실패했습니다.`
                );
                return;
            }

            if (isReply) {
                closeReply();
            } else {
                setComment('');
            }

            try {
                await refreshPosts();
                alert(`${label}이 등록되었습니다.`);
            } catch (error) {
                console.error(`${label} 등록 후 재조회 실패:`, error);
                alert(`${label}은 등록되었습니다. 확인하려면 새로고침해 주세요.`);
            }
        } finally {
            commentSaveLock.current = false;
            setSavingComment(false);
        }
    };

    const handleEditComment = c => {
        setEditingCommentId(c.comment_id);
        setEditingCommentContent(c.content);
    };

    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentContent('');
    };

    const saveEditComment = async commentId => {
        if (!editingCommentContent.trim()) {
            alert('댓글 내용을 입력해 주세요.');
            return;
        }

        try {
            await updateFreeComment(commentId, {
                content: editingCommentContent.trim()
            });
        } catch (error) {
            console.error('댓글 수정 실패:', error);
            alert('댓글 수정에 실패했습니다.');
            return;
        }

        cancelEditComment();

        try {
            await refreshPosts();
            alert('댓글이 수정되었습니다.');
        } catch (error) {
            console.error('댓글 수정 후 재조회 실패:', error);
            alert('댓글은 수정되었습니다. 확인하려면 새로고침해 주세요.');
        }
    };

    // [수정] 삭제 후 서버에서 안내 문구와 남은 답글을 다시 받습니다.
    const removeComment = async commentId => {
        if (!window.confirm('댓글을 삭제할까요?')) return;

        try {
            await deleteFreeComment(commentId);
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            alert('댓글 삭제에 실패했습니다.');
            return;
        }

        if (replyToId === commentId) {
            closeReply();
        }

        try {
            await refreshPosts();
            alert('댓글이 삭제되었습니다.');
        } catch (error) {
            console.error('댓글 삭제 후 재조회 실패:', error);
            alert('댓글은 삭제되었습니다. 확인하려면 새로고침해 주세요.');
        }
    };

    // [추가] 삭제 안내 줄은 댓글 수에 포함하지 않습니다.
    const countComments = comments =>
        (comments || []).filter(c => c.deleted_at == null).length;

    // [추가] 원댓글과 답글을 나누고, 답글은 원댓글 번호로 묶습니다.
    const comments = selected?.comments || [];
    const rootComments = [];
    const repliesByParent = new Map();

    for (const c of comments) {
        if (c.parent_comment_id == null) {
            rootComments.push(c);
        } else if (c.deleted_at == null) {
            const parentId = c.parent_comment_id;
            const replies = repliesByParent.get(parentId) || [];

            replies.push(c);
            repliesByParent.set(parentId, replies);
        }
    }

    // [추가] 원댓글과 답글에 같은 작성 시각·수정·삭제 UI를 씁니다.
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
            <div
                className="comment-item"
                key={c.comment_id}
                style={isReply ? { marginLeft: 24 } : undefined}
            >
                <div className="comment-meta">
                    {isReply && <span aria-hidden="true">↳ </span>}
                    <strong>{c.employee_name || '작성자 미확인'}</strong>

                    <span className="subtext">
                        {' ('}{dateTime(c.created_at)}{')'}
                        {c.updated_at && ' | 수정: ' + dateTime(c.updated_at)}
                    </span>

                    {editing ? (
                        <div>
                            <input
                                type="text"
                                aria-label="수정할 댓글 내용"
                                maxLength={10000}
                                value={editingCommentContent}
                                onChange={e =>
                                    setEditingCommentContent(e.target.value)
                                }
                            />
                            <button
                                type="button"
                                onClick={() => saveEditComment(c.comment_id)}
                            >
                                저장
                            </button>
                            <button type="button" onClick={cancelEditComment}>
                                취소
                            </button>
                        </div>
                    ) : (
                        <p className="comment-text">{c.content}</p>
                    )}
                </div>

                {!editing && (
                    <div className="table-actions">
                        {!isReply && (
                            <button
                                type="button"
                                disabled={savingComment}
                                onClick={() => openReply(c.comment_id)}
                            >
                                답글
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleEditComment(c)}
                        >
                            수정
                        </button>
                        <button
                            type="button"
                            className="danger-button"
                            onClick={() => removeComment(c.comment_id)}
                        >
                            삭제
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const writeModalLayout = (
        <form onSubmit={savePost}>
            <div>
                <label>제목</label>
                <input
                    type="text"
                    required
                    maxLength={200}
                    onInput={e => e.currentTarget.setCustomValidity('')}
                    placeholder="제목을 입력해 주세요."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label>내용</label>
                <textarea
                    required
                    onInput={e => e.currentTarget.setCustomValidity('')}
                    placeholder="내용을 입력해 주세요."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows="8"
                />
            </div>

            <div style={{ marginTop: '15px', textAlign: 'right' }}>
                <button type="submit" className="erp-primary-button">
                    {editingItem ? '수정하기' : '등록하기'}
                </button>
            </div>
        </form>
    );

    const actions = item => (
        <div className="table-actions">
            <button type="button" onClick={() => handleOpenWriteModal(item)}>
                수정
            </button>
            <button
                type="button"
                className="danger-button"
                onClick={() => remove(item)}
            >
                삭제
            </button>
        </div>
    );

    const tableHeaders = ['번호', '제목', '작성자', '작성일', '댓글수', '관리'];

    const tableData = filtered.map((item, index) => ({
        content: [
            filtered.length - index,
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
                onClick={() => selectPost(item.post_id)}
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

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">자유게시판</span>

                <div className="dashboard-top">
                    {selected ? (
                        <button
                            type="button"
                            onClick={() => selectPost(null)}
                        >
                            목록으로
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="register-btn"
                            onClick={() => handleOpenWriteModal()}
                        >
                            + 글쓰기
                        </button>
                    )}
                </div>
            </header>

            <hr />

            {!selected && (
                <>
                    <div className="filter-bar">
                        <label className="search-field">
                            검색:
                            <input
                                type="text"
                                placeholder="제목 또는 작성자 검색"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
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

            {selected && (
                <article className="detail-card">
                    <header>
                        <h3>{selected.title}</h3>
                        <span className="subtext">
                            작성자: {selected.employee_name || '작성자 미확인'}
                            {' | 작성일: '}{date(selected.created_at)}
                            {' | 최근수정: '}{date(selected.updated_at)}
                        </span>
                    </header>

                    <hr />

                    <div className="detail-body">
                        {selected.content}
                    </div>

                    {actions(selected)}

                    <hr />

                    <section className="comment-section">
                        <h4>댓글 ({countComments(comments)})</h4>

                        {/* [수정] 원댓글 바로 아래에 연결된 답글을 표시합니다. */}
                        <div className="comment-list">
                            {rootComments.map(root => (
                                <div key={root.comment_id}>
                                    {renderComment(root)}
                                    {(repliesByParent.get(root.comment_id) || [])
                                        .map(renderComment)}

                                    {replyToId === root.comment_id &&
                                        root.deleted_at == null && (
                                        <form
                                            className="comment-input-wrap"
                                            style={{ marginLeft: 24 }}
                                            onSubmit={event => {
                                                event.preventDefault();
                                                saveComment(root.comment_id);
                                            }}
                                        >
                                            <input
                                                type="text"
                                                aria-label="답글 내용"
                                                placeholder="답글을 입력하세요"
                                                maxLength={10000}
                                                value={replyContent}
                                                disabled={savingComment}
                                                onChange={e =>
                                                    setReplyContent(e.target.value)
                                                }
                                            />
                                            <button
                                                type="button"
                                                disabled={savingComment}
                                                onClick={closeReply}
                                            >
                                                취소
                                            </button>
                                            <button
                                                type="submit"
                                                className="register-btn"
                                                disabled={savingComment}
                                            >
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

                        <form
                            className="comment-input-wrap"
                            onSubmit={event => {
                                event.preventDefault();
                                saveComment();
                            }}
                        >
                            <input
                                type="text"
                                aria-label="댓글 내용"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="댓글을 입력하세요"
                                maxLength={10000}
                                disabled={savingComment}
                            />
                            <button
                                type="submit"
                                className="register-btn"
                                disabled={savingComment}
                            >
                                댓글 등록
                            </button>
                        </form>
                    </section>
                </article>
            )}

            {isModalOpen && (
                <ModalBase
                    onClose={handleCloseWriteModal}
                    title={editingItem ? '게시글 수정' : '글쓰기'}
                    layout={writeModalLayout}
                />
            )}
        </div>
    );
}

export default FreeBoardPage;