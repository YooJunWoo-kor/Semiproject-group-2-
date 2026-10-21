import React from "react";

function QualityTestList() {

    const products = [
        {
            id: 1,
            code: "P001",
            name: "수분크림",
            company: "ABC Cosmetics",
            status: "통과",
            inspectionDate: "2026-10-20"
        },
        {
            id: 2,
            code: "P002",
            name: "선크림",
            company: "ABC Cosmetics",
            status: "불합격",
            inspectionDate: "2026-10-20"
        },
        {
            id: 3,
            code: "P003",
            name: "클렌징폼",
            company: "ABC Cosmetics",
            status: "미실시",
            inspectionDate: "-"
        }
    ];

    return (
        <div className="quality-test-list">

            <h1>품질검사 목록</h1>

            <p>
                제품별 품질검사 상태와 최근 검사일을 확인할 수 있습니다.
            </p>

            <table className="quality-table">

                <thead>
                    <tr>
                        <th>제품코드</th>
                        <th>제품명</th>
                        <th>제조회사</th>
                        <th>검사상태</th>
                        <th>최근 검사일</th>
                    </tr>
                </thead>

                <tbody>
                    {
                        products.map(product => (
                            <tr key={product.id}>

                                <td>{product.code}</td>

                                <td>{product.name}</td>

                                <td>{product.company}</td>

                                <td>
                                    <span
                                        className={
                                            product.status === "통과"? "status pass" : product.status === "불합격"? "status fail" : "status not-tested"
                                        }
                                    >
                                        {product.status}
                                    </span>
                                </td>

                                <td>{product.inspectionDate}</td>

                            </tr>
                        ))
                    }
                </tbody>

            </table>

            

        </div>
    )
}

export default QualityTestList;