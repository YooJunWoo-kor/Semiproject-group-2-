import React from "react";

function DraftComp({drafts}) {
    const completedDrafts = drafts.filter((draft) => {
        return draft.status === "완료";
    })

    return (
        <div>
            <h2>완료된 기안서</h2>

            {completedDrafts.length === 0 ? (
                <p>완료된 기안서가 없습니다.</p>
            ) : (
                completedDrafts.map((draft, index) => {
                    return (
                        <div key={index}>
                            <p>제목 : {draft.title}</p>
                            <p>문서 종류 : {draft.draftType}</p>
                            <p>내용 : {draft.content}</p>
                            <p>작성일 : {draft.createdAt}</p>
                            <p>상태 : {draft.status}</p>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default DraftComp;