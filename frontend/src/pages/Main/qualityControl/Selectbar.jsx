import React from "react";
import { Link } from "react-router-dom";

function SelectBar() {

    return (
        <div className="select-bar">

            <Link to="/">
                대시보드
            </Link>

            <Link to="/products">
                제품
            </Link>

            <div className="quality-menu">

                <span>
                    품질관리
                </span>

                <div className="quality-sub-menu">

                    <Link to="/TestList">
                        품질검사목록
                    </Link>

                </div>

            </div>


            <Link to="/Graph">
                분석
            </Link>

        </div>
    );
}

export default SelectBar;