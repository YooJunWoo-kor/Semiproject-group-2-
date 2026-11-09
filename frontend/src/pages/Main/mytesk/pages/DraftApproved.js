import React from "react";

function DraftApproved({ drafts }) {
    return (
        <div className="draft-box">
            <h2>내가 승인한 기안서</h2>
            {drafts.length === 0 ? (
                <p>승인한 기안서가 없습니다.</p>
            ) : drafts.map(draft => (
                <div key={draft.id} className="draft-item">
                    <p>작성자 : {draft.writerName}</p>
                    <p>제목 : {draft.title}</p>
                    <p>문서 종류 : {draft.draftType}</p>
                    <p>내용 : {draft.content}</p>
                    <p>작성일 : {draft.createdAt}</p>
                    <p>문서 상태 : {draft.status}</p>
                </div>
            ))}
        </div>
    );
}

export default DraftApproved;
