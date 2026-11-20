// 담당 화면: 자금관리 → 법인카드
// 역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.
import { FinanceStatusBadge } from "../ui/FinanceDetailDisplay";
import React from "react";
import { getCorpCardStatusLabel, getCorpCardStatusTone, getCorpCardStatusActionLabel, } from "../../models/financeCorpCardModel";

export default function createCorpCardTableData({
  cardSaving,
  filteredCards,
  handleCardStatusChange,
  limitSaving,
  openCardDetail,
  openCardHistory,
  statusSavingId,
}) {
  // 목록 수정은 이 배열에서만 합니다.
  // label: 제목 / field: 표시할 카드 데이터 / render: 버튼·배지 등 별도 표시
  // 항목을 이동하거나 삭제하면 제목과 내용이 함께 변경됩니다.
  const cardColumns = [
    {
      key: "id",
      label: "ID",
      field: "id",
    },
    {
      key: "name",
      label: "법인카드 명",
      render: (card) => <strong>{card.cardName}</strong>,
    },
    {
      key: "department",
      label: "발급부서",
      field: "department",
    },
    {
      key: "manager",
      label: "관리자",
      field: "managerName",
    },
    {
      key: "status",
      label: (
        <span
          style={{ display: "block", textAlign: "center", }}
        >
          상태
        </span>
      ),
      render: (card) => (
        <FinanceStatusBadge tone={getCorpCardStatusTone(card.status)}>
          {getCorpCardStatusLabel(card.status)}
        </FinanceStatusBadge>
      ),
    },
    {
      key: "actions",
      label: "관리",
      render: (card) => (
        <div
          style={{ display: "inline-flex", gap: 4, flexWrap: "nowrap", whiteSpace: "nowrap", }}
        >
          <button
            type="button"
            disabled={cardSaving || limitSaving || statusSavingId !== null}
            onClick={() => openCardDetail(card.id)}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 8px",
            }}
          >
            상세
          </button>
          <button
            type="button"
            disabled={cardSaving || limitSaving || statusSavingId !== null}
            onClick={() => openCardHistory(card.id)}
            style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 8px", }}
          >
            거래내역
          </button>
          <button
            type="button"
            disabled={
              statusSavingId !== null ||
              cardSaving ||
              limitSaving ||
              !["사용", "ACTIVE", "STOP"].includes(card.status)
            }
            onClick={() => handleCardStatusChange(card)}
            style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 8px", }}
          >
            {getCorpCardStatusActionLabel(card, statusSavingId)}
          </button>
        </div>
      ),
    },
  ];

  // 제목과 셀을 같은 설정에서 생성합니다.
  const cardHeaders = cardColumns.map((column) => column.label);
  const tCardData = filteredCards.map((card) => ({
    content: cardColumns.map((column) => (
      <React.Fragment key={column.key}>
        {column.render ? column.render(card) : (card[column.field] ?? "-")}
      </React.Fragment>
    )),
  }));
  return {
    cardColumns,
    cardHeaders,
    tCardData,
  };
}
