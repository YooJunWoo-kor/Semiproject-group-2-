<<<<<<< HEAD
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "../product";

function ProductList() {

    const navigate = useNavigate();

    const [search, setSearch] = useState("");

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code.toLowerCase().includes(search.toLowerCase())
    );
    // 검색어가 포함된 제품만 filteredProducts에 저장한다


    return (
        <div className="product-page">

            <div className="product-top-bar">

                <div>
                    <h1>Products</h1>
                    <p>
                        등록된 제품의 기본정보와 재고현황을 확인합니다.
                    </p>
                </div>

                <div className="product-count">
                    {filteredProducts.length} Products
                </div>

            </div>


            <div className="product-search-area">

                <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    placeholder="제품명 또는 제품코드 검색"
                />

            </div>


            <div className="product-grid">

                {filteredProducts.map(product => (

                    <div
                        className="product-card"
                        key={product.id}
                        onClick={() =>
                            navigate(`/products/${product.id}`)
                            // 클릭하면 해당 id의 제품 상세링크로 넘어간다
                        }
                    >

                        <div className="product-card-info">

                            <h3>
                                {product.name}
                            </h3>

                            <p className="product-variant">
                                {product.variantText}
                            </p>

                            <p className="product-price">
                                ₩ {product.price.toLocaleString()}
                            </p>

                            <p className="product-stock">
                                <strong>{product.stock}</strong>
                                {" "}Units On Hand
                            </p>

                            <p className="product-code">
                                {product.code}
                            </p>

                        </div>


                        <div className="product-card-image">

                            <img
                                src={product.image}
                                alt={product.name}
                            />

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
}

=======
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "../product";

function ProductList() {

    const navigate = useNavigate();

    const [search, setSearch] = useState("");

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code.toLowerCase().includes(search.toLowerCase())
    );
    // 검색어가 포함된 제품만 filteredProducts에 저장한다


    return (
        <div className="product-page">

            <div className="product-top-bar">

                <div>
                    <h1>Products</h1>
                    <p>
                        등록된 제품의 기본정보와 재고현황을 확인합니다.
                    </p>
                </div>

                <div className="product-count">
                    {filteredProducts.length} Products
                </div>

            </div>


            <div className="product-search-area">

                <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    placeholder="제품명 또는 제품코드 검색"
                />

            </div>


            <div className="product-grid">

                {filteredProducts.map(product => (

                    <div
                        className="product-card"
                        key={product.id}
                        onClick={() =>
                            navigate(`/products/${product.id}`)
                            // 클릭하면 해당 id의 제품 상세링크로 넘어간다
                        }
                    >

                        <div className="product-card-info">

                            <h3>
                                {product.name}
                            </h3>

                            <p className="product-variant">
                                {product.variantText}
                            </p>

                            <p className="product-price">
                                ₩ {product.price.toLocaleString()}
                            </p>

                            <p className="product-stock">
                                <strong>{product.stock}</strong>
                                {" "}Units On Hand
                            </p>

                            <p className="product-code">
                                {product.code}
                            </p>

                        </div>


                        <div className="product-card-image">

                            <img
                                src={product.image}
                                alt={product.name}
                            />

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
}

>>>>>>> dc756df83a6fb7de274b5334c8eba37dfa55c2f2
export default ProductList;