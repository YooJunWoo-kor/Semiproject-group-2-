import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api";

function DraftReq({ drafts, loginUser, setEditingDraft, onDraftChanged }) {
    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();

    const requestedDrafts = drafts.filter(draft =>
        draft.writerEmployeeKey === loginUser?.employeeKey &&
        draft.status !== "최종승인" &&
        draft.title.includes(searchText)
    );

    async function handleDelete(id) {
        if (!window.confirm("임시저장 기안서를 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/drafts/${id}`, {
                params: { employeeId: loginUser.employeeKey }
            });
            await onDraftChanged();
        } catch (error) {
            console.error("기안서 삭제 오류:", error);
            alert(error.response?.data?.message || "기안서 삭제에 실패했습니다.");
        }
    }

    return (
        <div>
            <h2>요청된 기안서 / 임시저장된 기안서</h2>
            <input type="text" placeholder="제목 검색" value={searchText}
                onChange={e => setSearchText(e.target.value)} />
            {requestedDrafts.length === 0 ? (
                <p>요청된 기안서가 없습니다.</p>
            ) : requestedDrafts.map((draft, index) => (
                <div key={draft.id} className="draft-item">
                    <h3 className="draft-item-title">기안서 #{index + 1}</h3>
                    <p>제목 : {draft.title}</p>
                    <p>문서 종류 : {draft.draftType}</p>
                    <p>내용 : {draft.content}</p>
                    <p>작성일 : {draft.createdAt}</p>
                    <p>상태 : {draft.status}</p>
                    {draft.status === "임시저장" && (
                        <div className="draft-actions">
                            <button type="button" onClick={() => {
                                setEditingDraft(draft);
                                navigate("/main/mytesk/draft-create");
                            }}>이어서 작성</button>
                            <button type="button" onClick={() => handleDelete(draft.id)}>
                                삭제
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default DraftReq;
