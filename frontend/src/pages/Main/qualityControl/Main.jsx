
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/authStorage";
import "./pages/QualityControl.css";

function Main() {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // DB에서 제품 목록 가져오기
    useEffect(() => {

        async function loadProducts() {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/quality/products`
                );

                const data = response.data.map(item => ({
                    id: item.product_id,
                    code: item.product_code,
                    name: item.product_name,
                    qualityStatus: item.quality_status,
                    inspectionDate: item.inspection_date || "-",
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

    // 품질 상태별 제품 개수
    const passCount = products.filter(
        product => product.qualityStatus === "통과"
    ).length;

    const failCount = products.filter(
        product => product.qualityStatus === "불합격"
    ).length;

    const notTestedCount = products.filter(
        product => product.qualityStatus === "미실시"
    ).length;

    // 검사일이 있는 제품 중 최근 5개
    const recentProducts = products
        .filter(product => product.inspectionDate !== "-")
        .sort((a, b) =>
            b.inspectionDate.localeCompare(a.inspectionDate) // 검사일 최신순 정렬
        )
        .slice(0, 5);

    // 최신 검사 결과가 불합격인 제품
    const failedProducts = products.filter(
        product => product.qualityStatus === "불합격"
    );

    if (loading) {
        return <p>품질 데이터를 불러오는 중입니다.</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    // 기존 return JSX는 아래에 그대로 유지


    return (
        <div className="border-container">

            {/* 대시보드 제목 */}
            <header className="dashboard-header">
                <span className="subtitle">
                    품질보증 관리
                </span>
            </header>

            <div className="quality-header-badge">
                실시간 품질 현황
            </div>

            {/* 품질 현황 요약 */}
            <section className="quality-summary-grid">

                <article className="quality-summary-card is-total">
                    <span>전체 제품</span>
                    <strong>{products.length}</strong>
                    <small>관리 중인 전체 제품</small>
                </article>

                <article className="quality-summary-card is-pass">
                    <span>통과</span>
                    <strong>{passCount}</strong>
                    <small>검사 기준 충족</small>
                </article>

                <article className="quality-summary-card is-fail">
                    <span>불합격</span>
                    <strong>{failCount}</strong>
                    <small>추가 확인 필요</small>
                </article>

                <article className="quality-summary-card is-wait">
                    <span>미실시</span>
                    <strong>{notTestedCount}</strong>
                    <small>검사 대기 제품</small>
                </article>

            </section>

            <div className="quality-dashboard-grid">

                {/* 최근 품질검사 */}
                <section className="quality-panel quality-recent-panel">

                    <div className="quality-panel-heading">
                        <div>
                            <span className="quality-section-kicker">
                                RECENT INSPECTIONS
                            </span>
                            <h2>최근 품질검사</h2>
                        </div>

                        <span className="quality-panel-count">
                            최근 {recentProducts.length}건
                        </span>
                    </div>

                    <div className="quality-table-shell">

                        <table className="quality-data-table">

                            <thead>
                                <tr>
                                    <th>제품코드</th>
                                    <th>제품명</th>
                                    <th>검사일</th>
                                    <th>상태</th>
                                </tr>
                            </thead>

                            <tbody>
                                {recentProducts.map(product => (
                                    <tr key={product.id}>

                                        <td className="quality-code-cell">
                                            {product.code}
                                        </td>

                                        <td>
                                            <strong>{product.name}</strong>
                                        </td>

                                        <td>
                                            {product.inspectionDate}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    product.qualityStatus === "통과"
                                                        ? "quality-status is-pass"
                                                        : product.qualityStatus === "불합격"
                                                        ? "quality-status is-fail"
                                                        : "quality-status is-wait"
                                                }
                                            >
                                                {product.qualityStatus}
                                            </span>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </section>

                {/* 품질 이슈 */}
                <section className="quality-panel quality-issue-panel">

                    <div className="quality-panel-heading">

                        <div>
                            <span className="quality-section-kicker">
                                ISSUES
                            </span>
                            <h2>품질 이슈</h2>
                        </div>

                        <span className="quality-panel-count is-danger">
                            {failedProducts.length}건
                        </span>

                    </div>

                    <div className="quality-issue-list">

                        {failedProducts.length === 0 ? (

                            <div className="quality-empty-state">
                                현재 불합격 제품이 없습니다.
                            </div>

                        ) : (

                            failedProducts.map(product => (

                                <article
                                    className="quality-issue-item"
                                    key={product.id}
                                >

                                    <div className="quality-issue-top">
                                        <strong>{product.name}</strong>
                                        <span>{product.code}</span>
                                    </div>

                                    <p>
                                        {product.memo || "확인이 필요한 제품입니다."}
                                    </p>

                                </article>

                            ))

                        )}

                    </div>

                </section>

            </div>

        </div>
    );
}

export default Main;
