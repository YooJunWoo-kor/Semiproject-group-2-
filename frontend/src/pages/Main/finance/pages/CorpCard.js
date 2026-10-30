import React, { useState } from 'react';

function CorpCard() {
    // 화면 확인용 더미 데이터
    const [cardList] = useState([
        {
            id: 'CARD-2026-001',
            cardName: '법인 하나카드 (영업1팀)',
            department: '영업팀',
            managerName: '김철수',
            currentUsage: 1850000,
            monthlyLimit: 5000000,
            status: '사용중'
        },
        {
            id: 'CARD-2026-002',
            cardName: '법인 신한카드 (개발팀 공용)',
            department: '개발팀',
            managerName: '이영희',
            currentUsage: 3400000,
            monthlyLimit: 3000000, // 초과 테스트용
            status: '한도초과'
        },
        {
            id: 'CARD-2026-003',
            cardName: '법인 국민카드 (재무팀)',
            department: '재무·회계팀',
            managerName: '박민수',
            currentUsage: 720000,
            monthlyLimit: 10000000,
            status: '사용중'
        }
    ]);

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>법인카드 관리</span>
            </header>

            <hr />

            {/* 2. 간이 검색/필터 영역 */}
            <section>
                <div>
                    <label htmlFor="deptFilter">부서 선택: </label>
                    <select id="deptFilter">
                        <option value="ALL">전체 부서</option>
                        <option value="SALES">영업팀</option>
                        <option value="DEV">개발팀</option>
                        <option value="FINANCE">재무·회계팀</option>
                    </select>

                    <label htmlFor="searchKeyword" >검색: </label>
                    <input
                        id="searchKeyword"
                        type="text"
                        placeholder="카드명 또는 관리자명 입력"
                    />
                    <button type="button">조회</button>
                </div>
            </section>

            <br />

            {/* 3. 법인카드 리스트 테이블 */}
            <div className='table-shell'>
                <table >
                    <thead>
                        <tr >
                            <th>법인카드 ID</th>
                            <th>법인카드 명</th>
                            <th>발급부서</th>
                            <th>관리자명</th>
                            <th>당월 사용량</th>
                            <th>월 한도</th>
                            <th>잔여 한도</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cardList.map((card) => {
                            const remaining = card.monthlyLimit - card.currentUsage;

                            return (
                                <tr key={card.id}>
                                    <td>{card.id}</td>
                                    <td><strong>{card.cardName}</strong></td>
                                    <td>{card.department}</td>
                                    <td>{card.managerName}</td>
                                    <td>{card.currentUsage.toLocaleString()}원</td>
                                    <td>{card.monthlyLimit.toLocaleString()}원</td>
                                    <td >
                                        {remaining.toLocaleString()}원
                                    </td>
                                    <td><span className={`status-badge ${card.status === '한도초과' ? 'status-danger' : ''}`}>{card.status}</span></td>
                                    <td>
                                        <button type="button" onClick={() => alert(`${card.cardName} 상세 내역`)}>
                                            상세/내역보기
                                        </button>
                                        <button type="button" onClick={() => alert(`${card.cardName} 한도 수정`)}>
                                            한도변경
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CorpCard;
