import React, { useState } from "react";
import { useParams } from "react-router-dom";
import products from "../product"

function ProductDetail() {
    const { id } = useParams();
    const product = products.find(
        product => product.id === Number(id)
    );

    const [qualityStatus, setQualityStatus] = useState(
        product?.qualityStatus || "미실시"
    )

    const [memo, setMemo] = useState(
        product?.memo || ""
    );



    if (!product) {
        return <p>제품을 찾을 수 없습니다.</p>
    }

    return (
        <div>
            <div>
                <h3>품질검사 결과</h3>

                <button onClick={() => setQualityStatus("통과")}>
                    통과
                </button>

                <button onClick={() => setQualityStatus("미통과")}>
                    미통과
                </button>

                <button onClick= {() => setQualityStatus("미실시")}>
                    미실시
                </button> 

                <p>
                    현재 상태 : {qualityStatus}
                </p>

            </div>
            <h1>{product.id}번 제품 상세</h1>

            <img
                src={product.image}
                alt={product.name}
                width="200"
            />

            <p>제품명 : {product.name}</p>
            <p>가격 : {product.price}원</p>
            <p>제품 유형 : {product.type}</p>
            <p>제조회사 : {product.company}</p>
            <p>품질검사 상태 : {product.qualityStatus}</p>

            <div className="memo-area">
                <h3>내부 메모</h3>

                <textarea style={{outline:'none'}}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="내부 메모를 입력하세요"
                />
            </div>
        </div>
    )
}

export default ProductDetail;