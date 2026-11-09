import React from "react";
import StatisticsCard from "../../../components/StatisticsCard.js";
import BasicTable from "../../../components/BasicTable.js";
import { Link } from "react-router-dom";
import useCommunityItems from "./pages/useCommunityItems.js";

export function CommunityDashboard() {
    const notices = useCommunityItems("notices");
    const freePosts = useCommunityItems("free-posts");
    const resources = useCommunityItems("resources");
    const questions = useCommunityItems("questions");
    const suggestions = useCommunityItems("suggestions");

    const unansweredCount = questions.items.filter((item) => item.status === "답변 대기").length;
    const reviewingCount = suggestions.items.filter((item) => item.status === "검토 중").length;

  
    // 상단 현황 카드 데이터
    const boardStatus = [
      { title: "공지사항", count: notices.length, url: "/main/community/notice" },
      { title: "자유게시판", count: freePosts.items.length, url: "/main/community/free" },
      { title: "업무자료실", count: resources.length, url: "/main/community/tech" },
      { title: "Q&A 미답변", count: unansweredCount, url: "/main/community/qa" },
      { title: "건의 검토중", count: reviewingCount, url: "/main/community/suggestion" },
    ];
  
    // 1. 자유게시판 최신글 -> BasicTable 데이터 포맷({ content: [...] }) 변환
    const freeBoardHeaders = ["제목", "작성자", "작성일", "댓글"];
    const freeBoardData = freePosts.items.slice(0, 5).map((item) => ({
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
    const techData = resources.items.slice(0, 5).map((item) => ({
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
    const qaData = questions.items.slice(0, 5).map((item) => ({
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
    const suggestionData = suggestions.items.slice(0, 5).map((item) => ({
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
      <div className="border-container">
        {/* 대시보드 헤더 */}
        <header className="dashboard-header">
          <span className="subtitle">통합게시판 대시보드</span>
          <span className="subtext">사내 주요 공지 및 최신 게시글 현황을 확인하세요.</span>
        </header>
  
        {/* 1. 상단 통계 카드 구역 (재무 모듈 동일) */}
        <section className="stats-section">
          {boardStatus.map((board) => (
            <Link
              key={board.title}
              to={board.url}
              style={{ textDecoration: "none", color: "inherit" }}>
              <StatisticsCard title={board.title} count={board.count} stiyle={0} />
            </Link>
          ))}
        </section>
  
        <hr />
  
        {/* 2. 메인 대시보드 섹션 1 (좌측: 전사 공지/일정 보드 + 우측: 최신 자유게시판/업무자료실 테이블 2단) */}
        <section className="stats-section">
          <div style={{ flex: 1, minWidth: 0 }}>
            <BasicTable title="최신 자유게시판" th={freeBoardHeaders} td={freeBoardData} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
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