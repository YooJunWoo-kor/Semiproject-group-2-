import React from "react";
import { Link } from "react-router-dom";

function CommunityHome() {
  const data = [
    {id : 1, number : 3, }
    ,{id : 1, number : 3, }
    ,{id : 1, number : 3, }
    ,{id : 1, number : 3, }
    ,{id : 1, number : 3, }
    ,{id : 1, number : 3, }
  ]

  const boards = [
    { path: "/main/community/notice", name: "공지사항", description: "생산, 출시, 품질·안전 및 사내 업무 공지" },
    { path: "/main/community/free", name: "자유게시판", description: "직원 간 업무 소통과 부서 협업 정보" },
    { path: "/main/community/tech", name: "업무 자료실", description: "연구·생산·품질·인허가 업무 자료" },
    { path: "/main/community/qa", name: "업무 질문·답변", description: "원료, 제조, 품질검사 및 인허가 질문" },
    { path: "/main/community/suggestion", name: "업무 개선 건의", description: "ERP, 업무 프로세스 및 시설·장비 개선" },
  ];

  return (
    <main className="community-home">
      <h1>사내 ERP 커뮤니티</h1>
      <p>화장품 제조·유통 업무 게시판을 선택해 주세요.</p>
      <ul className="board-grid">
        {boards.map((board) => (
          <li key={board.path} className="board-card">
            <h2><Link to={board.path}>{board.name}</Link></h2>
            <p>{board.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default CommunityHome;
