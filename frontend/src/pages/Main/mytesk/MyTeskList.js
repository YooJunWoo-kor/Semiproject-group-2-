import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import Nav from "../../../components/Nav";
import ADComp from "../../../components/ADComp";

import DraftCreate from "./pages/DraftCreate";
import DraftReq from "./pages/DraftReq";
import DraftComp from "./pages/DraftComp";
import DraftReceived from "./pages/DraftReceived";
import DraftApproved from "./pages/DraftApproved";

function MyTeskList() {

    const loginUser = {
        id: 101,
        name: "홍길동",
        department: "개발팀",
        position: "사원"
    };

    const mainUrl = "/main/mytesk";
    const [drafts, setDrafts] = useState(() => {
        const savedDrafts = localStorage.getItem("drafts");

        if (savedDrafts) {
            return JSON.parse(savedDrafts);
        }

        return [];
    });


    const urlList = [
        { name: "출결관리", url: mainUrl },
        { name: "기안서 작성", url: mainUrl + "/draft-create" },
        { name: "요청된 기안서", url: mainUrl + "/draft-request" },
        { name: "완료된 기안서", url: mainUrl + "/draft-complete" },
        { name: "요청이 온 기안서", url: mainUrl + "/draft-received" },
        { name: "승인한 기안서", url: mainUrl + "/draft-approved" }
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

                    <Route path="draft-create" element={<DraftCreate drafts={drafts} setDrafts={setDrafts} loginUser={loginUser} />} />

                    <Route path="draft-complete" element={<DraftComp drafts={drafts} />} />

                    <Route path="draft-request" element={<DraftReq drafts={drafts} setDrafts={setDrafts} />} />

                    <Route path="draft-received" element={<DraftReceived
                        drafts={drafts} setDrafts={setDrafts} loginUser={loginUser}
                    />} />

                    <Route path="draft-approved" element={<DraftApproved drafts={drafts} loginUser={loginUser}/>
                    
                }
                    />

                </Routes>
            </div>
        </div>
    )
}

export default MyTeskList;