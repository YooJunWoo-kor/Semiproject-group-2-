import React, { useEffect, useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import products from "./product";
import "./QualityTestGraph.css";

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

const ANIMATION_DURATION = 900;

const barValuePlugin = {
    id: "barValuePlugin",
    afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);

        if (!dataset || !meta || meta.hidden) {
            return;
        }

        ctx.save();
        ctx.fillStyle = "#172033";
        ctx.font = '700 14px "DM Sans", "Noto Sans KR", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        meta.data.forEach((bar, index) => {
            const value = Number(dataset.data[index]) || 0;

            if (value <= 0) {
                return;
            }

            const labelY = Math.max(bar.y - 8, chartArea.top + 18);
            ctx.fillText(String(value), bar.x, labelY);
        });

        ctx.restore();
    }
};

function QualityTestGraph() {
    const [graphType, setGraphType] = useState("result");
    const [animationKey, setAnimationKey] = useState(0);
    const [animatedValues, setAnimatedValues] = useState({
        total: 0,
        pass: 0,
        fail: 0,
        wait: 0,
        rate: 0
    });

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

    const passRate = testedCount === 0
        ? 0
        : Math.round((passCount / testedCount) * 100);

    const maxBarValue = Math.max(notTestedCount, passCount, failCount, 1);

    const targetValues = useMemo(() => ({
        total: products.length,
        pass: passCount,
        fail: failCount,
        wait: notTestedCount,
        rate: passRate
    }), [passCount, failCount, notTestedCount, passRate]);

    useEffect(() => {
        let animationFrameId;
        const startedAt = performance.now();

        const animateCount = (now) => {
            const progress = Math.min((now - startedAt) / ANIMATION_DURATION, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            setAnimatedValues({
                total: Math.round(targetValues.total * easedProgress),
                pass: Math.round(targetValues.pass * easedProgress),
                fail: Math.round(targetValues.fail * easedProgress),
                wait: Math.round(targetValues.wait * easedProgress),
                rate: Math.round(targetValues.rate * easedProgress)
            });

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animateCount);
            }
        };

        setAnimatedValues({
            total: 0,
            pass: 0,
            fail: 0,
            wait: 0,
            rate: 0
        });

        animationFrameId = requestAnimationFrame(animateCount);

        return () => cancelAnimationFrame(animationFrameId);
    }, [graphType, targetValues]);

    const handleGraphChange = (e) => {
        setGraphType(e.target.value);
        setAnimationKey((prev) => prev + 1);
    };

    const resultData = {
        labels: ["미실시", "통과", "불합격"],
        datasets: [
            {
                label: "제품 수",
                data: [
                    animatedValues.wait,
                    animatedValues.pass,
                    animatedValues.fail
                ],
                backgroundColor: ["#8aa4b8", "#1685c5", "#c0394b"],
                borderColor: ["#6f8798", "#0c4485", "#9f2f3f"],
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 72
            }
        ]
    };

    const passRateData = {
        labels: ["통과", "불합격"],
        datasets: [
            {
                label: "검사 제품 수",
                data: [passCount, failCount],
                backgroundColor: ["#1685c5", "#c0394b"],
                borderColor: ["#ffffff", "#ffffff"],
                borderWidth: 4,
                hoverOffset: 10
            }
        ]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: "#172033",
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                border: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                suggestedMax: maxBarValue + 1,
                ticks: {
                    precision: 0,
                    stepSize: 1
                },
                grid: {
                    color: "rgba(23, 32, 51, 0.08)"
                },
                border: {
                    display: false
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1400,
            easing: "easeOutQuart"
        },
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    padding: 22
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: "#172033",
                padding: 12,
                cornerRadius: 8
            }
        }
    };

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>품질검사 분석</span>
            </header>
            
            <div className="graph-summary" aria-live="polite">
                <div className="graph-summary-card">
                    <span>전체 제품</span>
                    <strong>{animatedValues.total}</strong>
                    <small>등록 제품 기준</small>
                </div>

                <div className="graph-summary-card is-pass">
                    <span>통과</span>
                    <strong>{animatedValues.pass}</strong>
                    <small>검사 통과 제품</small>
                </div>

                <div className="graph-summary-card is-fail">
                    <span>불합격</span>
                    <strong>{animatedValues.fail}</strong>
                    <small>재검토 필요 제품</small>
                </div>

                <div className="graph-summary-card is-rate">
                    <span>통과율</span>
                    <strong>{animatedValues.rate}%</strong>
                    <small>검사 완료 제품 기준</small>
                </div>
            </div>

            <div className="graph-control-card">
                <div>
                    <strong>분석 그래프</strong>
                    <p>확인할 지표를 선택하면 그래프와 수치가 다시 애니메이션됩니다.</p>
                </div>

                <label className="graph-control">
                    <span>그래프 선택</span>
                    <select
                        value={graphType}
                        onChange={handleGraphChange}
                    >
                        <option value="result">검사 결과 현황</option>
                        <option value="passRate">품질검사 통과 비율</option>
                    </select>
                </label>
            </div>

            <div className="graph-card">
                {graphType === "result" && (
                    <>
                        <div className="graph-card-heading">
                            <div>
                                <span className="graph-card-kicker">RESULT STATUS</span>
                                <h2>검사 결과 현황</h2>
                            </div>
                            <span className="graph-card-badge">총 {products.length}개 제품</span>
                        </div>

                        <div className="quality-chart">
                            <Bar
                                data={resultData}
                                options={barOptions}
                                plugins={[barValuePlugin]}
                            />
                        </div>
                    </>
                )}

                {graphType === "passRate" && (
                    <>
                        <div className="pass-rate-header">
                            <div>
                                <span className="graph-card-kicker">PASS RATE</span>
                                <h2>품질검사 통과 비율</h2>
                                <p>검사가 완료된 제품을 기준으로 계산합니다.</p>
                            </div>

                            <div className="pass-rate-number">
                                <strong>{animatedValues.rate}%</strong>
                                <span>통과율</span>
                            </div>
                        </div>

                        <div className="pie-layout">
                            <div className="pie-chart">
                                <Pie
                                    key={`pie-${animationKey}`}
                                    data={passRateData}
                                    options={pieOptions}
                                />
                            </div>

                            <div className="pie-summary-list">
                                <div>
                                    <span className="summary-dot is-pass" />
                                    <div>
                                        <small>통과</small>
                                        <strong>{passCount}개</strong>
                                    </div>
                                </div>
                                <div>
                                    <span className="summary-dot is-fail" />
                                    <div>
                                        <small>불합격</small>
                                        <strong>{failCount}개</strong>
                                    </div>
                                </div>
                                <div>
                                    <span className="summary-dot is-wait" />
                                    <div>
                                        <small>미실시</small>
                                        <strong>{notTestedCount}개</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default QualityTestGraph;
