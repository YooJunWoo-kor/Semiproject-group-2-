// 담당 화면: 대시보드의 일정 상세
// 역할: 동일 제목 일정 선택 목록과 지급 문서 상세·로딩·오류·닫기를 표시합니다.
import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import { numberText } from "../../models/financeDashboardModel";

// 조회와 선택 상태는 대시보드 컨트롤러에서 관리합니다.
export default function FinanceScheduleDetailModal({
  scheduleDialog,
  documentDetail,
  detailLoading,
  detailError,
  detailDocumentId,
  onSelect,
  onClose,
}) {
  if (!scheduleDialog) return null;

  let title = "지급 일정 상세정보";
  if (detailDocumentId === null) title = "조회할 지급 문서 선택";

  function renderChoices() {
    if (detailDocumentId !== null) return null;
    return (
      <>
        <p className="finance-schedule-guide">
          같은 제목의 일정이 여러 개입니다. 조회할 문서를 선택해주세요.
        </p>
        <div className="finance-schedule-choices">
          {scheduleDialog.candidates.map((schedule) => (
            <button type="button" key={schedule.id} onClick={() => onSelect(schedule.id)}>
              <strong>{schedule.title}</strong>
              <span>
                문서 번호: {schedule.id}
                {" · "}마감일: {schedule.start}
              </span>
              <span>{schedule.description}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderDetail() {
    if (detailDocumentId === null) return null;
    if (detailLoading || detailError || !documentDetail) return null;
    const rows = [
      ["문서 번호", documentDetail.document_id],
      ["문서명", documentDetail.title],
      ["문서 구분", documentDetail.document_type],
      ["신청자", documentDetail.requester_name],
      ["신청 부서", documentDetail.department_name],
      ["마감일", documentDetail.due_date],
      ["결재 상태", documentDetail.approval_status],
      ["문서 금액", `${numberText(documentDetail.amount)}원`],
      ["지급 완료", `${numberText(documentDetail.paid_amount)}원`],
      ["남은 지급액", `${numberText(documentDetail.remaining_amount)}원`],
      ["내용", documentDetail.content],
    ];
    function displayValue(value) {
      if (value === "" || value == null) return "—";
      return value;
    }
    return (
      <div className="table-shell">
        <table className="finance-schedule-fields">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{displayValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="finance-registration-modal finance-schedule-detail">
      <ModalBase
        title={title}
        onClose={onClose}
        layout={
          <div aria-busy={detailLoading}>
            {renderChoices()}
            {detailLoading && <p role="status">상세정보를 불러오는 중입니다.</p>}
            {detailError && <p role="alert">{detailError}</p>}
            {renderDetail()}
            <div className="finance-schedule-actions">
              <button type="button" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}
