import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL, TOGLE_COLORS } from "../../../../utils/authStorage"; // 경로에 맞게 확인

// 프로젝트의 상세
function ProjectDetailWorkList({ projectID, onOpenNewModal, click }) {
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. 백엔드에서 할 일 목록 불러오기
    const fetchWorkList = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/project/worklist`);
            setTasks(response.data);
        } catch (error) {
            console.error("할 일 목록 조회 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkList();
    }, [projectID]);

    // 할 일 등록 버튼 함수 (부모에서 모달/입력창 여는 함수를 넘겨받은 경우 호출)
    const handleCreateTask = () => {
        if (onOpenNewModal) {
            onOpenNewModal();
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: "1"
            }}
        >
            {/* 상단 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ fontSize: "15px", margin: 0 }}>
                    할 일 목록 ({tasks.length}개)
                </h4>
            </div>

            {/* 2. 데이터가 있을 때: 할 일 카드 리스트 출력 */}
            {!loading && tasks.length > 0 && tasks.map((task) => {
                const isSelected = task.worklist_id === selectedTaskId;
                const tagColor = TOGLE_COLORS?.[task.type_id] || "var(--color-brand)";

                return (
                    <div
                        key={task.worklist_id}
                        onClick={() => {
                          setSelectedTaskId(task.worklist_id);
                          click(task.worklist_id);
                        }}
                        style={{
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: isSelected ? "1px solid var(--color-brand)" : "1px solid var(--color-line)",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                            {/* 색상 태그 점 + 제목 */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                                <span style={{ color: tagColor, fontSize: "12px" }}>●</span>
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
                            </div>

                            {/* 완료 상태 배지 */}
                            <span
                                style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    backgroundColor: task.is_completed ? "#e6f4ea" : "#f1f3f5",
                                    color: task.is_completed ? "#1e7e34" : "#495057",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {task.is_completed ? "완료" : "진행중"}
                            </span>
                        </div>

                        {/* 하단 메타 정보: 작성자, 기간, 댓글 수 */}
                        <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--color-muted)", display: "flex", justifyContent: "space-between" }}>
                            <div>
                                <span>작성자: {task.writer_name || `사번 ${task.employee_id}`}</span>
                                <span style={{ marginLeft: "10px" }}>댓글 {task.comment_count || 0}</span>
                            </div>
                            <span>{task.start} ~ {task.end}</span>
                        </div>
                    </div>
                );
            })}

            {/* 3. 할 일이 없을 때만: 데이터 없음 문구 + 추가 버튼 */}
            {!loading && tasks.length === 0 && (
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
    );
}

export default ProjectDetailWorkList;