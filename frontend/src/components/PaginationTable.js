import React, { useState } from 'react';
import BasicTable from './BasicTable';
import '../css/PaginationTable.css';

//기본 게시판 모듈, BasicTable활용

function PaginationTable({ title, th, allData = [], itemsPerPage = 5, style = 1 }) {
  
  // 현재 페이지 번호 (1부터 시작)
  const [currentPage, setCurrentPage] = useState(1);

  // 총 페이지 수 계산
  const totalPages = Math.ceil(allData.length / itemsPerPage) || 1;
  // 검색이나 삭제로 데이터가 줄어도 유효한 페이지를 표시한다.
  const visiblePage = Math.min(currentPage, totalPages);

  // 현재 페이지에 표시할 데이터 슬라이싱
  const startIndex = (visiblePage - 1) * itemsPerPage;
  const currentTd = allData.slice(startIndex, startIndex + itemsPerPage);

  // 페이지 번호 배열 생성 ([1, 2, 3, ...])
  const pageNumbers = [];
  for (let page = 1; page <= totalPages; page++) {
    pageNumbers.push(page);
  }

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
  };

  const handlePrev = () => {
    if (visiblePage > 1) setCurrentPage(visiblePage - 1);
  };

  const handleNext = () => {
    if (visiblePage < totalPages) setCurrentPage(visiblePage + 1);
  };

  const setClass = style === 1 ? "pagination-table-wrapper" : "border-container";

  return (
    <div className={setClass}>
      {/* 기존 BasicTable에 잘라낸 td와 title, th를 그대로 전달 */}
      <BasicTable title={title} th={th} td={currentTd} />

      {/* 하단 페이지네이션 컨트롤러 */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            type="button"
            className="page-btn nav-btn"
            onClick={handlePrev}
            disabled={visiblePage === 1}
          >
            &lt;
          </button>

          <div className="page-numbers">
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                className={`page-btn number-btn ${visiblePage === num ? 'active' : ''}`}
                onClick={() => handlePageChange(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="page-btn nav-btn"
            onClick={handleNext}
            disabled={visiblePage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

export default PaginationTable;