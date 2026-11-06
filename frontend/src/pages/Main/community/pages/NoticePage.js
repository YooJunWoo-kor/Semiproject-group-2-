
import React, { useState } from 'react';
import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';

export default function NoticePage({ communityItems }) {
  const { items, addItem, removeItem } = communityItems;

  // 검색어 관리
  const [query, setQuery] = useState('');

  // 현재 화면 관리: 목록 또는 상세 보기
  const [view, setView] = useState('list');

  // 선택한 게시글 관리
  const [selected, setSelected] = useState(null);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 공지사항 입력값 관리
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('일반공지');

  // 검색 필터링
  const filtered = items.filter((item) => {
    const searchText = `${item.title} ${item.content}`.toLowerCase();

    return searchText.includes(query.trim().toLowerCase());
  });

  // 공지사항 작성 모달 열기
  const handleOpenWriteModal = () => {
    setTitle('');
    setContent('');
    setCategory('일반공지');
    setIsModalOpen(true);
  };

  // 공지사항 작성 모달 닫기
  const handleCloseWriteModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setContent('');
    setCategory('일반공지');
  };

  // 공지사항 등록
  const saveNotice = (e) => {
    e.preventDefault();

    // 제목 확인
    if (!title.trim()) {
      alert('제목을 입력해 주세요.');
      return;
    }

    // 내용 확인
    if (!content.trim()) {
      alert('내용을 입력해 주세요.');
      return;
    }

    // 새 공지사항 객체 생성
    const newNotice = {
      id: `notice-${Date.now()}`,
      title: title.trim(),
      category: category,
      content: content.trim(),
      author: '관리자',
      important: category === '중요공지',
      createdAt: new Date().toLocaleDateString('sv-SE'),
      views: 0,
    };

    // 공지사항 목록에 추가
    addItem(newNotice);

    // 모달 닫기
    handleCloseWriteModal();

    // 목록 화면으로 이동
    setView('list');
    setSelected(null);

    alert('공지사항이 등록되었습니다.');
  };

  // 공지사항 삭제
  const remove = (targetId) => {
    if (!window.confirm('해당 공지글을 삭제하시겠습니까?')) {
      return;
    }

    removeItem(targetId);

    setSelected(null);
    setView('list');

    alert('공지사항이 삭제되었습니다.');
  };

  // PaginationTable 헤더
  const tableHeaders = [
    '구분',
    '분류',
    '제목',
    '작성자',
    '작성일',
    '조회수',
  ];

  // PaginationTable 데이터
  const tableData = filtered.map((item) => ({
    content: [
      item.important
        ? <span className="status-badge status-danger">공지</span>
        : '-',

      item.category,

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

      item.createdAt ? item.createdAt.slice(0, 10) : '-',

      item.views || 0,
    ],
  }));

  // 공지사항 작성 폼
  const writeModalLayout = (
    <form onSubmit={saveNotice}>

      {/* 제목 입력 */}
      <div>
        <label>제목</label>

        <input
          type="text"
          placeholder="제목을 입력해 주세요."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 내용 입력 */}
      <div>
        <label>내용</label>

        <textarea
          placeholder="내용을 입력해 주세요."
          rows="8"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* 공지사항 분류 */}
      <div>
        <label>분류</label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="일반공지">일반공지</option>
          <option value="중요공지">중요공지</option>
        </select>
      </div>

      {/* 등록 버튼 */}
      <div>
        <button type="submit">
          등록하기
        </button>
      </div>

    </form>
  );

  return (
    <div className="sub-container">

      {/* 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">공지사항</span>

        <div className="dashboard-top">

          {view === 'list' && (
            <button
              type="button"
              className="register-btn"
              onClick={handleOpenWriteModal}
            >
              + 공지글 작성
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

      {/* 목록 화면 */}
      {view === 'list' && (
        <>
          <div className="filter-bar">

            <label className="search-field">
              검색:

              <input
                id="search"
                type="text"
                placeholder="제목 또는 내용 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

            </label>

          </div>

          <PaginationTable
            title="공지사항 목록"
            th={tableHeaders}
            allData={tableData}
            itemsPerPage={10}
          />
        </>
      )}

      {/* 상세 보기 화면 */}
      {view === 'detail' && selected && (
        <article className="detail-card">

          <header>
            <h3>{selected.title}</h3>

            <span className="subtext">
              작성자: {selected.author} |
              분류: {selected.category} |
              작성일: {selected.createdAt?.slice(0, 10)} |
              조회수: {selected.views || 0}
            </span>
          </header>

          <hr />

          <div className="detail-body">
            {selected.content}
          </div>

          <div className="table-actions">

            <button
              type="button"
              onClick={() => {
                alert('공지사항 수정 기능은 아직 구현되지 않았습니다.');
              }}
            >
              수정
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={() => remove(selected.id)}
            >
              삭제
            </button>

          </div>

        </article>
      )}

      {/* 공지사항 작성 모달 */}
      {isModalOpen && (
        <ModalBase
          onClose={handleCloseWriteModal}
          title="공지사항 작성"
          layout={writeModalLayout}
        />
      )}

    </div>
  );
}
