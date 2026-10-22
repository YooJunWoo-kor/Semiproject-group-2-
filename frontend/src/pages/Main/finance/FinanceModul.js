import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

function FinanceModul() {
    const navigate = useNavigate();

    const financeMenus = [
        {
            id: 'corp-card',
            title: '부서 및 법인카드 관리',
            description: '부서별 법인카드 발급 현황, 한도 설정 및 카드 사용 내역 승인',
            path: 'corp-card'
        },
        {
            id: 'bank-account',
            title: '회사 계좌 관리',
            description: '법인 입출금 계좌 등록, 실시간 잔액 조회 및 입출금 거래 내역',
            path: 'bank-account'
        },
        {
            id: 'payment-approval',
            title: '결제(지출) 승인 페이지',
            description: '기안된 지출 결의서 및 전표 결재 승인/반려 처리',
            path: 'approval'
        },
        {
            id: 'partners',
            title: '거래처 관리 페이지',
            description: '매출처/매입처 사업자 정보, 담당자 연락처, 거래처별 계좌 관리',
            path: 'partners'
        },
        {
            id: 'trade-items',
            title: '매입 / 매출 품목 관리',
            description: '구매 원자재(매입 품목) 및 납품 상품(매출 품목) 단가/규격 관리',
            path: 'items'
        }
    ];

    return (
        <div className="sub-container">
            <header>
                <h2>[재무관리] 전산 업무 센터</h2>
                <p>처리할 세부 재무 항목을 선택하세요.</p>
                <button type="button" onClick={() => navigate('/main')}>
                    ← 메인 모듈 목록으로 돌아가기
                </button>
                <hr />
            </header>

            <main>
                <ul className="module-grid">
                    {financeMenus.map((menu) => (
                        <li key={menu.id} className="module-card">
                            <h3>{menu.title}</h3>
                            <p>{menu.description}</p>
                            <button
                                type="button"
                                onClick={() => navigate(menu.path)}
                            >
                                {menu.title} 이동
                            </button>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}

export default FinanceModul;