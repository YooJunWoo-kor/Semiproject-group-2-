import React, { useState } from 'react';
import BasicTable from './BasicTable';
import './PaginationTable.css';

function PaginationTable({ title, th, allData = [], itemsPerPage = 5 }) {
  // 현재 페이지 번호 (1부터 시작)
  const [currentPage, setCurrentPage] = useState(1);

  // 총 페이지 수 계산
  const totalPages = Math.ceil(allData.length / itemsPerPage) || 1;

  // 현재 페이지에 표시할 데이터 슬라이싱
  const startIndex = (currentPage - 1) * itemsPerPage;
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
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="pagination-table-wrapper">
      {/* 기존 BasicTable에 잘라낸 td와 title, th를 그대로 전달 */}
      <BasicTable title={title} th={th} td={currentTd} />

      {/* 하단 페이지네이션 컨트롤러 */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            type="button"
            className="page-btn nav-btn"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            &lt;
          </button>

          <div className="page-numbers">
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                className={`page-btn number-btn ${currentPage === num ? 'active' : ''}`}
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
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

export default PaginationTable;