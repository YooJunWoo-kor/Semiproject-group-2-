import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Nav from "../../../components/Nav.js";
import { CommunityDashboard } from "./CommunityDashboard.js";
import BoardPage from "./pages/BoardPage.js";
import { getCommunityBoards } from "../../../utils/communityApi";

function CommunityHome() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect 바깥으로 꺼내서 JSX에서도 호출할 수 있도록 변경
  const fetchBoards = async () => {
    try {
      const data = await getCommunityBoards();
      if (Array.isArray(data)) {
        setBoards(data);
      }
    } catch (error) {
      console.error("게시판 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  // 첫 번째 고정 메뉴(통합게시판) + DB에서 불러온 게시판 목록을 map으로 자동 생성
  const menuItems = [
    { name: "통합게시판", url: "/main/community" },
    ...boards.map((board) => ({
      name: board.board_name,
      url: `/main/community${board.front_path || board.api_path}`,
    })),
  ];

  return (
    <div className="sub-main-contain">
      <Nav urlist={menuItems} title={"커뮤니티"} />
      {loading ? (
        <div className="border-container">
          <p className="no-data">게시판 정보를 불러오는 중입니다...</p>
        </div>
      ) : (
        <Routes>
          <Route
            index
            element={
              <CommunityDashboard
                boards={boards}
                onRefreshBoards={fetchBoards}
              />
            }
          />
          <Route path=":boardSlug" element={<BoardPage boards={boards} />} />
        </Routes>
      )}
    </div>
  );
}

export default CommunityHome;