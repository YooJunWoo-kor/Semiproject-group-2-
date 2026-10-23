<<<<<<< HEAD
import React, { useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import products from "../product";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);


function QualityTestGraph() {

    const [graphType, setGraphType] = useState("result");


    const passCount = products.filter(
        product => product.qualityStatus === "통과"
    ).length;

    const failCount = products.filter(
        product => product.qualityStatus === "불합격"
    ).length;

    const notTestedCount = products.filter(
        product => product.qualityStatus === "미실시"
    ).length;


    const testedCount = passCount + failCount;

    const passRate =
        testedCount === 0
            ? 0
            : Math.round((passCount / testedCount) * 100);
            // 통과율 계산식


    const resultData = {

        labels: [
            "미실시",
            "통과",
            "불합격"
        ],

        datasets: [
            {
                label: "제품 수",

                data: [
                    notTestedCount,
                    passCount,
                    failCount
                ]
            }
        ]
    };


    const passRateData = {

        labels: [
            "통과",
            "불합격"
        ],

        datasets: [
            {
                label: "검사 제품 수",

                data: [
                    passCount,
                    failCount
                ]
            }
        ]
    };


    const barOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                position: "top"
            },

            title: {
                display: true,
                text: "품질검사 결과 현황"
            }
        },

        scales: {

            y: {
                beginAtZero: true,

                ticks: {
                    precision: 0
                }
            }
        }
    };
    // Chart.js에서 막대그래프 모양과 동작을 설정하는 옵션 객체


    const pieOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                position: "bottom"
            },

            title: {
                display: true,
                text: "품질검사 통과 비율"
            }
        }
    };
    // 원형그래프 모양과 동작을 설정하는 옵션 객체


    return (

        <div className="quality-graph-page">


            <div className="page-header">

                <h1>
                    품질검사 분석
                </h1>

                <p>
                    품질검사 결과와 통과 비율을 분석합니다.
                </p>

            </div>


            <div className="graph-summary">

                <div className="graph-summary-card">
                    <span>전체 제품</span>
                    <strong>
                        {products.length}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>통과</span>
                    <strong>
                        {passCount}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>불합격</span>
                    <strong>
                        {failCount}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>통과율</span>
                    <strong>
                        {passRate}%
                    </strong>
                </div>

            </div>


            <div className="graph-control">

                <label>
                    그래프 선택
                </label>

                <select
                    value={graphType}
                    onChange={(e) =>
                        setGraphType(e.target.value)
                    }
                >

                    <option value="result">
                        검사 결과 현황
                    </option>

                    <option value="passRate">
                        품질검사 통과 비율
                    </option>

                </select>

            </div>


            <div className="graph-card">


                {graphType === "result" && (

                    <>
                        <h2>
                            검사 결과 현황
                        </h2>

                        <div className="quality-chart">

                            <Bar
                                data={resultData}
                                options={barOptions}
                            />
                            {/* resultData
                                → 그래프에 들어갈 실제 데이터

                                barOptions
                                → 그래프를 어떻게 보여줄지 설정

                                ↓ 둘 다 전달

                                <Bar />

                                ↓
                                막대그래프 출력 */}

                        </div>
                    </>

                )}


                {graphType === "passRate" && (

                    <>
                        <div className="pass-rate-header">

                            <div>

                                <h2>
                                    품질검사 통과 비율
                                </h2>

                                <p>
                                    검사가 완료된 제품을 기준으로 계산합니다.
                                </p>

                            </div>


                            <div className="pass-rate-number">

                                <strong>
                                    {passRate}%
                                </strong>

                                <span>
                                    통과율
                                </span>

                            </div>

                        </div>


                        <div className="pie-chart">

                            <Pie
                                data={passRateData}
                                options={pieOptions}
                            />

                        </div>

                    </>

                )}


            </div>

        </div>
    );
}

=======
import React, { useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import products from "../product";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);


function QualityTestGraph() {

    const [graphType, setGraphType] = useState("result");


    const passCount = products.filter(
        product => product.qualityStatus === "통과"
    ).length;

    const failCount = products.filter(
        product => product.qualityStatus === "불합격"
    ).length;

    const notTestedCount = products.filter(
        product => product.qualityStatus === "미실시"
    ).length;


    const testedCount = passCount + failCount;

    const passRate =
        testedCount === 0
            ? 0
            : Math.round((passCount / testedCount) * 100);
            // 통과율 계산식


    const resultData = {

        labels: [
            "미실시",
            "통과",
            "불합격"
        ],

        datasets: [
            {
                label: "제품 수",

                data: [
                    notTestedCount,
                    passCount,
                    failCount
                ]
            }
        ]
    };


    const passRateData = {

        labels: [
            "통과",
            "불합격"
        ],

        datasets: [
            {
                label: "검사 제품 수",

                data: [
                    passCount,
                    failCount
                ]
            }
        ]
    };


    const barOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                position: "top"
            },

            title: {
                display: true,
                text: "품질검사 결과 현황"
            }
        },

        scales: {

            y: {
                beginAtZero: true,

                ticks: {
                    precision: 0
                }
            }
        }
    };
    // Chart.js에서 막대그래프 모양과 동작을 설정하는 옵션 객체


    const pieOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                position: "bottom"
            },

            title: {
                display: true,
                text: "품질검사 통과 비율"
            }
        }
    };
    // 원형그래프 모양과 동작을 설정하는 옵션 객체


    return (

        <div className="quality-graph-page">


            <div className="page-header">

                <h1>
                    품질검사 분석
                </h1>

                <p>
                    품질검사 결과와 통과 비율을 분석합니다.
                </p>

            </div>


            <div className="graph-summary">

                <div className="graph-summary-card">
                    <span>전체 제품</span>
                    <strong>
                        {products.length}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>통과</span>
                    <strong>
                        {passCount}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>불합격</span>
                    <strong>
                        {failCount}
                    </strong>
                </div>


                <div className="graph-summary-card">
                    <span>통과율</span>
                    <strong>
                        {passRate}%
                    </strong>
                </div>

            </div>


            <div className="graph-control">

                <label>
                    그래프 선택
                </label>

                <select
                    value={graphType}
                    onChange={(e) =>
                        setGraphType(e.target.value)
                    }
                >

                    <option value="result">
                        검사 결과 현황
                    </option>

                    <option value="passRate">
                        품질검사 통과 비율
                    </option>

                </select>

            </div>


            <div className="graph-card">


                {graphType === "result" && (

                    <>
                        <h2>
                            검사 결과 현황
                        </h2>

                        <div className="quality-chart">

                            <Bar
                                data={resultData}
                                options={barOptions}
                            />
                            {/* resultData
                                → 그래프에 들어갈 실제 데이터

                                barOptions
                                → 그래프를 어떻게 보여줄지 설정

                                ↓ 둘 다 전달

                                <Bar />

                                ↓
                                막대그래프 출력 */}

                        </div>
                    </>

                )}


                {graphType === "passRate" && (

                    <>
                        <div className="pass-rate-header">

                            <div>

                                <h2>
                                    품질검사 통과 비율
                                </h2>

                                <p>
                                    검사가 완료된 제품을 기준으로 계산합니다.
                                </p>

                            </div>


                            <div className="pass-rate-number">

                                <strong>
                                    {passRate}%
                                </strong>

                                <span>
                                    통과율
                                </span>

                            </div>

                        </div>


                        <div className="pie-chart">

                            <Pie
                                data={passRateData}
                                options={pieOptions}
                            />

                        </div>

                    </>

                )}


            </div>

        </div>
    );
}

>>>>>>> dc756df83a6fb7de274b5334c8eba37dfa55c2f2
export default QualityTestGraph;