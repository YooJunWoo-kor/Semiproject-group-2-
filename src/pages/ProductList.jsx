import React from "react";
import { useNavigate } from "react-router-dom";
import products from "../product";

function ProductList() {
    const navigate = useNavigate();


    return (
        <div>
            <h1>제품 목록</h1>
    
            <div className="product-grid">
                {
                    products.map(product => (
                        <div
                            className="product-card"
                            key={product.id}
                            onClick={() => navigate(`/products/${product.id}`)}>
                            <div>
                                <p>{product.name}</p>
                                <p>{product.price}원</p>
                                <p>{product.qualityStatus}</p>
                            </div>
    
                            <img
                                src={product.image}
                                alt={product.name}
                                width="100"
                            />
                        </div>
                    ))
                }
            </div>
        </div>
    )
}
export default ProductList;
