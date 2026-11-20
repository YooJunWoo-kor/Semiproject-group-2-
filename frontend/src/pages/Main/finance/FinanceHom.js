// 담당 화면: 재무 전체
// 역할: 재무 메뉴 표시와 하위 페이지 라우팅을 담당합니다.
import FinanceFunds from "./pages/FinanceFundsPage";
import React from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import FinanceModul from "./FinanceModul";
import FinanceWorkspace from "./pages/FinanceTransactionWorkspace";
import Partners from "./pages/FinancePartnersPage";
import Nav from "../../../components/Nav";
import { canAccessFinance } from "./utils/financeDataUtils";
import { getLoginUser } from "../../../utils/authStorage";
import "../../../css/Form.css";
import "../../../css/Table.css";
import "../../../css/SubMain.css";
import "../../../css/ModalPopup.css";
import "../../../css/GroupBord.css";

function FinanceHome() {
  const mainUrl = "/main/finance";
  const loginUser = getLoginUser();

  // 재무 메뉴는 재무부 또는 MASTER 계정에 표시합니다.

  // 마스터이거나 재무부 소속이면 true
  const canShowFinanceMenu = canAccessFinance(loginUser);

  // 모든 부서에 보여줄 메뉴
  const commonMenus = [
    { name: "대시보드", url: mainUrl },
  ];

  // 재무부에만 보여줄 메뉴
  const financeMenus = [
    { name: "거래처 관리", url: mainUrl + "/partners" },
    { name: "지출·거래 관리", url: mainUrl + "/items" },
    { name: "자금 관리", url: mainUrl + "/funds" },
  ];

  // 기본적으로 공통 메뉴만 보여줍니다.
  let urlList = commonMenus;

  // 로그인한 사용자의 부서ID가 6이면 재무 메뉴도 추가합니다.
  if (canShowFinanceMenu) urlList = [...commonMenus, ...financeMenus];
  
  return (
    <div className="sub-main-contain finance-module">
      <Nav urlist={urlList} title="재무" />
      <Routes>
        <Route index element={<FinanceModul />} />
        <Route path="funds/*" element={<FinanceFunds />} />
        <Route path="corp-card/*" element={<Navigate to="/main/finance/funds?tab=cards" replace />} />
        <Route path="bank-account/*" element={<Navigate to="/main/finance/funds?tab=accounts" replace />} />
        <Route path="approval/*" element={<Navigate to="/main/finance/items?view=analysis" replace />} />
        <Route path="partners/*" element={<Partners />} />
        <Route path="items/*" element={<FinanceWorkspace />} />
        <Route path="*" element={<Navigate to="/main/finance" replace />} />
      </Routes>
    </div>
  );
}

// 기존 화면을 재사용하며 탭 전환 시 검색 조건과 페이지를 유지합니다.

export default FinanceHome;
