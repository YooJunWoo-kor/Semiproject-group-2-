
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';

// 자유게시판 API
import {
    getFreePosts,
    addFreePost,
    updateFreePost,
    deleteFreePost,
    addFreeComment,
    deleteFreeComment
} from '../../../../utils/communityApi';
import { getLoginUser } from '../../../../utils/authStorage';


function FreeBoardPage() {

    const location = useLocation();

    // 1. 로그인 직원 정보 관리
    console.log('로그인 직원 정보:', getLoginUser())
    const [employee, setEmployee] = useState(getLoginUser());

    // 2. 게시글 데이터 관리
    const [items, setItems] = useState([]);

    // MySQL에서 게시글 전체 조회
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const posts = await getFreePosts();
                
                setItems(posts);
                console.log('MySQL 게시글 목록:', posts);

                // 다른 화면에서 선택한 게시글이 있다면 상세 보기
                const selectedItemId = location.state?.selectedItemId;


                if (selectedItemId) {
                    const selectedPost = posts.find(
                        (item) =>
                            String(item.id) === String(selectedItemId)
                    );
                    if (selectedPost) {
                        setSelected(selectedPost);
                        setView('detail');
                    }
                }
            } catch (error) {
                console.error('게시글 조회 실패:', error);
                alert('게시글 목록을 불러오지 못했습니다.');
            }
        };
        fetchPosts();
    }, []);


    // 게시글 목록 다시 불러오기
    const refreshPosts = async () => {

        const posts = await getFreePosts();

        setItems(posts);

        return posts;

    };


    // ==========================================
    // 3. 기존 화면 상태 관리
    // ==========================================

    const [query, setQuery] = useState('');

    const [view, setView] = useState('list');

    const [selected, setSelected] = useState(null);

    const [comment, setComment] = useState('');


    // ==========================================
    // 4. 모달과 게시글 입력값 관리
    // ==========================================

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingItem, setEditingItem] = useState(null);

    const [title, setTitle] = useState('');

    const [content, setContent] = useState('');


    // 검색
    const filtered = items.filter((item) =>
        `${item.title} ${item.author}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );


    // ==========================================
    // 5. 글쓰기 / 수정 모달 열기
    // ==========================================

    const handleOpenWriteModal = (item = null) => {

        setEditingItem(item);

        setTitle(item ? item.title : '');

        setContent(item ? item.content : '');

        setIsModalOpen(true);

    };


    // 모달 닫기
    const handleCloseWriteModal = () => {

        setIsModalOpen(false);

        setEditingItem(null);

        setTitle('');

        setContent('');

    };


    // ==========================================
    // 6. 게시글 저장
    // ==========================================

    const savePost = async (event) => {

        event.preventDefault();


        if (!title.trim()) {

            alert('제목을 입력해 주세요.');

            return;

        }


        if (!content.trim()) {

            alert('내용을 입력해 주세요.');

            return;

        }


        // 직원 정보 확인
        if (!employee) {

            alert('직원 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');

            return;

        }


        try {

            // 게시글 수정
            if (editingItem) {

                await updateFreePost(editingItem.id, {
                    title: title.trim(),
                    content: content.trim()
                });


                const posts = await refreshPosts();

                const updatedPost = posts.find(
                    (item) => item.id === editingItem.id
                );


                if (selected && selected.id === editingItem.id) {

                    setSelected(updatedPost || null);

                }

                alert('게시글이 수정되었습니다.');

            }


            // 새 게시글 등록
            else {

                await addFreePost({
                    title: title.trim(),
                    content: content.trim(),
                    author: employee.name
                });


                await refreshPosts();

                alert('게시글이 등록되었습니다.');

            }


            handleCloseWriteModal();

        } catch (error) {

            console.error('게시글 저장 실패:', error);

            alert('게시글 저장에 실패했습니다.');

        }

    };


    // ==========================================
    // 7. 게시글 삭제
    // ==========================================

    const remove = async (itemToRemove = selected) => {

        if (!itemToRemove || !window.confirm('이 글을 삭제할까요?')) {

            return;

        }


        try {

            await deleteFreePost(itemToRemove.id);

            await refreshPosts();


            if (selected && selected.id === itemToRemove.id) {

                setSelected(null);

                setView('list');

            }

            alert('게시글이 삭제되었습니다.');

        } catch (error) {

            console.error('게시글 삭제 실패:', error);

            alert('게시글 삭제에 실패했습니다.');

        }

    };


    // ==========================================
    // 8. 댓글 저장
    // ==========================================

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

            await addFreeComment(selected.id, {
                content: comment.trim(),
                author: employee.name
            });


            const posts = await refreshPosts();

            const updatedPost = posts.find(
                (item) => item.id === selected.id
            );


            if (updatedPost) {

                setSelected(updatedPost);

            }

            setComment('');

            alert('댓글이 등록되었습니다.');

        } catch (error) {

            console.error('댓글 등록 실패:', error);

            alert('댓글 등록에 실패했습니다.');

        }

    };


    // ==========================================
    // 9. 댓글 삭제
    // ==========================================

    const removeComment = async (id) => {

        if (!window.confirm('댓글을 삭제할까요?')) {

            return;

        }


        try {

            await deleteFreeComment(id);


            const posts = await refreshPosts();

            const updatedPost = posts.find(
                (item) => item.id === selected.id
            );


            if (updatedPost) {

                setSelected(updatedPost);

            }

            alert('댓글이 삭제되었습니다.');

        } catch (error) {

            console.error('댓글 삭제 실패:', error);

            alert('댓글 삭제에 실패했습니다.');

        }

    };


    // ==========================================
    // 10. 모달 입력 폼
    // ==========================================

    const writeModalLayout = (

        <form onSubmit={savePost}>

            <div>

                <label>제목</label>

                <input
                    type="text"
                    placeholder="제목을 입력해 주세요."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

            </div>


            <div>

                <label>내용</label>

                <textarea
                    placeholder="내용을 입력해 주세요."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
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


    // ==========================================
    // 11. 테이블 데이터
    // ==========================================

    const tableHeaders = [
        '번호',
        '제목',
        '작성자',
        '작성일',
        '댓글수',
        '관리'
    ];


    const tableData = filtered.map((item, index) => ({

        content: [

            filtered.length - index,


            <span
                className="table-link-title"
                onClick={() => {
                    setSelected(item);
                    setView('detail');
                }}
            >
                {item.title}
            </span>,


            item.author,


            item.createdAt || item.updatedAt || '-',


            (item.comments || []).length,


            <div className="table-actions">

                <button
                    type="button"
                    onClick={() => handleOpenWriteModal(item)}
                >
                    수정
                </button>


                <button
                    type="button"
                    className="danger-button"
                    onClick={() => remove(item)}
                >
                    삭제
                </button>

            </div>,

        ],

    }));

    // 12. 화면 출력
    return (

        <div className="border-container">


            {/* 상단 공통 헤더 */}

            <header className="dashboard-header">

                <span className="subtitle">자유게시판</span>

                <div className="dashboard-top">

                    {view === 'list' && (

                        <button
                            type="button"
                            className="register-btn"
                            onClick={() => handleOpenWriteModal()}
                        >
                            + 글쓰기
                        </button>

                    )}


                    {view !== 'list' && (

                        <button
                            type="button"
                            onClick={() => setView('list')}
                        >
                            목록으로
                        </button>

                    )}

                </div>

            </header>


            <hr />


            {/* 게시글 목록 */}

            {view === 'list' && (

                <>

                    <div className="filter-bar">

                        <label className="search-field">

                            검색:

                            <input
                                type="text"
                                placeholder="제목 또는 작성자 검색"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
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


            {/* 게시글 상세 보기 */}

            {view === 'detail' && selected && (

                <article className="detail-card">

                    <header>

                        <h3>{selected.title}</h3>

                        <span className="subtext">

                            작성자: {selected.author} |
                            작성일: {selected.createdAt} |
                            최근수정: {selected.updatedAt}

                        </span>

                    </header>


                    <hr />


                    <div className="detail-body">
                        {selected.content}
                    </div>


                    <div className="table-actions">

                        <button
                            type="button"
                            onClick={() => handleOpenWriteModal(selected)}
                        >
                            수정
                        </button>


                        <button
                            type="button"
                            className="danger-button"
                            onClick={() => remove(selected)}
                        >
                            삭제
                        </button>

                    </div>


                    <hr />


                    {/* 댓글 영역 */}

                    <section className="comment-section">

                        <h4>댓글 ({(selected.comments || []).length})</h4>


                        <div className="comment-list">

                            {(selected.comments || []).map((c) => (

                                <div key={c.id} className="comment-item">

                                    <div className="comment-meta">

                                        <strong>{c.author}</strong>

                                        <span className="subtext">
                                            ({c.createdAt})
                                        </span>

                                        <p className="comment-text">
                                            {c.content}
                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        className="danger-button"
                                        onClick={() => removeComment(c.id)}
                                    >
                                        삭제
                                    </button>

                                </div>

                            ))}


                            {(selected.comments || []).length === 0 && (

                                <p className="no-data">
                                    등록된 댓글이 없습니다.
                                </p>

                            )}

                        </div>


                        <div className="comment-input-wrap">

                            <input
                                type="text"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
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


            {/* 공통 모달 */}

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
