import React, { useEffect, useState } from "react";

//프로젝트의 할일 목록의 상세
function ProjectWorkDetail(){
    const selectedTask = 1;
    const [commentInput, setCommentInput] = useState("");

    const tasks = [{id: 0, status: '완료', comments: '000'}]
    const comment = [];

    const toggleTaskStatus = (taskId) => {
        
      };

    // 댓글 등록 핸들러
    const handleAddComment = (e) => {
    
    };

    const nextTasks = function(){};

    return (
        <section style={{ flex: "1gi", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {selectedTask ? (
            <article className="detail-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* 상단 제목 & 완료 처리 토글 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "17px" }}>
                    {selectedTask.title}
                  </h3>
                  <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
                    <span>담당자: <strong>{selectedTask.assignee?.name}</strong></span>
                    <span style={{ margin: "0 8px" }}>|</span>
                    <span>
                      상태:{" "}
                      <span
                        className={`status-badge ${
                          selectedTask.status === "완료" ? "status-success" : ""
                        }`}
                      >
                        {selectedTask.status}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleTaskStatus(selectedTask.id)}
                  style={{
                    backgroundColor: selectedTask.status === "완료" ? "#f1f5f9" : "var(--color-brand)",
                    color: selectedTask.status === "완료" ? "#475569" : "#fff",
                    borderColor: selectedTask.status === "완료" ? "#cbd5e1" : "var(--color-brand)",
                    fontSize: "13px",
                    padding: "6px 14px",
                    minHeight: "auto",
                  }}
                >
                  {selectedTask.status === "완료" ? "다시 열기" : "✓ 완료 처리"}
                </button>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* 본문 내용 */}
              <div style={{ minHeight: "80px", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedTask.content || "상세 설명이 없습니다."}
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* 댓글 피드 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>
                  댓글 ({(selectedTask.comments || []).length})
                </h4>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    maxHeight: "180px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {
                    <div
                      key={comment.id}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "6px",
                        border: "1px solid var(--color-line)",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <strong>{comment.author}</strong>
                        <span className="subtext" style={{ fontSize: "11px" }}>{comment.createdAt}</span>
                      </div>
                      <div>{comment.content}</div>
                    </div>
                  }

                  {(selectedTask.comments || []).length === 0 && (
                    <p className="no-data" style={{ margin: "10px 0" }}>
                      등록된 댓글이 없습니다.
                    </p>
                  )}
                </div>

                {/* 댓글 입력 폼 */}
                <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="댓글을 입력하세요..."
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
            /* 할 일이 없거나 선택되지 않았을 때의 빈 화면 */
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