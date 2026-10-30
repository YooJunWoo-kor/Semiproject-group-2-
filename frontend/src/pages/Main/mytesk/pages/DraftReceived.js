import React from "react";

function DraftReceived({ drafts, setDrafts, loginUser }) {



    const receivedDrafts = drafts.filter((draft) => {
        const currentApproval = draft.approvers[draft.currentApprovalStep];

        return (
            currentApproval &&
            currentApproval.employeeKey === loginUser.employeeKey &&
            draft.status === "결재대기"
        )
    });

    console.log("drafts:", drafts);
    console.log("loginUser:", loginUser);
    console.log("receivedDrafts:", receivedDrafts);

    function handleApprove(id) {

        const updatedDrafts = drafts.map((draft) => {

            if (draft.id === id) {

                const nextStep = draft.currentApprovalStep + 1;

                if (nextStep < draft.approvers.length) {
                    return {
                        ...draft,
                        currentApprovalStep: nextStep
                    };
                }

                return {
                    ...draft,
                    status: "최종승인"
                };
            }

            return draft;
        });

        setDrafts(updatedDrafts);
    }

    function handleReject(id) {

        const rejectionReason = prompt("반려 사유를 입력해주세요.");

        if (rejectionReason == null) {
            return;
        }

        if (rejectionReason.trim() === "") {
            alert("반려 사유를 입력해주세요");
            return;
        }

        const updatedDrafts = drafts.map((draft) => {
            if (draft.id === id) {
                return {
                    ...draft,
                    status: "반려",
                    rejectedByEmployeeKey: loginUser.employeeKey,
                    rejectedByName: loginUser.name,
                    rejectionReason: rejectionReason,
                    rejectedAt: new Date().toLocaleString() // 보기좋은 문자열로 바꾸기
                }
            }

            return draft;
        })

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

                            {draft.approvers.map((approver, index) => (
                                <p key={approver.employeeKey}>
                                    {index + 1}단계 결재자 :
                                    {approver.position} {approver.name}                                </p>
                            ))}

                            <button
                                type="button"
                                onClick={() => handleApprove(draft.id)}
                            >
                                승인
                            </button>

                            <button type="button" onClick={() => handleReject(draft.id)}>
                                반려
                            </button>

                        </div>
                    );
                })
            )}
        </div>
    );
}

export default DraftReceived;