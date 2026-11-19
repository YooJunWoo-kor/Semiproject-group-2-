import React, { useEffect, useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";
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
import StatisticsCard from "../../../../components/StatisticsCard";
import ColorTeg from "../../../../components/ColorTeg";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// CategoryScale 가로축에 '통과', '불합격' 같은 항목 표시
// LinearScale	세로축에 0, 1, 2, 3 같은 숫자 표시
// BarElement	막대그래프를 그리는 기능
// ArcElement	원형그래프의 조각을 그리는 기능
// Title	그래프 제목 기능
// Tooltip	마우스를 올렸을 때 나오는 정보
// Legend	그래프의 범례 기능

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

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/quality/products`
                );

                const data = response.data.map(item => ({
                    qualityStatus: item.quality_status
                }));

                setProducts(data);

            } catch (err) {
                console.error("그래프 데이터 조회 실패:", err);
                setError("그래프 데이터를 불러오지 못했습니다.");

            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);


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
    }), [products.length, passCount, failCount, notTestedCount, passRate]);

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
                backgroundColor: ["#94a3b8", "#10b981", "#ef4444"],
                borderColor: ["#64748b", "#059669", "#dc2626"],
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
                backgroundColor: ["#10b981", "#ef4444"],
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
    
    if (loading) {
        return <p>그래프 데이터를 불러오는 중입니다.</p>;
    }
    
    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div className="border-container vertical-box" style={{gap:"10px"}}>
            <header className="dashboard-header">
                <span className="subtitle">품질검사 분석</span>
            </header>

            <div className="horizontal-box">
                <StatisticsCard title={"전체"} count={notTestedCount} stiyle={0} />
                <StatisticsCard title={"통과"} count={passCount} stiyle={0} />
                <StatisticsCard title={"불합격"} count={failCount} stiyle={0} />
                <StatisticsCard title={"통과율"} count={passRate} stiyle={4} />
            </div>

            <div className="horizontal-box size-fill" >
                <div className="boder vertical-box size-fill"
                    style={{padding:"30px", paddingBottom:"80px", height:"500px"}}
                >
                    <div className="horizontal-box">
                        <h2>검사 결과 현황</h2>
                        <ColorTeg title={"총"} count={products.length} type={'개'}/>
                    </div>

                    <div className="quality-chart">
                        <Bar
                            data={resultData}
                            options={barOptions}
                            plugins={[barValuePlugin]}
                        />
                    </div>
                </div>
                <div className="vertical-box boder size-fill"
                    style={{padding:"30px", paddingBottom:"80px", height:"500px"}}
                >
                    <div className="horizontal-box">
                        <h2>품질검사 통과 비율</h2>
                        <ColorTeg title={""} count={animatedValues.rate} type={'%'}/>
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
                </div>
            </div>
        </div>
    );
}

export default QualityTestGraph;
