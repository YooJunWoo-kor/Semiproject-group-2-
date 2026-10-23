import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import FinanceModul from './FinanceModul';
import CorpCard from './pages/CorpCard';
import BankAccount from './pages/BankAccount';
import Approval from './pages/Approval';
import Partners from './pages/Partners';
import Items from './pages/Items';

function FinanceHome() {
    return (
        <Routes>
            <Route index element={<FinanceModul />}/>
            <Route path='corp-card/*' element={<CorpCard />}/>
            <Route path='bank-account/*' element={<BankAccount />}/>
            <Route path='approval/*' element={<Approval />}/>
            <Route path='partners/*' element={<Partners />}/>
            <Route path='items/*' element={<Items />}/>
            <Route path='*' element={<Navigate to="/main/finance" replace />}/>
        </Routes>
    );
}

export default FinanceHome;
