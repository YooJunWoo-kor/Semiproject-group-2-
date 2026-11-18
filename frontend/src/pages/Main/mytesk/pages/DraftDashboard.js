import React from "react";
import { Link } from "react-router-dom";
import BasicTable from "../../../../components/BasicTable";
import StatisticsCard from "../../../../components/StatisticsCard";
import DraftStatusTag from "./DraftStatusTag";

function DraftDashboard({
    drafts = [],
    receivedDrafts = [],
    approvedDrafts = []
}) {
    const savedCount = drafts.filter(
        draft => draft.status === "임시저장"
    ).length;

    const recentDrafts = [...drafts]
        .sort((a, b) => Number(b.id) - Number(a.id));

    const summaryCards = [
        { title: "내 작성 기안서", count: drafts.length },
        { title: "임시저장", count: savedCount },
        { title: "결재할 문서", count: receivedDrafts.length },
    ];

    const recentTableData = recentDrafts.map(draft => ({
        content: [
            draft.title || "-",
            draft.draftType || "-",
            draft.createdAt || "-",
            <DraftStatusTag status={draft.status} />
        ]
    }));

    return (
        <div className="vertical-box size-fill" style={{alignSelf: "stretch"}}>
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
                title="기안서 현황"
                th={["제목", "문서 종류", "작성일", "상태"]}
                td={recentTableData}
            />
        </div>
    );
}

export default DraftDashboard;