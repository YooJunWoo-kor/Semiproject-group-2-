import React from "react";

function DraftDashboard({
    drafts = [],
    receivedDrafts = [],
    approvedDrafts = []
}) {
    const savedCount = drafts.filter(
        draft => draft.status === '임시저장'
    ).length;

    return (
        <div className = "draft-box">
            <h2>전자결재 대시보드</h2>


            <div>
                <p>내 작성 기안서 : {drafts.length}건</p>
                <p>임시저장 : {savedCount}건</p>
                <p>결재할 문서 : {receivedDrafts.length}건</p>
                <p>내 승인 기록 : {approvedDrafts.length}건</p>
            </div>
        </div>
    )
}

export default DraftDashboard;