// 담당 화면: 대시보드의 지급 요약
// 역할: 기간별 지급총액·지급예정을 표시하고 각 요약의 조회 기간을 관리합니다.
import React, { useState } from "react";
import { PERIODS, PERIOD_TEXT, getDashboardRangeText, getDashboardAmountText, } from "../../models/financeDashboardModel";

export default function FinancePaymentSummary({ title, kind, data, loading }) {
  // 두 요약의 기간 선택은 서로 독립적입니다.
  const [period, setPeriod] = useState("day");
  const range = data?.ranges?.[period];
  return (
    <section className={`fd-summary fd-summary-${kind}`} aria-label={title}>
      <div className="fd-summary-heading">
        <h2>{title}</h2>

        <ul className="fd-periods grouplist" role="group" aria-label={`${title} 조회 기간`}>
          {PERIODS.map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                aria-pressed={period === key}
                className={period === key ? "active" : ""}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="fd-amount-area" aria-live="polite">
        <p className="fd-date subtext">{getDashboardRangeText(range)}</p>

        <p className="fd-amount">{getDashboardAmountText(data, kind, period, loading)}</p>

        <p className="fd-caption subtext">
          {PERIOD_TEXT[period]} 지급 {kind === "completed" ? "완료" : "예정"} 금액
        </p>
      </div>
    </section>
  );
}
