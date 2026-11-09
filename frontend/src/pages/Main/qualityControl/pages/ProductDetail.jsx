import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../../../../utils/authStorage";
import defaultQualityChecklist from "./QualityChecklist";
import { calculateQualityScore } from "../../../../utils/qualityScore";



function ProductDetail() {

    const { id } = useParams();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    const [qualityStatus, setQualityStatus] = useState("미실시");
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspector, setInspector] = useState("");
    const [failReason, setFailReason] = useState("");
    const [memo, setMemo] = useState("");
    
    const [isSaving, setIsSaving] = useState(false);

    const [checklist, setChecklist] = useState(
        defaultQualityChecklist.map(item => ({
            ...item,
            result: "미실시"
        }))
    )

    const [newChecklistName, setNewChecklistName] = useState("");

    const qualityScore = calculateQualityScore(checklist)


    const changeChecklistResult = (id, result) => {

        const nextChecklist = checklist.map(item =>
            item.id === id ? { ...item, result: result } : item
        );

        setChecklist(nextChecklist);
    }

    const addChecklistItem = () => {

        if (!newChecklistName.trim()) {
            return;
        }

        const newItem = {
            id: Date.now(),
            name: newChecklistName,
            description: "관리자 추가 항목",
            result: "미실시",
            custom: true
        }

        setChecklist([
            ...checklist,
            newItem
        ])

        setNewChecklistName("");
    };

    
useEffect(() => {

    async function loadProduct() {
        setLoading(true);
        setProduct(null);

        try {
            const response = await axios.get(
                `${API_BASE_URL}/quality/products/${id}`
            );

            const data = response.data;

            const productData = {
                id: data.product_id,
                code: data.product_code,
                name: data.product_name,
                type: data.product_type,
                company: data.company,
                inspector: data.inspector,
                price: Number(data.price ?? 0), // ?? 값이 null이거나 undefined면 0
                stock: data.stock,
                image: data.image_url,
                variantText: data.variant_text,
                qualityStatus: data.quality_status,
                inspectionDate: data.inspection_date || "-",
                memo: data.memo || ""
            };

            setProduct(productData);

            setQualityStatus(data.quality_status || "미실시");
            setInspectionDate(data.inspection_date || "");
            setMemo(data.memo || "");

        } catch (error) {
            console.log("상세페이지 에러");
        }
    }

    loadProduct();

}, [id]);




    if (!product) {
        return <p>제품을 찾을 수 없습니다.</p>;
    }


    
const handleSave = async () => {

    if (isSaving || !product) return;

    // 필수 입력값 검사
    if (!inspectionDate || !inspector.trim()) {
        alert("검사일과 검사자를 입력해주세요.");
        return;
    }

    if (qualityStatus === "불합격" && !failReason.trim()) {
        alert("불합격 사유를 입력해주세요.");
        return;
    }

    const inspectionData = {
        productId: product.id,
        inspectionDate,
        inspector: inspector.trim(),
        qualityStatus,
        failReason: qualityStatus === "불합격" ? failReason.trim() : null,
        memo: memo.trim(),
        qualityScore: Number(qualityScore)
    };

    try {
        setIsSaving(true);

        const response = await axios.post(
            `${API_BASE_URL}/quality/inspections`, inspectionData
        );

        console.log("검사 저장 성공:", response.data);

        // 화면의 최근 검사 정보도 변경
        setProduct(prev => ({
            ...prev,
            qualityStatus,
            inspectionDate,
            memo: memo.trim()
        }));

        alert("검사 결과가 저장되었습니다.");

    } catch (error) {
        console.error("검사 저장 실패:", error);
        alert("검사 결과를 저장하지 못했습니다.");

    } finally {
        setIsSaving(false);
    }
};



    return (

        <div className="product-detail-page">


            <div className="detail-top">

                <div>
                    <h1>{product.name}</h1>

                    <p>
                        {product.code} · {product.company}
                    </p>
                </div>

                <span
                    className={qualityStatus === "통과" ? "status pass" : qualityStatus === "불합격" ? "status fail" : "status not-tested"}>
                        
                    {qualityStatus}
                </span>

            </div>


            <section className="product-info-card">

                <div className="detail-image-area">

                    <img
                        src={product.image}
                        alt={product.name}
                    />

                </div>


                <div className="detail-info-grid">

                    <div>
                        <span>제품 코드</span>
                        <strong>{product.code}</strong>
                    </div>

                    <div>
                        <span>제품 유형</span>
                        <strong>{product.type}</strong>
                    </div>

                    <div>
                        <span>제조회사</span>
                        <strong>{product.company}</strong>
                    </div>

                    <div>
                        <span>가격</span>
                        <strong>
                            {product.price.toLocaleString()}원
                        </strong>
                    </div>

                    <div>
                        <span>재고</span>
                        <strong>
                            {product.stock}개
                        </strong>
                    </div>

                    <div>
                        <span>최근 검사일</span>
                        <strong>
                            {product.inspectionDate}
                        </strong>
                    </div>

                </div>

            </section>


            <section className="inspection-card">

                <div className="section-title">

                    <div>
                        <h2>품질검사</h2>
                        <p>
                            제품의 검사 결과와 세부 내용을 입력합니다.
                        </p>
                    </div>

                </div>


                <div className="inspection-form-row">

                    <label>검사 상태</label>

                    <div className="quality-status-buttons">

                        <button
                            className={
                                qualityStatus === "통과" ? "selected" : ""
                            }
                            onClick={() =>
                                setQualityStatus("통과")
                            }
                        >
                            통과
                        </button>

                        <button
                            className={
                                qualityStatus === "불합격" ? "selected" : ""
                            }
                            onClick={() =>
                                setQualityStatus("불합격")
                            }
                        >
                            불합격
                        </button>

                        <button
                            className={
                                qualityStatus === "미실시" ? "selected" : ""
                            }
                            onClick={() =>
                                setQualityStatus("미실시")
                            }
                        >
                            미실시
                        </button>

                    </div>

                </div>


                <div className="inspection-form-grid">

                    <div>

                        <label>검사일</label>

                        <input
                            type="date"
                            value={inspectionDate} onChange={(e) =>
                                setInspectionDate(e.target.value)
                            }
                        />

                    </div>


                    <div>

                        <label>검사자</label>

                        <input
                            type="text"
                            value={inspector}
                            onChange={(e) =>
                                setInspector(e.target.value)
                            }
                            placeholder="검사자 이름"
                        />

                    </div>

                </div>

                {/* qualityStatus 값이 "불합격" 이면 뒤에 명령문 실행 */}
                {qualityStatus === "불합격" && (

                    <div className="inspection-form-row">

                        <label>불합격 사유</label>

                        <textarea
                            value={failReason}
                            onChange={(e) =>
                                setFailReason(e.target.value)
                            }
                            placeholder="불합격 사유를 입력하세요."
                        />

                    </div>

                )}


                <div className="inspection-form-row">

                    <label>내부 메모</label>

                    <textarea
                        value={memo}
                        onChange={(e) =>
                            setMemo(e.target.value)
                        }
                        placeholder="검사 관련 메모를 입력하세요."
                    />

                </div>


                <div className="detail-save-area">

                    <button
                        className="save-button"
                        onClick={handleSave}
                    >
                        검사 결과 저장
                    </button>

                </div>

            </section>


            <section className="inspection-history-card">

                <div className="section-title">

                    <div>
                        <h2>검사 이력</h2>

                        <p>
                            제품의 이전 품질검사 결과입니다.
                        </p>
                    </div>

                </div>


                <table className="quality-table">

                    <thead>

                        <tr>
                            <th>검사일</th>
                            <th>검사자</th>
                            <th>검사결과</th>
                            <th>비고</th>
                        </tr>

                    </thead>


                    <tbody>

                        <tr>

                            <td>
                                {product.inspectionDate}
                            </td>

                            <td>
                                {product.inspector || "-"}
                            </td>

                            <td>

                                <span
                                    className={
                                        product.qualityStatus === "통과" ? "status pass" : product.qualityStatus === "불합격" ? "status fail" : "status not-tested"
                                    }
                                >
                                    {product.qualityStatus}
                                </span>

                            </td>

                            <td>
                                {product.memo || "-"}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </section>

            <section className="quality-checklist">

                <h2>품질 검사 체크리스트</h2>

                <div className="quality-score">
                    품질 점수 : <strong>{qualityScore}점 / 10점</strong>
                </div>

                {checklist.map(item => (
                    <div
                        key={item.id}
                        className="checklist-item">

                        <div>
                            <strong>{item.name}</strong>

                            <p>
                                {item.description}
                            </p>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() =>
                                    changeChecklistResult(
                                        item.id,
                                        "통과"
                                    )
                                }
                            >
                                통과
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    changeChecklistResult(
                                        item.id,
                                        "불합격"
                                    )
                                }
                            >
                                불합격
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    changeChecklistResult(
                                        item.id,
                                        "미실시"
                                    )
                                }
                            >
                                미실시
                            </button>

                            <span>
                                현재 결과 : {item.result}
                            </span>
                        </div>
                    </div>
                ))}

                <div className="checklist-add">

                    <input
                        type="text"
                        value={newChecklistName}
                        onChange={(event) =>
                            setNewChecklistName(
                                event.target.value
                            )
                        }
                        placeholder="추가 검사 항목"
                    />

                    <button
                        type="button"
                        onClick={addChecklistItem}
                    >
                        검사 항목 추가
                    </button>

                </div>

            </section>

        </div>

    );
}

export default ProductDetail;