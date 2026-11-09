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
import { API_BASE_URL, getEmployeeAccounts, getLoginUser } from "../../../utils/authStorage";
import DraftDashboard from "./pages/DraftDashboard";



function toDraft(draft, loginUser) {
    // MySQL의 JSON 필드는 문자열이나 객체로 전달될 수 있다.
    const detailData = typeof draft.detail_data === "string"
        ? JSON.parse(draft.detail_data)
        : (draft.detail_data || {});
    const statuses = {
        DRAFT: "임시저장",
        PENDING: "결재대기",
        APPROVED: "최종승인",
        REJECTED: "반려",
    };
    return {
        id: draft.draft_id,
        title: draft.title,
        draftType: draft.document_type,
        content: draft.content || "",
        detailData,
        status: statuses[draft.status] || draft.status,
        createdAt: draft.created_at ? new Date(draft.created_at).toLocaleString("ko-KR") : "",
        writerEmployeeKey: draft.employee_id,
        writerName: draft.writer_name || (draft.employee_id === loginUser?.employeeKey ? loginUser.name : ""),
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
    const employeeId = getLoginUser()?.employeeKey;
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
            const currentUser = getLoginUser();
            const [mine, received, approved] = await Promise.all([
                axios.get(`${API_BASE_URL}/drafts`, { params }),
                axios.get(`${API_BASE_URL}/drafts/received/list`, { params }),
                axios.get(`${API_BASE_URL}/drafts/approved/list`, { params })
            ]); // 서버에 get 요청 3개를 한꺼번에 보내고 모든걸로 부터 응답이 오면 밑 코드를 실행
            setDrafts(mine.data.map(row => toDraft(row, currentUser)));
            setReceivedDrafts(received.data.map(row => toDraft(row, currentUser)));
            setApprovedDrafts(approved.data.map(row => toDraft(row, currentUser)));
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
        {name : "전자결재 대시보드", url: mainUrl + "/draft-dashboard"},
        { name: "기안 작성", url: mainUrl + "/draft-create" },
        { name: "내 결재 요청", url: mainUrl + "/draft-request" },
        { name: "결재할 문서", url: mainUrl + "/draft-received" },
        { name: "결재 완료", url: mainUrl + "/draft-approved" }
    ];

    return (
        <div className="sub-main-contain">
            <Nav urlist={urlList} title={'내업무 관리'}/>
            <div className="border-container">
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
                            setDrafts={setDrafts}
                            editingDraft={editingDraft}
                            setEditingDraft={setEditingDraft}
                            onDraftChanged={loadDrafts}
                        />
                    } />
                    <Route path="draft-complete" element={<DraftComp drafts={drafts} />} />
                    <Route path="draft-request" element={
                        <DraftReq drafts={drafts} setEditingDraft={setEditingDraft} onDraftChanged={loadDrafts} />
                    } />
                    <Route path="draft-received" element={
                        <DraftReceived drafts={receivedDrafts} onDraftChanged={loadDrafts} />
                    } />
                    <Route path="draft-approved" element={
                        <DraftApproved drafts={approvedDrafts} loginUser={loginUser} />
                    } />

                    <Route path="draft-dashboard" element = { <DraftDashboard drafts={drafts} receivedDrafts={receivedDrafts} approvedDrafts={approvedDrafts}/>}/>
                </Routes>
            </div>
        </div>
    );
}

export default MyTeskList;
