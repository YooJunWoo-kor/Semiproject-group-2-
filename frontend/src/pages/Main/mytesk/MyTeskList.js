import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import axios from "axios";

import Nav from "../../../components/Nav";
import ADComp from "../../../components/ADComp";

import DraftCreate from "./pages/DraftCreate";
import DraftReq from "./pages/DraftReq";
import DraftComp from "./pages/DraftComp";
import DraftReceived from "./pages/DraftReceived";
import DraftApproved from "./pages/DraftApproved";

function MyTeskList() {

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api";

    useEffect(() => {
        async function loadDrafts() {
            const employeeId = loginUser?.employee_id;
    
            if (!Number.isSafeInteger(employeeId)) {
                return;
            }
    
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/drafts`,
                    {
                        params: {
                            employeeId: employeeId
                        }
                    }
                );
    
                const dbDrafts = response.data.map(draft => ({
                    id: draft.draft_id,
                    title: draft.title,
                    draftType: draft.document_type,
                    content: draft.content,
                    status: draft.status === "DRAFT" ? "임시저장" : draft.status === "PENDING" ? "결재대기" : draft.status,
                    createdAt: draft.created_at,
                    writerEmployeeKey: loginUser.employeeKey,
                    writerName: loginUser.name,
                    approvers: []
                }));
    
                setDrafts(dbDrafts);
    
            } catch (error) {
                console.error("기안서 목록 조회 오류:", error);
            }
        }
    
        loadDrafts();
    }, [loginUser?.employee_id]);


    const urlList = [
        { name: "출결관리", url: mainUrl },
        { name : "결재 대시보드", url : mainUrl + "/approval-dashboard"},
        { name: "기안 작성", url: mainUrl + "/draft-create" },
        { name: "내 결재 요청", url: mainUrl + "/draft-request" },
        { name: "결재할 문서", url: mainUrl + "/draft-received" },
        { name: "결재 완료", url: mainUrl + "/draft-approved" }
    ];

    useEffect(() => {
        localStorage.setItem("drafts", JSON.stringify(drafts)); // setItem은 localStorage에 값을 저장하는 함수
        // JSON.stringify로 배열 + 객체를 localStorage가 저장가능한 문자열 형태로 바꾼다
    }, [drafts]);

    return (
        <div className="sub-main-contain">
            <Nav urlist={urlList} />

            <div className="sub-container">
                <Routes>
                    <Route index element={
                        <div>
                            <h2>출결관리</h2>
                            <ADComp />
                        </div>
                    } />

                    <Route path="draft-create" element={<DraftCreate employees={employees} loginUser={loginUser} drafts={drafts} setDrafts={setDrafts} setEditingDraft={setEditingDraft} editingDraft={editingDraft}/> } />

                    <Route path="draft-complete" element={<DraftComp drafts={drafts} />} />

                    <Route path="draft-request" element={<DraftReq drafts={drafts} setDrafts={setDrafts} loginUser = {loginUser} setEditingDraft = {setEditingDraft} />} />

                    <Route path="draft-received" element={<DraftReceived
                        drafts={drafts} setDrafts={setDrafts} loginUser={loginUser}
                    />} />

                    <Route path="draft-approved" element={<DraftApproved drafts={drafts} loginUser={loginUser}/>
                    
                }
                    />

                </Routes>

                console.log(employees);
            </div>
        </div>
    )
}

export default MyTeskList;