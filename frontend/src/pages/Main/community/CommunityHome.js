import React from "react";
import { Link, Route, Routes } from "react-router-dom";

import NoticePage from "./pages/NoticePage.js";
import FreeBoardPage from "./pages/FreeBoardPage.js";
import QnAPage from "./pages/QnAPage.js";
import SuggestionPage from "./pages/SuggestionPage.js";
import TechLibraryPage from "./pages/TechLibraryPage.js";
import useCommunityItems from "./pages/useCommunityItems.js";
import StatisticsCard from "../../../components/StatisticsCard.js";
import ScheduleBoard from "../../../components/ScheduleBoard.js";
import BasicTable from "../../../components/BasicTable.js";
import Nav from "../../../components/Nav.js";

const menuItems = [
  { name: "통합게시판", url: "/main/community" },
  { name: "공지사항", url: "/main/community/notice" },
  { name: "자유게시판", url: "/main/community/free" },
  { name: "업무자료실", url: "/main/community/tech" },
  { name: "Q&A", url: "/main/community/qa" },
  { name: "개선 건의", url: "/main/community/suggestion" },
];

function CommunityDashboard({ notices, freePosts, resources, questions, suggestions }) {
  const unansweredCount = questions.filter((item) => item.status === "답변 대기").length;
  const reviewingCount = suggestions.filter((item) => item.status === "검토 중").length;

  // 상단 현황 카드 데이터
  const boardStatus = [
    { title: "공지사항", count: notices.length, url: "/main/community/notice" },
    { title: "자유게시판", count: freePosts.length, url: "/main/community/free" },
    { title: "업무자료실", count: resources.length, url: "/main/community/tech" },
    { title: "Q&A 미답변", count: unansweredCount, url: "/main/community/qa" },
    { title: "건의 검토중", count: reviewingCount, url: "/main/community/suggestion" },
  ];

  // 1. 자유게시판 최신글 -> BasicTable 데이터 포맷({ content: [...] }) 변환
  const freeBoardHeaders = ["제목", "작성자", "작성일", "댓글"];
  const freeBoardData = freePosts.slice(0, 5).map((item) => ({
    content: [
      <Link
        className="table-link-title"
        to="/main/community/free"
        state={{ selectedItemId: item.id }}
      >
        {item.title}
      </Link>,
      item.author || "사용자",
      item.createdAt || "-",
      (item.comments || []).length,
    ],
  }));

  // 2. 업무자료실 최신글 -> BasicTable 데이터 포맷 변환
  const techHeaders = ["구분", "자료명", "작성자", "등록일"];
  const techData = resources.slice(0, 5).map((item) => ({
    content: [
      <span className="status-badge">{item.category || "기타"}</span>,
      <Link
        className="table-link-title"
        to="/main/community/tech"
        state={{ selectedItemId: item.id }}
      >
        {item.title}
      </Link>,
      item.author || "관리자",
      item.createdAt || "-",
    ],
  }));

  // 3. Q&A 최신글 -> BasicTable 데이터 포맷 변환
  const qaHeaders = ["상태", "질문 제목", "작성자", "등록일"];
  const qaData = questions.slice(0, 5).map((item) => ({
    content: [
      <span className={`status-badge ${item.status === "답변 완료" ? "status-success" : "status-danger"}`}>
        {item.status || "답변 대기"}
      </span>,
      <Link
        className="table-link-title"
        to="/main/community/qa"
        state={{ selectedItemId: item.id }}
      >
        {item.title}
      </Link>,
      item.author || "작성자",
      item.createdAt || "-",
    ],
  }));

  // 4. 개선 건의 최신글 -> BasicTable 데이터 포맷 변환
  const suggestionHeaders = ["상태", "건의 내용", "작성자", "등록일"];
  const suggestionData = suggestions.slice(0, 5).map((item) => ({
    content: [
      <span className={`status-badge ${item.status === "완료" ? "status-success" : ""}`}>
        {item.status || "접수"}
      </span>,
      <Link
        className="table-link-title"
        to="/main/community/suggestion"
        state={{ selectedItemId: item.id }}
      >
        {item.title}
      </Link>,
      item.author || "작성자",
      item.createdAt || "-",
    ],
  }));

  return (
    <div className="sub-container">
      {/* 대시보드 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">통합게시판 대시보드</span>
        <span className="subtext">사내 주요 공지 및 최신 게시글 현황을 확인하세요.</span>
      </header>

      {/* 1. 상단 통계 카드 구역 (재무 모듈 동일) */}
      <section className="stats-section">
        {boardStatus.map((board) => (
          <Link key={board.title} to={board.url} style={{ textDecoration: "none", color: "inherit" }}>
            <StatisticsCard title={board.title} count={board.count} stiyle={2} />
          </Link>
        ))}
      </section>

      <hr />

      {/* 2. 메인 대시보드 섹션 1 (좌측: 전사 공지/일정 보드 + 우측: 최신 자유게시판/업무자료실 테이블 2단) */}
      <section className="stats-section">
        <ScheduleBoard />
        <div style={{ display: "flex", flexFlow: "column", gap: "16px", flex: 1, minWidth: 0 }}>
          <BasicTable title="최신 자유게시판" th={freeBoardHeaders} td={freeBoardData} />
          <BasicTable title="최신 업무자료실" th={techHeaders} td={techData} />
        </div>
      </section>

      {/* 3. 하단 섹션 2 (좌우 2분할: Q&A 현황 + 사내 개선 건의 현황) */}
      <section className="stats-section" style={{ marginTop: "16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BasicTable title="Q&A 문의 현황" th={qaHeaders} td={qaData} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BasicTable title="사내 개선 건의 현황" th={suggestionHeaders} td={suggestionData} />
        </div>
      </section>
    </div>
  );
}

function CommunityHome() {
  const noticeItems = useCommunityItems("notices");
  const freePostItems = useCommunityItems("free-posts");
  const resourceItems = useCommunityItems("resources");
  const questionItems = useCommunityItems("questions");
  const suggestionItems = useCommunityItems("suggestions");

  return (
    <div className="sub-main-contain">
      <Nav urlist={menuItems} />
      <Routes>
        <Route
          index
          element={
            <CommunityDashboard
              notices={noticeItems.items}
              freePosts={freePostItems.items}
              resources={resourceItems.items}
              questions={questionItems.items}
              suggestions={suggestionItems.items}
            />
          }
        />
        <Route path="notice" element={<NoticePage communityItems={noticeItems} />} />
        <Route path="free" element={<FreeBoardPage communityItems={freePostItems} />} />
        <Route path="tech" element={<TechLibraryPage communityItems={resourceItems} />} />
        <Route path="qa" element={<QnAPage communityItems={questionItems} />} />
        <Route path="suggestion" element={<SuggestionPage communityItems={suggestionItems} />} />
        <Route
          path="*"
          element={
            <CommunityDashboard
              notices={noticeItems.items}
              freePosts={freePostItems.items}
              resources={resourceItems.items}
              questions={questionItems.items}
              suggestions={suggestionItems.items}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default CommunityHome;