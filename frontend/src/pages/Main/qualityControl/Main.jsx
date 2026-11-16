import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/authStorage";
import StatisticsCard from "../../../components/StatisticsCard";
import "./pages/QualityControl.css";
import BasicCalendar from "../../../components/calendar/BasicCalendar";

function Main() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [calendarEvents, setCalendarEvents] = useState([]);
    const [statusFilter, setStatusFilter] = useState("전체");
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        const loadCalendar = async () => {
            try{
                const response = await axios.get(API_BASE_URL + "/quality/calendar/events");

                setCalendarEvents(response.data);
            }
            catch (error){
                console.error("캘린더 조회 실패:", error);
            }
        }
        loadCalendar();
    }, []);

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await axios.get(API_BASE_URL + "/quality/products");
                const data = response.data.map(item => ({
                    id: item.product_id,
                    code: item.product_code,
                    name: item.product_name,
                    qualityStatus: item.quality_status,
                    createdAt: item.created_at || "-",
                    memo: item.memo || ""
                }));
                setProducts(data);
            } catch (err) {
                console.error("대시보드 조회 실패:", err);
                setError("품질 데이터를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }
        loadProducts();
    }, []);

    const passCount = products.filter(
        product => product.qualityStatus === "통과"
    ).length;
    const failCount = products.filter(
        product => product.qualityStatus === "불합격"
    ).length;
    const notTestedCount = products.filter(
        product => product.qualityStatus === "미실시"
    ).length;

    const recentProducts = products
        .filter(product => product.createdAt !== "-")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5);

    const failedProducts = products.filter(
        product => product.qualityStatus === "불합격"
    );

    if (loading) {
        return <p role="status">품질 데이터를 불러오는 중입니다.</p>;
    }

    if (error) {
        return <p role="alert">{error}</p>;
    }

    const keyword = searchText.trim().toLowerCase();
    const calendarSchedules = calendarEvents
        .filter(item =>
            (statusFilter === "전체" || item.quality_status === statusFilter) &&
            (
                (item.product_name || "").toLowerCase().includes(keyword) ||
                (item.product_code || "").toLowerCase().includes(keyword)
            )
        )
        .map(item => ({
            schedule_id: item.event_id,
            title: `${item.product_name} (${item.product_code}) · ${item.event_type === "검사 완료"
                ? `검사 완료 (${item.quality_status})`
                : item.event_type}`,
            start: item.event_date,
            end: item.event_date,
            typeId: item.event_type === "검사 완료"
                ? (item.quality_status === "통과" ? 3 : 2)
                : (item.event_type === "재검사 예정" ? 1 : 0)
        }));

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">품질관리 대시보드</span>
                <div className="dashboard-top">
                    <span className="subtext">제품별 검사 결과와 향후 검사 일정을 확인하세요.</span>
                </div>
            </header>

            <section className="stats-section" aria-label="품질 현황">
                <StatisticsCard title="전체 제품" count={products.length} stiyle={0} />
                <StatisticsCard title="통과" count={passCount} stiyle={0} />
                <StatisticsCard title="불합격" count={failCount} stiyle={0} />
                <StatisticsCard title="미실시" count={notTestedCount} stiyle={0} />
            </section>

            <section className="quality-panel">

            <div className="quality-panel-heading">
                <h2>품질 검사 일정</h2>
                <span className="quality-header-badge">표시 일정 {calendarSchedules.length}건</span>
            </div>

            <div className="quality-toolbar">
                <div className="quality-toolbar-copy">
                    <strong>검사 및 재검사 일정</strong>
                    <span>제품별 예정 일정과 완료 기록을 확인합니다.</span>
                </div>

                <div className="quality-filter-controls">
                    <select
                        aria-label="캘린더 검사 상태 필터"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="전체">전체</option>
                        <option value="통과">통과</option>
                        <option value="불합격">불합격</option>
                        <option value="미실시">미실시</option>
                    </select>

                    <div className="quality-search-box">
                        <input
                            type="text"
                            placeholder="제품명 또는 제품코드 검색"
                            aria-label="캘린더 제품 검색"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <BasicCalendar schedule={calendarSchedules} readOnly />
        </section>

            <div className="quality-dashboard-grid">
                <section className="quality-panel">
                    <h2>최근 품질검사</h2>
                    <div className="table-shell">
                        <table>
                            <thead>
                                <tr>
                                    <th>제품코드</th>
                                    <th>제품명</th>
                                    <th>검사일시</th>
                                    <th>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="no-data">
                                            최근 품질검사 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : recentProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>{product.code}</td>
                                        <td><strong>{product.name}</strong></td>
                                        <td>{product.createdAt}</td>
                                        <td>
                                            <span className={
                                                "attendance-tag " +
                                                (product.qualityStatus === "통과"
                                                    ? "tag-emerald"
                                                    : product.qualityStatus === "불합격"
                                                    ? "tag-red" : "tag-amber")
                                            }>
                                                {product.qualityStatus || "미실시"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="quality-panel">
                    <h2>품질 이슈 ({failedProducts.length}건)</h2>
                    {failedProducts.length === 0 ? (
                        <p className="no-data">현재 불합격 제품이 없습니다.</p>
                    ) : (
                        <div className="quality-issue-list">
                            {failedProducts.map(product => (
                                <article className="quality-issue-item" key={product.id}>
                                    <div className="quality-issue-top">
                                        <strong>{product.name}</strong>
                                        <span>{product.code}</span>
                                    </div>
                                    <p>{product.memo || "확인이 필요한 제품입니다."}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Main;
