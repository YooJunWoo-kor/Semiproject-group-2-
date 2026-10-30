import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import StatisticsCard from '../../../components/StatisticsCard';
import ScheduleBoard from '../../../components/ScheduleBoard';
import BasicTable from '../../../components/BasicTable';

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

    //결제 요청관련 외부데이터 형태 예시
    const data1 = [
        {
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
        ,{
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
        ,{
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
        ,{
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
        ,{
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
        ,{
            title: "10월 ERP 서버 호스팅 및 인프라 비용 청구",
            amount: "2,500,000원",
            author: "홍길동",
            start: "2026-10-15",
            end: "2026-10-31",
            isPaid: false
        }
    ]

    //결제요청 테이블 1관련 자료형 변환
    const tHeader1 = ["요청 내용","금액","작성자","요청일","마감일","승인"];
    const tData1 = data1.slice(0,5).map((item) => {
        let list = [];
        list.push(item.title);
        list.push(item.amount);
        list.push(item.author);
        list.push(item.start);
        list.push(item.end);
        list.push(item.isPaid ? '지급완료' : '미지급');
        
        return { content: list }; // conent -> content 오타 수정
      });
    

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className='subtitle'>대시보드</span>
                <span className='subtext'> 처리할 세부 재무 항목을 선택하세요. </span>
            </header>

            <div>
                <section className="stats-section">
                    <StatisticsCard
                        title="법인카드"
                        count="3"
                        stiyle={2}
                    />
                    <StatisticsCard
                        title="회사계좌"
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
                    지급총액
                    일간
                    주간
                    월간
                    지급예정
                    일간
                    주간
                    월간
                </section>
            </div>
            <section className="stats-section">
                <ScheduleBoard/>
                <div style={{display:"flex",flexFlow:"column",gap:"10px"}}>
                    <BasicTable title={"비용청구"}th = {tHeader1} td={tData1}/>
                    <BasicTable title={"구매요청"} th = {tHeader1} td={tData1}/>
                </div>
            </section>
        </div>
    );
}

export default FinanceModul;