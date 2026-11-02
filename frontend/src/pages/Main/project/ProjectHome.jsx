import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectModul from './ProjectModul';
import Nav from '../../../components/Nav';

function ProjectRoutes() {
  const [projectlist, setProjectlist] = useState([
    {
      id: "proj-001",
      title: "결제/정산 모듈 패치",
      typeId: 1,
      start: "2026-10-25",
      end: "2026-11-05",
      members: [
        { id: "emp-001", name: "홍길동", position: "팀장" },
        { id: "emp-002", name: "김철수", position: "차장" }
      ],
      tasks: [
        {
          id: "task-001",
          title: "PG사 연동 규격서 검토",
          content: "신규 결제 모듈 API 스펙 및 보안 키 검증",
          assignee: { id: "emp-001", name: "홍길동" },
          status: "진행 중",
          comments: [
            {
              id: "comment-001",
              author: "김철수",
              content: "테스트 키 발급 완료되었습니다.",
              createdAt: "2026-10-26"
            }
          ]
        }
      ]
    },
    {
      id: "proj-002",
      title: "UI/UX 리뉴얼",
      typeId: 2,
      start: "2026-11-01",
      end: "2026-11-20",
      members: [
        { id: "emp-003", name: "이영희", position: "대리" },
        { id: "emp-004", name: "박민수", position: "사원" }
      ],
      tasks: [
        {
          id: "task-002",
          title: "공통 테이블 컴포넌트 리팩토링",
          content: "PaginationTable 및 BasicTable CSS 표준화",
          assignee: { id: "emp-003", name: "이영희" },
          status: "대기",
          comments: []
        }
      ]
    },
    {
      id: "proj-003",
      title: "데이터 마이그레이션",
      typeId: 0,
      start: "2026-10-01",
      end: "2026-10-20",
      members: [
        { id: "emp-002", name: "김철수", position: "차장" },
        { id: "emp-005", name: "정우성", position: "과장" }
      ],
      tasks: [
        {
          id: "task-003",
          title: "레거시 DB 사원/근태 데이터 추출",
          content: "MySQL 신규 스키마 매핑 및 더미 데이터 이관",
          assignee: { id: "emp-002", name: "김철수" },
          status: "완료",
          comments: [
            {
              id: "comment-002",
              author: "정우성",
              content: "이관 검증 완료했습니다.",
              createdAt: "2026-10-19"
            }
          ]
        }
      ]
    },
    {
      id: "proj-004",
      title: "회원 데이터 동기화",
      typeId: 3,
      start: "2026-11-10",
      end: "2026-11-28",
      members: [
        { id: "emp-001", name: "홍길동", position: "팀장" },
        { id: "emp-004", name: "박민수", position: "사원" }
      ],
      tasks: [] // 할 일 없음
    },
    {
      id: "proj-005",
      title: "재고 물류 최적화",
      typeId: 4,
      start: "2026-12-01",
      end: "2026-12-30",
      members: [
        { id: "emp-003", name: "이영희", position: "대리" },
        { id: "emp-005", name: "정우성", position: "과장" }
      ],
      tasks: [] // 할 일 없음
    }
  ]);

  const mainUrl = "/main/project/";
  
  const urlList = [
    { name: "프로젝트 대시보드", url: mainUrl }
  ];

  projectlist.forEach((item) => {
    urlList.push({
      name: item.title,
      url: mainUrl + item.id
    });
  });

  // 개별 프로젝트 상태(할 일, 댓글 등) 업데이트 헬퍼
  const handleUpdateProjectTasks = (projectId, updatedTasks) => {
    setProjectlist((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, tasks: updatedTasks } : proj
      )
    );
  };

  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route index element={<ProjectModul projectlist={projectlist} />} />
          {projectlist.map((item) => (
            <Route
              key={item.id}
              path={item.id}
              element={
                <ProjectDetail
                  project={item}
                  onUpdateTasks={(newTasks) => handleUpdateProjectTasks(item.id, newTasks)}
                />
              }
            />
          ))}
        </Routes>
      </div>
    </div>
  );
}

// 📌 상단 진행현황 컴포넌트
function ProjectProgress({ start, end }) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const today = new Date();

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalPeriod = endDate - startDate;
  const elapsedPeriod = today - startDate;

  let percent = 0;
  let statusText = "진행 중";
  let statusBadgeClass = "status-badge";

  if (totalPeriod <= 0) {
    percent = 100;
    statusText = "완료";
    statusBadgeClass = "status-badge status-success";
  } else if (today < startDate) {
    percent = 0;
    const diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
    statusText = `시작 전 (D-${diffDays})`;
  } else if (today > endDate) {
    percent = 100;
    statusText = "종료(완료)";
    statusBadgeClass = "status-badge status-success";
  } else {
    percent = Math.min(100, Math.max(0, Math.round((elapsedPeriod / totalPeriod) * 100)));
    const remainDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    statusText = `진행 중 (D-${remainDays})`;
  }

  return (
    <div className="detail-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "14px", fontWeight: "bold", marginRight: "10px" }}>
            일정 진행률
          </span>
          <span className={statusBadgeClass}>{statusText}</span>
        </div>
        <span style={{ fontSize: "18px", fontWeight: "bold", color: "var(--color-brand)" }}>
          {percent}%
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: "10px",
          backgroundColor: "#e2e8f0",
          borderRadius: "999px",
          overflow: "hidden",
          margin: "8px 0"
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            backgroundColor: "var(--color-brand)",
            borderRadius: "999px",
            transition: "width 0.4s ease-in-out"
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-muted)" }}>
        <span>시작일: {start}</span>
        <span>기준일: {new Date().toISOString().slice(0, 10)}</span>
        <span>마감일: {end}</span>
      </div>
    </div>
  );
}

// 📌 프로젝트 세부 3단 레이아웃 서브페이지
function ProjectDetail({ project, onUpdateTasks }) {
  const tasks = project.tasks || [];
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [commentInput, setCommentInput] = useState("");

  // 프로젝트 전환 시 선택된 할 일 초기화 (해당 프로젝트의 첫 할 일이 있으면 선택, 없으면 null)
  useEffect(() => {
    setSelectedTaskId(tasks[0]?.id || null);
    setCommentInput("");
  }, [project.id]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // 할 일 상태 토글 ('완료' <-> '진행 중')
  const toggleTaskStatus = (taskId) => {
    const nextTasks = tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          status: task.status === "완료" ? "진행 중" : "완료",
        };
      }
      return task;
    });
    onUpdateTasks(nextTasks);
  };

  // 댓글 등록 핸들러
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedTask) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      author: "홍길동",
      content: commentInput.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const nextTasks = tasks.map((task) => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          comments: [...(task.comments || []), newComment],
        };
      }
      return task;
    });

    onUpdateTasks(nextTasks);
    setCommentInput("");
  };

  // 신규 할 일 등록 (모달 연결 전 임시 생성 핸들러)
  const handleCreateTask = () => {
    const newTaskTitle = prompt("새로운 할 일 제목을 입력하세요:");
    if (!newTaskTitle || !newTaskTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      content: "상세 내용을 입력해 주세요.",
      assignee: project.members?.[0] || { name: "미지정" },
      status: "대기",
      comments: []
    };

    const nextTasks = [...tasks, newTask];
    onUpdateTasks(nextTasks);
    setSelectedTaskId(newTask.id);
  };

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">{project.title}</span>
        <span className="subtext">프로젝트 세부 일정 및 실시간 업무 현황</span>
      </header>

      {/* 2. 상단 일정 진행현황 바 */}
      <ProjectProgress start={project.start} end={project.end} />

      <hr style={{ margin: "20px 0" }} />

      {/* 3. 3단 패널 레이아웃 */}
      <div style={{ display: "flex", gap: "20px", minHeight: "480px" }}>
        
        {/* [1열] 참여 팀원 목록 (세로 카드 스택) */}
        <section
          style={{
            flex: "0 0 170px",
            borderRight: "1px solid var(--color-line)",
            paddingRight: "16px",
          }}
        >
          <h4 style={{ fontSize: "15px", marginBottom: "14px" }}>
            참여 팀원 ({project.members?.length || 0})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {project.members &&
              project.members.map((member) => (
                <div
                  key={member.id}
                  className="content-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    width: "100%",
                    minHeight: "auto",
                    padding: "10px 12px",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>{member.name}</strong>
                  <span className="subtext" style={{ fontSize: "12px", marginTop: "2px" }}>
                    {member.position}
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* [2열] 할 일 리스트 목록 */}
        <section
          style={{
            flex: "1 1 300px",
            borderRight: "1px solid var(--color-line)",
            paddingRight: "16px",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h4 style={{ fontSize: "15px", margin: 0 }}>
              할 일 목록 ({tasks.length})
            </h4>
            <button
              type="button"
              className="register-btn"
              style={{ fontSize: "12px", padding: "4px 10px", minHeight: "auto" }}
              onClick={handleCreateTask}
            >
              + 할 일 추가
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid var(--color-brand)" : "1px solid var(--color-line)",
                    backgroundColor: isSelected ? "#eff6ff" : "#fff",
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
                      className={`status-badge ${
                        task.status === "완료"
                          ? "status-success"
                          : task.status === "진행 중"
                          ? ""
                          : "status-danger"
                      }`}
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--color-muted)" }}>
                    <span>담당자: {task.assignee?.name || "미지정"}</span>
                    <span style={{ marginLeft: "10px" }}>댓글 {(task.comments || []).length}</span>
                  </div>
                </div>
              );
            })}

            {/* 할 일이 없을 때: 데이터 없음 문구 + 추가 버튼 */}
            {tasks.length === 0 && (
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
        </section>

        {/* [3열] 선택한 할 일 상세 내용 및 하단 댓글 (미선택 시 빈 화면 유지) */}
        <section style={{ flex: "1.5 1 380px", display: "flex", flexDirection: "column", minWidth: 0 }}>
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
                  {(selectedTask.comments || []).map((comment) => (
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
                  ))}

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
      </div>
    </div>
  );
}

export default function ProjectHome() {
  return <ProjectRoutes />;
}