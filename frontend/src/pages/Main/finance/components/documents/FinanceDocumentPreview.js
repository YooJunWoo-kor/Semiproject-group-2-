// 담당 화면: 영수증·청구서·견적서
// 역할: 문서 번호·공급자/고객·품목·합계·비고·지급 안내의 인쇄용 표시
import React from "react";

function DocumentPartyPreview({ title, party }) {
  return (
    <div>
      <h2>{title}</h2>
      <p className="fdp-name">{party.name || "회사명 / 고객명"}</p>
      {party.businessNumber && <p>사업자번호 {party.businessNumber}</p>}
      {(party.address || party.city || party.country) && (
        <p>{[party.address, party.city, party.country].filter(Boolean).join(" ")}</p>
      )}
      {party.phone && <p>{party.phone}</p>}
      {party.email && <p>{party.email}</p>}
    </div>
  );
}

export default function FinanceDocumentPreview({ type, state }) {
  const { config, data, rows, totals, format, employeeName, nowDate, setPreviewElement } = state;
  return (
    <article
      className="finance-doc-paper"
      ref={setPreviewElement}
      aria-label={`${config.title} 미리보기`}
    >
      <div className="fdp-head">
        <div>
          <div className="fdp-muted">{config.en}</div>
          <h1>{config.title}</h1>
        </div>

        <div className="fdp-meta">
          <strong>{data.number || "저장 전"}</strong>
          <p>
            {config.date} {data.date}
          </p>

          {config.extraDate && (
            <p>
              {config.extraDate} {data.extraDate || "미입력"}
            </p>
          )}
        </div>
      </div>

      <div className="fdp-parties">
        <DocumentPartyPreview title="공급자" party={data.business} />
        <DocumentPartyPreview title={config.party} party={data.customer} />
      </div>

      <table>
        <thead>
          <tr>
            <th scope="col">품목 / 설명</th>
            <th scope="col">수량</th>
            <th scope="col">단가</th>
            <th scope="col">세율</th>
            <th scope="col">합계</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                {item.name || "품목명"}

                {item.description && <div className="fdp-description">{item.description}</div>}
              </td>
              <td>{item.quantity || "0"}</td>
              <td>{format(Number(item.unitPrice || 0))}</td>
              <td>{item.taxRate || "0"}%</td>
              <td>{format(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 문서 금액 합계 */}
      <div className="fdp-totals">
        <p>
          <span>공급가액</span>
          <span>{format(totals.supply)}</span>
        </p>
        <p>
          <span>부가세</span>
          <span>{format(totals.tax)}</span>
        </p>
        <p className="fdp-grand">
          <span>{config.total}</span>
          <span>{format(totals.total)}</span>
        </p>
      </div>

      {/* 비고 */}
      {data.note && (
        <div className="fdp-note">
          <h2>비고</h2>
          <p>{data.note}</p>
        </div>
      )}

      {type === "receipt" && <p>결제 방법: {data.method}</p>}
      {/* 청구서에만 표시 */}
      {type === "invoice" && (
        <div>
          <p>지급 방법: {data.method}</p>
          {data.method === "계좌이체" && <p>아래 계좌로 입금 부탁드립니다.</p>}

          {data.method === "계좌이체" && data.account && <p>{data.account}</p>}
        </div>
      )}

      {/* 모든 문서에 표시 */}
      <div className="fdp-footer">
        <p>담당 사원: {employeeName}</p>
        <p>작성일: {nowDate}</p>
      </div>
    </article>
  );
}
