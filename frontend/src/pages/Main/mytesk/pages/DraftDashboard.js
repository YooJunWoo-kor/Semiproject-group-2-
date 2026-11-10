import React from "react";
import { Link } from "react-router-dom";
import BasicTable from "../../../../components/BasicTable";
import StatisticsCard from "../../../../components/StatisticsCard";

function DraftDashboard({
    drafts = [],
    receivedDrafts = [],
    approvedDrafts = []
}) {
    const savedCount = drafts.filter(
        draft => draft.status === "임시저장"
    ).length;

    const recentDrafts = [...drafts]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 5);

    const summaryCards = [
        { title: "내 작성 기안서", count: drafts.length },
        { title: "임시저장", count: savedCount },
        { title: "결재할 문서", count: receivedDrafts.length },
        { title: "내 승인 기록", count: approvedDrafts.length }
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
            <header className="dashboard-header">
                <span className="subtitle">전자결재 대시보드</span>
                <div className="dashboard-top">
                    <Link to="/main/mytesk/draft-create" className="register-btn">
                        새 기안 작성
                    </Link>
                </div>
            </header>

            <p className="subtext">내 기안과 결재 현황을 한눈에 확인하세요.</p>

            <section className="stats-section" aria-label="전자결재 현황">
                {summaryCards.map(card => (
                    <StatisticsCard
                        key={card.title}
                        title={card.title}
                        count={card.count}
                        stiyle={0}
                    />
                ))}
            </section>

            <BasicTable
                title="최근 작성한 기안서 (최대 5건)"
                th={["제목", "문서 종류", "작성일", "상태"]}
                td={recentTableData}
            />
        </div>
    );
}

export default DraftDashboard;
