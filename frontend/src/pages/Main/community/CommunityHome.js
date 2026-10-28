import React from "react";
import { Link, Route, Routes } from "react-router-dom";

import NoticePage from "./pages/NoticePage.js";
import FreeBoardPage from "./pages/FreeBoardPage.js";
import QnAPage from "./pages/QnAPage.js";
import SuggestionPage from "./pages/SuggestionPage.js";
import TechLibraryPage from "./pages/TechLibraryPage.js";
import Nav from "../../../components/Nav";

function CommunityHome() {
  let mainUrl = "/main/community/"
    const urlList = [
        {name:"통합게시판", url:mainUrl+"/*"}
        ,{name:"공지사항", url:mainUrl+"/notice"}
        ,{name:"자유게시판 관리", url:mainUrl+"/free"}
        ,{name:"업무 자료실", url:mainUrl+"/tech"}
        ,{name:"Q&A", url:mainUrl+"/qa"}
        ,{name:"개선건의", url:mainUrl+"/suggestion"}
    ];

  return (
    <main className='sub-main-contain'>
      <Nav urlist={urlList}/>
      <Routes>
        {/* 임시로 커뮤니티메인링크 아무거나 걸어둠 */}
        <Route path="/*" element = {<TechLibraryPage />}/>
        <Route path="/notice" element = {<NoticePage />}/>
        <Route path="/free" element = {<FreeBoardPage />}/>
        <Route path="/tech" element = {<TechLibraryPage />}/>
        <Route path="/qa" element = {<QnAPage />}/>
        <Route path="/suggestion" element = {<SuggestionPage />}/>
      </Routes>
    </main>
  );
}

export default CommunityHome;
