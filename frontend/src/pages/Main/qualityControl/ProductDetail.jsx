<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
<<<<<<< HEAD
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import products from "../product";
=======
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import products from "./product";
import defaultQualityChecklist from "./QualityChecklist";
import { calculateQualityScore } from "./utils/qualityScore";
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx

function ProductDetail() {

    const { id } = useParams();

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
=======
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



>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
    const product = products.find(
        product => product.id === Number(id)
    );
    // id가 같은 제품만 상세화면에 나오게하기


    const [qualityStatus, setQualityStatus] = useState(
        product?.qualityStatus || "미실시"
    );
    // ?는 존재하면 뒤에 값을 읽고 ||는 없다면 뒤에 값을 넣으라는 명령문

    const [inspectionDate, setInspectionDate] = useState(
        product?.inspectionDate === "-"
            ? ""
            : product?.inspectionDate || ""
    );

    const [inspector, setInspector] = useState("");

    const [failReason, setFailReason] = useState("");

    const [memo, setMemo] = useState(
        product?.memo || ""
    );

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
    
=======

>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx


    if (!product) {
        return <p>제품을 찾을 수 없습니다.</p>;
    }


    const handleSave = () => {

        const inspectionData = {
            productId: product.id,
            qualityStatus,
            inspectionDate,
            inspector,
            failReason,
<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
            memo
=======
            memo,
            checklist,
            qualityScore
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
        };

        console.log(inspectionData);

        alert("검사 결과가 저장되었습니다.");
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
                    className={
                        qualityStatus === "통과"
                            ? "status pass"
                            : qualityStatus === "불합격"
<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
                            ? "status fail"
                            : "status not-tested"
=======
                                ? "status fail"
                                : "status not-tested"
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
                    }
                >
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
                                qualityStatus === "통과"
                                    ? "selected"
                                    : ""
                            }
                            onClick={() =>
                                setQualityStatus("통과")
                            }
                        >
                            통과
                        </button>

                        <button
                            className={
                                qualityStatus === "불합격"
                                    ? "selected"
                                    : ""
                            }
                            onClick={() =>
                                setQualityStatus("불합격")
                            }
                        >
                            불합격
                        </button>

                        <button
                            className={
                                qualityStatus === "미실시"
                                    ? "selected"
                                    : ""
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
                            value={inspectionDate}
                            onChange={(e) =>
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

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
                // qualityStatus 값이 "불합격" 이면 뒤에 명령문 실행
=======
                {/* qualityStatus 값이 "불합격" 이면 뒤에 명령문 실행 */}
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
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
                                -
                            </td>

                            <td>

                                <span
                                    className={
                                        product.qualityStatus === "통과"
                                            ? "status pass"
                                            : product.qualityStatus === "불합격"
<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
                                            ? "status fail"
                                            : "status not-tested"
=======
                                                ? "status fail"
                                                : "status not-tested"
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
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

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
        </div>

    );
}

=======
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import products from "../product";

function ProductDetail() {

    const { id } = useParams();

    const product = products.find(
        product => product.id === Number(id)
    );
    // id가 같은 제품만 상세화면에 나오게하기


    const [qualityStatus, setQualityStatus] = useState(
        product?.qualityStatus || "미실시"
    );
    // ?는 존재하면 뒤에 값을 읽고 ||는 없다면 뒤에 값을 넣으라는 명령문

    const [inspectionDate, setInspectionDate] = useState(
        product?.inspectionDate === "-"
            ? ""
            : product?.inspectionDate || ""
    );

    const [inspector, setInspector] = useState("");

    const [failReason, setFailReason] = useState("");

    const [memo, setMemo] = useState(
        product?.memo || ""
    );

    


    if (!product) {
        return <p>제품을 찾을 수 없습니다.</p>;
    }


    const handleSave = () => {

        const inspectionData = {
            productId: product.id,
            qualityStatus,
            inspectionDate,
            inspector,
            failReason,
            memo
        };

        console.log(inspectionData);

        alert("검사 결과가 저장되었습니다.");
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
                    className={
                        qualityStatus === "통과"
                            ? "status pass"
                            : qualityStatus === "불합격"
                            ? "status fail"
                            : "status not-tested"
                    }
                >
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
                                qualityStatus === "통과"
                                    ? "selected"
                                    : ""
                            }
                            onClick={() =>
                                setQualityStatus("통과")
                            }
                        >
                            통과
                        </button>

                        <button
                            className={
                                qualityStatus === "불합격"
                                    ? "selected"
                                    : ""
                            }
                            onClick={() =>
                                setQualityStatus("불합격")
                            }
                        >
                            불합격
                        </button>

                        <button
                            className={
                                qualityStatus === "미실시"
                                    ? "selected"
                                    : ""
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
                            value={inspectionDate}
                            onChange={(e) =>
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

                // qualityStatus 값이 "불합격" 이면 뒤에 명령문 실행
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
=======
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
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
                    </button>

                </div>

            </section>

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx

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
                                -
                            </td>

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

                            <td>
                                {product.memo || "-"}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </section>

=======
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
        </div>

    );
}

<<<<<<< HEAD:frontend/src/pages/ProductDetail.jsx
>>>>>>> dc756df83a6fb7de274b5334c8eba37dfa55c2f2
=======
>>>>>>> 98317d7250d01438e9694a7f0f6de18c0744cd8d:frontend/src/pages/Main/qualityControl/ProductDetail.jsx
export default ProductDetail;