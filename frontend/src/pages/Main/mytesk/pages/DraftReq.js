import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";
import { useNavigate } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";


function DraftReq({ drafts, setEditingDraft, onDraftChanged }) {
    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();
    const employeeId = getLoginUser()?.employeeKey;

    const requestedDrafts = drafts.filter(draft =>
        draft.writerEmployeeKey === employeeId &&
        draft.status !== "최종승인" &&
        draft.title.includes(searchText)
    );

    async function handleDelete(id) {
        if (!window.confirm("임시저장 기안서를 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/drafts/${id}`, {
                params: { employeeId }
            });
            await onDraftChanged();
        } catch (error) {
            console.error("기안서 삭제 오류:", error);
            alert(error.response?.data?.message || "기안서 삭제에 실패했습니다.");
        }
    }

    return (
        <div className="draft-box">
            <h2>요청된 기안서 / 임시저장된 기안서</h2>
    
            <input
                type="text"
                placeholder="제목 검색"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
    
            <PaginationTable
                title="내 결재 요청"
                th={["제목", "문서 종류", "내용", "작성일", "상태", "관리"]}
                allData={requestedDrafts.map(draft => ({
                    content: [
                        draft.title,
                        draft.draftType,
                        draft.content,
                        draft.createdAt,
                        draft.status
                    ]
                }))}
                itemsPerPage={5}
            />
        </div>
    );
}

export default DraftReq;
