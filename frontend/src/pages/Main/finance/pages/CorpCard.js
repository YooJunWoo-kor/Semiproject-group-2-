// [MVC] 법인카드 목록·등록·상세·이력·한도 화면을 연결합니다.
import React, { useRef } from "react";
import useCorpCardsController from "../components/corpCards/useCorpCardsController";
import createCorpCardTableData from "../components/corpCards/createCorpCardTableData";
import CorpCardFormModal from "../components/corpCards/CorpCardFormModal";
import CorpCardLimitModal from "../components/corpCards/CorpCardLimitModal";
import CorpCardDetailModal from "../components/corpCards/CorpCardDetailModal";
import useFinanceResourceTableLayout from "../components/FinanceResourceTableLayout";
import { FinanceSearchForm } from "../components/FinanceDetailUI";
import "../components/Finance.css";
import PaginationTable from "../../../../components/PaginationTable";
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";
export default function CorpCard(props) {
  const cardListRef = useRef(null);

  // 화면에 필요한 상태와 동작은 Controller에서 전달받습니다.
  const {
    embedded,
    loading,
    loadError,
    departmentFilter,
    setDepartmentFilter,
    searchKeyword,
    setSearchKeyword,
    searchFilter,
    cardView,
    limitTarget,
    monthlyLimitInput,
    setMonthlyLimitInput,
    limitSaving,
    limitError,
    editingCardId,
    cardFormOpen,
    cardPayments,
    paymentsLoading,
    paymentsError,
    cardSaving,
    cardFormError,
    cardForm,
    formDepartments,
    formEmployees,
    optionsLoading,
    optionsError,
    statusSavingId,
    statusError,
    departmentOptions,
    filteredCards,
    handleCardSearch,
    handleCardStatusChange,
    openCardForm,
    openEditCardForm,
    handleCardFormChange,
    handleCardSubmit,
    openLimitForm,
    handleLimitSubmit,
    selectedCard,
    openCardHistory,
    openCardDetail,
    closeCardDetail,
    closeLimitModal,
    closeRegistrationModal,
  } = useCorpCardsController(props);
  // 선택한 카드가 바뀌면 해당 카드의 사용 이력을 조회합니다.

  const cardTableTitle = "법인카드 목록 현황";
  const { cardColumns, cardHeaders, tCardData } = createCorpCardTableData({
    cardSaving,
    filteredCards,
    handleCardStatusChange,
    limitSaving,
    openCardDetail,
    openCardHistory,
    statusSavingId,
  });
  useFinanceResourceTableLayout(cardListRef, cardColumns);
  return (
    <div
      className={`border-container finance-cards finance-resource${embedded ? " finance-resource-embedded" : ""}`}
    >
      <header className="dashboard-header finance-resource-header">
        {!embedded && <span className="subtitle">법인카드 관리</span>}
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            disabled={cardSaving || limitSaving || cardFormOpen || statusSavingId !== null}
            onClick={openCardForm}
          >
            + 카드 등록
          </button>
        </div>
      </header>

      {!embedded && <hr />}

      {cardFormOpen && (
        <CorpCardFormModal
          cardForm={cardForm}
          cardFormError={cardFormError}
          cardSaving={cardSaving}
          closeRegistrationModal={closeRegistrationModal}
          editingCardId={editingCardId}
          formDepartments={formDepartments}
          formEmployees={formEmployees}
          handleCardFormChange={handleCardFormChange}
          handleCardSubmit={handleCardSubmit}
          loadError={loadError}
          loading={loading}
          optionsError={optionsError}
          optionsLoading={optionsLoading}
        />
      )}

      {/* 법인카드 검색 및 부서 필터 */}
      <section className="finance-resource-filters">
        <FinanceSearchForm
          className="finance-card-search finance-resource-search"
          onSubmit={handleCardSearch}
          filters={[
            {
              id: "deptFilter",
              label: "부서 선택: ",
              value: departmentFilter,
              onChange: setDepartmentFilter,
              options: [
                {
                  value: "ALL",
                  label: "전체 부서",
                },
                ...departmentOptions.map((value) => ({
                  value,
                  label: value,
                })),
              ],
            },
          ]}
          keyword={{
            id: "card-search-keyword",
            placeholder: "카드명 또는 관리자명 입력",
            value: searchKeyword,
            onChange: setSearchKeyword,
          }}
        />
      </section>

      {loading && <p>법인카드 목록을 불러오는 중입니다.</p>}

      {loadError && <p role="alert">{loadError}</p>}

      {statusError && <p role="alert">{statusError}</p>}

      {/* PaginationTable 연동 */}
      <div
        className="finance-resource-list"
        ref={cardListRef}
        style={{
          width: "100%",
          minWidth: 0,
        }}
      >
        <PaginationTable
          key={JSON.stringify(searchFilter)}
          title={cardTableTitle}
          th={cardHeaders}
          allData={tCardData}
          itemsPerPage={5} // 5건씩 페이징 처리
        />
      </div>

      {limitTarget && (
        <CorpCardLimitModal
          closeLimitModal={closeLimitModal}
          handleLimitSubmit={handleLimitSubmit}
          limitError={limitError}
          limitSaving={limitSaving}
          limitTarget={limitTarget}
          monthlyLimitInput={monthlyLimitInput}
          setMonthlyLimitInput={setMonthlyLimitInput}
        />
      )}

      {selectedCard && !cardFormOpen && !limitTarget && (
        <CorpCardDetailModal
          cardPayments={cardPayments}
          cardSaving={cardSaving}
          cardView={cardView}
          closeCardDetail={closeCardDetail}
          limitSaving={limitSaving}
          openCardDetail={openCardDetail}
          openCardHistory={openCardHistory}
          openEditCardForm={openEditCardForm}
          openLimitForm={openLimitForm}
          paymentsError={paymentsError}
          paymentsLoading={paymentsLoading}
          selectedCard={selectedCard}
          statusSavingId={statusSavingId}
        />
      )}
    </div>
  );
}
