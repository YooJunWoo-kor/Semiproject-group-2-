import React from "react";
import { Link, useLocation } from "react-router-dom";

function SelectBar() {
    const location = useLocation();

    const segments = location.pathname.split("/").filter(Boolean);

    const basePath = segments.length >= 2 
        ? `/${segments[0]}/${segments[1]}` 
        : `/${segments[0] || 'quality'}`;

    return (
        <div className="erp-top-nav">
            {/* 시스템 최상단 홈으로 이동 */}
            <Link to="/">홈</Link>

            {/* 현재 상위 주소(basePath) 뒤에 하위 메뉴들을 결합 */}
            <Link to={`${basePath}/manage`}>품질관리</Link>
            <Link to={`${basePath}/products`}>제품</Link>

            <div className="quality-menu">
                <span>품질검사</span>
                <div className="quality-sub-menu">
                    <Link to={`${basePath}/test-list`}>품질검사목록</Link>
                </div>
            </div>

            <Link to={`${basePath}/graph`}>분석 그래프</Link>
        </div>
    );
}

export default SelectBar;