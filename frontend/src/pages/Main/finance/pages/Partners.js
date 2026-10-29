import React, { useState } from 'react';

function Partners() {
    // 1. 뷰 모드 전환 (리스트형 vs 달력형)
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

    // 2. 선택된 거래처 (상세 계좌 및 거래내역 확인용)
    const [selectedPartnerId, setSelectedPartnerId] = useState('PT-2026-001');

    // 거래처 기본 목록 (목 데이터)
    const [partnersList] = useState([
        {
            id: 'PT-2026-001',
            name: '(주)알파솔루션',
            type: '매출처 (고객사)',
            bizNumber: '120-81-45678',
            ceo: '이대표',
            contact: '010-1234-5678',
            bankInfo: { bank: '신한은행', account: '110-345-678901', holder: '(주)알파솔루션' },
            settlementType: '입금 마감',
            closingDate: '매월 25일',
            outstandingAmount: 15400000, // 미수금 (받을 돈)
            status: '정상'
        },
        {
            id: 'PT-2026-002',
            name: '(주)베타원자재',
            type: '매입처 (공급사)',
            bizNumber: '214-85-98765',
            ceo: '김공급',
            contact: '010-9876-5432',
            bankInfo: { bank: '기업은행', account: '020-012345-01-099', holder: '(주)베타원자재' },
            settlementType: '출금 마감',
            closingDate: '매월 말일',
            outstandingAmount: 8800000, // 미지급금 (줄 돈)
            status: '정상'
        },
        {
            id: 'PT-2026-003',
            name: '감마클라우드(주)',
            type: '매입처 (공급사)',
            bizNumber: '105-86-11223',
            ceo: '박서버',
            contact: '02-555-1234',
            bankInfo: { bank: '국민은행', account: '479002-01-998877', holder: '감마클라우드(주)' },
            settlementType: '출금 마감',
            closingDate: '매월 15일',
            outstandingAmount: 2200000, // 미지급금 (줄 돈)
            status: '정상'
        }
    ]);

    // 선택된 거래처와의 거래내역 (상세 테이블용 더미 데이터)
    const [tradeHistory] = useState([
        { id: 'TR-101', date: '2026-10-10', type: '매출', item: 'ERP 솔루션 라이선스 납품', amount: 15400000, status: '세금계산서 발행(입금대기)' },
        { id: 'TR-100', date: '2026-09-25', type: '입금완료', item: '9월 유지보수료 수납', amount: 5500000, status: '정산완료' }
    ]);

    const currentPartner = partnersList.find((p) => p.id === selectedPartnerId) || partnersList[0];

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>거래처 관리</span>
            </header>
                <div>
                    <button
                        type="button"
                        className={viewMode === 'list' ? 'is-active' : ''}
                        onClick={() => setViewMode('list')}
                        
                    >
                        📋 리스트로 보기
                    </button>
                    <button
                        type="button"
                        className={viewMode === 'calendar' ? 'is-active' : ''}
                        onClick={() => setViewMode('calendar')}
                        
                    >
                        📅 마감일 달력으로 보기
                    </button>
                    <button type="button" onClick={() => alert('신규 거래처 등록 폼')} >
                        + 신규 거래처 등록
                    </button>
                </div>

            <hr />

            {/* 2. 조건부 렌더링: 리스트 뷰 vs 달력 뷰 */}
            {viewMode === 'list' ? (
                <section>
                    <h3>거래처 목록 (입출금 마감 현황)</h3>
                    <div>
                        <label>구분: </label>
                        <select>
                            <option>전체 구분</option>
                            <option>매출처 (입금마감)</option>
                            <option>매입처 (출금마감)</option>
                        </select>
                        <input type="text" placeholder="거래처명, 사업자번호 검색"  />
                        <button type="button">검색</button>
                    </div>
                    <br />
                    <div className='table-shell'>
                        <table >
                            <thead>
                                <tr >
                                    <th>거래처 ID</th>
                                    <th>거래처명</th>
                                    <th>구분</th>
                                    <th>사업자번호</th>
                                    <th>대표자/연락처</th>
                                    <th>마감 구분</th>
                                    <th>정기 마감일</th>
                                    <th>미정산 잔액 (미수/미지급)</th>
                                    <th>관리/선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partnersList.map((item) => (
                                    <tr
                                        key={item.id}
                                        
                                        onClick={() => setSelectedPartnerId(item.id)}
                                    >
                                        <td>{item.id}</td>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.type}</td>
                                        <td>{item.bizNumber}</td>
                                        <td>{item.ceo} ({item.contact})</td>
                                        <td>
                                            <span className={`settlement-badge ${item.settlementType === '입금 마감' ? 'is-income' : 'is-expense'}`}>
                                                {item.settlementType}
                                            </span>
                                        </td>
                                        <td><strong>{item.closingDate}</strong></td>
                                        <td >
                                            {item.outstandingAmount.toLocaleString()}원
                                        </td>
                                        <td>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedPartnerId(item.id); }}>
                                                상세/거래내역
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <section>
                    {/* 달력 뷰 뼈대 */}
                    <h3>2026년 10월 입금 / 출금 정산 마감 달력</h3>
                    <div >
                        <span >● 파란색: 매출처 입금 마감 (수납 예정)</span>
                        <span >● 빨간색: 매입처 출금 마감 (지급 예정)</span>
                    </div>

                    <table >
                        <thead>
                            <tr >
                                <th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td></td><td></td><td></td><td></td><td>1</td><td>2</td><td>3</td>
                            </tr>
                            <tr>
                                <td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td>
                            </tr>
                            <tr>
                                <td>11</td><td>12</td><td>13</td><td>14</td>
                                <td >
                                    <strong>15</strong><br />
                                    <small >[출금] 감마클라우드 (220만)</small>
                                </td>
                                <td>16</td><td>17</td>
                            </tr>
                            <tr>
                                <td>18</td><td>19</td><td>20</td><td>21</td><td>22</td><td>23</td><td>24</td>
                            </tr>
                            <tr>
                                <td >
                                    <strong>25</strong><br />
                                    <small >[입금] (주)알파솔루션 (1,540만)</small>
                                </td>
                                <td>26</td><td>27</td><td>28</td><td>29</td><td>30</td>
                                <td >
                                    <strong>31</strong><br />
                                    <small >[출금] (주)베타원자재 (880만)</small>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            )}

            <hr  />

            {/* 3. 하단 세부 영역: 선택된 거래처의 계좌 정보 & 거래 내역 */}
            <section>
                <h3>[선택 거래처 상세 정보] {currentPartner.name}</h3>

                {/* 3-1. 거래처 등록 계좌 정보 */}
                <fieldset >
                    <legend>거래처 공식 결제(정산) 계좌 정보</legend>
                    <p>
                        <strong>거래 은행:</strong> {currentPartner.bankInfo.bank} |{' '}
                        <strong>계좌번호:</strong> {currentPartner.bankInfo.account} |{' '}
                        <strong>예금주:</strong> {currentPartner.bankInfo.holder}
                        <button type="button"  onClick={() => alert('계좌 변경 모달')}>
                            계좌정보 수정
                        </button>
                    </p>
                </fieldset>

                {/* 3-2. 거래처 거래 히스토리 */}
                <h4>해당 거래처와의 거래 내역 (최근 전표/계산서)</h4>
                <table >
                    <thead>
                        <tr >
                            <th>거래 번호</th>
                            <th>거래일자</th>
                            <th>구분</th>
                            <th>품목/적요</th>
                            <th>거래 금액</th>
                            <th>처리 상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tradeHistory.map((tr) => (
                            <tr key={tr.id}>
                                <td>{tr.id}</td>
                                <td>{tr.date}</td>
                                <td>{tr.type}</td>
                                <td>{tr.item}</td>
                                <td >{tr.amount.toLocaleString()}원</td>
                                <td>{tr.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

export default Partners;
