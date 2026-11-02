import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "./product";
import "./QualityControl.css";

function QualityTestList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("전체");

    const filteredProducts = products.filter(product => {
        const searchMatch =
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.code.toLowerCase().includes(search.toLowerCase());

        const statusMatch =
            statusFilter === "전체" || product.qualityStatus === statusFilter;

        return searchMatch && statusMatch;
    });

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>품질검사 관리</span>
                <div className="quality-header-badge">총 {filteredProducts.length}건</div>
            </header>

            <section className="quality-toolbar quality-test-toolbar">
                <div className="quality-toolbar-copy">
                    <strong>검사 목록 검색</strong>
                    <span>검색어와 상태 필터를 함께 적용할 수 있습니다.</span>
                </div>

                <div className="quality-filter-controls">
                    <div className="quality-search-box">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="제품명 또는 제품코드 검색"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="검사 상태 필터"
                    >
                        <option value="전체">전체 상태</option>
                        <option value="통과">통과</option>
                        <option value="불합격">불합격</option>
                        <option value="미실시">미실시</option>
                    </select>
                </div>
            </section>

            <section className="quality-panel quality-list-panel">
                <div className="quality-panel-heading">
                    <div>
                        <span className="quality-section-kicker">INSPECTION LIST</span>
                        <h2>검사 결과 목록</h2>
                    </div>
                    <span className="quality-panel-count">{filteredProducts.length}건</span>
                </div>

                <div className="quality-table-shell">
                    <table className="quality-data-table quality-test-table">
                        <thead>
                            <tr>
                                <th>제품코드</th>
                                <th>제품명</th>
                                <th>제조회사</th>
                                <th>검사상태</th>
                                <th>최근 검사일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="quality-empty-state">
                                            검색 조건에 맞는 검사 결과가 없습니다.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr
                                        key={product.id}
                                        onClick={() => navigate(`/main/qa/products/${product.id}`)}
                                        className="quality-clickable-row"
                                    >
                                        <td className="quality-code-cell">{product.code}</td>
                                        <td><strong>{product.name}</strong></td>
                                        <td>{product.company}</td>
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
                                        <td>{product.inspectionDate}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default QualityTestList;