import React, { useState } from "react";
import QualityTestList from "./QualityTestList";

function Main() {

    const [products, setProducts] = useState([
        {
            id: 1,
            name: "수분크림",
            company: "ABC Cosmetics",
            status: "통과",
            inspectionDate: "2026-10-20"
        },
        {
            id: 2,
            name: "선크림",
            company: "ABC Cosmetics",
            status: "불합격",
            inspectionDate: "2026-10-20"
        },
        {
            id: 3,
            name: "클렌징폼",
            company: "ABC Cosmetics",
            status: "미실시",
            inspectionDate: "-"
        }
    ]);

    const passCount = products.filter(
        product => product.status === "통과"
    ).length;

    const failCount = products.filter(
        product => product.status === "불합격"
    ).length;

    const notTestedCount = products.filter(
        product => product.status === "미실시"
    ).length;

    return (
        <div className="main-container">

            <h1>품질보증 관리</h1>

            <p>
                화장품 제품의 품질검사 현황을 관리합니다.
            </p>


            <hr />


            <section>

                <h2>품질검사 현황</h2>

                <div>
                    <span>
                        전체 : {products.length}개 <br/>
                    </span>

                    <span>
                        통과 : {passCount}개 <br/>
                    </span>

                    <span>
                        불합격 : {failCount}개 <br/>
                    </span>

                    <span>
                        미실시 : {notTestedCount}개
                    </span>
                </div>
                <br/>

            </section>


            <hr />


            <QualityTestList/>

        </div>
    )
}

export default Main;