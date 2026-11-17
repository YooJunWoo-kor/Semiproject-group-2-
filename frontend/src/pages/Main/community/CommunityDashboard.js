import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StatisticsCard from "../../../components/StatisticsCard.js";
import BasicTable from "../../../components/BasicTable.js";
import ModalBase from "../../../components/ModalBase";
import SetNewBoardLayout from "./pages/SetNewBoardLayout";

import { getCommunityBoards, getCommunityPosts } from "../../../utils/communityApi";

export function CommunityDashboard({ onRefreshBoards }) {
    const [boards, setBoards] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const fetchDashboardData = async () => {
            try {
                // 게시판 목록과 전체 게시글을 병렬로 동시 조회
                const [boardRows, postRows] = await Promise.all([
                    getCommunityBoards(),
                    getCommunityPosts()
                ]);

                if (!Array.isArray(boardRows) || !Array.isArray(postRows)) {
                    throw new Error("데이터 형식이 올바르지 않습니다.");
                }

                if (active) {
                    setBoards(boardRows);
                    setItems(postRows);
                }
            } catch (err) {
                console.error("통합게시판 조회 실패:", err);
                if (active) {
                    setError("통합게시판 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            active = false;
        };
    }, []);

    const formatDate = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("sv-SE", {
            timeZone: "Asia/Seoul"
        });
    };

    // api_path('/free-posts' 등)를 프론트 라우트 경로('/main/community/free-posts' 등)로 변환
    // 만약 기존 URL(/free, /notice 등)을 유지하려면 DB에 front_path 컬럼을 두거나 그대로 api_path를 통일해 쓰면 깔끔합니다.
    const getBoardUrl = (board) => `/main/community${board.api_path}`;

    const makeTableData = (posts, boardPath, showCategory = false) => {
        return posts.slice(0, 5).map((item, index) => {
            const cells = [posts.length - index];

            if (showCategory) {
                cells.push(item.category || "-");
            }

            cells.push(
                <Link
                    key={`title-${item.post_id}`}
                    className="table-link-title"
                    to={`${boardPath}?postId=${item.post_id}`}
                >
                    {item.title}
                </Link>,
                item.employee_name || "작성자 미확인",
                formatDate(item.created_at),
                Number(item.comment_count ?? 0)
            );

            return { content: cells };
        });
    };

    const basicHeaders = ["번호", "제목", "작성자", "작성일", "댓글수"];
    const categoryHeaders = ["번호", "분류", "제목", "작성자", "작성일", "댓글수"];

    // 대시보드 하단 최신 글 테이블에 노출할 게시판 (예: 공지사항 제외 나머지 전부, 혹은 전체)
    // 나중에 게시판이 6번, 7번으로 늘어나도 자동으로 테이블이 추가됩니다!
    const tableBoards = boards.filter((b) => String(b.board_type) !== "2");

    //게시판 추가 모달
    const [isBoardModal, setIsBoardModal] = useState(false);
    const handleBoardCreated = () => {
        setIsBoardModal(false);
        if (onRefreshBoards) onRefreshBoards(); // 좌측 내비게이션 + 대시보드 즉시 갱신
    };

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">통합게시판 대시보드</span>
                <div className="dashboard-top">
                    <button
                    type="button"
                    className="register-btn"
                    onClick={() => setIsBoardModal(true)}
                    >
                    + 게시판 등록
                    </button>
                </div>
            </header>

            {loading && <p className="no-data">통합게시판 목록을 불러오는 중입니다.</p>}
            {error && <p role="alert">{error}</p>}

            {!loading && !error && (
                <>
                    {/* 1. 상단 통계 카드: DB에 있는 게시판 수만큼 자동 생성 */}
                    <section className="stats-section">
                        {boards.map((board) => {
                            const count = items.filter(
                                (item) => String(item.board_type) === String(board.board_type)
                            ).length;

                            return (
                                <Link
                                    key={board.board_type}
                                    to={getBoardUrl(board)}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                >
                                    <StatisticsCard
                                        title={board.board_name}
                                        count={count}
                                        stiyle={0}
                                    />
                                </Link>
                            );
                        })}
                    </section>

                    <hr />

                    {/* 2. 하단 최신 글 테이블: 2열 그리드로 자동 배치 */}
                    <section
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: "16px"
                        }}
                    >
                        {tableBoards.map((board) => {
                            const boardPosts = items.filter(
                                (item) => String(item.board_type) === String(board.board_type)
                            );
                            // default_category가 null이 아니면 '분류' 컬럼 표시
                            const hasCategory = board.default_category !== null;

                            return (
                                <div key={board.board_type} style={{ minWidth: 0 }}>
                                    <BasicTable
                                        title={`최신 ${board.board_name}`}
                                        th={hasCategory ? categoryHeaders : basicHeaders}
                                        td={makeTableData(
                                            boardPosts,
                                            getBoardUrl(board),
                                            hasCategory
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </section>
                </>
            )}
            {isBoardModal && (
                <ModalBase
                    title={"게시판 등록"}
                    onClose={() => setIsBoardModal(false)}
                    layout={
                    <SetNewBoardLayout
                        onSuccess={handleBoardCreated}
                        onClose={() => setIsBoardModal(false)}
                    />
                    }
                />
                )}
        </div>
    );
}