import React from "react";
import { NavLink, Navigate, Routes, Route } from "react-router-dom";
import Main from "./Main";
import QualityTestList from "./QualityTestList";
import ProductList from "./ProductList";
import QualityTestGraph from "./QualityTestGraph";

function QaRouter() {
    return (
        <div className="quality-shell">
            <nav className="module-subnav" aria-label="품질관리 하위 메뉴">
                <NavLink to="/main/qa" end>품질 대시보드</NavLink>
                <NavLink to="/main/qa/products">제품 목록</NavLink>
                <NavLink to="/main/qa/test-list">검사 목록</NavLink>
                <NavLink to="/main/qa/graph">분석 그래프</NavLink>
            </nav>
            <Routes>
                <Route index element={<Main />} />
                <Route path="manage/*" element={<QualityTestList />} />
                <Route path="products/*" element={<ProductList />} />
                <Route path="test-list/*" element={<QualityTestList />} />
                <Route path="graph/*" element={<QualityTestGraph />} />
                <Route path="*" element={<Navigate to="/main/qa" replace />} />
            </Routes>
        </div>
    );
}

export default QaRouter;
