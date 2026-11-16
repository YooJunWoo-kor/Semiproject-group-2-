import React, { useState } from 'react';
import { Navigate, Routes, Route, useSearchParams } from 'react-router-dom';
import FinanceModul from './FinanceModul';
import CorpCard from './pages/CorpCard';
import BankAccount from './pages/BankAccount';
import FinanceWorkspace from './pages/FinanceWorkspace';
import Partners from './pages/Partners';
import Nav from '../../../components/Nav';
import { getLoginUser } from "../../../utils/authStorage";
import "../../../css/Form.css";
import "../../../css/Table.css";
import "../../../css/SubMain.css";
import "../../../css/ModalPopup.css";
import "../../../css/GroupBord.css";


function FinanceHome() {
  const mainUrl = "/main/finance";
  const loginUser = getLoginUser();

  // 마스터이거나 재무부 소속이면 true
  const canAccessFinance = loginUser?.role === "MASTER" || String(loginUser?.department_id) === "1";

  // 모든 부서에 보여줄 메뉴
  const commonMenus = [{
    name: "대시보드",
    url: mainUrl
  }];

  // 재무부에만 보여줄 메뉴
  const financeMenus = [{
    name: "거래처 관리",
    url: mainUrl + "/partners"
  }, {
    name: "지출·거래 관리",
    url: mainUrl + "/items"
  }, {
    name: "자금 관리",
    url: mainUrl + "/funds"
  }];

  // 기본적으로 공통 메뉴만 보여줍니다.
  let urlList = commonMenus;

  // 로그인한 사용자의 부서ID가 1이면 재무 메뉴도 추가합니다.
  if (canAccessFinance) {
    urlList = [...commonMenus, ...financeMenus];
  }
  return <div className="sub-main-contain finance-module">
            <Nav urlist={urlList} title='재무' />
            <Routes>
                <Route index element={<FinanceModul />} />
                <Route path='funds/*' element={<FinanceFunds />} />
                <Route path='corp-card/*' element={<Navigate to="/main/finance/funds?tab=cards" replace />} />
                <Route path='bank-account/*' element={<Navigate to="/main/finance/funds?tab=accounts" replace />} />
                <Route path='approval/*' element={<Navigate to="/main/finance/items?view=analysis" replace />} />
                <Route path='partners/*' element={<Partners />} />
                <Route path='items/*' element={<FinanceWorkspace />} />
                <Route path='*' element={<Navigate to="/main/finance" replace />} />
            </Routes>
        </div>;
}

// 기존 화면을 재사용하며 탭 전환 시 검색 조건과 페이지를 유지합니다.
function FinanceFunds() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'accounts' ? 'accounts' : 'cards';
  const [cards, setCards] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [cardsBusy, setCardsBusy] = useState(false);
  const [accountsBusy, setAccountsBusy] = useState(false);
  const busy = cardsBusy || accountsBusy;
  const money = (summary, key) => !summary || summary.loading ? '조회 중…' : summary.error ? '조회 실패' : `${Number(summary[key]).toLocaleString('ko-KR')}원`;
  function changeTab(tab) {
    if (busy || tab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, {
      replace: true
    });
  }
  return <div className="border-container finance-funds">
            <header className="dashboard-header">
                <h2 className="subtitle">자금 관리</h2>
            </header>
            <section className="finance-funds-summary" aria-label="전체 자금 현황">
                <article className="content-card">
                    <h3>회사계좌 총잔액</h3>
                    <strong>{money(accounts, 'balance')}</strong>
                    <p className="subtext">원화 계좌 기준 · 외화 제외</p>
                </article>
                <article className="content-card">
                    <h3>법인카드 당월 사용액</h3>
                    <strong>{money(cards, 'usage')}</strong>
                    <p className="subtext">전체 등록 카드 기준</p>
                </article>
                <article className="content-card">
                    <h3>법인카드 잔여한도</h3>
                    <strong>{money(cards, 'remaining')}</strong>
                    <p className="subtext">사용 중인 카드 기준</p>
                </article>
            </section>
            <div className="finance-workspace-tabs" role="group" aria-label="자금 관리 화면 선택">
                {[['cards', '법인카드', cards], ['accounts', '회사계좌', accounts]].map(([tab, label, summary]) => <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} aria-pressed={activeTab === tab} aria-controls={`finance-funds-${tab}`} disabled={busy} onClick={() => changeTab(tab)}>
                        {label}{summary && !summary.loading && !summary.error ? ` (${summary.count})` : ''}
                    </button>)}
            </div>
            <div id="finance-funds-cards" className="finance-funds-panel" hidden={activeTab !== 'cards'}>
                <CorpCard embedded onSummaryChange={setCards} onBusyChange={setCardsBusy} />
            </div>
            <div id="finance-funds-accounts" className="finance-funds-panel" hidden={activeTab !== 'accounts'}>
                <BankAccount embedded onSummaryChange={setAccounts} onBusyChange={setAccountsBusy} />
            </div>
        </div>;
}
export default FinanceHome;
