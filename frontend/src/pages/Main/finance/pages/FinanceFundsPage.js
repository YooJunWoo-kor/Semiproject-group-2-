// 담당 화면: 자금 관리
// 역할: 전체 자금 요약과 법인카드·회사계좌 탭 전환을 담당합니다.
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import CorpCard from "./FinanceCorpCardsPage";
import BankAccount from "./FinanceBankAccountsPage";

// 기존 화면을 재사용하며 탭 전환 시 검색 조건과 페이지를 유지합니다.
export default function FinanceFundsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "accounts" ? "accounts" : "cards";
  const [cards, setCards] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [cardsBusy, setCardsBusy] = useState(false);
  const [accountsBusy, setAccountsBusy] = useState(false);
  const busy = cardsBusy || accountsBusy;
  function money(summary, key) {
    if (!summary || summary.loading) return "조회 중…";
    if (summary.error) return "조회 실패";
    return `${Number(summary[key]).toLocaleString("ko-KR")}원`;
  }
  function changeTab(tab) {
    if (busy || tab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, {
      replace: true,
    });
  }
  return (
    <div className="border-container finance-funds">
      <header className="dashboard-header">
        <h2 className="subtitle">자금 관리</h2>
      </header>
      <section className="finance-funds-summary" aria-label="전체 자금 현황">
        <article className="content-card">
          <h3>회사계좌 총잔액</h3>
          <strong>{money(accounts, "balance")}</strong>
          <p className="subtext">원화 계좌 기준 · 외화 제외</p>
        </article>
        <article className="content-card">
          <h3>법인카드 당월 사용액</h3>
          <strong>{money(cards, "usage")}</strong>
          <p className="subtext">전체 등록 카드 기준</p>
        </article>
        <article className="content-card">
          <h3>법인카드 잔여한도</h3>
          <strong>{money(cards, "remaining")}</strong>
          <p className="subtext">사용 중인 카드 기준</p>
        </article>
      </section>
      <div className="finance-workspace-tabs" role="group" aria-label="자금 관리 화면 선택">
        {[
          ["cards", "법인카드", cards],
          ["accounts", "회사계좌", accounts],
        ].map(([tab, label, summary]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "active" : ""}
            aria-pressed={activeTab === tab}
            aria-controls={`finance-funds-${tab}`}
            disabled={busy}
            onClick={() => changeTab(tab)}
          >
            {label}
            {summary && !summary.loading && !summary.error ? ` (${summary.count})` : ""}
          </button>
        ))}
      </div>
      <div id="finance-funds-cards" className="finance-funds-panel" hidden={activeTab !== "cards"}>
        <CorpCard embedded onSummaryChange={setCards} onBusyChange={setCardsBusy} />
      </div>
      <div
        id="finance-funds-accounts"
        className="finance-funds-panel"
        hidden={activeTab !== "accounts"}
      >
        <BankAccount embedded onSummaryChange={setAccounts} onBusyChange={setAccountsBusy} />
      </div>
    </div>
  );
}
