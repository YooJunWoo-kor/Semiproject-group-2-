import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./QualityControl.css";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";
import ColorTeg from "../../../../components/ColorTeg";

// 제품목록과 겹쳐서 삭제
function QualityTestList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("전체");


const [products, setProducts] = useState([]);

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
                    company: item.company,
                    qualityStatus: item.quality_status,
                    createdAt: item.created_at || "-"
                }));

                setProducts(data);

            } catch (error) {
                console.error("검사 목록 조회 실패:", error);
            }
        }

        loadProducts();
    }, []);

    let sucesse;
    let fail;
    let notimple;

    const notimpleLength = ()=>{
        const filterLengt = products.filter((item)=>{
            return item.qualityStatus == "미실시"
        })
        return filterLengt.length;
    }

    const failedLength = ()=>{
        const filterLengt = products.filter((item)=>{
            return item.qualityStatus == "불합격"
        })
        return filterLengt.length;
    }

    const sucessedLength = ()=>{
        const filterLengt = products.filter((item)=>{
            return item.qualityStatus == "통과"
        })
        return filterLengt.length;
    }

    notimple = notimpleLength();
    sucesse = sucessedLength();
    fail = failedLength();

    const filteredProducts = products.filter(product => {
        const searchMatch =
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.code.toLowerCase().includes(search.toLowerCase());

        const statusMatch =
            statusFilter === "전체" || product.qualityStatus === statusFilter;

        return searchMatch && statusMatch;
    });

    return (
        <div className="border-container" style={{gap:"10px"}}>
            <header className="dashboard-header">
                <span className="subtitle">품질검사 관리</span>
                <ColorTeg title={"통과"} count={sucesse} type={"건"} color={"blue"}/>
                <ColorTeg title={"실패"} count={fail} type={"건"} />
                <ColorTeg title={"미실시"} count={notimple} type={"건"} color={"orange"}/>
            </header>

            <section className="">
                <div className="quality-filter-controls">
                    <input
                        style={{
                            width:"250px",
                            fontSize: "12px",
                            marginLeft: "auto"
                        }}

                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="제품명 또는 제품코드 검색"
                    />

                    <select
                        style={{
                            fontSize: '12px'
                        }}
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
                                <th>최근 검사일시</th>
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
                                        <td>{product.createdAt}</td>
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