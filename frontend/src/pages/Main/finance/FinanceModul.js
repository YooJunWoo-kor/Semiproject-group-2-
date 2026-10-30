import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import StatisticsCard from '../../../components/StatisticsCard';

function FinanceModul() {
    const navigate = useNavigate();

    const financeMenus = [
        {
            title: '부서 및 법인카드 관리',
            description: '부서별 법인카드 발급 현황, 한도 설정 및 카드 사용 내역 승인',
            path: 'corp-card'
        },
        {
            title: '회사 계좌 관리',
            description: '법인 입출금 계좌 등록, 실시간 잔액 조회 및 입출금 거래 내역',
            path: 'bank-account'
        },
        {
            title: '결제(지출) 승인 페이지',
            description: '기안된 지출 결의서 및 전표 결재 승인/반려 처리',
            path: 'approval'
        },
        {
            title: '거래처 관리 페이지',
            description: '매출처/매입처 사업자 정보, 담당자 연락처, 거래처별 계좌 관리',
            path: 'partners'
        },
        {
            title: '매입 / 매출 품목 관리',
            description: '구매 원자재(매입 품목) 및 납품 상품(매출 품목) 단가/규격 관리',
            path: 'items'
        }
    ];

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>대시보드</span>
                <span className='subtext'> 처리할 세부 재무 항목을 선택하세요. </span>
            </header>

            <section className="stats-section">
                <StatisticsCard
                    title="법인카드"
                    count="3"
                    stiyle={2}
                />
                <StatisticsCard
                    title="회사계좌 현황"
                    count="5"
                    stiyle={2}
                />
                <StatisticsCard
                    title="신규 기안"
                    count="3"
                    stiyle={2}
                />
                <StatisticsCard
                    title="거래처"
                    count="3"
                    stiyle={2}
                />
                <StatisticsCard
                    title="관리 품목"
                    count="3"
                    stiyle={2}
                />
            </section>
            <div> 달력추가 예정 </div>
            <div> 신규기안 리스트 </div>
            <div> 주요 거래처 리스트 </div>
            <div> 신규 매입 </div>
            <div> 신규 매출 </div>
        </div>
    );
}

export default FinanceModul;