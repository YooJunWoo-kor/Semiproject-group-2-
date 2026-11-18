import { getPartnerBalanceLabel } from "./partnerModel";
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
