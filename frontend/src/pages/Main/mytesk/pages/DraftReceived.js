import React from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";
import PaginationTable from "../../../../components/PaginationTable";


function DraftReceived({ drafts, onDraftChanged }) {
    async function handleDecision(id, decision) {
        const employeeId = Number(getLoginUser()?.employeeKey);
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
        <div className="draft-box draft-list-view" data-page="draft-received">
            <h2>요청이 온 기안서</h2>
            
{drafts.length === 0 ? (
    <p>요청받은 기안서가 없습니다.</p>
) : (
    <PaginationTable
        title="결재할 문서"
        th={["결재요청자", "제목", "문서 종류", "내용", "작성일", "상태", "관리"]}
        allData={drafts.map(draft => ({
            content: [
                draft.writerName,
                draft.title,
                draft.draftType,
                draft.content,
                draft.createdAt,
                draft.status,
                <div className="draft-actions">
                    <button
                        className="erp-primary-button"
                        type="button"
                        onClick={() => handleDecision(draft.id, "approve")}
                    >
                        승인
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDecision(draft.id, "reject")}>
                        반려
                    </button>
                </div>
            ]
        }))}
        itemsPerPage={5}
    />
)}

        </div>
    );
}

export default DraftReceived;
