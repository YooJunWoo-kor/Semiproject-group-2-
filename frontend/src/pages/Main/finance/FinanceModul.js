// 담당 화면: 대시보드
// 역할: 통계·지급 일정·문서 작성 버튼과 모달을 배치합니다.
import FinanceDocumentLauncher from "./components/documents/FinanceDocumentLauncher";
import useFinanceDashboardController from "./controllers/useFinanceDashboardController";
import React from "react";
import StatisticsCard from "../../../components/StatisticsCard";
import FinancePaymentSummary from "./components/dashboard/FinancePaymentSummary";
import FinanceSchedulePanel from "./components/dashboard/FinanceSchedulePanel";
import FinanceScheduleDetailModal from "./components/dashboard/FinanceScheduleDetailModal";
import "./styles/Finance.css";
import "../../../css/Table.css";
import "../../../css/Form.css";
import "../../../css/SubMain.css";
import "../../../css/ModalPopup.css";
import "../../../css/GroupBord.css";

function FinanceModul() {
  const {
    scheduleDialog,
    documentDetail,
    detailLoading,
    detailError,
    detailDocumentId,
    openDocumentDetail,
    closeScheduleDetail,
    handleCalendarClick,
    data,
    loading,
    error,
    reload,
    setReload,
    stats,
    documentType,
    setDocumentType,
    closeDocument,
  } = useFinanceDashboardController();

  let reloadLabel = "새로고침";
  
  if (loading) reloadLabel = "조회 중…";

  return (
    <div className="border-container finance-dashboard">
      <header className="dashboard-header">
        <span className="subtitle">재무관리 대시보드</span>

        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            disabled={loading}
            onClick={() => setReload(reload + 1)}
          >
            {reloadLabel}
          </button>
        </div>
      </header>

      {error && (
        <div className="fd-error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <p role="status" className="subtext">
          재무 현황을 불러오는 중입니다.
        </p>
      )}

      <div className="fd-top-row">
        {!loading && data && (
          <section className="stats-section fd-stats" aria-label="재무 현황">
            {stats.map(([key, label]) => (
              <StatisticsCard
                key={key} title={label} count={data.counts[key]} stiyle={0} color="var(--color-brand)" />
            ))}
          </section>
        )}

        <FinanceDocumentLauncher
          documentType={documentType}
          onSelect={setDocumentType}
          onClose={closeDocument}
        />
      </div>

      <div className="fd-bottom">
        <FinanceSchedulePanel
          schedules={data?.schedules || []}
          loading={loading}
          error={error}
          onCalendarClick={handleCalendarClick}
        >
          <FinanceScheduleDetailModal
            scheduleDialog={scheduleDialog}
            documentDetail={documentDetail}
            detailLoading={detailLoading}
            detailError={detailError}
            detailDocumentId={detailDocumentId}
            onSelect={openDocumentDetail}
            onClose={closeScheduleDetail}
          />
        </FinanceSchedulePanel>

        <div className="fd-summaries fd-panel">
          <FinancePaymentSummary title="지급총액" kind="completed" data={data} loading={loading} />

          <FinancePaymentSummary title="지급예정" kind="planned" data={data} loading={loading} />

          <p className="fd-note subtext">
            지급예정: 승인된 결재 문서의 미지급 잔액 · 지급기한 기준
          </p>
        </div>
      </div>
    </div>
  );
}
export default FinanceModul;
