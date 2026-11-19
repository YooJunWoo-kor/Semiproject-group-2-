import React, { useEffect, useState } from "react";
import { getLoginUser } from "../../../../utils/authStorage";
import EmployeeTag from "../../../../components/EmployeeTag";
import {
  getBoardPosts,
  deleteBoardPost,
  addBoardComment,
  updateBoardComment,
  deleteBoardComment,
} from "../../../../utils/communityApi";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) : "-";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";

export default function BoardDetail({
  postId,
  apiPath,
  refreshKey,
  onEditPost,
  onDeleted,
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [replyToId, setReplyToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchDetail = async () => {
    try {
      const rows = await getBoardPosts(apiPath);
      const found = rows.find((item) => String(item.post_id) === String(postId));
      setPost(found || null);
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setComment("");
    setReplyToId(null);
    setReplyContent("");
    setEditingCommentId(null);
    fetchDetail();
  }, [apiPath, postId, refreshKey]);

  if (loading) {
    return <p className="no-data">게시글을 불러오는 중입니다.</p>;
  }

  if (!post) {
    return <p className="no-data">존재하지 않거나 삭제된 게시글입니다.</p>;
  }

  const getEmployeeId = () => {
    const user = getLoginUser();
    const id = Number(user?.employee_id ?? user?.employeeKey);
    return Number.isInteger(id) && id > 0 ? id : null;
  };

  const handleDeletePost = async () => {
    if (busy || !window.confirm("이 게시글을 삭제할까요?")) return;

    setBusy(true);
    try {
      await deleteBoardPost(apiPath, post.post_id);
      alert("게시글이 삭제되었습니다.");
      onDeleted();
    } catch (error) {
      alert(error.response?.data?.message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async (e, parentId = null) => {
    e.preventDefault();

    const content = (parentId === null ? comment : replyContent).trim();
    if (!content || busy) return;

    const employeeId = getEmployeeId();
    if (!employeeId) return alert("로그인 직원 정보를 확인해 주세요.");

    setBusy(true);
    try {
      await addBoardComment(apiPath, post.post_id, {
        content,
        employee_id: employeeId,
        parent_comment_id: parentId,
      });

      if (parentId === null) {
        setComment("");
      } else {
        setReplyToId(null);
        setReplyContent("");
      }

      await fetchDetail();
    } catch (error) {
      alert(error.response?.data?.message || "댓글 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateComment = async (e, commentId) => {
    e.preventDefault();
    if (!editingComment.trim() || busy) return;

    setBusy(true);
    try {
      await updateBoardComment(apiPath, post.post_id, commentId, {
        content: editingComment.trim(),
      });
      setEditingCommentId(null);
      fetchDetail();
    } catch (error) {
      alert(error.response?.data?.message || "댓글 수정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteComment = async (item) => {
    const message = item.parent_comment_id == null
      ? "댓글을 삭제할까요? 달린 답글도 함께 삭제됩니다."
      : "답글을 삭제할까요?";

    if (busy || !window.confirm(message)) return;

    setBusy(true);
    try {
      await deleteBoardComment(apiPath, post.post_id, item.comment_id);
      setEditingCommentId(null);

      if (replyToId === item.comment_id) {
        setReplyToId(null);
        setReplyContent("");
      }

      await fetchDetail();
    } catch (error) {
      alert(error.response?.data?.message || "댓글 삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const comments = post.comments || [];
  const rootComments = [];
  const repliesByParent = new Map();

  for (const item of comments) {
    if (item.parent_comment_id == null) {
      rootComments.push(item);
      continue;
    }

    const parentId = String(item.parent_comment_id);
    const replies = repliesByParent.get(parentId) || [];

    replies.push(item);
    repliesByParent.set(parentId, replies);
  }

  const orderedComments = rootComments.flatMap((item) => [
    item,
    ...(repliesByParent.get(String(item.comment_id)) || []),
  ]);

  const inputStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    padding: "10px 12px",
    border: "1px solid #ccd6e5",
    borderRadius: 8,
    font: "inherit",
  };

  return (
    <article
      className="boder vertical-box"
      style={{
        padding: "30px",
        paddingBottom: "80px",
      }}
    >
      <div className="horizontal-box">
        <h3>{post.title}</h3>
      </div>

      <div className="horizontal-box">
        <EmployeeTag id={getEmployeeId()} />
        <p className="subtext">
          {` ${
            formatDate(post.created_at) < formatDate(post.updated_at)
              ? formatDate(post.updated_at) + "(수정)"
              : formatDate(post.updated_at)
          }`}
        </p>
      </div>

      <hr />

      <div
        className="detail-body"
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          minHeight: "450px",
          backgroundColor: "#efefef",
          padding: "30px",
          borderRadius: "10px",
        }}
      >
        {post.content}
      </div>

      <div className="horizontal-box" style={{ fontSize: "13px" }}>
        <button type="button" disabled={busy} onClick={() => onEditPost(post)}>
          수정
        </button>
        <button
          type="button"
          disabled={busy}
          className="danger-button"
          onClick={handleDeletePost}
        >
          삭제
        </button>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <section className="comment-section">
        <h4>댓글 ({orderedComments.length})</h4>

        <div
          className="comment-list"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "15px",
            marginBottom: "20px",
            borderRadius: "10px",
          }}
        >
          {orderedComments.map((c) => (
            <div
              className="comment-item"
              key={c.comment_id}
              style={c.parent_comment_id == null ? undefined : { marginLeft: 24 }}
            >
              <div className="comment-meta">
                <strong>{c.employee_name || "작성자 미확인"}</strong>

                <span className="subtext" style={{ fontSize: "13px", marginLeft: "auto" }}>
                  {` ${formatDateTime(c.created_at)}`}
                  {c.updated_at && ` | 수정: ${formatDateTime(c.updated_at)}`}
                </span>

                {editingCommentId === c.comment_id ? (
                  <form
                    className="horizontal-box"
                    onSubmit={(e) => handleUpdateComment(e, c.comment_id)}
                  >
                    <input
                      className="size-fill"
                      required
                      maxLength={10000}
                      style={inputStyle}
                      value={editingComment}
                      onChange={(e) => setEditingComment(e.target.value)}
                      disabled={busy}
                    />
                    <button type="submit" disabled={busy} style={{ fontSize: "13px" }}>
                      저장
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      style={{ fontSize: "13px" }}
                      onClick={() => setEditingCommentId(null)}
                    >
                      취소
                    </button>
                  </form>
                ) : (
                  <div className="horizontal-box">
                    <p
                      className="comment-text"
                      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                    >
                      {c.content}
                    </p>

                    <div className="horizontal-box" style={{ fontSize: "13px", marginLeft: "auto" }}>
                      {c.parent_comment_id == null && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setReplyToId(c.comment_id);
                            setReplyContent("");
                          }}
                        >
                          답글
                        </button>
                      )}

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
                        onClick={() => handleDeleteComment(c)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {replyToId === c.comment_id && (
                <form
                  className="horizontal-box"
                  onSubmit={(e) => handleAddComment(e, c.comment_id)}
                >
                  <input
                    className="size-fill"
                    required
                    maxLength={10000}
                    placeholder="답글을 입력하세요"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    disabled={busy}
                    style={inputStyle}
                  />
                  <button type="submit" disabled={busy}>
                    답글 등록
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setReplyToId(null);
                      setReplyContent("");
                    }}
                  >
                    취소
                  </button>
                </form>
              )}
            </div>
          ))}

          {orderedComments.length === 0 && (
            <p className="no-data">등록된 댓글이 없습니다.</p>
          )}
        </div>

        <form
          className="comment-input-wrap"
          style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
          onSubmit={handleAddComment}
        >
          <input
            required
            placeholder="댓글을 입력하세요"
            maxLength={10000}
            disabled={busy}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 240px", width: "auto" }}
          />
          <button
            type="submit"
            className="register-btn"
            disabled={busy}
            style={{ fontSize: "13px" }}
          >
            댓글 등록
          </button>
        </form>
      </section>
    </article>
  );
}