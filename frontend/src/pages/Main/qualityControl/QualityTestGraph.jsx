import React from "react";
import { Bar } from "react-chartjs-2";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);


function QualityTestGraph() {

    const data = {
        labels: ["미실시", "통과", "불합격"],

        datasets: [
            {
                label: "제품 수",
                data: [7, 14, 3]
            }
        ]
    };


    return (
        <div className="quality-graph-page">

            <h1>품질검사 분석</h1>


            {/* 그래프 종류 선택 */}
            <div>
                <label>그래프 선택 : </label>

                <select>
                    <option value="result">
                        검사 결과 현황
                    </option>

                    <option value="passRate">
                        품질검사 통과 비율
                    </option>

                    <option value="company">
                        제조회사별 품질 현황
                    </option>
                </select>
            </div>


            <div className="quality-chart">
                <Bar data={data} />
            </div>

        </div>
    );
}

export default QualityTestGraph;