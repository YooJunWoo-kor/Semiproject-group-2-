import React, { useEffect, useState } from 'react';
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

    // [수정] 주소에서 글 번호를 읽어 상세 글을 찾습니다.
    const selectedId = searchParams.get('postId');
    const selected = items.find(item => String(item.post_id) === selectedId);

    // 댓글 입력과 수정
    const [comment, setComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');

    // 글쓰기·수정 모달
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // [추가] 제목을 누르면 상세 주소를 방문 기록에 추가합니다.
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

    // [수정] 새 API 응답의 title로 검색합니다.
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

        // [수정] 등록과 수정 모두 title, content를 전달합니다.
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

    const saveComment = async () => {
        if (!comment.trim()) {
            alert('댓글 내용을 입력해 주세요.');
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

        try {
            await addFreeComment(selected.post_id, {
                content: comment.trim(),
                employee_id: Number(
                    employee.employee_id ?? employee.employeeKey
                )
            });
        } catch (error) {
            console.error('댓글 등록 실패:', error);
            alert('댓글 등록에 실패했습니다.');
            return;
        }

        setComment('');

        try {
            await refreshPosts();
            alert('댓글이 등록되었습니다.');
        } catch (error) {
            console.error('댓글 등록 후 재조회 실패:', error);
            alert('댓글은 등록되었습니다. 확인하려면 새로고침해 주세요.');
        }
    };

    // [수정] 댓글 번호는 comment_id를 사용합니다.
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

    const removeComment = async commentId => {
        if (!window.confirm('댓글을 삭제할까요?')) return;

        try {
            await deleteFreeComment(commentId);
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            alert('댓글 삭제에 실패했습니다.');
            return;
        }

        setItems(previous =>
            previous.map(post =>
                post.post_id === selected?.post_id
                    ? {
                        ...post,
                        comments: (post.comments || []).filter(
                            c => c.comment_id !== commentId
                        )
                    }
                    : post
            )
        );

        alert('댓글이 삭제되었습니다.');
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
            (item.comments || []).length,
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
                        <h4>댓글 ({(selected.comments || []).length})</h4>

                        <div className="comment-list">
                            {(selected.comments || []).map(c => {
                                const editing = editingCommentId === c.comment_id;

                                return (
                                    <div className="comment-item" key={c.comment_id}>
                                        <div className="comment-meta">
                                            <strong>
                                                {c.employee_name || '작성자 미확인'}
                                            </strong>

                                            <span className="subtext">
                                                {' ('}{dateTime(c.created_at)}{')'}
                                                {c.updated_at &&
                                                    ' | 수정: ' + dateTime(c.updated_at)}
                                            </span>

                                            {editing ? (
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={editingCommentContent}
                                                        onChange={e =>
                                                            setEditingCommentContent(
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            saveEditComment(c.comment_id)
                                                        }
                                                    >
                                                        저장
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditComment}
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="comment-text">{c.content}</p>
                                            )}
                                        </div>

                                        {!editing && (
                                            <div className="table-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditComment(c)}
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    type="button"
                                                    className="danger-button"
                                                    onClick={() =>
                                                        removeComment(c.comment_id)
                                                    }
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {(selected.comments || []).length === 0 && (
                                <p className="no-data">등록된 댓글이 없습니다.</p>
                            )}
                        </div>

                        <div className="comment-input-wrap">
                            <input
                                type="text"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="댓글을 입력하세요"
                            />
                            <button
                                type="button"
                                className="register-btn"
                                onClick={saveComment}
                            >
                                댓글 등록
                            </button>
                        </div>
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