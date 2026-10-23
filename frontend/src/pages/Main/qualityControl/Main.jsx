import React from "react";
import products from "./product";

function Main() {

    const passCount = products.filter(
        product => product.qualityStatus === "통과"
    ).length;

    const failCount = products.filter(
        product => product.qualityStatus === "불합격"
    ).length;

    const notTestedCount = products.filter(
        product => product.qualityStatus === "미실시"
    ).length;

    const recentProducts = products.slice(0, 5);

    const failedProducts = products.filter(
        product => product.qualityStatus === "불합격"
    );

    return (
        <div className="main-container">

            <div className="page-header">
                <h1>품질보증 관리</h1>
                <p>제품의 품질검사 현황과 주요 이슈를 확인합니다.</p>
            </div>

            <div className="summary-grid">

                <div className="summary-card">
                    <p>전체 제품</p>
                    <h2>{products.length}</h2>
                </div>

                <div className="summary-card">
                    <p>통과</p>
                    <h2>{passCount}</h2>
                </div>

                <div className="summary-card">
                    <p>불합격</p>
                    <h2>{failCount}</h2>
                </div>

                <div className="summary-card">
                    <p>미실시</p>
                    <h2>{notTestedCount}</h2>
                </div>

            </div>


            <div className="dashboard-content">

                <section className="dashboard-section">

                    <h2>최근 품질검사</h2>

                    <table className="quality-table">

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

                                    <td>{product.code}</td>

                                    <td>{product.name}</td>

                                    <td>{product.inspectionDate}</td>

                                    <td>
                                        <span
                                            className={
                                                product.qualityStatus === "통과"
                                                    ? "status pass"
                                                    : product.qualityStatus === "불합격"
                                                    ? "status fail"
                                                    : "status not-tested"
                                            }
                                        >
                                            {product.qualityStatus}
                                        </span>
                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </table>

                </section>


                <section className="dashboard-section">

                    <h2>품질 이슈</h2>

                    {failedProducts.length === 0 ? (

                        <p>현재 불합격 제품이 없습니다.</p>

                    ) : (

                        failedProducts.map(product => (

                            <div
                                className="issue-item"
                                key={product.id}
                            >
                                <strong>{product.name}</strong>

                                <span>
                                    {product.code}
                                </span>

                                <p>
                                    {product.memo || "확인이 필요한 제품입니다."}
                                </p>
                            </div>

                        ))

                    )}

                </section>

            </div>

        </div>
    );
}

export default Main;