import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "./product";

function QualityTestList() {

    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("전체");

    const filteredProducts = products.filter(product => {

        const searchMatch =
            product.name.includes(search) ||
            product.code.includes(search);

        const statusMatch =
            statusFilter === "전체" || 
            // 처음에는 무조건 전체
            product.qualityStatus === statusFilter; 
            // 이후 product 데이터의 qualityStatus로 변경

        return searchMatch && statusMatch;
        // 검색값과 상태값 둘 다 만족하는 제품만 리턴
    });


    return (
        <div className="quality-test-list">

            <div className="page-header">
                <h1>품질검사 관리</h1>
                <p>
                    제품별 품질검사 상태와 최근 검사일을 확인합니다.
                </p>
            </div>


            <div className="quality-filter-area">

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="제품명 또는 제품코드 검색"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="전체">전체 상태</option>
                    <option value="통과">통과</option>
                    <option value="불합격">불합격</option>
                    <option value="미실시">미실시</option>
                </select>

            </div>


            <div className="product-result-info">
                총 {filteredProducts.length}건
            </div>


            <table className="quality-table">

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

                    {filteredProducts.map(product => (

                        <tr
                            key={product.id}
                            onClick={() =>
                                navigate(`/products/${product.id}`)
                            }
                            className="quality-row"
                        >

                            <td>{product.code}</td>

                            <td>{product.name}</td>

                            <td>{product.company}</td>

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

                            <td>{product.inspectionDate}</td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    );
}

export default QualityTestList;