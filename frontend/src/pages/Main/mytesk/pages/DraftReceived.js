import React from "react";

function DraftReceived({}) {
    const receivedDrafts = drafts.filter((draft) => {
        return (
            draft.approverId === loginUser.id && draft.status === "요청"
        )
    })

    function handleApprove(id) {
        const updatedDrafts = drafts.map((draft) => {
            if (draft.id === id)
                return {
                    ...draft,
                    status: "승인"
                };

            return draft;
        })


        setDrafts(updatedDrafts)

    }

    return (
        <div>
            <h2>요청이 온 기안서</h2>

            {receivedDrafts.length === 0 ? (
                <p>요청받은 기안서가 없습니다</p>
            ) : (
                receivedDrafts.map((draft) => {
                    return(
                        <div key={draft.id}>
                            <p>작성자 : {draft.writerName}</p>
                            <p>제목 : {draft.title}</p>
                            <p>문서 종류 : {draft.content}</p>
                            <p>작성일 : {draft.createdAt}</p>
                            <p>상태 : {draft.status}</p>

                            <button type="button" onClick={() => handleApprove(draft.id)}>승인</button>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default DraftReceived;