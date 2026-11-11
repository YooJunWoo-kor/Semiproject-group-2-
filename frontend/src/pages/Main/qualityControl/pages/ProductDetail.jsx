import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./QualityControl.css";

import { API_BASE_URL } from "../../../../utils/authStorage";
import defaultQualityChecklist from "./QualityChecklist";
import { calculateQualityScore } from "../../../../utils/qualityScore";



function ProductDetail() {

    const { id } = useParams();
    
    const [product, setProduct] = useState(null);

    const [qualityStatus, setQualityStatus] = useState("미실시");
    const [inspector, setInspector] = useState("");
    const [failReason, setFailReason] = useState("");
    const [memo, setMemo] = useState("");
    
    const [isSaving, setIsSaving] = useState(false);
    const [inspectionHistory, setInspectionHistory] = useState([]);
    const [historyRefresh, setHistoryRefresh] = useState(0);

    const [selectedInspectionId, setSelectedInspectionId] = useState(null);
    const [historyChecklist, setHistoryChecklist] = useState(null);

    const navigate = useNavigate();

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

    const undoItem = checklist.filter(
        item =>  item.result === '미실시' 
    )
    
useEffect(() => {

    async function loadProduct() {
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
                inspector: data.inspector || "-",
                price: Number(data.price ?? 0), // ?? 값이 null이거나 undefined면 0
                stock: data.stock,
                image: data.image_url,
                variantText: data.variant_text,
                qualityStatus: data.quality_status,
                created_at: data.created_at || "-",
                memo: data.memo || ""
            };

            setProduct(productData);
            setInspector(data.inspector || "");

            setQualityStatus(data.quality_status || "미실시");
            setMemo(data.memo || "");

        } catch (error) {
            console.log("상세페이지 에러");
        }
    }

    loadProduct();

}, [id]);

useEffect(() => {
    function QualityResult() {
        if(undoItem.length > 0){
            setQualityStatus("미실시");
        }
        else if(qualityScore === "10.0"){
            setQualityStatus("통과");
        }
        else{
            setQualityStatus("불합격");
        }
    }

    QualityResult();

    
}, [undoItem.length, qualityScore]);



useEffect(() => {
    async function loadHistory() {
        try {
            // 1. 제품의 검사 이력 가져오기
            const response = await axios.get(
                `${API_BASE_URL}/quality/products/${id}/inspections`
            );

            const history = response.data;
            setInspectionHistory(history);

            if (history.length === 0) return;

            

        } catch (error) {
            console.error("체크리스트 조회 실패:", error);
        }
    }

    loadHistory();
}, [id, historyRefresh]);






    if (!product) {
        return <p>제품을 찾을 수 없습니다.</p>;
    }


const loadHistoryChecklist = async (inspectionId) => {

    setSelectedInspectionId(inspectionId);
    setHistoryChecklist(null);

    try {
        const response = await axios.get(
            `${API_BASE_URL}/quality/inspections/${inspectionId}/items`
        );

        setHistoryChecklist(response.data);

    } catch (error) {
        console.error("체크리스트 조회 실패:", error);
        alert("체크리스트를 불러오지 못했습니다.");
        setSelectedInspectionId(null);
    }
};


    
const handleSave = async () => {

    if (isSaving || !product) return;

    // 필수 입력값 검사
    if (!inspector.trim()) {
        alert("검사자를 입력해주세요.");
        return;
    }

    if (qualityStatus === "불합격" && !failReason.trim()) {
        alert("불합격 사유를 입력해주세요.");
        return;
    }

    const inspectionData = {
        productId: product.id,
        inspector: inspector.trim(),
        qualityStatus,
        failReason: qualityStatus === "불합격" ? failReason.trim() : null,
        memo: memo.trim(),
        qualityScore: Number(qualityScore),
        checklist: checklist
    };

    try {
        setIsSaving(true);

        const response = await axios.post(
            `${API_BASE_URL}/quality/inspections`, inspectionData
        );

        console.log("검사 저장 성공:", response.data);

        // 검사 결과가 정상 저장되면 최신 검사 정보와 DB 저장 시각을 갱신
        setProduct(prev => ({
            ...prev,
            qualityStatus,
            inspector: inspector.trim(),
            memo: memo.trim()
        }));

        try {
            const latest = await axios.get(`${API_BASE_URL}/quality/products/${product.id}`);
            setProduct(prev => prev && prev.id === product.id
                ? { ...prev, created_at: latest.data.created_at || "-" }
                : prev);
        } catch (refreshError) {
            console.error("최근 검사 저장 시각 갱신 실패:", refreshError);
        }

        setHistoryRefresh(prev => prev + 1);
        alert("검사 결과가 저장되었습니다.");

    } catch (error) {
        console.error("검사 저장 실패:", error);
        alert("검사 결과를 저장하지 못했습니다.");

    } finally {
        setIsSaving(false);
    }

};

    const selectedInspection = inspectionHistory.find(
        item => item.inspection_id === selectedInspectionId
    );


    
    
 
    
       const DeleteProduct =  async (product_id) => {
            try {
                // 1. 제품의 검사 이력 가져오기
                const response = await axios.delete(
                    `${API_BASE_URL}/quality/products/${product_id}`
                );

                console.log(response.data);
                alert("제품 삭제 완료");


                navigate("/main/qa/products");
                
    
            } catch (error) {
                console.error(error);
                alert("제품 삭제 실패");
            }
       }

       const  DeleteInspectionList =  async (id) => {
            try{
                await axios.delete(
                    `${API_BASE_URL}/quality/inspections/${id}`
                )

                const newHistory = inspectionHistory.filter(
                    item => item.inspection_id !== id
                )
    
                setInspectionHistory(newHistory) 
            }
            catch(error){
                console.error("검사 이력 삭제 실패");
            }
       }

       
    
        
    
    return (

        <div className="product-detail-page">


            <div className="detail-top quality-page-header">

                <div>
                    <h1>
                        {product.name}

                        <span className={qualityStatus === "통과" ? "quality-status is-pass" : qualityStatus === "불합격" ? "quality-status is-fail" : "quality-status is-wait"}>
                            {qualityStatus}
                        </span>
                    </h1>

                    

                    
                </div>

                <span>
                    <button onClick={() => DeleteProduct(product.id)}>
                        제품삭제
                    </button>
                </span>

            </div>


            <section className="product-info-card quality-panel">

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
                        <span>최근 검사일시</span>
                        <strong>
                            {product.created_at}
                        </strong>
                    </div>

                </div>

            </section>


            <section className="inspection-card quality-panel">

                <div className="section-title">

                    <div>
                        <h2>품질검사</h2>
                        <p>
                            제품의 검사 결과와 세부 내용을 입력합니다.
                        </p>
                    </div>

                </div>


                <div className="inspection-form-grid">

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

            </section>


            <section className="inspection-history-card quality-panel">

                <div className="section-title">

                    <div>
                        <h2>검사 이력</h2>

                        <p>
                            제품의 이전 품질검사 결과입니다.
                        </p>
                    </div>

                </div>


                <div className="quality-table-shell">
                <table className="quality-table quality-data-table">

                    <thead>

                        <tr>
                            <th>검사일시</th>
                            <th>검사자</th>
                            <th>검사결과</th>
                            <th>비고</th>
                            <th>체크리스트</th>
                        </tr>

                    </thead>


                    
                    <tbody>
                        {inspectionHistory.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    등록된 검사 이력이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            inspectionHistory.map(item => (
                                <tr key={item.inspection_id}>
                                    <td>{item.created_at}</td>

                                    <td>{item.inspector || "-"}</td>

                                    <td>
                                        <span className={
                                            item.quality_status === "통과" ? "quality-status is-pass" : item.quality_status === "불합격" ? "quality-status is-fail" : "quality-status is-wait"
                                        }>
                                            {item.quality_status}
                                        </span>
                                    </td>

                                    <td>{item.memo || item.fail_reason || "-"}</td>

                                    <td>
                                        <button type="button" onClick={() => loadHistoryChecklist(item.inspection_id)}>
                                            보기
                                        </button>

                                        <button type="button" onClick= {() => DeleteInspectionList(item.inspection_id)}>삭제</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>


                </table>
                </div>

                {selectedInspectionId !== null && (
                        
                        <div className="quality-panel">
                            <h3>{selectedInspection?.created_at} {selectedInspection?.inspector} 검사자 체크리스트</h3>

                            {historyChecklist === null ? (
                                <p>불러오는 중...</p>
                            ) : historyChecklist.length === 0 ? (
                                <p>저장된 체크리스트가 없습니다.</p>
                            ) : (
                                <ul>
                                    {historyChecklist.map(item => (
                                        <li key={item.item_id}>
                                            {item.item_name} : {item.result}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <hr/>

            </section>

            <section className="quality-checklist quality-panel">

                <h2>품질 검사 체크리스트</h2>

                <div className="quality-score">
                    품질 점수 : <strong>{qualityScore}점 / 10점</strong> <h3>미실시 아이템 개수 : {undoItem.length}</h3>
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
                                className={item.result === "통과" ? "selected" : ""}
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
                                className={item.result === "불합격" ? "selected" : ""}
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
                                className={item.result === "미실시" ? "selected" : ""}
                                onClick={() =>
                                    changeChecklistResult(
                                        item.id,
                                        "미실시"
                                    )
                                }
                            >
                                미실시
                            </button>

                            
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

            <div className="detail-save-area">

                    <button
                        className="save-button erp-primary-button"
                        onClick={handleSave}
                    >
                        검사 결과 저장
                    </button>

            </div>

        </div>

    );
}

export default ProductDetail;