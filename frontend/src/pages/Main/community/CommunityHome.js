import React from "react";
import { Route, Routes } from "react-router-dom";
import NoticePage from "./pages/NoticePage.js";
import FreeBoardPage from "./pages/FreeBoardPage.js";
import QnAPage from "./pages/QnAPage.js";
import SuggestionPage from "./pages/SuggestionPage.js";
import TechLibraryPage from "./pages/TechLibraryPage.js";
import Nav from "../../../components/Nav.js";
import { CommunityDashboard } from "./CommunityDashboard.js";

const menuItems = [
  { name: "통합게시판", url: "/main/community" },
  { name: "공지사항", url: "/main/community/notice" },
  { name: "자유게시판", url: "/main/community/free" },
  { name: "업무자료실", url: "/main/community/tech" },
  { name: "Q&A", url: "/main/community/qa" },
  { name: "개선 건의", url: "/main/community/suggestion" },
];

function CommunityHome() {
  

  return (
    <div className="sub-main-contain">
      <Nav urlist={menuItems} title={'커뮤니티'}/>
      <Routes>
        <Route index element={<CommunityDashboard/>}/>
        <Route path="notice" element={<NoticePage />} />
        <Route path="free" element={<FreeBoardPage />} />
        <Route path="tech" element={<TechLibraryPage />} />
        <Route path="qa" element={<QnAPage />} />
        <Route path="suggestion" element={<SuggestionPage />} />
      </Routes>
    </div>
  );
}

export default CommunityHome;