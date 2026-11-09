import React from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";


function DraftReceived({ drafts, onDraftChanged }) {
    async function handleDecision(id, decision) {
        const employeeId = getLoginUser()?.employeeKey;
        if (decision === "reject" && !window.confirm("이 기안서를 반려하시겠습니까?")) return; // !window.confirm == "확인", "취소" 반대됨
        try {
            await axios.post(`${API_BASE_URL}/drafts/${id}/decision`, {
                employeeId,
                decision
            });
            await onDraftChanged();
            alert(decision === "approve" ? "결재 승인 완료" : "기안서 반려 완료");
        } catch (error) {
            console.error("결재 처리 오류:", error);
            alert(error.response?.data?.message || "결재 처리에 실패했습니다.");
        }
    }

    return (
        <div className="draft-box">
            <h2>요청이 온 기안서</h2>
            {drafts.length === 0 ? (
                <p>요청받은 기안서가 없습니다.</p>
            ) : drafts.map(draft => (
                <div key={draft.id} className="draft-item">
                    <p>결재요청자 : {draft.writerName}</p>
                    <p>제목 : {draft.title}</p>
                    <p>문서 종류 : {draft.draftType}</p>
                    <p>내용 : {draft.content}</p>
                    <p>작성일 : {draft.createdAt}</p>
                    <p>상태 : {draft.status}</p>
                    <button className="erp-primary-button" type="button" onClick={() => handleDecision(draft.id, "approve")}>
                        승인
                    </button>
                    <button type="button" onClick={() => handleDecision(draft.id, "reject")}>
                        반려
                    </button>
                </div>
            ))}
        </div>
    );
}

export default DraftReceived;
