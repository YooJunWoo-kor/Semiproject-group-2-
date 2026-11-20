// 담당 화면: 거래처 관리
// 역할: 거래처 목록 조회·검색·선택 및 편집/금액 조회 연결을 담당합니다.
// 거래처 조회·검색·선택과 기능별 Controller 연결을 담당합니다.
import usePartnerEditor from "./usePartnerEditor";
import usePartnerBalances from "./usePartnerBalances";
import { useEffect, useState } from "react";
import { getPartners } from "../../../../utils/financeService";
import { toPartner, buildPartnerCalendarEvents, filterPartners, } from "../models/financePartnerModel";

export default function usePartnersController() {
  // 1. 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState("week"); // 'week' | 'month'

  // 2. 선택된 거래처 ID (상세 확인용)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const {
    amountDetail,
    setAmountDetail,
    amountMonth,
    setAmountMonth,
    allAmountPeriods,
    setAllAmountPeriods,
    amountRows,
    openAmountDetail,
  } = usePartnerBalances();
  // DB에서 가져온 거래처 목록
  const [partnersList, setPartnersList] = useState([]);

  // 조회 상태와 오류 메시지
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 입력 중인 검색 조건
  const [keyword, setKeyword] = useState("");
  const [tradeType, setTradeType] = useState("ALL");

  // 검색 버튼을 눌렀을 때 적용할 조건
  const [searchFilter, setSearchFilter] = useState({
    keyword: "",
    tradeType: "ALL",
  });

  // null이면 신규 등록, ID가 있으면 해당 거래처 수정
  const {
    editingPartnerId,
    formOpen,
    partnerForm,
    saving,
    formError,
    deleting,
    openPartnerForm,
    handlePartnerChange,
    openEditPartnerForm,
    handlePartnerSubmit,
    handlePartnerDelete,
    closeRegistrationModal,
  } = usePartnerEditor({
    partnersList,
    setKeyword,
    setPartnersList,
    setSearchFilter,
    setSelectedPartnerId,
    setTradeType,
  });
  function handleSearch() {
    setSearchFilter({
      keyword: keyword.trim(),
      tradeType: tradeType,
    });
  }

  // 화면에 처음 들어왔을 때 거래처 목록을 조회
  useEffect(() => {
    async function loadPartners() {
      try {
        const data = await getPartners();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환
        const partners = data.map(toPartner);
        setPartnersList(partners);
      } catch (err) {
        console.error("거래처 조회 오류:", err);
        setError("거래처 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadPartners();
  }, []);

  // 검색 조건에 맞는 거래처만 남깁니다.
  const filteredPartners = filterPartners(partnersList, searchFilter);

  // PaginationTable 규격 데이터 매핑 ({ content: [...] })
  const calendarEvents = buildPartnerCalendarEvents(partnersList);
  // 캘린더 이벤트 매핑 (BasicCalendar / WeeklyCalendar 공통 인터페이스 규격)
  // 정기 마감일로 매월 달력 일정을 만듭니다.

  // 선택한 거래처의 정보를 찾습니다.
  const selectedPartner = partnersList.find((item) => item.id === selectedPartnerId);

  // 선택한 거래처를 공통 상세 모달로 표시합니다.
  function openPartnerDetail(partnerId) {
    if (saving || deleting) return;
    setSelectedPartnerId(partnerId);
  }
  function closePartnerDetail() {
    if (saving || deleting) return;
    setSelectedPartnerId(null);
  }

  // 신규 등록폼 열기

  function handleSearchKeyDown(e) {
    // 한글 입력을 확정하는 Enter는 제외합니다.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch();
  }
  // 화면에 전달할 상태와 동작
  return {
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
  };
}
