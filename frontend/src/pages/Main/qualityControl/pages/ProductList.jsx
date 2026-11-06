import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "./product";
import "./QualityControl.css";

function ProductList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="quality-products-page">
            <header className="quality-page-header">
                <div>
                    <span className="quality-eyebrow">PRODUCTS</span>
                    <h1>제품 목록</h1>
                    <p>등록된 제품의 기본정보와 재고 현황을 확인합니다.</p>
                </div>
                <div className="quality-header-badge">{filteredProducts.length}개 제품</div>
            </header>

            <section className="quality-toolbar">
                <div className="quality-toolbar-copy">
                    <strong>제품 검색</strong>
                    <span>제품명 또는 제품코드로 빠르게 찾을 수 있습니다.</span>
                </div>
                <div className="quality-search-box">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="제품명 또는 제품코드 검색"
                    />
                </div>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="quality-empty-state quality-empty-card">
                    검색 조건에 맞는 제품이 없습니다.
                </div>
            ) : (
                <div className="quality-product-grid">
                    {filteredProducts.map(product => (
                        <article
                            className="quality-product-card"
                            key={product.id}
                            onClick={() => navigate(`/main/qa/products/${product.id}`)}
                        >
                            <div className="quality-product-image">
                                <img src={product.image} alt={product.name} />
                                <span className={
                                    product.qualityStatus === "통과"
                                        ? "quality-status is-pass"
                                        : product.qualityStatus === "불합격"
                                        ? "quality-status is-fail"
                                        : "quality-status is-wait"
                                }>
                                    {product.qualityStatus}
                                </span>
                            </div>

                            <div className="quality-product-info">
                                <div className="quality-product-heading">
                                    <div>
                                        <span className="quality-product-code">{product.code}</span>
                                        <h3>{product.name}</h3>
                                    </div>
                                    <span className="quality-product-variant">{product.variantText}</span>
                                </div>

                                <p className="quality-product-price">
                                    ₩ {product.price.toLocaleString()}
                                </p>

                                <div className="quality-product-meta">
                                    <span>재고 <strong>{product.stock}개</strong></span>
                                    <span>{product.company}</span>
                                </div>

                                <div className="quality-product-action">
                                    상세 정보 보기
                                    <span aria-hidden="true">→</span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProductList;