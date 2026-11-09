import React from "react";
import { Link } from "react-router-dom";
import BasicTable from "../../../../components/BasicTable";

function DraftDashboard({
    drafts = [],
    receivedDrafts = [],
    approvedDrafts = []
}) {
    const savedCount = drafts.filter(
        draft => draft.status === "임시저장"
    ).length;

    // 기안서 ID는 생성 순서대로 증가하므로 최신 등록 문서를 먼저 표시한다.
    const recentDrafts = [...drafts]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 5);

    const summaryCards = [
        { label: "내 작성 기안서", count: drafts.length, description: "내가 작성한 전체 문서", tag: "작성" },
        { label: "임시저장", count: savedCount, description: "이어서 작성할 문서", tag: "보관" },
        { label: "결재할 문서", count: receivedDrafts.length, description: "내 결재를 기다리는 문서", tag: "대기" },
        { label: "내 승인 기록", count: approvedDrafts.length, description: "내가 승인한 문서", tag: "완료" }
    ];

    const statusTagClass = (status) => {
        switch (status) {
            case "임시저장": return "tag-blue";
            case "결재대기": return "tag-amber";
            case "최종승인": return "tag-emerald";
            case "반려": return "tag-red";
            default: return "tag-blue";
        }
    };

    const recentTableData = recentDrafts.map(draft => ({
        content: [
            draft.title || "-",
            draft.draftType || "-",
            draft.createdAt || "-",
            <span className={"attendance-tag " + statusTagClass(draft.status)}>
                {draft.status || "-"}
            </span>
        ]
    }));

    return (
        <div className="draft-box">
            <h2>전자결재 대시보드</h2>

            <div className="dashboard-header" style={{
                justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: 0
            }}>
                <p className="subtext" style={{ margin: 0 }}>
                    내 기안과 결재 현황을 한눈에 확인하세요.
                </p>
                <Link to="/main/mytesk/draft-create" className="register-btn">
                    새 기안 작성
                </Link>
            </div>

            <div className="draft-row" style={{ alignItems: "stretch" }}>
                {summaryCards.map(card => (
                    <div key={card.label} className="draft-item" style={{ flex: "1 1 190px" }}>
                        <span className="attendance-badge">{card.tag}</span>
                        <h3 className="draft-item-title" style={{ marginTop: 12, color: "var(--color-ink)" }}>
                            {card.label}
                        </h3>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <strong style={{ fontSize: "2rem", color: "var(--color-brand)", lineHeight: 1.2 }}>
                                {card.count}
                            </strong>
                            <span className="subtext">건</span>
                        </div>
                        <p className="subtext">{card.description}</p>
                    </div>
                ))}
            </div>

            <BasicTable
                title="최근 작성한 기안서 (최대 5건)"
                th={["제목", "문서 종류", "작성일", "상태"]}
                td={recentTableData}
            />

            <div className="draft-item">
                <h3 className="draft-item-title">바로가기</h3>
                <p className="subtext">기존 기안서 목록으로 이동하여 내용을 확인하거나 결재할 수 있습니다.</p>
                <div className="dashboard-header" style={{
                    justifyContent: "flex-start", gap: 8, flexWrap: "wrap",
                    borderBottom: "none", paddingBottom: 0, marginBottom: 0
                }}>
                    <Link className="register-btn" to="/main/mytesk/draft-request">
                        내 결재 요청
                    </Link>
                    <Link className="register-btn" to="/main/mytesk/draft-received">
                        결재할 문서
                    </Link>
                    <Link className="register-btn" to="/main/mytesk/draft-approved">
                        결재 완료
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default DraftDashboard;
