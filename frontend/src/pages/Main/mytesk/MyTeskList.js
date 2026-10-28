import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";

import Nav from "../../../components/Nav";
import ADComp from "../../../components/ADComp";

import DraftCreate from "./pages/DraftCreate";
import DraftReq from "./pages/DraftReq";

function MyTeskList() {
    const mainUrl = "/main/mytesk";
    const [drafts, setDrafts] = useState([]);

    const urlList = [
        { name: "출결관리", url: mainUrl},
        { name: "기안서 작성", url: mainUrl + "/draft-create"}
    ];

    return (
        <div className="sub-main-contain">
            <Nav urlist={urlList}/>

            <div className="sub-container">
                <Routes>
                    <Route index element = {
                        <div>
                            <h2>출결관리</h2>
                            <ADComp/>
                        </div>
                    }/>

                    <Route path="draft-create" element={<DraftCreate drafts={drafts} setDrafts={setDrafts}/>}/>

                    <Route path="draft-request" element={<DraftReq drafts={drafts}/>}/>
                </Routes>
            </div>
        </div>
    )
}

export default MyTeskList;