import React, { useState } from 'react';

function Items() {
    // 1. 매입 / 매출 탭 필터 ('ALL' | 'SALES' | 'PURCHASE')
    const [activeTab, setActiveTab] = useState('ALL');

    // 2. 검색 및 날짜 필터 상태
    const [searchTerm, setSearchTerm] = useState('');

    // 화면 확인용 매입/매출 품목 목 데이터
    const [itemList] = useState([
        {
            id: 'ITM-2026-001',
            type: 'SALES', // 매출
            date: '2026-10-18',
            itemName: 'ERP 구축 솔루션 라이선스 v1.0',
            spec: '1식 (Enterprise)',
            customer: '(주)알파솔루션',
            unitPrice: 20000000,
            quantity: 1,
            supplyAmount: 20000000,
            vat: 2000000,
            totalAmount: 22000000,
            status: '세금계산서발행(입금대기)'
        },
        {
            id: 'ITM-2026-002',
            type: 'PURCHASE', // 매입
            date: '2026-10-15',
            itemName: '사내 개발용 고성능 모니터 32인치',
            spec: '4K IPS / 5EA',
            customer: '(주)베타원자재',
            unitPrice: 450000,
            quantity: 5,
            supplyAmount: 2250000,
            vat: 225000,
            totalAmount: 2475000,
            status: '지급완료(카드결제)'
        },
        {
            id: 'ITM-2026-003',
            type: 'SALES', // 매출
            date: '2026-10-12',
            itemName: '클라우드 인프라 유지보수 (10월분)',
            spec: '월 정기계약',
            customer: '대한물류(주)',
            unitPrice: 3500000,
            quantity: 1,
            supplyAmount: 3500000,
            vat: 350000,
            totalAmount: 3850000,
            status: '정산완료(입금확인)'
        },
        {
            id: 'ITM-2026-004',
            type: 'PURCHASE', // 매입
            date: '2026-10-10',
            itemName: '사내 서버랙 전원 공급장치(UPS)',
            spec: '3kVA / 2EA',
            customer: '감마클라우드(주)',
            unitPrice: 1200000,
            quantity: 2,
            supplyAmount: 2400000,
            vat: 240000,
            totalAmount: 2640000,
            status: '정산대기(계좌이체예정)'
        }
    ]);

    // 탭 선택 및 검색어에 따른 필터링 로직
    const filteredList = itemList.filter((item) => {
        const matchesTab = activeTab === 'ALL' || item.type === activeTab;
        const matchesSearch =
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.customer.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // 상단 요약 집계 연산
    const totalSalesAmount = itemList
        .filter((item) => item.type === 'SALES')
        .reduce((sum, item) => sum + item.totalAmount, 0);

    const totalPurchaseAmount = itemList
        .filter((item) => item.type === 'PURCHASE')
        .reduce((sum, item) => sum + item.totalAmount, 0);

    return (
        <div className="finance-page">
            {/* 1. 상단 타이틀 및 액션 */}
            <header>
                <h2>매입한 품목 / 매출 품목 관리</h2>
                <p>거래처별 매입 원자재/비품 및 판매된 완제품/용역 품목 내역을 집계합니다.</p>
                <div>
                    <button type="button" onClick={() => alert('신규 품목/거래 등록 모달')}>
                        + 품목 거래내역 신규 등록
                    </button>
                    <button type="button" onClick={() => alert('엑셀 다운로드')} >
                        엑셀(Excel) 다운로드
                    </button>
                </div>
            </header>

            <hr />

            {/* 2. 상단 매입/매출 누적 요약 카드 */}
            <section>
                <h3>금월 거래 총액 요약</h3>
                <p>
                    <span >
                        총 매출 합계: {totalSalesAmount.toLocaleString()}원
                    </span>{' '}
                    |{' '}
                    <span >
                        총 매입 합계: {totalPurchaseAmount.toLocaleString()}원
                    </span>{' '}
                    |{' '}
                    <strong>
                        예상 영업이익(마진): {(totalSalesAmount - totalPurchaseAmount).toLocaleString()}원
                    </strong>
                </p>
            </section>

            <hr />

            {/* 3. 탭 전환 및 필터 검색 구역 */}
            <section>
                <div>
                    <button
                        type="button"
                        className={`finance-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('ALL')}
                        
                    >
                        전체 거래 품목 ({itemList.length})
                    </button>
                    <button
                        type="button"
                        className={`finance-tab ${activeTab === 'SALES' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('SALES')}
                        
                    >
                        매출 품목 (판매)
                    </button>
                    <button
                        type="button"
                        className={`finance-tab ${activeTab === 'PURCHASE' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('PURCHASE')}
                        
                    >
                        매입 품목 (구매)
                    </button>

                    <input
                        type="text"
                        placeholder="품목명 또는 거래처명 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        
                    />
                </div>
            </section>

            <br />

            {/* 4. 품목 리스트 테이블 */}
            <main>
                <table >
                    <thead>
                        <tr >
                            <th>품목 번호</th>
                            <th>구분</th>
                            <th>거래일자</th>
                            <th>거래처(고객명)</th>
                            <th>물품명 (품목명)</th>
                            <th>규격/수량</th>
                            <th>단가</th>
                            <th>공급가액</th>
                            <th>부가세(VAT)</th>
                            <th>총 합계금액</th>
                            <th>결제/정산상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map((item) => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>
                                    <strong className={`finance-type ${item.type === 'SALES' ? 'is-sales' : 'is-purchase'}`}>
                                        {item.type === 'SALES' ? '매출' : '매입'}
                                    </strong>
                                </td>
                                <td>{item.date}</td>
                                <td><strong>{item.customer}</strong></td>
                                <td>{item.itemName}</td>
                                <td>{item.spec} ({item.quantity}개)</td>
                                <td >{item.unitPrice.toLocaleString()}원</td>
                                <td >{item.supplyAmount.toLocaleString()}원</td>
                                <td >{item.vat.toLocaleString()}원</td>
                                <td >
                                    {item.totalAmount.toLocaleString()}원
                                </td>
                                <td>{item.status}</td>
                                <td>
                                    <button type="button" onClick={() => alert(`${item.itemName} 전표 확인`)}>
                                        전표조회
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}

export default Items;
