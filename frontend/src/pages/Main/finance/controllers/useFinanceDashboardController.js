// 담당 화면: 대시보드
// 역할: 대시보드 데이터 조회·지급 일정 상세 및 문서 창 상태을 담당합니다.
// 대시보드 조회·지급 일정 상세·문서 창 상태를 담당합니다.
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../utils/authStorage";
import { dashboardStats, getScheduleCandidates, getDashboardDocumentId, validateDashboardResponse, } from "../models/financeDashboardModel";

const DASHBOARD_API = API_BASE_URL + "/finance/dashboard";

export default function useFinanceDashboardController() {
  // documentId가 null이면 같은 제목의 문서 선택 화면
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [documentDetail, setDocumentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailDocumentId = scheduleDialog?.documentId ?? null;
  function openDocumentDetail(documentId) {
    const id = getDashboardDocumentId(documentId);
    if (id === null) return;
    setDocumentDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setScheduleDialog({
      documentId: id,
      candidates: [],
    });
  }
  function closeScheduleDetail() {
    setScheduleDialog(null);
    setDocumentDetail(null);
    setDetailError("");
    setDetailLoading(false);
  }

  // 공용 달력의 일정 버튼 클릭을 부모에서 감지합니다.
  function handleCalendarClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button.g-cal-bar");
    if (!button || !event.currentTarget.contains(button)) return;

    // 공용 달력의 기존 클릭 처리 대신 상세보기를 실행합니다.
    event.stopPropagation();
    const title = button.getAttribute("title");
    if (!title) return;
    const candidates = getScheduleCandidates(data, title);
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      openDocumentDetail(candidates[0].id);
      return;
    }

    // 제목이 같으면 임의로 문서를 열지 않고 선택하도록 합니다.
    setDocumentDetail(null);
    setDetailError("");
    setDetailLoading(false);
    setScheduleDialog({
      documentId: null,
      candidates,
    });
  }
  useEffect(() => {
    if (detailDocumentId === null) return;
    const controller = new AbortController();
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");
      try {
        const response = await fetch(`${DASHBOARD_API}/schedules/${detailDocumentId}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "조회할 지급 문서를 찾을 수 없습니다."
              : "상세정보를 불러오지 못했습니다.",
          );

        const result = await response.json();
        if (!controller.signal.aborted) setDocumentDetail(result);
      } catch (err) {
        if (err.name !== "AbortError") setDetailError(err.message);
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => controller.abort();
  }, [detailDocumentId]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  // 입력 중인 조건과 실제 적용한 조건을 분리합니다. Enter로도 검색합니다.

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(DASHBOARD_API, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("재무 현황을 불러오지 못했습니다. 서버 연결을 확인해 주세요.");
        const result = await response.json();
        const validationError = validateDashboardResponse(result);
        if (validationError) throw new Error(validationError);
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setData(null);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, [reload]);
  const stats = dashboardStats;
  const [documentType, setDocumentType] = useState(null);
  const closeDocument = () => setDocumentType(null);
  // 화면에 전달할 상태와 동작
  return {
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
  };
}
