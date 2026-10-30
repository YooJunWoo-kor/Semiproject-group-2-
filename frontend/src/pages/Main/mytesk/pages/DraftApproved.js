import React from "react";

function DraftApproved({ drafts, loginUser }) {

    const approvedDrafts = drafts.filter((draft) => {
        return (
            draft.approverId === loginUser.id &&
            draft.status === "최종승인"
        )
    });

    return (
        <div>
            <h2>승인된 기안서</h2>

            {approvedDrafts.length === 0 ? (
                <p>승인된 기안서가 없습니다.</p>
            ) : (
                approvedDrafts.map((draft) => {
                    return (
                        <div key={draft.id} className="draft-item">
                            <p>작성자 : {draft.writerName}</p>
                            <p>제목 : {draft.title}</p>
                            <p>문서 종류 : {draft.draftType}</p>
                            <p>내용 : {draft.content}</p>
                            <p>작성일 : {draft.createdAt}</p>
                            <p>상태 : {draft.status}</p>
                        </div>
                    );
                })
            ) }

        

            
        </div>
    );
}

export default DraftApproved;