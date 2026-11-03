import React, { useState } from "react";
import { Link } from "react-router-dom";
import PaginationTable from "../../../../components/PaginationTable";
import { getLoginUser } from "../../../../utils/authStorage";

// 기존 더미 데이터 원본 유지
const rows = [
  ['김민준', '개발팀', '08:48', '-', '정상'],
  ['이서연', '인사팀', '08:55', '-', '정상'],
  ['박지호', '디자인팀', '09:12', '-', '지각'],
  ['최유진', '마케팅팀', '-', '연차', '휴가'],
  ['정도윤', '경영지원팀', '08:51', '-', '정상'],
  ['한지우', '개발팀', '-', '-', '미출근']
];

export default function Attendance() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  // 검색 상태 관리
  const [searchTerm, setSearchTerm] = useState("");

  // 1. 공통 테이블 헤더 규격 (th)
  const list = ["직원", "부서", "출근시간", "비고", "근태상태"];

  // 2. 검색 필터링 적용
  const filteredRows = rows.filter((row) => {
    const name = row[0];
    const dept = row[1];
    const status = row[4];
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 3. PaginationTable 전용 allData 규격({ content: [...] }) 매핑
  const tableData = filteredRows.map((row) => ({
    content: [
      row[0], // 직원
      row[1], // 부서
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{row[2]}</span>, // 출근시간
      row[3], // 비고
      <span className={`status-tag ${row[4] === '정상' ? 'working' : 'off'}`}>
        {row[4]}
      </span> // 근태상태
    ]
  }));

  return (
    <div className="sub-container">
      {/* 상단 헤더 */}
      <header className="dashboard-header">
        <div>
          <span className="subtitle">근태관리</span>
          <span className="subtext">전사 임직원의 일별 출근 및 근태 현황을 확인합니다.</span>
        </div>
        <div className="dashboard-top">
          {isMaster && (
            <Link to="/main/hr/employees" className="register-btn">
              근태수정
            </Link>
          )}
        </div>
      </header>

      {/* 상단 검색바 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "16px",
        marginBottom: "12px"
      }}>
        <div style={{ fontSize: "14px", color: "#475569" }}>
          전체 <strong>{filteredRows.length}</strong>건
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="직원명, 부서, 근태상태 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "13px",
              outline: "none",
              width: "220px"
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                padding: "0 10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                color: "#64748b"
              }}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 게시판 모듈 적용 (PaginationTable) */}
      <PaginationTable
        title="일별 근태 현황 목록"
        th={list}
        allData={tableData}
        itemsPerPage={5}
      />
    </div>
  );
}