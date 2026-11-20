// 담당 화면: 재무 여러 화면에서 재사용
// 역할: 공통 PaginationTable을 재사용하며 재무 표의 자동 열 너비와 정렬을 보완
import React, { useId } from "react";
import PaginationTable from "../../../../../components/PaginationTable";

// 재무 목록의 열 너비는 내용에 따라 브라우저가 자동 계산합니다.
// columns는 열 정렬에만 사용하고, 공용 표에는 기존 props를 그대로 전달합니다.
export default function FinanceResourceTable(props) {
  const tableId = useId();
  const scope = `[data-finance-table="${tableId}"]`;
  const columns = props.columns || [];
  const alignmentRules = columns
    .map((column, index) => {
      let align = "left";
      if (["id", "status", "actions"].includes(column.key)) align = "center";
      if (["left", "center", "right"].includes(column.align)) align = column.align;
      return `
      ${scope} table tr > :nth-child(${index + 1}) {
        text-align: ${align} !important;
        vertical-align: middle;
      }
    `;
    })
    .join("\n");
  const tableProps = {
    ...props,
  };
  delete tableProps.columns;
  return (
    <div
      className="finance-resource-list finance-resource-table-ui"
      data-finance-table={tableId}
      style={{
        width: "100%",
        minWidth: 0,
      }}
    >
      <style>{`
        ${scope} table {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          table-layout: auto !important;
          box-sizing: border-box;
        }
        ${scope} table th,
        ${scope} table td {
          padding: 8px 10px !important;
          box-sizing: border-box;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        ${scope} table button {
          min-height: 30px !important;
          height: 30px !important;
          padding: 6px 8px !important;
          font-size: 12px !important;
          line-height: 16px !important;
          border-radius: 8px !important;
          white-space: nowrap;
          flex-shrink: 0;
          box-sizing: border-box;
          cursor: pointer;
        }
        ${scope} table button:disabled { cursor: default; }
        ${scope} .attendance-card {
          padding-bottom: 12px !important;
          min-width: 0;
        }
        ${scope} .attendance-card h4 {
          margin-top: 0 !important;
          margin-bottom: 10px !important;
        }
        ${scope} .table-shell {
          overflow-x: auto;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box;
        }

        ${alignmentRules}
      `}</style>
      <PaginationTable {...tableProps} />
    </div>
  );
}
