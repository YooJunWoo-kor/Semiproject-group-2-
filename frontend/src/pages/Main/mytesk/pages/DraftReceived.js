import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";
import PaginationTable from "../../../../components/PaginationTable";
import DraftApproved from "./DraftApproved";
import DraftStatusTag from "./DraftStatusTag";

function DraftReceived({ drafts, onDraftChanged, appDrafts }) {
    const [pagetype, setPagetype] = useState(1);

    const tabButtonStyle = (isActive) => ({
        background: "none",
        border: "none",
        borderBottom: isActive ? "2px solid var(--color-brand)" : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 6px",
        fontSize: "14px",
        fontWeight: isActive ? 700 : 400,
        color: isActive ? "var(--color-brand)" : "var(--color-muted)",
        cursor: "pointer",
        minHeight: "auto",
    });

    return (
        <div className="draft-box draft-list-view" data-page="draft-received">
            <h2>결제 할 문서</h2>

            <div className="horizontal-box" style={{ gap: "12px", marginBottom: "12px" }}>
                <button
                    type="button"
                    style={tabButtonStyle(pagetype === 1)}
                    onClick={() => setPagetype(1)}
                >
                    요청 ({drafts.length})
                </button>
                <button
                    type="button"
                    style={tabButtonStyle(pagetype === 2)}
                    onClick={() => setPagetype(2)}
                >
                    완료 ({appDrafts.length})
                </button>
            </div>

            <div className="horizontal-box">
                {
                    pagetype === 1 ? (
                        drafts.length === 0 ? (
                            <div className="boder size-fill">
                                <p>요청받은 기안서가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="size-fill">
                                <PaymentDraft drafts={drafts} onDraftChanged={onDraftChanged} />
                            </div>
                        )
                    ) : (
                        <div className="size-fill">
                            <DraftApproved drafts={appDrafts} />
                        </div>
                    )
                }
            </div>
        </div>
    );
}

function PaymentDraft({ drafts, onDraftChanged }) {
    async function handleDecision(id, decision) {
        const employeeId = Number(getLoginUser()?.employeeKey);
        if (decision === "reject" && !window.confirm("이 기안서를 반려하시겠습니까?")) return;
        try {
            await axios.post(`${API_BASE_URL}/drafts/${id}/decision`, {
                employeeId,
                decision,
            });
            await onDraftChanged();
            alert(decision === "approve" ? "결재 승인 완료" : "기안서 반려 완료");
        } catch (error) {
            console.error("결재 처리 오류:", error);
            alert(error.response?.data?.message || "결재 처리에 실패했습니다.");
        }
    }

    return (
        <PaginationTable
            title="결재할 문서"
            th={["결재요청자", "제목", "문서 종류", "내용", "작성일", "상태", "관리"]}
            allData={drafts.map((draft) => ({
                content: [
                    draft.writerName,
                    draft.title,
                    draft.draftType,
                    draft.content,
                    draft.createdAt,
                    <DraftStatusTag status={draft.status} />,
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
                            onClick={() => handleDecision(draft.id, "reject")}
                        >
                            반려
                        </button>
                    </div>,
                ],
            }))}
            itemsPerPage={5}
        />
    );
}

export default DraftReceived;