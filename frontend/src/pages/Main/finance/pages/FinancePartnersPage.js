// 담당 화면: 거래처 관리
// 역할: 거래처 목록·검색·달력·등록·상세·금액 조회를 연결합니다.
import { FinanceSearchForm } from "../components/ui/FinanceFormControls";
// 거래처 목록·등록·상세·금액 조회와 공통 달력을 연결합니다.
import React from "react";
import usePartnersController from "../controllers/usePartnersController";
import createPartnerTableData from "../components/partners/createPartnerTableData";
import PartnerFormModal from "../components/partners/PartnerFormModal";
import PartnerBalanceModal from "../components/partners/PartnerBalanceModal";
import PartnerDetailModal from "../components/partners/PartnerDetailModal";
import { FinanceTwoColumn, FinanceLayoutColumn } from "../components/ui/FinanceDetailDisplay";
import { FilterTabs } from "../../../../components/FilterControls";
import "../styles/Finance.css";
import PaginationTable from "../../../../components/PaginationTable";
import WeeklyCalendar from "../../../../components/weeklycalendar/WeeklyCalendar";
import BasicCalendar from "../../../../components/calendar/BasicCalendar";
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";

export default function Partners() {
  const {
    calendarType,
    setCalendarType,
    amountDetail,
    setAmountDetail,
    amountMonth,
    setAmountMonth,
    allAmountPeriods,
    setAllAmountPeriods,
    amountRows,
    partnersList,
    loading,
    error,
    keyword,
    setKeyword,
    tradeType,
    setTradeType,
    searchFilter,
    editingPartnerId,
    formOpen,
    partnerForm,
    saving,
    formError,
    deleting,
    handleSearch,
    filteredPartners,
    openAmountDetail,
    calendarEvents,
    selectedPartner,
    openPartnerDetail,
    closePartnerDetail,
    openPartnerForm,
    handlePartnerChange,
    openEditPartnerForm,
    handlePartnerSubmit,
    handlePartnerDelete,
    closeRegistrationModal,
    handleSearchKeyDown,
  } = usePartnersController();

  // 테이블 규격 헤더 정의
  const partnerTableTitle = "거래처 목록 (입출금 마감 현황)";
  const partnerHeaders = ["거래처 ID", "거래처명", "받을 금액", "지급할 금액"];

  // 검색 조건에 맞는 거래처만 남깁니다.
  const tPartnerData = createPartnerTableData({
    deleting,
    filteredPartners,
    openAmountDetail,
    openPartnerDetail,
    saving,
  });
  return (
    <div className="border-container finance-partners">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">거래처 및 정산 마감 관리</span>
        <div className="dashboard-top">
          <button type="button" className="register-btn" onClick={openPartnerForm}>
            + 신규 거래처 등록
          </button>
        </div>
      </header>

      <hr />

      {formOpen && (
        <PartnerFormModal
          closeRegistrationModal={closeRegistrationModal}
          editingPartnerId={editingPartnerId}
          formError={formError}
          handlePartnerChange={handlePartnerChange}
          handlePartnerSubmit={handlePartnerSubmit}
          partnerForm={partnerForm}
          saving={saving}
        />
      )}

      {amountDetail && (
        <PartnerBalanceModal
          allAmountPeriods={allAmountPeriods}
          amountDetail={amountDetail}
          amountMonth={amountMonth}
          amountRows={amountRows}
          setAllAmountPeriods={setAllAmountPeriods}
          setAmountDetail={setAmountDetail}
          setAmountMonth={setAmountMonth}
        />
      )}

      {/* 2. 좌우 2단 분할 레이아웃 컨테이너 (테이블 좌측, 달력 우측 상시 노출) */}
      <FinanceTwoColumn>
        {/* [좌측 영역] 검색 필터 및 거래처 목록 테이블 (약 62% 너비) */}
        <FinanceLayoutColumn>
          {/* 간이 검색/필터 구역 */}
          <FinanceSearchForm
            className="finance-partner-filters"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
            keyword={{
              id: "partner-search-keyword",
              placeholder: "거래처명, 사업자번호 검색",
              value: keyword,
              onChange: setKeyword,
              onKeyDown: handleSearchKeyDown,
            }}
          />

          {loading && <p>거래처 목록을 불러오는 중입니다.</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && filteredPartners.length === 0 && (
            <p>
              {partnersList.length === 0 ? "등록된 거래처가 없습니다." : "검색 결과가 없습니다."}
            </p>
          )}

          <div
            style={{
              flex: "1 1 62%",
              minWidth: 0,
            }}
          >
            <PaginationTable
              key={JSON.stringify(searchFilter)}
              title={partnerTableTitle}
              th={partnerHeaders}
              allData={tPartnerData}
              itemsPerPage={5}
            />
          </div>

          {/* 상세와 수정 폼은 하나씩 열고, 기존 공통 모달을 사용합니다. */}
          {selectedPartner && !formOpen && (
            <PartnerDetailModal
              closePartnerDetail={closePartnerDetail}
              deleting={deleting}
              handlePartnerDelete={handlePartnerDelete}
              openEditPartnerForm={openEditPartnerForm}
              saving={saving}
              selectedPartner={selectedPartner}
            />
          )}
        </FinanceLayoutColumn>

        {/* [우측 영역] 상시 노출 마감일 달력 (약 38% 너비) */}
        <FinanceLayoutColumn side="right">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h4 className="board-title finance-calendar-title">정산 마감 일정</h4>
            <FilterTabs
              label="달력 보기"
              options={[
                {
                  value: "week",
                  label: "주간",
                },
                {
                  value: "month",
                  label: "월간",
                },
              ]}
              value={calendarType}
              onChange={setCalendarType}
            />
          </div>

          {/* 수정된 컴포넌트명 BasicCalendar 및 WeeklyCalendar 적용 */}
          <div className="calendar-widget-wrapper">
            {calendarType === "week" ? (
              <WeeklyCalendar schedule={calendarEvents} />
            ) : (
              <BasicCalendar schedule={calendarEvents} />
            )}
          </div>
        </FinanceLayoutColumn>
      </FinanceTwoColumn>
    </div>
  );
}
