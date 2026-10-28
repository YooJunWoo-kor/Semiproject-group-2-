import React, { useState } from 'react';

function Approval() {
    // 화면 확인용 더미 결재 데이터
    const [approvalList] = useState([
        {
            id: 'APPR-202610-001',
            department: '영업1팀',
            requester: '김철수 대리',
            title: '10월 거래처 미팅 식대 청구',
            amount: 185000,
            paymentMethod: '법인카드 (하나카드)',
            deadline: '2026-10-25',
            receiptAttached: true,
            status: '대기' // 대기, 승인, 반려
        },
        {
            id: 'APPR-202610-002',
            department: '개발팀',
            requester: '이영희 팀장',
            title: '클라우드 서버(AWS) 10월분 이용료',
            amount: 2450000,
            paymentMethod: '계좌이체 (기업은행)',
            deadline: '2026-10-31',
            receiptAttached: true,
            status: '대기'
        },
        {
            id: 'APPR-202610-003',
            department: '인사팀',
            requester: '정민우 사원',
            title: '신규 입사자 웰컴키트 제작비',
            amount: 600000,
            paymentMethod: '계좌이체 (국민은행)',
            deadline: '2026-10-20',
            receiptAttached: false,
            status: '반려'
        },
        {
            id: 'APPR-202610-004',
            department: '재무·회계팀',
            requester: '박민수 과장',
            title: '사내 회계 감사 수수료 지급',
            amount: 5000000,
            paymentMethod: '계좌이체 (기업은행)',
            deadline: '2026-10-15',
            receiptAttached: true,
            status: '승인'
        }
    ]);

    // 승인 처리 액션
    const handleApprove = (id, title, amount) => {
        const confirmed = window.confirm(`[${id}] "${title}" 건을 승인하시겠습니까?\n승인 시 해당 계좌/카드에서 지출 전표가 자동 발행됩니다.`);
        if (confirmed) {
            alert(`승인 완료: ${amount.toLocaleString()}원 지출 전표가 등록되었습니다.`);
        }
    };

    // 반려 처리 액션
    const handleReject = (id) => {
        const reason = window.prompt(`[${id}] 반려 사유를 입력하세요:`, '증빙 영수증 불명확');
        if (reason) {
            alert(`반려 처리되었습니다. 사유: ${reason}`);
        }
    };

    return (
        <div className="finance-page">
            {/* 1. 상단 타이틀 및 집계 요약 */}
            <header>
                <h2>결제(지출) 승인 관리</h2>
                <p>각 부서에서 상신된 지출 결의서를 검토하고 승인/반려합니다.</p>
                <div>
                    <strong>승인 대기:</strong> 2건 |{' '}
                    <strong>금월 승인 합계:</strong> 5,000,000원 |{' '}
                    <strong>금월 반려:</strong> 1건
                </div>
            </header>

            <hr />

            {/* 2. 필터/검색 구역 */}
            <section>
                <div>
                    <label htmlFor="statusFilter">결재 상태: </label>
                    <select id="statusFilter">
                        <option value="ALL">전체 보기</option>
                        <option value="PENDING">대기중</option>
                        <option value="APPROVED">승인 완료</option>
                        <option value="REJECTED">반려됨</option>
                    </select>

                    <label htmlFor="deptFilter" >부서 선택: </label>
                    <select id="deptFilter">
                        <option value="ALL">전체 부서</option>
                        <option value="SALES">영업팀</option>
                        <option value="DEV">개발팀</option>
                        <option value="HR">인사팀</option>
                    </select>

                    <button type="button" >검색</button>
                </div>
            </section>

            <br />

            {/* 3. 결제 지출 승인 목록 테이블 */}
            <main>
                <table >
                    <thead>
                        <tr >
                            <th>결재 번호</th>
                            <th>상신 부서</th>
                            <th>결제 요청자</th>
                            <th>승인 내역 (제목)</th>
                            <th>청구 금액</th>
                            <th>결제 수단</th>
                            <th>증빙</th>
                            <th>처리 마감일</th>
                            <th>진행 상태</th>
                            <th>결재 처리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvalList.map((item) => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>{item.department}</td>
                                <td>{item.requester}</td>
                                <td>
                                    <strong>{item.title}</strong>
                                </td>
                                <td >
                                    {item.amount.toLocaleString()}원
                                </td>
                                <td>{item.paymentMethod}</td>
                                <td >
                                    {item.receiptAttached ? (
                                        <button type="button" onClick={() => alert('영수증 이미지 보기')}>
                                            보기
                                        </button>
                                    ) : (
                                        <span >미첨부</span>
                                    )}
                                </td>
                                <td>{item.deadline}</td>
                                <td>
                                    <span className={`status-badge ${item.status === '대기' ? 'status-pending' : item.status === '반려' ? 'status-danger' : ''}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>
                                    {item.status === '대기' ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(item.id, item.title, item.amount)}
                                            >
                                                승인
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(item.id)}
                                                
                                            >
                                                반려
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => alert(`${item.id} 이력 조회`)}>
                                            이력보기
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}

export default Approval;
