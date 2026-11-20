// 담당 화면: 지출·거래 관리 요약
// 역할: 지출·거래 분류별 현황 표시
import React from "react";
import { won, total } from "../../models/financePaymentOverviewModel";

export default function PaymentOverview({
  data,
  handleOverviewGroupSelect,
  loading,
  selectedCodes,
  tradeBusy,
}) {
  return (
    <section className="pm-overview-panel" aria-label="지출·수입 분류 요약">
      {[
        ["expense", "출금", "지출·매입 요약"],
        ["income", "입금", "수입·매출 요약"],
      ].map(([key, value, title]) => {
        const source = data.overview[key];
        return (
          <div className="pm-overview-card" key={key}>
            <div className="pm-panel-heading">
              <h4>{title}</h4>
              <strong>{won(source.summary.total)}</strong>
            </div>
            <div className="pm-overview-groups">
              {source.groups.map((group) => {
                const keys = group.items.map((item) => `${value}:${item.code}`);
                const selected =
                  keys.length === selectedCodes.length &&
                  keys.every((code) => selectedCodes.includes(code));
                return (
                  <button
                    type="button"
                    key={group.id}
                    className="pm-category-button"
                    aria-pressed={selected}
                    disabled={loading || tradeBusy}
                    onClick={() => handleOverviewGroupSelect(value, keys, selected)}
                  >
                    <span>{group.label}</span>
                    <strong>
                      {won(total(source.entries.filter((row) => row.group_id === group.id)))}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
