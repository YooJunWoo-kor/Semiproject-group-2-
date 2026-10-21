import React from "react";
import { Link } from "react-router-dom";

function SelectBar() {

    return (
        <div className="select-bar">

            <Link to="/">
                홈
            </Link>

            <Link to="/Manage">
                품질관리
            </Link>

            <Link to="/products">
                제품
            </Link>
            <div className="quality-menu">

                <span>품질검사</span>

                <div className="quality-sub-menu">
                    <Link to="/TestList">
                        품질검사목록
                    </Link>
                </div>

            </div>

            <Link to="Graph">
                분석 그래프
            </Link>

        </div>
    )
}

export default SelectBar;