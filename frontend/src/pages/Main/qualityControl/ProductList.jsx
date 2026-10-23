import React from "react";


function ProductList() {

    const products = [
        {
            id: 1,
            name: "수분크림",
            price: 25000,
            image: "/images/수분크림.jpg"
        },
        {
            id: 2,
            name: "선크림",
            price: 18000,
            image: "/images/선크림.jpg"
        },
        {
            id: 3,
            name: "클렌징폼",
            price: 12000,
            image: "/images/클렌징 폼.jpg"
        }
    ];

    return (
        <div className="product-list-page">
    
            <h1>제품 목록</h1>
    
            <div className="product-grid">
                {
                    products.map(product => (
                        <div
                            className="product-card"
                            key={product.id}
                        >
                            <div className="product-info">
                                <p className="product-name">
                                    {product.name}
                                </p>
    
                                <p className="product-price">
                                    {product.price}원
                                </p>
                            </div>
    
                            <img
                                src={product.image}
                                alt={product.name}
                                className="product-image"
                            />
                        </div>
                    ))
                }
            </div>
    
        </div>
    )
}
export default ProductList;
