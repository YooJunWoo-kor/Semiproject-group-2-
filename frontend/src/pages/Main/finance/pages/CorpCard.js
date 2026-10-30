import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PaginationTable from '../../../../components/PaginationTable';

const cardList = [
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
      monthlyLimit: 3000000,
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
    },
    {
        id: 'CARD-2026-003',
        cardName: '법인 국민카드 (재무팀)',
        department: '재무·회계팀',
        managerName: '박민수',
        currentUsage: 720000,
        monthlyLimit: 10000000,
        status: '사용중'
      },
      {
        id: 'CARD-2026-003',
        cardName: '법인 국민카드 (재무팀)',
        department: '재무·회계팀',
        managerName: '박민수',
        currentUsage: 720000,
        monthlyLimit: 10000000,
        status: '사용중'
      },
      {
        id: 'CARD-2026-003',
        cardName: '법인 국민카드 (재무팀)',
        department: '재무·회계팀',
        managerName: '박민수',
        currentUsage: 720000,
        monthlyLimit: 10000000,
        status: '사용중'
      },
      {
        id: 'CARD-2026-003',
        cardName: '법인 국민카드 (재무팀)',
        department: '재무·회계팀',
        managerName: '박민수',
        currentUsage: 720000,
        monthlyLimit: 10000000,
        status: '사용중'
      },
      {
        id: 'CARD-2026-003',
        cardName: '법인 국민카드 (재무팀)',
        department: '재무·회계팀',
        managerName: '박민수',
        currentUsage: 720000,
        monthlyLimit: 10000000,
        status: '사용중'
      },
  ];
function CorpCard() {
    
    const cardTableTitle = "법인카드 목록 현황";
    const cardHeaders = [
        "법인카드 ID",
        "법인카드 명",
        "발급부서",
        "관리자명",
        "당월 사용량",
        "월 한도",
        "잔여 한도",
        "상태",
        "관리"
    ];
    
    const tCardData = cardList.map((card) => {
        const remaining = card.monthlyLimit - card.currentUsage;
        return {
            content: [
                card.id,
                <strong>{card.cardName}</strong>,
                card.department,
                card.managerName,
                card.currentUsage.toLocaleString()+"원",
                card.monthlyLimit.toLocaleString()+"원",
                remaining.toLocaleString()+"원",
                <span className={`status-badge ${card.status === '한도초과' ? 'status-danger' : ''}`}>
                    {card.status}
                </span>,
                <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => alert(`${card.cardName} 상세 내역`)}>
                    상세
                </button>
                <button type="button" onClick={() => alert(`${card.cardName} 한도 수정`)}>
                    한도변경
                </button>
                </div>
            ]
        };
      });
    
      return (
        <div className="sub-container">
          <header className="dashboard-header">
            <span className="subtitle">법인카드 관리</span>
            <div className="dashboard-top">
              <button className="register-btn">+ 등록</button>
            </div>
          </header>
    
          <hr />
    
          {/* 간이 검색/필터 영역 */}
          <section>
            <div>
              <label htmlFor="deptFilter">부서 선택: </label>
              <select id="deptFilter">
                <option value="ALL">전체 부서</option>
                <option value="SALES">영업팀</option>
                <option value="DEV">개발팀</option>
                <option value="FINANCE">재무·회계팀</option>
              </select>
    
              <label htmlFor="searchKeyword">검색: </label>
              <input
                id="searchKeyword"
                type="text"
                placeholder="카드명 또는 관리자명 입력"
              />
              <button type="button">조회</button>
            </div>
          </section>
    
          <br />
    
          {/* PaginationTable 연동 */}
          <PaginationTable
            title={cardTableTitle}
            th={cardHeaders}
            allData={tCardData}
            itemsPerPage={5} // 5건씩 페이징 처리
          />
        </div>
      );
    }

export default CorpCard;
