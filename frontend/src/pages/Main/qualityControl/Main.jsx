import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/authStorage";
import StatisticsCard from "../../../components/StatisticsCard";
import "./pages/QualityControl.css";

function Main() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await axios.get(API_BASE_URL + "/quality/products");
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
        .filter(product => product.inspectionDate !== "-")
        .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
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

    return (
        <div className="quality-dashboard-page">
            <header className="dashboard-header">
                <span className="subtitle">품질관리 대시보드</span>
                <div className="dashboard-top">
                    <span className="subtext">실시간 품질 현황</span>
                </div>
            </header>

            <section className="stats-section" aria-label="품질 현황">
                <StatisticsCard title="전체 제품" count={products.length} stiyle={0} />
                <StatisticsCard title="통과" count={passCount} stiyle={0} />
                <StatisticsCard title="불합격" count={failCount} stiyle={0} />
                <StatisticsCard title="미실시" count={notTestedCount} stiyle={0} />
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
                                    <th>검사일</th>
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
                                        <td>{product.inspectionDate}</td>
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
