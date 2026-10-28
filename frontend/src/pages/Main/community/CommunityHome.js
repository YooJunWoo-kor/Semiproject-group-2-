import React, { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import NoticePage from "./pages/NoticePage.js";
import FreeBoardPage from "./pages/FreeBoardPage.js";
import QnAPage from "./pages/QnAPage.js";
import SuggestionPage from "./pages/SuggestionPage.js";
import TechLibraryPage from "./pages/TechLibraryPage.js";
import useCommunityItems from "./pages/useCommunityItems.js";
import StatisticsCard from "../../../components/StatisticsCard.js";
import Nav from "../../../components/Nav.js";
import "./Community.css";

const menuItems = [
  { name: "통합게시판", url: "/main/community" },
  { name: "공지사항", url: "/main/community/notice" },
  { name: "자유게시판", url: "/main/community/free" },
  { name: "업무자료실", url: "/main/community/tech" },
  { name: "Q&A", url: "/main/community/qa" },
  { name: "개선 건의", url: "/main/community/suggestion" },
];

const boardUrls = {
  notices: "/main/community/notice",
  freePosts: "/main/community/free",
  resources: "/main/community/tech",
  questions: "/main/community/qa",
  suggestions: "/main/community/suggestion",
};

function getLatestItems(items) {
  return [...items]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 3);
}

function BoardPreview({ title, url, items, getMeta }) {
  return (
    <section className="community-preview-card">
      <div className="community-section-heading">
        <h2>{title}</h2>
        <Link className="community-view-all" to={url}>전체 보기</Link>
      </div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link className="community-post-link" to={url} state={{ selectedItemId: item.id }}>
                {item.title}
              </Link>
              <small>{getMeta(item)}</small>
            </li>
          ))}
        </ul>
      ) : <p className="community-empty-message">등록된 글이 없습니다.</p>}
    </section>
  );
}

function CommunityDashboard({ notices, freePosts, resources, questions, suggestions }) {
  const [selectedNotice, setSelectedNotice] = useState(null);
  const importantNotices = notices.filter((item) => item.important === true).slice(0, 2);
  const latestFreePosts = getLatestItems(freePosts);
  const latestResources = getLatestItems(resources);
  const latestQuestions = getLatestItems(questions);
  const latestSuggestions = getLatestItems(suggestions);
  const unansweredCount = questions.filter((item) => item.status === "답변 대기").length;
  const reviewingCount = suggestions.filter((item) => item.status === "검토 중").length;
  const boardStatus = [
    {
      title: "공지사항",
      count: notices.length,
      url: "/main/community/notice",
    },
    {
      title: "자유게시판",
      count: freePosts.length,
      url: "/main/community/free",
    },
    {
      title: "업무자료실",
      count: resources.length,
      url: "/main/community/tech",
    },
    {
      title: "Q&A 미답변",
      count: unansweredCount,
      url: "/main/community/qa",
    },
    {
      title: "개선 건의 검토 중",
      count: reviewingCount,
      url: "/main/community/suggestion",
    },
  ];

  return (
    <main className="community-page">
      <header className="community-header">
        <h1>통합게시판</h1>
        <p>커뮤니티 주요 현황과 최신 글을 확인하세요.</p>
      </header>

      <div className="community-summary-stack">
        <section className="board-status-section">
          <h2>게시판 현황</h2>
          <div className="board-status-list">
            {boardStatus.map((board) => (
              <Link className="board-status-card" key={board.title} to={board.url}>
                <StatisticsCard title={board.title} count={board.count} stiyle={0} />
              </Link>
            ))}
          </div>
        </section>

        <section className="important-notice-section">
          <div className="community-section-heading">
            <h2>중요 공지</h2>
            <Link className="community-view-all" to={boardUrls.notices}>전체 보기</Link>
          </div>
          {importantNotices.length ? (
            <ul>
              {importantNotices.map((item) => (
                <li key={item.id}>
                  <button className="important-notice-title" type="button" onClick={() => setSelectedNotice(item)}>{item.title}</button>
                  <small>{item.createdAt || "-"}</small>
                </li>
              ))}
            </ul>
          ) : <p className="community-empty-message">등록된 글이 없습니다.</p>}
          {selectedNotice ? (
            <article className="important-notice-detail">
              <h3>{selectedNotice.title}</h3>
              <p>{selectedNotice.author || "작성자 없음"} · {selectedNotice.createdAt || "-"}</p>
              <p>{selectedNotice.content}</p>
              <button className="notice-close-button" type="button" onClick={() => setSelectedNotice(null)}>닫기</button>
            </article>
          ) : null}
        </section>
      </div>

      <div className="community-board-grid">
        <BoardPreview title="자유게시판" url={boardUrls.freePosts} items={latestFreePosts} getMeta={(item) => `${item.createdAt || "-"}${(item.comments || []).length ? ` · 댓글 ${(item.comments || []).length}` : ""}`} />
        <BoardPreview title="업무자료실" url={boardUrls.resources} items={latestResources} getMeta={(item) => `${item.category || "기타"} · ${item.createdAt || "-"}`} />
        <BoardPreview title="Q&A" url={boardUrls.questions} items={latestQuestions} getMeta={(item) => `${item.createdAt || "-"} · ${item.status || "답변 대기"}`} />
        <BoardPreview title="개선 건의" url={boardUrls.suggestions} items={latestSuggestions} getMeta={(item) => `${item.createdAt || "-"} · ${item.status || "접수"}`} />
      </div>
    </main>
  );
}

function CommunityHome() {
  const noticeItems = useCommunityItems("notices");
  const freePostItems = useCommunityItems("free-posts");
  const resourceItems = useCommunityItems("resources");
  const questionItems = useCommunityItems("questions");
  const suggestionItems = useCommunityItems("suggestions");

  return (
    <div className="sub-main-contain community-layout">
      <Nav urlist={menuItems} />

      <div className="content-area community-content">
        <Routes>
          <Route index element={<CommunityDashboard notices={noticeItems.items} freePosts={freePostItems.items} resources={resourceItems.items} questions={questionItems.items} suggestions={suggestionItems.items} />} />
          <Route path="notice" element={<NoticePage communityItems={noticeItems} />} />
          <Route path="free" element={<FreeBoardPage communityItems={freePostItems} />} />
          <Route path="tech" element={<TechLibraryPage communityItems={resourceItems} />} />
          <Route path="qa" element={<QnAPage communityItems={questionItems} />} />
          <Route path="suggestion" element={<SuggestionPage communityItems={suggestionItems} />} />
          <Route path="*" element={<CommunityDashboard notices={noticeItems.items} freePosts={freePostItems.items} resources={resourceItems.items} questions={questionItems.items} suggestions={suggestionItems.items} />} />
        </Routes>
      </div>
    </div>
  );
}

export default CommunityHome;
