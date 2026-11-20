// 담당 화면: 거래처 관리
// 역할: 거래처 금액 상세와 조회 기간 선택
import { getPartnerRemainingLabel } from "../../models/financePartnerModel";
import React from "react";
import { FinanceSummaryBox, FinanceResourceModal } from "../ui/FinanceDetailDisplay";
import { shiftPartnerMonth } from "../../models/financePartnerModel";

export default function PartnerBalanceModal({
  allAmountPeriods,
  amountDetail,
  amountMonth,
  amountRows,
  setAllAmountPeriods,
  setAmountDetail,
  setAmountMonth,
}) {
  function renderAmountRows() {
    if (amountRows.length === 0)
      return (
        <tr>
          <td colSpan={6}>선택한 기간의 거래 내역이 없습니다.</td>
        </tr>
      );

    return amountRows.map((row) => (
      <tr key={row.transaction_id}>
        <td>{row.transaction_id}</td>
        <td>{row.trade_date || "-"}</td>
        <td>{row.due_date || "-"}</td>
        <td>
          {row.total_amount == null
            ? "품목 확인 필요"
            : `${Number(row.total_amount).toLocaleString()}원`}
        </td>
        <td>{Number(row.paid_amount).toLocaleString()}원</td>
        <td>
          {row.remaining_amount == null
            ? "확인 필요"
            : `${Number(row.remaining_amount).toLocaleString()}원`}
        </td>
      </tr>
    ));
  }
  function renderAmountContent() {
    if (amountDetail.loading) return <p role="status">금액 내역을 불러오는 중입니다.</p>;

    if (amountDetail.error) return <p role="alert">{amountDetail.error}</p>;

    return (
      <>
        <FinanceSummaryBox
          items={[
            {
              key: "remaining",
              label: `${allAmountPeriods ? "전체 기간" : "선택 월"} 남은 금액 합계`,
              value: getPartnerRemainingLabel(amountRows),
            },
          ]}
        />
        <div
          className="table-shell"
          style={{ overflowX: "auto", border: "1px solid var(--color-line)", borderRadius: 12, }}
        >
          <table
            style={{ width: "100%", minWidth: 640, tableLayout: "fixed", }}
          >
            <thead>
              <tr>
                {["거래 번호", "거래일", "마감일", "거래 총액", "정산 완료액", "남은 금액"].map(
                  (label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>{renderAmountRows()}</tbody>
          </table>
        </div>
      </>
    );
  }
  return (
    <FinanceResourceModal
      title={`${amountDetail.partner.name} · ${amountDetail.type === "매출" ? "받을 금액" : "지급할 금액"} 상세`}
      onClose={() => setAmountDetail(null)}
    >
      <section
        className="finance-partner-amount-content"
        aria-label="금액 상세정보"
        style={{ display: "flex", flexDirection: "column", gap: 12, }}
      >
        <div
          style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 8, }}
        >
          <label
            style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: 4, margin: 0, whiteSpace: "nowrap", }}
          >
            <input
              type="checkbox"
              checked={allAmountPeriods}
              onChange={(event) => setAllAmountPeriods(event.target.checked)}
            />
            전체 기간
          </label>
          <div
            style={{ display: "inline-flex", alignItems: "center", gap: 8, }}
          >
            <button
              type="button"
              aria-label="이전 월"
              disabled={allAmountPeriods}
              onClick={() => setAmountMonth((month) => shiftPartnerMonth(month, -1))}
            >
              ◀
            </button>
            <label
              htmlFor="partner-amount-month"
              style={{ margin: 0, whiteSpace: "nowrap", }}
            >
              조회 월
            </label>
            <input
              style={{ width: 145, margin: 0, boxSizing: "border-box", }}
              id="partner-amount-month"
              type="month"
              value={amountMonth}
              disabled={allAmountPeriods}
              min="1900-01"
              max="9999-12"
              onChange={(event) => {
                if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(event.target.value))
                  setAmountMonth(event.target.value);
              }}
            />
            <button
              type="button"
              aria-label="다음 월"
              disabled={allAmountPeriods}
              onClick={() => setAmountMonth((month) => shiftPartnerMonth(month, 1))}
            >
              ▶
            </button>
          </div>
        </div>
        {renderAmountContent()}
      </section>
    </FinanceResourceModal>
  );
}
