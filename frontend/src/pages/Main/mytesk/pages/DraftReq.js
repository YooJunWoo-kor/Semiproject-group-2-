import React, { useState } from "react";
import { Navigate } from "react-router-dom";

function DraftReq({ drafts, setDrafts, loginUser, setEditingDraft }) {

    const [editId, setEditId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editDraftType, setEditDraftType] = useState("");
    const [searchText, setsearchText] = useState("");

    function handleEdit(draft) {
        setEditId(draft.id);
        setEditTitle(draft.title);
        setEditContent(draft.content);
        setEditDraftType(draft.draftType);
    }


    const requestedDrafts = drafts.filter((draft) => {
        return (
            draft.writerEmployeeKey === loginUser.employeeKey &&
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


    function handleCancel() {
        setEditId(null);
        setEditTitle("");
        setEditContent("");
        setEditDraftType("");
    }



    function handleSave(id) {

        if (editTitle.trim() === "" || editContent.trim() === "") {
            alert("제목과 내용을 입력해주세요");
            return;
        }

        const updatedDrafts = drafts.map((draft) => {
            if (draft.id === id) {
                return {
                    ...draft,
                    title: editTitle,
                    content: editContent,
                    draftType: editDraftType
                }
            }


            return draft;
        });

        setDrafts(updatedDrafts);

        setEditId(null);
        setEditTitle("");
        setEditContent("");
        setEditDraftType("");
    }

    return (
        <div>
            <h2>요청된 기안서 / 임시저장된 기안서</h2>
            <input type="text" placeholder="제목 검색" value={searchText} onChange={e => setsearchText(e.target.value)} />

            {requestedDrafts.length === 0 ? (
                <p>요청된 기안서가 없습니다.</p>
            ) : (
                requestedDrafts.map((draft, index) => {
                    return (

                        <div key={draft.id} className="draft-item">
                            <h3 className="draft-item-title">기안서 #{index + 1}</h3>

                            {editId === draft.id ? (
                                <div>
                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} />

                                    <select value={editDraftType} onChange={e => setEditDraftType(e.target.value)}>
                                        <option>일반</option>
                                        <option>휴가</option>
                                        <option>구매</option>
                                        <option>비용</option>

                                    </select>

                                    <button type="button" onClick={() => handleSave(draft.id)}>
                                        저장
                                    </button>

                                    <button type="button" onClick={handleCancel}>
                                        취소
                                    </button>
                                </div>
                            ) : (

                                <div>
                                    {draft.approvers.map((approver, index) => (

                                        <p key={approver.employeeKey}>
                                            {index + 1}단계 결재자 :
                                            {approver.position} {approver.name}

                                            {draft.status === "최종승인" ? "- 승인완료" : index < draft.currentApprovalStep ? " - 승인완료" : index === draft.currentApprovalStep ? "- 결재대기" : " - 대기"}

                                        </p>
                                    ))}

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

                                    {draft.status === "임시저장" && (

                                        <div>
                                            <button type="button" onClick={() => {
                                                setEditingDraft(draft);
                                                Navigate("/main/mytesk/draft-create");
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
                            )}

                        </div>
                    );
                })
            )}

        </div>
    );
}

export default DraftReq;