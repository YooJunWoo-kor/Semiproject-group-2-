// 담당 화면: 거래처 관리
// 역할: 목록의 열 정의와 행 데이터를 구성합니다. 제목·셀 표시·정렬·관리 버튼을 수정할 때 확인합니다.
import { getPartnerBalanceLabel } from "../../models/financePartnerModel";
import React from "react";

export default function createPartnerTableData({
  deleting,
  filteredPartners,
  openAmountDetail,
  openPartnerDetail,
  saving,
}) {
  // PaginationTable 규격 데이터 매핑 ({ content: [...] })
  const tPartnerData = filteredPartners.map((item) => ({
    content: [
      item.id,
      <button
        type="button"
        className="finance-partner-link"
        disabled={saving || deleting}
        onClick={() => openPartnerDetail(item.id)}
      >
        {item.name}
      </button>,
      ...["매출", "매입"].map((type) => (
        <button
          key={type}
          type="button"
          className="finance-partner-link"
          onClick={() => openAmountDetail(item, type)}
          aria-label={`${item.name} ${type === "매출" ? "받을" : "지급할"} 금액 상세정보`}
        >
          {getPartnerBalanceLabel(item, type)}
        </button>
      )),
    ],
  }));
  return tPartnerData;
}
