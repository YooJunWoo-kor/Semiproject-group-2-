import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";
import { useNavigate } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import ModalBase from "../../../../components/ModalBase";



function DraftReq({ drafts, setEditingDraft, onDraftChanged }) {
    const [searchText, setSearchText] = useState("");
    const [selectedDraft, setSelectedDraft] = useState(null);

    const navigate = useNavigate();
    const employeeId = Number(getLoginUser()?.employeeKey);

    const requestedDrafts = drafts.filter(draft =>
        Number(draft.writerEmployeeKey) === employeeId &&
        draft.status !== "최종승인" &&
        (draft.title || "").includes(searchText)
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

    const CancelReq = async (draftId) => {
        if(!window.confirm("결재 요청을 취소하시겠습니까?")){
            return;
        }

        try{
            await axios.delete(`${API_BASE_URL}/drafts/cancel/${draftId}/${employeeId}`
            );

            await onDraftChanged();
            
        }
        catch (error){
            console.error("요청 취소 오류:", error);
        }
    }

    return (
        <div className="draft-box draft-list-view" data-page="draft-request">
            <h2>요청된 기안서 / 임시저장된 기안서</h2>
    
            <input
                type="text"
                placeholder="제목 검색"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
    
            <PaginationTable
                title="내 결재 요청"
                th={["제목", "문서 종류", "작성일", "상태", "관리"]}
                
                allData={requestedDrafts.map(draft => ({
                    content: [
                        <button
                            type="button"
                            className="table-link-title"
                            onClick={() => setSelectedDraft(draft)}
                        >
                            {draft.title}
                        </button>,

                        draft.draftType,
                        draft.createdAt,
                        draft.status,

                        draft.status === "임시저장" ? (
                            <div className="draft-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingDraft(draft);
                                        navigate("/main/mytesk/draft-create");
                                    }}
                                >
                                    이어서 작성
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(draft.id)}
                                >
                                    삭제
                                </button>
                            </div>
                        ) : draft.status === "결재대기" ? (<button onClick={() => CancelReq(draft.id)}>요청취소</button>) : null
                    ]
                }))}

                itemsPerPage={5}
            />

        {selectedDraft && (
            <ModalBase
                title="기안서 상세내용"
                onClose={() => setSelectedDraft(null)}
                layout={
                    <div className="draft-box">
                        <div className="draft-item">
                            <h3 className="draft-item-title">
                                {selectedDraft.title}
                            </h3>

                            <p>문서 종류 : {selectedDraft.draftType}</p>
                            <p>작성일 : {selectedDraft.createdAt}</p>
                            <p>상태 : {selectedDraft.status}</p>
                            <hr />
                            <h4>기안 내용</h4>
                            <p>
                                {selectedDraft.content || "등록된 내용이 없습니다."}
                            </p>
                        </div>
                    </div>
                }
            />
        )}
        </div>
    );
}

export default DraftReq;
