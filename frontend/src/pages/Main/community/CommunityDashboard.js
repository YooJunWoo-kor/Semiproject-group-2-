// [수정] 샘플 데이터 대신 통합 DB 게시글을 조회합니다.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StatisticsCard from "../../../components/StatisticsCard.js";
import BasicTable from "../../../components/BasicTable.js";

// [추가] 통합게시판 조회 API
import { getCommunityPosts } from "../../../utils/communityApi";

export function CommunityDashboard() {
    // ===== [추가] DB 목록과 조회 상태 =====
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const fetchPosts = async () => {
            try {
                const rows = await getCommunityPosts();

                if (!Array.isArray(rows)) {
                    throw new Error("게시글 목록 형식이 올바르지 않습니다.");
                }

                if (active) {
                    setItems(rows);
                }
            } catch (error) {
                console.error("통합게시판 조회 실패:", error);

                if (active) {
                    setError("통합게시판 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchPosts();

        return () => {
            active = false;
        };
    }, []);

    // ===== [수정] 게시판 번호로 목록 구분 =====
    // 1: 자유게시판 / 2: 공지사항 / 3: 업무자료실
    // 4: Q&A / 5: 개선 건의
    const freePosts = items.filter(
        item => String(item.board_type) === "1"
    );

    const notices = items.filter(
        item => String(item.board_type) === "2"
    );

    const resources = items.filter(
        item => String(item.board_type) === "3"
    );

    const questions = items.filter(
        item => String(item.board_type) === "4"
    );

    const suggestions = items.filter(
        item => String(item.board_type) === "5"
    );

    // [추가] 날짜 표시
    const formatDate = value => {
        if (!value) return "-";

        return new Date(value).toLocaleDateString("sv-SE", {
            timeZone: "Asia/Seoul"
        });
    };

    // ===== [수정] 실제 DB 게시글 수 표시 =====
    // 답변·검토 상태는 현재 DB에서 관리하지 않으므로 전체 글 수입니다.
    const boardStatus = [
        {
            title: "공지사항",
            count: notices.length,
            url: "/main/community/notice"
        },
        {
            title: "자유게시판",
            count: freePosts.length,
            url: "/main/community/free"
        },
        {
            title: "업무자료실",
            count: resources.length,
            url: "/main/community/tech"
        },
        {
            title: "Q&A",
            count: questions.length,
            url: "/main/community/qa"
        },
        {
            title: "개선 건의",
            count: suggestions.length,
            url: "/main/community/suggestion"
        }
    ];

    // ===== [추가] 최신 글 목록을 표 형식으로 변환 =====
    // API가 최신순으로 반환한 목록 중 5개만 표시합니다.
    // 표시 번호와 실제 DB의 post_id는 별도로 사용합니다.
    const makeTableData = (posts, boardPath, showCategory = false) => {
        return posts.slice(0, 5).map((item, index) => {
            const cells = [
                posts.length - index
            ];

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

            return {
                content: cells
            };
        });
    };

    // ===== [수정] DB 컬럼을 사용하는 최신 글 표 =====
    const freeHeaders = [
        "번호",
        "제목",
        "작성자",
        "작성일",
        "댓글수"
    ];

    const categoryHeaders = [
        "번호",
        "분류",
        "제목",
        "작성자",
        "작성일",
        "댓글수"
    ];

    const freeBoardData = makeTableData(
        freePosts,
        "/main/community/free"
    );

    const techData = makeTableData(
        resources,
        "/main/community/tech",
        true
    );

    const qaData = makeTableData(
        questions,
        "/main/community/qa",
        true
    );

    const suggestionData = makeTableData(
        suggestions,
        "/main/community/suggestion",
        true
    );

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">
                    통합게시판 대시보드
                </span>

                <span className="subtext">
                    게시판별 현황과 최신 게시글을 확인하세요.
                </span>
            </header>

            {/* ===== [추가] 조회 중·오류 안내 ===== */}
            {loading && (
                <p className="no-data">
                    통합게시판 목록을 불러오는 중입니다.
                </p>
            )}

            {error && (
                <p role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && (
                <>
                    {/* ===== [수정] 게시판별 실제 글 수 ===== */}
                    <section className="stats-section">
                        {boardStatus.map(board => (
                            <Link
                                key={board.title}
                                to={board.url}
                                style={{
                                    textDecoration: "none",
                                    color: "inherit"
                                }}
                            >
                                <StatisticsCard
                                    title={board.title}
                                    count={board.count}
                                    stiyle={0}
                                />
                            </Link>
                        ))}
                    </section>

                    <hr />

                    {/* 자유게시판·업무자료실 최신 글 */}
                    <section className="stats-section">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <BasicTable
                                title="최신 자유게시판"
                                th={freeHeaders}
                                td={freeBoardData}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <BasicTable
                                title="최신 업무자료실"
                                th={categoryHeaders}
                                td={techData}
                            />
                        </div>
                    </section>

                    {/* Q&A·개선 건의 최신 글 */}
                    <section
                        className="stats-section"
                        style={{ marginTop: "16px" }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <BasicTable
                                title="최신 Q&A"
                                th={categoryHeaders}
                                td={qaData}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <BasicTable
                                title="최신 개선 건의"
                                th={categoryHeaders}
                                td={suggestionData}
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}