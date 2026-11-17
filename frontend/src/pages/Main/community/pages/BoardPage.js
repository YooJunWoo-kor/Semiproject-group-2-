import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ModalBase from "../../../../components/ModalBase";
import BoardList from "./BoardList";
import BoardDetail from "./BoardDetail";
import BoardWriteModal from "./BoardWriteModal";

const BOARD_CATEGORIES = {
  "2": ["일반공지", "중요공지"],
  "3": [
    "기타",
    "품질관리(QC/QA)",
    "생산·제조",
    "영업·마케팅",
    "연구개발(R&D)",
    "원료 및 성분",
    "인허가·규제",
    "제품·패키징",
  ],
  "4": ["질문", "기타"],
  "5": ["건의", "기타"],
};

export default function BoardPage({ boards = [] }) {
  const { boardSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentBoard = boards.find(
    (b) => b.front_path === `/${boardSlug}` || b.api_path === `/${boardSlug}`
  );
  const categoryOptions = BOARD_CATEGORIES[String(currentBoard?.board_type || "")] || [];
  const hasCategory = categoryOptions.length > 0;

  const [modal, setModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedId = searchParams.get("postId");

  const clearPostId = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("postId");
    setSearchParams(nextParams, { replace: true });
  };

  if (!currentBoard) {
    return (
      <div className="border-container">
        <p className="no-data">게시판 정보를 불러오는 중이거나 존재하지 않는 게시판입니다.</p>
      </div>
    );
  }

  const openWrite = (item = null) => {
    setEditingPost(item);
    setModal(true);
  };

  return (
    <div className="border-container">
      <header className="dashboard-header">
        <span className="subtitle">{currentBoard.board_name}</span>
        <div className="dashboard-top">
          {selectedId ? (
            <button type="button" onClick={clearPostId}>
              목록으로
            </button>
          ) : (
            <button
              type="button"
              className="register-btn"
              onClick={() => openWrite()}
            >
              + 글쓰기
            </button>
          )}
        </div>
      </header>

      <hr />

      {!selectedId ? (
        <BoardList
          board={currentBoard}
          hasCategory={hasCategory}
          refreshKey={refreshKey}
          onEditPost={openWrite}
        />
      ) : (
        <BoardDetail
          postId={selectedId}
          apiPath={currentBoard.api_path}
          refreshKey={refreshKey}
          onEditPost={openWrite}
          onDeleted={clearPostId}
        />
      )}

      {modal && (
        <ModalBase
          onClose={() => setModal(false)}
          title={
            editingPost == null
              ? `${currentBoard.board_name} 글쓰기`
              : `${currentBoard.board_name} 수정`
          }
          layout={
            <BoardWriteModal
              apiPath={currentBoard.api_path}
              editingPost={editingPost}
              hasCategory={hasCategory}
              categoryOptions={categoryOptions}
              onSuccess={() => {
                setModal(false);
                setRefreshKey((k) => k + 1);
              }}
              onClose={() => setModal(false)}
            />
          }
        />
      )}
    </div>
  );
}