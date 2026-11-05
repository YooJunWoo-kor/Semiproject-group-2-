import React from "react";
import products from "./pages/product";
import "./pages/QualityControl.css";

function Main() {
    const passCount = products.filter(product => product.qualityStatus === "통과").length;
    const failCount = products.filter(product => product.qualityStatus === "불합격").length;
    const notTestedCount = products.filter(product => product.qualityStatus === "미실시").length;

    const recentProducts = products.slice(0, 5);
    const failedProducts = products.filter(product => product.qualityStatus === "불합격");

    return (
        <div className="quality-dashboard-page">
            <header className="quality-page-header">
                <div>
                    <span className="quality-eyebrow">QUALITY CONTROL</span>
                    <h1>품질보증 관리</h1>
                    <p>제품의 품질검사 현황과 주요 이슈를 한눈에 확인합니다.</p>
                </div>
                <div className="quality-header-badge">실시간 품질 현황</div>
            </header>

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
                <section className="quality-panel quality-recent-panel">
                    <div className="quality-panel-heading">
                        <div>
                            <span className="quality-section-kicker">RECENT INSPECTIONS</span>
                            <h2>최근 품질검사</h2>
                        </div>
                        <span className="quality-panel-count">최근 {recentProducts.length}건</span>
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
                                        <td className="quality-code-cell">{product.code}</td>
                                        <td><strong>{product.name}</strong></td>
                                        <td>{product.inspectionDate}</td>
                                        <td>
                                            <span className={
                                                product.qualityStatus === "통과"
                                                    ? "quality-status is-pass"
                                                    : product.qualityStatus === "불합격"
                                                    ? "quality-status is-fail"
                                                    : "quality-status is-wait"
                                            }>
                                                {product.qualityStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="quality-panel quality-issue-panel">
                    <div className="quality-panel-heading">
                        <div>
                            <span className="quality-section-kicker">ISSUES</span>
                            <h2>품질 이슈</h2>
                        </div>
                        <span className="quality-panel-count is-danger">{failedProducts.length}건</span>
                    </div>

                    <div className="quality-issue-list">
                        {failedProducts.length === 0 ? (
                            <div className="quality-empty-state">현재 불합격 제품이 없습니다.</div>
                        ) : (
                            failedProducts.map(product => (
                                <article className="quality-issue-item" key={product.id}>
                                    <div className="quality-issue-top">
                                        <strong>{product.name}</strong>
                                        <span>{product.code}</span>
                                    </div>
                                    <p>{product.memo || "확인이 필요한 제품입니다."}</p>
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