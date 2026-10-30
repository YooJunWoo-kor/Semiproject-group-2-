import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function DraftReq({ drafts, setDrafts, loginUser, setEditingDraft }) {

    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();


    const requestedDrafts = drafts.filter((draft) => {
        return (
            draft.writerEmployeeKey === loginUser.employeeKey &&
            draft.status !== "최종승인" &&
            draft.title.includes(searchText)
        );
    });

    function handleDelete(id) {
        setDrafts(
            drafts.filter((draft) => {
                return draft.id !== id;
            })
        );
    }


    return (
        <div>
            <h2>요청된 기안서 / 임시저장된 기안서</h2>
            <input type="text" placeholder="제목 검색" value={searchText} onChange={e => setSearchText(e.target.value)} />

            {requestedDrafts.length === 0 ? (
                <p>요청된 기안서가 없습니다.</p>
            ) : (
                requestedDrafts.map((draft, index) => {
                    return (

                        <div key={draft.id} className="draft-item">
                            <h3 className="draft-item-title">기안서 #{index + 1}</h3>
                
                                    <p>제목 : {draft.title}</p>
                                    <p>문서 종류 : {draft.draftType}</p>
                                    <p>내용 : {draft.content}</p>
                                    <p>작성일 : {draft.createdAt}</p>
                                    <p>
                                        상태 :
                                        {draft.status === "임시저장" ? (
                                            <span className="draft-temp-badge">
                                                [임시저장]
                                            </span>
                                        ) : (
                                            <span style={{ marginLeft: "8px" }}>
                                                {draft.status}
                                            </span>
                                        )}
                                    </p>

                                    {draft.status === "반려" && (
                                        <div>
                                            <p>반려자 : {draft.rejectedByName}</p>
                                            <p>반려 사유 : {draft.rejectionReason}</p>
                                            <p>반려일 : {draft.rejectedAt} </p>
                                        </div>
                                    )}

                                    {draft.status === "임시저장" && (

                                        <div  className="draft-actions">
                                            <button type="button" onClick={() => {
                                                setEditingDraft(draft);
                                                navigate("/main/mytesk/draft-create");
                                            }}
                                            >
                                                이어서 작성
                                            </button>

                                            <button type="button" onClick={() => handleDelete(draft.id)}>
                                                삭제
                                            </button>
                                        </div>
                                    )}
                            </div>
                        );
                    })
                )}
    
            </div>
        );
    }

export default DraftReq;