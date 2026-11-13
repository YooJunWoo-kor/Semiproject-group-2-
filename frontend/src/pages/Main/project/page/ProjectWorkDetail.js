import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser, TOGLE_COLORS } from "../../../../utils/authStorage";

// 부모에서 넘겨주는 할 일 ID를 projectID prop으로 받음
function ProjectWorkDetail({ projectID, onBack, onTaskUpdated }) {
    const [taskDetail, setTaskDetail] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState("");
    const [replyTarget, setReplyTarget] = useState(null); // 대댓글 대상 { comment_id, author_name }
    const [loading, setLoading] = useState(false);

    // 1. projectID(할 일 ID)가 바뀌거나 들어올 때마다 상세 정보 & 댓글 조회
    useEffect(() => {
        if (!projectID) {
            setTaskDetail(null);
            setComments([]);
            return;
        }

        const fetchDetailAndComments = async () => {
            setLoading(true);
            setReplyTarget(null);
            try {
                const [detailRes, commentsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/project/worklist/${projectID}`),
                    axios.get(`${API_BASE_URL}/project/worklist/${projectID}/comments`)
                ]);
                setTaskDetail(detailRes.data);
                setComments(commentsRes.data);
            } catch (error) {
                console.error("할 일 상세 및 댓글 조회 실패:", error);
                setTaskDetail(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetailAndComments();
    }, [projectID]);

    // 댓글만 새로고침할 때 쓰는 함수
    const fetchComments = async (worklistId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/project/worklist/${worklistId}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error("댓글 목록 조회 실패:", error);
        }
    };

    // 2. 완료 / 진행중 상태 토글 핸들러
    const toggleTaskStatus = async () => {
        if (!taskDetail) return;
        const nextStatus = taskDetail.is_completed ? 0 : 1;

        try {
            await axios.patch(`${API_BASE_URL}/project/worklist/${taskDetail.worklist_id}/status`, {
                is_completed: nextStatus
            });

            const updated = { ...taskDetail, is_completed: nextStatus };
            setTaskDetail(updated);

            if (onTaskUpdated) {
                onTaskUpdated(updated);
            }
        } catch (error) {
            console.error("상태 변경 실패:", error);
            alert("상태 변경 중 오류가 발생했습니다.");
        }
    };

    // 3. 댓글 / 대댓글 등록 핸들러
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentInput.trim() || !taskDetail) return;

        const loginUser = getLoginUser();
        const employeeId = loginUser?.employeeKey;

        if (!employeeId) {
            alert("로그인 정보가 없습니다.");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/project/worklist/${taskDetail.worklist_id}/comments`, {
                employee_id: employeeId,
                content: commentInput.trim(),
                parent_comment_id: replyTarget ? replyTarget.comment_id : null
            });

            setCommentInput("");
            setReplyTarget(null);
            fetchComments(taskDetail.worklist_id);
        } catch (error) {
            console.error("댓글 등록 실패:", error);
            alert("댓글 등록 중 오류가 발생했습니다.");
        }
    };

    const isCompleted = taskDetail?.is_completed === 1;
    const tagColor = TOGLE_COLORS?.[taskDetail?.type_id] || "var(--color-brand)";

    return (
        <section style={{ flex: "1", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {loading ? (
                <div
                    className="detail-card"
                    style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--color-muted)" }}>불러오는 중...</p>
                </div>
            ) : taskDetail ? (
                <article className="detail-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {/* 상단 뒤로가기 버튼 */}
                    {onBack && (
                        <div style={{ marginBottom: "10px" }}>
                            <button
                                type="button"
                                onClick={onBack}
                                style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    fontSize: "13px",
                                    color: "var(--color-muted)",
                                    cursor: "pointer"
                                }}
                            >
                                ← 할 일 목록으로
                            </button>
                        </div>
                    )}

                    {/* 상단 제목 & 완료 처리 토글 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                            <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: tagColor, fontSize: "13px" }}>●</span>
                                {taskDetail.title}
                            </h3>
                            <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
                                <span>작성자: <strong>{taskDetail.writer_name || `사번 ${taskDetail.employee_id}`}</strong></span>
                                <span style={{ margin: "0 8px" }}>|</span>
                                <span>기간: {taskDetail.start_day} ~ {taskDetail.end_day}</span>
                                <span style={{ margin: "0 8px" }}>|</span>
                                <span>
                                    상태:{" "}
                                    <span className={`status-badge ${isCompleted ? "status-success" : ""}`}>
                                        {isCompleted ? "완료" : "진행중"}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={toggleTaskStatus}
                            style={{
                                backgroundColor: isCompleted ? "#f1f5f9" : "var(--color-brand)",
                                color: isCompleted ? "#475569" : "#fff",
                                borderColor: isCompleted ? "#cbd5e1" : "var(--color-brand)",
                                fontSize: "13px",
                                padding: "6px 14px",
                                minHeight: "auto",
                                cursor: "pointer"
                            }}
                        >
                            {isCompleted ? "다시 열기" : "✓ 완료 처리"}
                        </button>
                    </div>

                    <hr style={{ margin: "14px 0" }} />

                    {/* 본문 내용 */}
                    <div style={{ minHeight: "80px", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {taskDetail.content || "상세 설명이 없습니다."}
                    </div>

                    <hr style={{ margin: "14px 0" }} />

                    {/* 댓글 & 대댓글 피드 */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>
                            댓글 ({comments.length})
                        </h4>

                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                maxHeight: "220px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                marginBottom: "12px",
                            }}
                        >
                            {comments.map((item) => {
                                const isReply = item.parent_comment_id !== null;
                                return (
                                    <div
                                        key={item.comment_id}
                                        style={{
                                            padding: "8px 12px",
                                            marginLeft: isReply ? "24px" : "0px",
                                            backgroundColor: isReply ? "#f1f5f9" : "#f8fafc",
                                            borderRadius: "6px",
                                            border: "1px solid var(--color-line)",
                                            fontSize: "13px",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                            <div>
                                                {isReply && <span style={{ color: "var(--color-brand)", marginRight: "4px" }}>↳</span>}
                                                <strong>{item.author_name || `사번 ${item.employee_id}`}</strong>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span className="subtext" style={{ fontSize: "11px" }}>{item.created_at}</span>
                                                {!isReply && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplyTarget(item)}
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            padding: 0,
                                                            fontSize: "11px",
                                                            color: "var(--color-brand)",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        답글
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>{item.content}</div>
                                    </div>
                                );
                            })}

                            {comments.length === 0 && (
                                <p className="no-data" style={{ margin: "10px 0" }}>
                                    등록된 댓글이 없습니다.
                                </p>
                            )}
                        </div>

                        {/* 대댓글 작성 중일 때 대상 표시 배너 */}
                        {replyTarget && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "4px 10px",
                                    marginBottom: "6px",
                                    backgroundColor: "#eef2ff",
                                    borderRadius: "4px",
                                    fontSize: "12px"
                                }}
                            >
                                <span>
                                    <strong>{replyTarget.author_name || `사번 ${replyTarget.employee_id}`}</strong>님에게 답글 작성 중
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setReplyTarget(null)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* 댓글 입력 폼 */}
                        <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                placeholder={replyTarget ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                style={{ flex: 1, minHeight: "36px", padding: "6px 10px" }}
                            />
                            <button
                                type="submit"
                                className="erp-primary-button"
                                style={{ minHeight: "36px", padding: "0 14px", fontSize: "13px" }}
                            >
                                등록
                            </button>
                        </form>
                    </div>
                </article>
            ) : (
                <div
                    className="detail-card"
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "var(--color-muted)",
                    }}
                >
                    <p style={{ margin: 0, fontSize: "14px" }}>선택된 할 일이 없습니다.</p>
                    <span style={{ fontSize: "12px", marginTop: "4px" }}>
                        좌측 목록에서 항목을 선택해 상세 내용과 댓글을 확인하세요.
                    </span>
                </div>
            )}
        </section>
    );
}

export default ProjectWorkDetail;