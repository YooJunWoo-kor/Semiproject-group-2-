import React, { useEffect, useState } from "react";

//프로젝트의 상세
function ProjectWorkDetail(project, tasks){
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    const task = {id: '0'};
    const isSelected = false;

    useEffect(() => {
      }, [project.id]);

    //할일 등록 버튼 함수 
    const handleCreateTask = function(){}

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex : '1'
        }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ fontSize: "15px", margin: 0 }}>
                할 일 목록 (몇개인지)
                </h4>
            </div>
            {
            //   const isSelected = task.id === selectedTaskId;
            //   return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: isSelected ? "1px solid var(--color-brand)" : "1px solid var(--color-line)",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: isSelected ? "var(--color-brand)" : "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.title}
                    </span>
                    <span
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--color-muted)" }}>
                    <span>담당자: {task.assignee?.name || "미지정"}</span>
                    <span style={{ marginLeft: "10px" }}>댓글 </span>
                  </div>
                </div>
            }

            {/* 할 일이 없을 때: 데이터 없음 문구 + 추가 버튼 */}
            {(
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 10px",
                  textAlign: "center",
                  gap: "12px",
                }}
              >
                <p className="no-data" style={{ margin: 0 }}>
                  등록된 할 일이 없습니다.
                </p>
                <button
                  type="button"
                  className="register-btn"
                  onClick={handleCreateTask}
                >
                  + 첫 번째 할 일 등록
                </button>
              </div>
            )}
          </div>
        )
}

export default ProjectWorkDetail;