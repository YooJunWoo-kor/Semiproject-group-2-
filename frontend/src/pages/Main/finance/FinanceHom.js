import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import FinanceModul from './FinanceModul';
import CorpCard from './pages/CorpCard';
import BankAccount from './pages/BankAccount';
import Approval from './pages/Approval';
import Partners from './pages/Partners';
import Items from './pages/Items';
import Nav from '../../../components/Nav';

function FinanceHome() {
    let mainUrl = "/main/finance/"
    const urlList = [
        {name:"대시보드", url:mainUrl+"/*"}
        ,{name:"법인카드 관리", url:mainUrl+"/corp-card"}
        ,{name:"회사계좌 관리", url:mainUrl+"/bank-account"}
        ,{name:"결제(지출)승인", url:mainUrl+"/approval"}
        ,{name:"거래처 관리", url:mainUrl+"/partners"}
        ,{name:"매입/매출 품목관리", url:mainUrl+"/items"}
    ];
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
