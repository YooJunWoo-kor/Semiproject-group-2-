import React from "react";
import PaginationTable from "../../../../components/PaginationTable";

function DraftApproved({ drafts }) {
    return (
        <div className="draft-box draft-list-view" data-page="draft-approved">
            <h2>내가 승인한 기안서</h2>
            
{drafts.length === 0 ? (
    <p>승인한 기안서가 없습니다.</p>
) : (
    <PaginationTable
        title="결재 완료"
        th={[
            "작성자",
            "제목",
            "문서 종류",
            "내용",
            "작성일",
            "문서 상태"
        ]}
        allData={drafts.map(draft => ({
            content: [
                draft.writerName,
                draft.title,
                draft.draftType,
                draft.content,
                draft.createdAt,
                draft.status
            ]
        }))}
        itemsPerPage={5}
    />
)}

        </div>
    );
}

export default DraftApproved;
