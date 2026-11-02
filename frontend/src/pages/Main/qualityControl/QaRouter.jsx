import React from "react";
import { NavLink, Navigate, Routes, Route } from "react-router-dom";
import Main from "./Main";
import QualityTestList from "./pages/QualityTestList";
import ProductList from "./pages/ProductList";
import QualityTestGraph from "./pages/QualityTestGraph";
import ProductDetail from "./pages/ProductDetail";
import Nav from '../../../components/Nav.js';

function QaRouter() {
    let mainUrl = "/main/qa/"
    const urlList = [
        {name:"품질 대시보드", url:mainUrl+"/*"}
        ,{name:"제품 목록", url:mainUrl+"/products"}
        ,{name:"검사 목록", url:mainUrl+"/test-list"}
        ,{name:"분석 그래프", url:mainUrl+"/graph"}
    ];

    return (
        <div className='sub-main-contain'>
            <Nav urlist={urlList}/>
            <Routes>
                <Route index element={<Main />} />
                <Route path="manage/*" element={<QualityTestList />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/:id" element={<ProductDetail />}/>
                <Route path="test-list/*" element={<QualityTestList />} />
                <Route path="graph/*" element={<QualityTestGraph />} />
                <Route path="*" element={<Navigate to="/main/qa" replace />} />
            </Routes>
        </div>
    );
}

export default QaRouter;
