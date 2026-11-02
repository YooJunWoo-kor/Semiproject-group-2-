import React, { useState } from "react";
import { useParams } from "react-router-dom";
import products from "./product";
import defaultQualityChecklist from "./QualityChecklist";
import { calculateQualityScore } from "./utils/qualityScore";

function ProductDetail() {
  const { id } = useParams();

  const product = products.find((item) => item.id === Number(id));

  const [checklist, setChecklist] = useState(
    defaultQualityChecklist.map((item) => ({
      ...item,
      result: "미실시",
    }))
  );
  const [newChecklistName, setNewChecklistName] = useState("");

  const [qualityStatus, setQualityStatus] = useState(
    product?.qualityStatus || "미실시"
  );
  const [inspectionDate, setInspectionDate] = useState(
    product?.inspectionDate === "-" ? "" : product?.inspectionDate || ""
  );
  const [inspector, setInspector] = useState("");
  const [failReason, setFailReason] = useState("");
  const [memo, setMemo] = useState(product?.memo || "");

  const qualityScore = calculateQualityScore(checklist);

  if (!product) {
    return <p>제품을 찾을 수 없습니다.</p>;
  }

  const changeChecklistResult = (itemId, result) => {
    setChecklist((currentChecklist) =>
      currentChecklist.map((item) =>
        item.id === itemId ? { ...item, result } : item
      )
    );
  };

  const addChecklistItem = () => {
    const name = newChecklistName.trim();

    if (!name) {
      return;
    }

    setChecklist((currentChecklist) => [
      ...currentChecklist,
      {
        id: Date.now(),
        name,
        description: "관리자 추가 항목",
        result: "미실시",
        custom: true,
      },
    ]);

    setNewChecklistName("");
  };

  const handleSave = () => {
    const inspectionData = {
      productId: product.id,
      qualityStatus,
      inspectionDate,
      inspector,
      failReason,
      memo,
      checklist,
      qualityScore,
    };

    console.log(inspectionData);
    alert("검사 결과가 저장되었습니다.");
  };

  const statusClass =
    qualityStatus === "통과"
      ? "status pass"
      : qualityStatus === "불합격"
        ? "status fail"
        : "status not-tested";

  return (
    <div className="product-detail-page">
      <div className="detail-top">
        <div>
          <h1>{product.name}</h1>
          <p>
            {product.code} · {product.company}
          </p>
        </div>

        <span className={statusClass}>{qualityStatus}</span>
      </div>

      <section className="product-info-card">
        <div className="detail-image-area">
          <img src={product.image} alt={product.name} />
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
            <strong>{product.price.toLocaleString()}원</strong>
          </div>
          <div>
            <span>재고</span>
            <strong>{product.stock}개</strong>
          </div>
          <div>
            <span>최근 검사일</span>
            <strong>{product.inspectionDate}</strong>
          </div>
        </div>
      </section>

      <section className="inspection-card">
        <div className="section-title">
          <div>
            <h2>품질검사</h2>
            <p>제품의 검사 결과와 세부 내용을 입력합니다.</p>
          </div>
        </div>

        <div className="inspection-form-row">
          <label>검사 상태</label>
          <div className="quality-status-buttons">
            {["통과", "불합격", "미실시"].map((status) => (
              <button
                key={status}
                type="button"
                className={qualityStatus === status ? "selected" : ""}
                onClick={() => setQualityStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="inspection-form-grid">
          <div>
            <label htmlFor="inspectionDate">검사일</label>
            <input
              id="inspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(event) => setInspectionDate(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="inspector">검사자</label>
            <input
              id="inspector"
              type="text"
              value={inspector}
              onChange={(event) => setInspector(event.target.value)}
              placeholder="검사자 이름"
            />
          </div>
        </div>

        {qualityStatus === "불합격" && (
          <div className="inspection-form-row">
            <label htmlFor="failReason">불합격 사유</label>
            <textarea
              id="failReason"
              value={failReason}
              onChange={(event) => setFailReason(event.target.value)}
              placeholder="불합격 사유를 입력하세요."
            />
          </div>
        )}

        <div className="inspection-form-row">
          <label htmlFor="memo">내부 메모</label>
          <textarea
            id="memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="검사 관련 메모를 입력하세요."
          />
        </div>
      </section>

      <section className="quality-checklist">
        <h2>품질 검사 체크리스트</h2>

        <div className="quality-score">
          품질 점수: <strong>{qualityScore}점 / 10점</strong>
        </div>

        {checklist.map((item) => (
          <div key={item.id} className="checklist-item">
            <div>
              <strong>{item.name}</strong>
              <p>{item.description}</p>
            </div>

            <div>
              {["통과", "불합격", "미실시"].map((result) => (
                <button
                  key={result}
                  type="button"
                  onClick={() => changeChecklistResult(item.id, result)}
                >
                  {result}
                </button>
              ))}
              <span>현재 결과: {item.result}</span>
            </div>
          </div>
        ))}

        <div className="checklist-add">
          <input
            type="text"
            value={newChecklistName}
            onChange={(event) => setNewChecklistName(event.target.value)}
            placeholder="추가 검사 항목"
          />
          <button type="button" onClick={addChecklistItem}>
            검사 항목 추가
          </button>
        </div>
      </section>

      <section className="inspection-history-card">
        <div className="section-title">
          <div>
            <h2>검사 이력</h2>
            <p>제품의 이전 품질검사 결과입니다.</p>
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
              <td>{product.inspectionDate}</td>
              <td>-</td>
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
              <td>{product.memo || "-"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="detail-save-area">
        <button className="save-button" onClick={handleSave}>
          검사 결과 저장
        </button>
      </div>
    </div>
  );
}

export default ProductDetail;