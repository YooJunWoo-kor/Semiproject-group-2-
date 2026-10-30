import React from "react";

function DraftReceived({ drafts, setDrafts, loginUser }) {

    const receivedDrafts = drafts.filter((draft) => {
        return (
            draft.firstApproverId === loginUser.id &&
            draft.status === "1차결재대기"
        )
        ||
        (
            draft.secondApproverId === loginUser.id &&
            draft.status === "2차결재대기"
        )
    });

    function handleApprove(id) {

        const updatedDrafts = drafts.map((draft) => {

            if (draft.id === id) {
                return {
                    ...draft,
                    status: "2차결재대기"
                };
            }

            if (draft.secondApproverId === loginUser.id && draft.status === "2차결재대기"){
                return {
                    ...draft,
                    status: "최종승인"
                }
            }

            return draft;
        });

        setDrafts(updatedDrafts);
    }

    return (
        <div>
            <h2>요청이 온 기안서</h2>

            {receivedDrafts.length === 0 ? (
                <p>요청받은 기안서가 없습니다</p>
            ) : (
                receivedDrafts.map((draft) => {
                    return (
                        <div key={draft.id}>

                            <p>결재요청자 : {draft.writerName}</p>
                            <p>제목 : {draft.title}</p>
                            <p>문서 종류 : {draft.draftType}</p>
                            <p>작성일 : {draft.createdAt}</p>
                            <p>상태 : {draft.status}</p>
                            <p>
                                1차 결재자 :
                                {draft.firstApproverPosition} {draft.firstApproverName}
                            </p>

                            <p>
                                2차 결재자 :
                                {draft.secondApproverPosition} {draft.secondApproverName}
                            </p>

                            <button
                                type="button"
                                onClick={() => handleApprove(draft.id)}
                            >
                                승인
                            </button>

                        </div>
                    );
                })
            )}
        </div>
    );
}

export default DraftReceived;