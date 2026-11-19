import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import {
  getBoardPosts,
  deleteBoardPost,
  recordNoticeView,
} from "../../../../utils/communityApi";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) : "-";

export default function BoardList({ board, hasCategory, refreshKey, onEditPost }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const boardType = String(board.board_type);
  const isNotice = boardType === "2";

  const fetchList = async () => {
    try {
      const rows = await getBoardPosts(board.api_path);
      setItems(rows);
      setLoadError("");
    } catch {
      setLoadError("게시글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setQuery("");
    fetchList();
  }, [board.api_path, refreshKey]);

  const handleSelect = async (item) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("postId", String(item.post_id));
    setSearchParams(nextParams);

    if (isNotice) {
      try {
        await recordNoticeView(item.post_id);
      } catch {
        // 무시
      }
    }
  };

  const handleDelete = async (item) => {
    if (busy || !window.confirm("이 게시글을 삭제할까요?")) return;
    setBusy(true);
    try {
      await deleteBoardPost(board.api_path, item.post_id);
      alert("게시글이 삭제되었습니다.");
      fetchList();
    } catch (error) {
      alert(error.response?.data?.message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="no-data">목록을 불러오는 중입니다.</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

  const keyword = query.trim().toLowerCase();
  const filtered = items.filter((item) =>
    `${item.title} ${item.content} ${item.employee_name || "작성자 미확인"}`
      .toLowerCase()
      .includes(keyword)
  );

  const actions = (item) => (
    <div className="table-actions">
      <button type="button" disabled={busy} onClick={() => onEditPost(item)}>
        수정
      </button>
      <button
        type="button"
        disabled={busy}
        className="danger-button"
        onClick={() => handleDelete(item)}
      >
        삭제
      </button>
    </div>
  );

  const tableHeaders = isNotice
    ? ["구분", "분류", "제목", "작성자", "작성일", "조회수", "관리"]
    : hasCategory
    ? ["번호", "분류", "제목", "작성자", "작성일", "댓글수", "관리"]
    : ["번호", "제목", "작성자", "작성일", "댓글수", "관리"];

  const tableData = filtered.map((item, index) => {
    const titleBtn = (
      <button
        key={`title-${item.post_id}`}
        type="button"
        className="table-link-title"
        style={{
          border: 0,
          background: "transparent",
          padding: 0,
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
        }}
        disabled={busy}
        onClick={() => handleSelect(item)}
      >
        {item.title}
      </button>
    );

    if (isNotice) {
      return {
        content: [
          item.important ? <span className="status-badge status-danger">공지</span> : "-",
          item.category || "-",
          titleBtn,
          item.employee_name || "작성자 미확인",
          formatDate(item.created_at),
          item.views || 0,
          actions(item),
        ],
      };
    }

    const row = [filtered.length - index];
    if (hasCategory) row.push(item.category || "-");
    row.push(
      titleBtn,
      item.employee_name || "작성자 미확인",
      formatDate(item.created_at),
      (item.comments || []).length,
      actions(item)
    );
    return { content: row };
  });

  return (
    <div className="vertical-box">
      <div className="filter-bar horizontal-box">
          <input
            placeholder="제목, 내용 또는 작성자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
                fontSize: '13px',
                width: '300px',
                marginLeft: 'auto'
            }}
          />
      </div>

      <PaginationTable
        key={`${boardType}-${keyword}`}
        title={`${board.board_name} 목록`}
        th={tableHeaders}
        allData={tableData}
        itemsPerPage={10}
      />
    </div>
  );
}