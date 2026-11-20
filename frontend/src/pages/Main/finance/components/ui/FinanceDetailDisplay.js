// 담당 화면: 재무 여러 화면에서 재사용
// 역할: 상세 행·리소스 상세·상태 배지·요약 표시. Layout/Form/Button 일부를 재내보내 기존 import 호환
import React from "react";
import ColorTeg from "../../../../../components/ColorTeg";

export function FinanceDetailRows({ rows = [], emptyValue = null, labelWidth = "30%" }) {
  return (
    <>
      {rows.map(([label, value], index) => (
        <tr key={`${label}-${index}`}>
          <th
            scope="row"
            style={{
              width: labelWidth,
              padding: "12px 14px",
              textAlign: "left",
              verticalAlign: "top",
              background: "var(--color-canvas)",
              borderBottom: "1px solid var(--color-line)",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {label}
          </th>
          <td
            style={{
              padding: "12px 14px",
              textAlign: "left",
              verticalAlign: "top",
              borderBottom: "1px solid var(--color-line)",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {value ?? emptyValue}
          </td>
        </tr>
      ))}
    </>
  );
}
export function FinanceResourceDetails({ rows = [] }) {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
        }}
      >
        <colgroup>
          <col
            style={{
              width: "28%",
            }}
          />
          <col />
        </colgroup>
        <tbody>
          <FinanceDetailRows rows={rows} emptyValue="-" labelWidth="28%" />
        </tbody>
      </table>
    </div>
  );
}

// 상태 문구는 Model에서 전달하고, 작은 표에도 맞는 표시 스타일만 관리합니다.
export function FinanceStatusBadge({ tone = "", children }) {
  let color = "gray";
  if (tone === "status-success") color = "green";
  if (tone === "status-pending") color = "orange";
  if (tone === "status-danger") color = "red";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          zoom: 0.85,
        }}
      >
        <ColorTeg
          title={
            <span
              style={{
                display: "inline-block",
                textAlign: "center",
              }}
            >
              {children}
            </span>
          }
          count=""
          type=""
          color={color}
        />
      </div>
    </div>
  );
}

function summaryColor(item) {
  if (item.color) return item.color;
  if (item.key === "income") return "green";
  if (item.key === "expense") return "blue";
  if (item.key === "balance") return "purple";
  return "gray";
}

// 금액 계산·단위는 호출부에 두고, 기존 공통 ColorTeg로 표시합니다.
export function FinanceSummaryBox({ items = [] }) {
  return (
    <div
      aria-label="금액 요약"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px 20px",
        padding: 12,
        border: "1px solid var(--color-line)",
        borderRadius: 10,
      }}
    >
      {items.map((item) => (
        <ColorTeg
          key={item.key}
          title={`${item.label}:`}
          count={item.value ?? ""}
          type=""
          color={summaryColor(item)}
        />
      ))}
    </div>
  );
}

// 기존 import 경로를 유지하며 실제 구현은 역할별 UI 파일에서 관리합니다.
export { FinanceResourceModal, FinanceTwoColumn, FinanceLayoutColumn } from "./FinanceLayout";
export {
  FinanceField,
  FinanceControl,
  FinanceActions,
  FinanceSearchForm,
} from "./FinanceFormControls";
export { FinanceButton } from "./FinanceButton";
