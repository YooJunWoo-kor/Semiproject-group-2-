import React, { useState } from 'react';

function BankAccount() {
    // 화면 확인용 더미 계좌 데이터
    const [accountList] = useState([
        {
            id: 'ACC-001',
            accountName: '기업 주거래 운영계좌',
            bankName: '기업은행',
            accountNumber: '020-058123-01-018',
            accountType: '운영비/출금전용',
            currency: 'KRW',
            balance: 145000000,
            managerName: '박민수 (재무팀)',
            status: '정상',
            lastTransactionDate: '2026-10-20 16:40'
        },
        {
            id: 'ACC-002',
            accountName: '국민 매출 수납계좌',
            bankName: '국민은행',
            accountNumber: '479001-04-123456',
            accountType: '매출수납(입금전용)',
            currency: 'KRW',
            balance: 89200000,
            managerName: '김철수 (재무팀)',
            status: '정상',
            lastTransactionDate: '2026-10-21 09:15'
        },
        {
            id: 'ACC-003',
            accountName: '하나 외화(달러) 결제계좌',
            bankName: '하나은행',
            accountNumber: '101-910002-88888',
            accountType: '해외 결제/외화',
            currency: 'USD',
            balance: 45000, // $45,000
            managerName: '박민수 (재무팀)',
            status: '정상',
            lastTransactionDate: '2026-10-18 11:20'
        },
        {
            id: 'ACC-004',
            accountName: '신한 정기예금 계좌',
            bankName: '신한은행',
            accountNumber: '110-222-333333',
            accountType: '예치금/정기예금',
            currency: 'KRW',
            balance: 500000000,
            managerName: '이영희 (이사)',
            status: '동결(만기대기)',
            lastTransactionDate: '2026-06-30 00:00'
        }
    ]);

    // 원화 기준 총 잔액 합산 (외화 제외)
    const totalKrwBalance = accountList
        .filter((acc) => acc.currency === 'KRW')
        .reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div>
            {/* 1. 상단 타이틀 및 액션 */}
            <header>
                <h2>회사 계좌 관리</h2>
                <p>법인 소유의 모든 입출금/예적금 계좌 현황 및 잔액을 관리합니다.</p>
                <div>
                    <button type="button" onClick={() => alert('신규 계좌 등록 폼 열기')}>
                        + 법인 계좌 신규 등록
                    </button>
                    <button type="button" onClick={() => alert('전체 계좌 잔액 동기화 실행')} >
                        실시간 잔액 동기화
                    </button>
                </div>
            </header>

            <hr />

            {/* 2. 전사 잔액 요약 영역 (KPI 카드 구역) */}
            <section>
                <h3>자금 현황 요약</h3>
                <p>
                    <strong>등록 계좌 수:</strong> {accountList.length}개 |{' '}
                    <strong>원화 계좌 총 잔액:</strong> {totalKrwBalance.toLocaleString()} 원 |{' '}
                    <strong>외화 보유액:</strong> $45,000 USD
                </p>
            </section>

            <hr />

            {/* 3. 검색 및 필터 구역 */}
            <section>
                <div>
                    <label htmlFor="bankFilter">은행 구분: </label>
                    <select id="bankFilter">
                        <option value="ALL">전체 은행</option>
                        <option value="IBK">기업은행</option>
                        <option value="KB">국민은행</option>
                        <option value="HANA">하나은행</option>
                        <option value="SHINHAN">신한은행</option>
                    </select>

                    <label htmlFor="typeFilter" >용도 구분: </label>
                    <select id="typeFilter">
                        <option value="ALL">전체 용도</option>
                        <option value="OPERATING">운영비/출금</option>
                        <option value="SALES">매출수납/입금</option>
                        <option value="SAVINGS">예금/예치</option>
                    </select>

                    <input
                        type="text"
                        placeholder="계좌명 또는 계좌번호 검색"
                        
                    />
                    <button type="button">조회</button>
                </div>
            </section>

            <br />

            {/* 4. 회사 계좌 목록 테이블 */}
            <div className='table-shell'>
                <table>
                    <thead>
                        <tr >
                            <th>계좌 ID</th>
                            <th>은행명</th>
                            <th>계좌번호</th>
                            <th>계좌별칭(계좌명)</th>
                            <th>용도 구분</th>
                            <th>현재 잔액</th>
                            <th>통화</th>
                            <th>관리 책임자</th>
                            <th>최근 거래일시</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accountList.map((acc) => (
                            <tr key={acc.id}>
                                <td>{acc.id}</td>
                                <td><strong>{acc.bankName}</strong></td>
                                <td>{acc.accountNumber}</td>
                                <td>{acc.accountName}</td>
                                <td>{acc.accountType}</td>
                                <td >
                                    {acc.balance.toLocaleString()} {acc.currency === 'USD' ? '$' : '원'}
                                </td>
                                <td>{acc.currency}</td>
                                <td>{acc.managerName}</td>
                                <td>{acc.lastTransactionDate}</td>
                                <td>{acc.status}</td>
                                <td>
                                    <button type="button" onClick={() => alert(`${acc.accountName}의 입출금 거래내역 조회`)}>
                                        거래내역
                                    </button>
                                    <button type="button" onClick={() => alert(`${acc.accountName} 수정`)}>
                                        수정
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BankAccount;