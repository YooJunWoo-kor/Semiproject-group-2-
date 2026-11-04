import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import FinanceModul from './FinanceModul';
import CorpCard from './pages/CorpCard';
import BankAccount from './pages/BankAccount';
import Approval from './pages/Approval';
import Partners from './pages/Partners';
import Items from './pages/Items';
import Nav from '../../../components/Nav';
import { getLoginUser } from "../../../utils/authStorage";

// function FinanceHome() {
//     let mainUrl = "/main/finance/"
//     const urlList = [
//         {name:"대시보드", url:mainUrl+"/*"}
//         ,{name:"법인카드 관리", url:mainUrl+"/corp-card"}
//         ,{name:"회사계좌 관리", url:mainUrl+"/bank-account"}
//         ,{name:"결제(지출)승인", url:mainUrl+"/approval"}
//         ,{name:"거래처 관리", url:mainUrl+"/partners"}
//         ,{name:"매입/매출 품목관리", url:mainUrl+"/items"}
//     ];

function FinanceHome() {
    const mainUrl = "/main/finance";
    const loginUser = getLoginUser();

    // 마스터이거나 재무부 소속이면 true
    const canAccessFinance =
        loginUser?.role === "MASTER" ||
        String(loginUser?.department_id) === "1";

    // 모든 부서에 보여줄 메뉴
    const commonMenus = [
        { name: "대시보드", url: mainUrl },
        { name: "거래처 관리", url: mainUrl + "/partners" },
        { name: "매입/매출 품목관리", url: mainUrl + "/items" }
    ];

    // 재무부에만 보여줄 메뉴
    const financeMenus = [
        { name: "법인카드 관리", url: mainUrl + "/corp-card" },
        { name: "회사계좌 관리", url: mainUrl + "/bank-account" },
        { name: "결제(지출)승인", url: mainUrl + "/approval" }
    ];

    // 기본적으로 공통 메뉴만 보여줍니다.
    let urlList = commonMenus;

    // 로그인한 사용자의 부서ID가 1이면 재무 메뉴도 추가합니다.
    if (canAccessFinance) {
        urlList = [...commonMenus, ...financeMenus];
    }
    


    return (
        <div className='sub-main-contain'>
            <Nav urlist={urlList}/>
            <Routes>
                <Route index element={<FinanceModul />}/>
                <Route path='corp-card/*' element={<CorpCard />}/>
                <Route path='bank-account/*' element={<BankAccount />}/>
                <Route path='approval/*' element={<Approval />}/>
                <Route path='partners/*' element={<Partners />}/>
                <Route path='items/*' element={<Items />}/>
                <Route path='*' element={<Navigate to="/main/finance" replace />}/>
            </Routes>
        </div>
    );
}

export default FinanceHome;
