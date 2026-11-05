import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import axios from "axios";

import Nav from "../../../components/Nav";
import ADComp from "../../../components/ADComp";
import DraftCreate from "./pages/DraftCreate";
import DraftReq from "./pages/DraftReq";
import DraftComp from "./pages/DraftComp";
import DraftReceived from "./pages/DraftReceived";
import DraftApproved from "./pages/DraftApproved";
import { getEmployeeAccounts, getLoginUser } from "../../../utils/authStorage";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api";

function toDraft(draft, loginUser) {
    const statuses = {
        DRAFT: "임시저장",
        PENDING: "결재대기",
        APPROVED: "최종승인",
        REJECTED: "반려"
    };
    return {
        id: draft.draft_id,
        title: draft.title,
        draftType: draft.document_type,
        content: draft.content || "",
        status: statuses[draft.status] || draft.status,
        createdAt: draft.created_at ? new Date(draft.created_at).toLocaleString("ko-KR") : "",
        writerEmployeeKey: draft.employee_id,
        writerName: draft.writer_name || (draft.employee_id === loginUser?.employee_id ? loginUser.name : ""),
        approvers: [],
        currentApprovalStep: 0
    };
}

function MyTeskList() {
    const [employees, setEmployees] = useState([]);
    const [editingDraft, setEditingDraft] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [receivedDrafts, setReceivedDrafts] = useState([]);
    const [approvedDrafts, setApprovedDrafts] = useState([]);
    const [draftError, setDraftError] = useState("");
    const loginUser = getLoginUser();
    const employeeId = loginUser?.employee_id;
    const mainUrl = "/main/mytesk";

    useEffect(() => {
        async function loadEmployees() {
            try {
                setEmployees(await getEmployeeAccounts());
            } catch (error) {
                console.error("직원 목록 조회 오류:", error);
            }
        }
        loadEmployees();
    }, []);

    const loadDrafts = useCallback(async () => {
        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) return;
        try {
            const params = { employeeId };
            const [mine, received, approved] = await Promise.all([
                axios.get(`${API_BASE_URL}/drafts`, { params }),
                axios.get(`${API_BASE_URL}/drafts/received/list`, { params }),
                axios.get(`${API_BASE_URL}/drafts/approved/list`, { params })
            ]);
            setDrafts(mine.data.map(row => toDraft(row, loginUser)));
            setReceivedDrafts(received.data.map(row => toDraft(row, loginUser)));
            setApprovedDrafts(approved.data.map(row => toDraft(row, loginUser)));
            setDraftError("");
        } catch (error) {
            console.error("기안서 목록 조회 오류:", error);
            setDraftError("기안서 목록을 불러오지 못했습니다. 서버 연결 상태를 확인해주세요.");
        }
    }, [employeeId]);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    const urlList = [
        { name: "출결관리", url: mainUrl },
        { name: "결재 대시보드", url: mainUrl + "/approval-dashboard" },
        { name: "기안 작성", url: mainUrl + "/draft-create" },
        { name: "내 결재 요청", url: mainUrl + "/draft-request" },
        { name: "결재할 문서", url: mainUrl + "/draft-received" },
        { name: "결재 완료", url: mainUrl + "/draft-approved" }
    ];

    return (
        <div className="sub-main-contain">
            <Nav urlist={urlList} />
            <div className="sub-container">
                {draftError && <p role="alert">{draftError}</p>}
                <Routes>
                    <Route index element={
                        <div>
                            <h2>출결관리</h2>
                            <ADComp />
                        </div>
                    } />
                    <Route path="draft-create" element={
                        <DraftCreate
                            employees={employees}
                            loginUser={loginUser}
                            drafts={drafts}
                            setDrafts={setDrafts}
                            editingDraft={editingDraft}
                            setEditingDraft={setEditingDraft}
                            onDraftChanged={loadDrafts}
                        />
                    } />
                    <Route path="draft-complete" element={<DraftComp drafts={drafts} />} />
                    <Route path="draft-request" element={
                        <DraftReq drafts={drafts} loginUser={loginUser}
                            setEditingDraft={setEditingDraft} onDraftChanged={loadDrafts} />
                    } />
                    <Route path="draft-received" element={
                        <DraftReceived drafts={receivedDrafts} loginUser={loginUser}
                            onDraftChanged={loadDrafts} />
                    } />
                    <Route path="draft-approved" element={
                        <DraftApproved drafts={approvedDrafts} loginUser={loginUser} />
                    } />
                </Routes>
            </div>
        </div>
    );
}

export default MyTeskList;
