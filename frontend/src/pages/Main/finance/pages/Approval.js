// 결재 목록, 기안 및 상세 화면을 연결합니다.
import React from "react";
import useApprovalsController from "../components/approval/useApprovalsController";
import createApprovalTableData from "../components/approval/createApprovalTableData";
import ApprovalDraftModal from "../components/approval/ApprovalDraftModal";
import ApprovalDetailModal from "../components/approval/ApprovalDetailModal";
import { FinanceSearchForm } from "../components/FinanceDetailUI";
import PaginationTable from "../../../../components/PaginationTable";
import "../components/Finance.css";
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";

export default function Approval(props) {
  const {
    embedded,
    allowCreate,
    expenseGroups,
    loginUser,
    paymentBusy,
    paymentFormOpen,
    setPaymentFormOpen,
    setApprovalModalElement,
    decisionOpinion,
    setDecisionOpinion,
    decisionPassword,
    setDecisionPassword,
    decisionSaving,
    decisionError,
    decisionMessage,
    attachmentSaving,
    setAttachmentSaving,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    searchFilter,
    approvalSteps,
    stepsLoading,
    stepsError,
    draftOpen,
    draftSaving,
    draftError,
    draftForm,
    draftEmployees,
    employeesLoading,
    employeesError,
    departmentOptions,
    filteredApprovals,
    handleSearch,
    pendingCount,
    approvedAmount,
    rejectedCount,
    selectedApproval,
    canDecide,
    handleDecision,
    canAttach,
    handlePaymentBusyChange,
    handlePaymentSaved,
    openApprovalDetail,
    closeApprovalDetail,
    closeDraftForm,
    openDraftForm,
    handleDraftChange,
    handleDraftSubmit,
    refreshApprovalAttachments,
  } = useApprovalsController(props);

  const approvalHeaders = [
    "결재 번호",
    "상신 부서",
    "결재 요청자",
    "승인 내역 (제목)",
    "신청 금액",
    "등록된 결제수단",
    "증빙",
    "처리 마감일",
    "진행 상태",
    "관리",
  ];

  // 선택한 문서의 정보를 찾습니다.
  const tApprovalData = createApprovalTableData({
    attachmentSaving,
    decisionSaving,
    filteredApprovals,
    openApprovalDetail,
    paymentBusy,
  });
  
  return (
    <div className="border-container">
      <header className="dashboard-header">
        <span className="subtitle">{embedded ? "기존 결재·이력" : "결제(지출) 관리"}</span>

        {allowCreate && (
          <div className="dashboard-top">
            <button
              type="button"
              className="register-btn"
              disabled={draftOpen || draftSaving || decisionSaving || attachmentSaving || paymentBusy}
              onClick={openDraftForm}
            >
              + 지출 결재 기안
            </button>
          </div>
        )}
      </header>

      {draftOpen && (
        <ApprovalDraftModal
          closeDraftForm={closeDraftForm}
          draftEmployees={draftEmployees}
          draftError={draftError}
          draftForm={draftForm}
          draftSaving={draftSaving}
          employeesError={employeesError}
          employeesLoading={employeesLoading}
          expenseGroups={expenseGroups}
          handleDraftChange={handleDraftChange}
          handleDraftSubmit={handleDraftSubmit}
        />
      )}

      <p>
        내업무 승인 기안서는 조회용으로 함께 표시됩니다. 금액이 미등록인 문서는 승인 금액 합계에서 제외됩니다.
      </p>
      <div>
        <strong>승인 대기:</strong> {pendingCount}건{" | "}
        <strong>승인 문서 금액 합계:</strong> {approvedAmount.toLocaleString()}원{" | "}
        <strong>반려:</strong> {rejectedCount}건
      </div>

      <hr />

      <section>
        <FinanceSearchForm
          onSubmit={handleSearch}
          filters={[
            {
              id: "approval-status",
              label: "결재 상태: ",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                {
                  value: "ALL",
                  label: "전체 보기",
                },
                ...["대기", "승인", "반려"].map((value) => ({
                  value,
                  label: value,
                })),
              ],
            },
            {
              id: "approval-department",
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
        />
      </section>

      <br />

      {loading && <p>결재 문서를 불러오는 중입니다.</p>}
      {error && <p role="alert">{error}</p>}

      <PaginationTable
        key={JSON.stringify(searchFilter)}
        title="결제 지출 승인 목록"
        th={approvalHeaders}
        allData={tApprovalData}
        itemsPerPage={5}
      />

      {selectedApproval && !draftOpen && (
        <ApprovalDetailModal
          approvalSteps={approvalSteps}
          attachmentSaving={attachmentSaving}
          canAttach={canAttach}
          canDecide={canDecide}
          closeApprovalDetail={closeApprovalDetail}
          decisionError={decisionError}
          decisionMessage={decisionMessage}
          decisionOpinion={decisionOpinion}
          decisionPassword={decisionPassword}
          decisionSaving={decisionSaving}
          handleDecision={handleDecision}
          handlePaymentBusyChange={handlePaymentBusyChange}
          handlePaymentSaved={handlePaymentSaved}
          loginUser={loginUser}
          paymentBusy={paymentBusy}
          paymentFormOpen={paymentFormOpen}
          refreshApprovalAttachments={refreshApprovalAttachments}
          selectedApproval={selectedApproval}
          setApprovalModalElement={setApprovalModalElement}
          setAttachmentSaving={setAttachmentSaving}
          setDecisionOpinion={setDecisionOpinion}
          setDecisionPassword={setDecisionPassword}
          setPaymentFormOpen={setPaymentFormOpen}
          stepsError={stepsError}
          stepsLoading={stepsLoading}
        />
      )}
    </div>
  );
}
