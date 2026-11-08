import React, { useEffect, useState } from "react";
import ModalBase from '../../../../components/ModalBase';
import '../FinanceRegistration.css';
import PaginationTable from '../../../../components/PaginationTable';
import WeeklyCalendar from '../../../../components/weeklycalendar/WeeklyCalendar';
import BasicCalendar from '../../../../components/calendar/BasicCalendar';
import { getPartners, createPartner, updatePartner, deletePartner } from "../../../../utils/financeService";


// 신규 거래처 입력폼의 초기값
const initialPartnerForm = {
  company_name: "",
  tax_id: "",
  representative_name: "",
  company_phone: "",
  company_address: "",
  memo: "",
  trade_role: "매입",
  company_type: "",
  closing_day: "",
  bank_name: "",
  account_number: "",
  account_holder: ""
};

function Partners() {
  // 1. 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState('week'); // 'week' | 'month'

  // 2. 선택된 거래처 ID (상세 확인용)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

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
    tradeType: "ALL"
  });

  // null이면 신규 등록, ID가 있으면 해당 거래처 수정
  const [editingPartnerId, setEditingPartnerId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState(initialPartnerForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 삭제 요청 중인지 확인
  const [deleting, setDeleting] = useState(false);

  function handleSearch() {
    setSearchFilter({
      keyword: keyword.trim(),
      tradeType: tradeType
    });
  }


  // 화면에 처음 들어왔을 때 거래처 목록을 조회
  useEffect(() => {
    async function loadPartners() {
      try {
        const data = await getPartners();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환
        const partners = data.map((item) => ({
          id: item.partner_id,
          name: item.company_name,
          type: item.trade_role || "-",
          bizNumber: item.tax_id || "-",
          ceo: item.representative_name || "-",
          contact: item.company_phone || "-",
          address: item.company_address || "-",
          companyType: item.company_type || "-",
          memo: item.memo || "-",

          // DB 연결
          // 매입은 출금, 매출은 입금으로 표시
          settlementType:
            item.trade_role === "매입" ? "출금 마감" :
              item.trade_role === "매출" ? "입금 마감" : "-",

          // 매월 정기 마감일
          closingDay: item.closing_day,

          // 달력용 날짜는 다음 단계에서 연결
          closingDate: "",

          // 거래처 계좌정보
          bankInfo: {
            bank: item.bank_name || "-",
            account: item.account_number || "-",
            holder: item.account_holder || "-"
          },

          // 백엔드에서 계산한 금액을 숫자로 변환합니다.
          receivableAmount: Number(item.receivable_amount),
          payableAmount: Number(item.payable_amount),
          missingItems: Number(item.missing_items)
        }));

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

  // 테이블 규격 헤더 정의
  const partnerTableTitle = "거래처 목록 (입출금 마감 현황)";
  const partnerHeaders = [
    "거래처 ID",
    "거래처명",
    "구분",
    "사업자번호",
    "대표자/연락처",
    "마감 구분",
    "정기 마감일",
    "받을 금액",
    "지급할 금액",
    "관리/선택"
  ];

  // 검색 조건에 맞는 거래처만 남깁니다.
  const filteredPartners = partnersList.filter((item) => {
    const searchText = searchFilter.keyword.toLowerCase();

    // 거래처명 또는 사업자번호에 검색어가 포함되는지 확인
    const matchesKeyword =
      item.name.toLowerCase().includes(searchText) ||
      item.bizNumber.toLowerCase().includes(searchText);

    // DB의 거래 역할 값은 "매입", "매출"입니다.
    const matchesType =
      searchFilter.tradeType === "ALL" ||
      item.type === searchFilter.tradeType;

    return matchesKeyword && matchesType;
  });

  // PaginationTable 규격 데이터 매핑 ({ content: [...] })
  const tPartnerData = filteredPartners.map((item) => ({
    content: [
      item.id,
      <strong>{item.name}</strong>,
      item.type,
      item.bizNumber,
      `${item.ceo} (${item.contact})`,
      <span className={`status-badge ${item.settlementType === '입금 마감' ? 'status-success' : 'status-danger'}`}>
        {item.settlementType}
      </span>,
      <strong>
        {item.closingDay
          ? Number(item.closingDay) === 31
            ? "매월 말일"
            : `매월 ${item.closingDay}일`
          : "-"}
      </strong>,
      item.missingItems > 0
        ? "확인 필요"
        : `${item.receivableAmount.toLocaleString()}원`,
      item.missingItems > 0
        ? "확인 필요"
        : `${item.payableAmount.toLocaleString()}원`,
      <button
        type="button"
        disabled={saving || deleting}
        onClick={() => openPartnerDetail(item.id)}
      >
        선택
      </button>
    ]
  }));

  // 캘린더 이벤트 매핑 (BasicCalendar / WeeklyCalendar 공통 인터페이스 규격)
  // 정기 마감일로 매월 달력 일정을 만듭니다.
  const calendarEvents = [];
  const currentYear = new Date().getFullYear();

  // 작년부터 내년까지의 마감 일정을 생성합니다.
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let month = 0; month < 12; month++) {
      // 해당 월의 마지막 날짜
      const lastDay = new Date(year, month + 1, 0).getDate();

      partnersList.forEach((item) => {
        const closingDay = Number(item.closingDay);

        // 마감일이 없거나 잘못된 값이면 건너뜁니다.
        if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
          return;
        }

        // 31은 말일로 처리합니다.
        // 29일, 30일도 해당 월에 없으면 말일로 처리합니다.
        const day = Math.min(closingDay, lastDay);

        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const date = `${year}-${mm}-${dd}`;

        calendarEvents.push({
          id: `${item.id}-${date}`,
          title: `[${item.settlementType}] ${item.name}`,
          start: date,
          end: date,
          typeId: item.settlementType === "입금 마감" ? 0 : 2,
          description: "거래처 정기 정산 마감 일정"
        });
      });
    }
  }

  // 선택한 거래처의 정보를 찾습니다.
  const selectedPartner = partnersList.find(
    (item) => item.id === selectedPartnerId);

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
  function openPartnerForm() {
    setEditingPartnerId(null);
    setPartnerForm({ ...initialPartnerForm });
    setFormError("");
    setFormOpen(true);
  }

  // 입력한 항목의 값을 변경합니다.
  function handlePartnerChange(e) {
    const { name, value } = e.target;

    setPartnerForm({
      ...partnerForm,
      [name]: value
    });
  }

  // 거래처 수정폼 열기
  function openEditPartnerForm(partner) {
    function inputValue(value) {
      return value === "-" || value == null ? "" : value;
    }

    setEditingPartnerId(partner.id);

    // 선택한 거래처 정보를 기존 입력폼에 채웁니다.
    setPartnerForm({
      company_name: partner.name,
      tax_id: inputValue(partner.bizNumber),
      representative_name: inputValue(partner.ceo),
      company_phone: inputValue(partner.contact),
      company_address: inputValue(partner.address),
      memo: inputValue(partner.memo),
      trade_role: partner.type,
      company_type: inputValue(partner.companyType),
      closing_day: partner.closingDay ?? "",
      bank_name: inputValue(partner.bankInfo.bank),
      account_number: inputValue(partner.bankInfo.account),
      account_holder: inputValue(partner.bankInfo.holder)
    });

    setFormError("");
    setFormOpen(true);
  }

  // DB에 신규 거래처를 저장합니다.
  async function handlePartnerSubmit(e) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setFormError("");

    try {
      const isEditing = editingPartnerId !== null;
      let result;

      if (isEditing) {
        result = await updatePartner(editingPartnerId, partnerForm);
      } else {
        result = await createPartner(partnerForm);
      }

      // 저장에 성공한 데이터를 화면용 이름으로 변환합니다.
      const newPartner = {
        id: isEditing ? editingPartnerId : result.partner_id,
        name: partnerForm.company_name.trim(),
        type: partnerForm.trade_role,
        bizNumber: partnerForm.tax_id.trim() || "-",
        ceo: partnerForm.representative_name.trim() || "-",
        contact: partnerForm.company_phone.trim() || "-",
        address: partnerForm.company_address.trim() || "-",
        companyType: partnerForm.company_type.trim() || "-",
        memo: partnerForm.memo.trim() || "-",
        settlementType:
          partnerForm.trade_role === "매입"
            ? "출금 마감"
            : "입금 마감",
        closingDay:
          partnerForm.closing_day === ""
            ? null
            : Number(partnerForm.closing_day),
        closingDate: "",
        // 수정 시 기존 계산 금액을 유지하고, 신규 등록은 0원입니다.
        receivableAmount: isEditing
          ? partnersList.find((item) => item.id === editingPartnerId).receivableAmount
          : 0,
        payableAmount: isEditing
          ? partnersList.find((item) => item.id === editingPartnerId).payableAmount
          : 0,
        missingItems: isEditing
          ? partnersList.find((item) => item.id === editingPartnerId).missingItems
          : 0,
        bankInfo: {
          bank: partnerForm.bank_name.trim() || "-",
          account: partnerForm.account_number.trim() || "-",
          holder: partnerForm.account_holder.trim() || "-"
        }
      };

      if (isEditing) {
        // 수정한 ID의 거래처만 교체합니다.
        setPartnersList((prev) =>
          prev.map((item) =>
            item.id === editingPartnerId ? newPartner : item
          )
        );
      } else {
        // 신규 등록일 때만 행을 추가합니다.
        setPartnersList((prev) => [newPartner, ...prev]);
      }

      // 검색 조건을 초기화해서 새 거래처가 보이게 합니다.
      setKeyword("");
      setTradeType("ALL");
      setSearchFilter({ keyword: "", tradeType: "ALL" });

      //거래처 등록+수정
      setSelectedPartnerId(newPartner.id);
      setFormOpen(false);
      setEditingPartnerId(null);
      alert(
        isEditing
          ? "거래처가 수정되었습니다."
          : "거래처가 등록되었습니다."
      );
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        "거래처 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 거래처 삭제
  async function handlePartnerDelete(partner) {
    if (deleting || saving) return;

    // 취소를 누르면 삭제하지 않습니다.
    const confirmed = window.confirm(
      `[${partner.id}번] ${partner.name} 거래처를 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await deletePartner(partner.id);

      // DB 삭제 성공 후 화면 목록에서도 제거합니다.
      setPartnersList((prev) =>
        prev.filter((item) => item.id !== partner.id)
      );

      setSelectedPartnerId(null);

      // 삭제한 거래처의 수정폼이 열려 있으면 닫습니다.
      if (editingPartnerId === partner.id) {
        setFormOpen(false);
        setEditingPartnerId(null);
      }

      // 삭제 후 목록 첫 페이지로 돌아갑니다.
      setSearchFilter((prev) => ({
        ...prev,
        refresh: (prev.refresh || 0) + 1
      }));

      alert("거래처가 삭제되었습니다.");
    } catch (err) {
      // 거래 내역이 있어 삭제가 차단된 경우도 표시합니다.
      alert(
        err.response?.data?.message ||
        "거래처 삭제에 실패했습니다."
      );
    } finally {
      setDeleting(false);
    }
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving) return;
    setFormOpen(false);
  }

  return (
    <div className="border-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <span className="subtitle">거래처 및 정산 마감 관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            onClick={openPartnerForm}
          >
            + 신규 거래처 등록
          </button>
        </div>
      </header>

      <hr />

      {formOpen && (
        <div className="finance-registration-modal">
          <ModalBase
            title={editingPartnerId === null ? "신규 거래처 등록" : "거래처 수정"}
            onClose={closeRegistrationModal}
  
            layout={(
              <form onSubmit={handlePartnerSubmit}>
              
                {/* 같은 구조의 문자 입력칸은 map으로 만듭니다. */}
                {[
                  { name: "company_name", label: "거래처명", required: true, max: 100 },
                  { name: "tax_id", label: "사업자번호", max: 30 },
                  { name: "representative_name", label: "대표자", max: 50 },
                  { name: "company_phone", label: "연락처", max: 30 },
                  { name: "company_address", label: "주소", max: 255 },
                  { name: "company_type", label: "업체 유형", max: 30 },
                  { name: "bank_name", label: "은행명", max: 50 },
                  { name: "account_number", label: "계좌번호", max: 50 },
                  { name: "account_holder", label: "예금주", max: 100 }
                ].map((field) => (
                  <div key={field.name}>
                    <label htmlFor={`partner-${field.name}`}>
                      {field.label}{field.required ? " *" : ""}
                    </label>
                    <input
                      id={`partner-${field.name}`}
                      name={field.name}
                      type="text"
                      value={partnerForm[field.name]}
                      onChange={handlePartnerChange}
                      required={field.required}
                      maxLength={field.max}
                      disabled={saving}
                    />
                  </div>
                ))}
              
                <div>
                  <label htmlFor="partner-trade-role">거래 구분 *</label>
                  <select
                    id="partner-trade-role"
                    name="trade_role"
                    value={partnerForm.trade_role}
                    onChange={handlePartnerChange}
                    disabled={saving}
                  >
                    <option value="매입">매입</option>
                    <option value="매출">매출</option>
                  </select>
                </div>
              
                <div>
                  <label htmlFor="partner-closing-day">정기 마감일</label>
                  <input
                    id="partner-closing-day"
                    name="closing_day"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="1~31, 31은 말일"
                    value={partnerForm.closing_day}
                    onChange={handlePartnerChange}
                    disabled={saving}
                  />
                </div>
              
                <div>
                  <label htmlFor="partner-memo">메모</label>
                  <textarea
                    id="partner-memo"
                    name="memo"
                    value={partnerForm.memo}
                    onChange={handlePartnerChange}
                    disabled={saving}
                  />
                </div>
              
                {formError && <p role="alert">{formError}</p>}
              
                <button type="submit" disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeRegistrationModal}
                >
                  취소
                </button>
              </form>
            )}
          />
        </div>
      )}

      {/* 2. 좌우 2단 분할 레이아웃 컨테이너 (테이블 좌측, 달력 우측 상시 노출) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>

        {/* [좌측 영역] 검색 필터 및 거래처 목록 테이블 (약 62% 너비) */}
        <div style={{ flex: '1 1 62%', minWidth: 0 }}>
          {/* 간이 검색/필터 구역 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <label htmlFor="partnerTypeSelect">구분: </label>
            <select
              id="partnerTypeSelect"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              style={{ width: "180px", flexShrink: 0 }}
            >
              <option value="ALL">전체 구분</option>
              <option value="매출">매출처 (입금마감)</option>
              <option value="매입">매입처 (출금마감)</option>
            </select>

            <input
              type="text"
              placeholder="거래처명, 사업자번호 검색"
              style={{ flex: 1, minWidth: "180px", width: "auto" }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                // 한글 입력을 확정하는 Enter는 제외합니다.
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleSearch();
                }
              }}
            />

            <button type="button" onClick={handleSearch} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              검색
            </button>
          </div>

          {loading && <p>거래처 목록을 불러오는 중입니다.</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && filteredPartners.length === 0 && (
            <p>
              {partnersList.length === 0
                ? "등록된 거래처가 없습니다."
                : "검색 결과가 없습니다."}
            </p>
          )}

          <div style={{ flex: "1 1 62%", minWidth: 0 }}>
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
            <div className="finance-registration-modal finance-partner-detail">
              <ModalBase
                title="거래처 상세정보"
                onClose={closePartnerDetail}
                layout={(
                  <section aria-label="거래처 상세정보">
                    <div className="table-shell">
                      <table>
                        <tbody>
                          <tr>
                            <th scope="row">거래처명</th>
                            <td>{selectedPartner.name}</td>
                          </tr>
                          <tr>
                            <th scope="row">거래 구분</th>
                            <td>{selectedPartner.type}</td>
                          </tr>
                          <tr>
                            <th scope="row">업체 유형</th>
                            <td>{selectedPartner.companyType}</td>
                          </tr>
                          <tr>
                            <th scope="row">사업자번호</th>
                            <td>{selectedPartner.bizNumber}</td>
                          </tr>
                          <tr>
                            <th scope="row">대표자</th>
                            <td>{selectedPartner.ceo}</td>
                          </tr>
                          <tr>
                            <th scope="row">연락처</th>
                            <td>{selectedPartner.contact}</td>
                          </tr>
                          <tr>
                            <th scope="row">주소</th>
                            <td>{selectedPartner.address}</td>
                          </tr>
                          <tr>
                            <th scope="row">정기 마감일</th>
                            <td>
                              {selectedPartner.closingDay
                                ? Number(selectedPartner.closingDay) === 31
                                  ? "매월 말일"
                                  : `매월 ${selectedPartner.closingDay}일`
                                : "-"}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">은행명</th>
                            <td>{selectedPartner.bankInfo.bank}</td>
                          </tr>
                          <tr>
                            <th scope="row">계좌번호</th>
                            <td>{selectedPartner.bankInfo.account}</td>
                          </tr>
                          <tr>
                            <th scope="row">예금주</th>
                            <td>{selectedPartner.bankInfo.holder}</td>
                          </tr>
                          <tr>
                            <th scope="row">메모</th>
                            <td>{selectedPartner.memo}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="finance-detail-actions">
                      <button type="button" className="erp-primary-button"
                        disabled={saving || deleting}
                        onClick={() => openEditPartnerForm(selectedPartner)}>
                        수정
                      </button>
                      <button type="button" className="finance-detail-delete"
                        disabled={saving || deleting}
                        onClick={() => handlePartnerDelete(selectedPartner)}>
                        {deleting ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </section>
                )}
              />
            </div>
          )}
        </div>


        {/* [우측 영역] 상시 노출 마감일 달력 (약 38% 너비) */}
        <div style={{ flex: '0 0 38%', minWidth: '340px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>정산 마감 일정</h4>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={calendarType === 'week' ? 'is-active' : ''}
                onClick={() => setCalendarType('week')}
              >
                주간
              </button>
              <button
                type="button"
                className={calendarType === 'month' ? 'is-active' : ''}
                onClick={() => setCalendarType('month')}
              >
                월간
              </button>
            </div>
          </div>


          {/* 수정된 컴포넌트명 BasicCalendar 및 WeeklyCalendar 적용 */}
          <div className="calendar-widget-wrapper">
            {calendarType === "week" ? (
              <WeeklyCalendar schedule={calendarEvents} />
            ) : (
              <BasicCalendar schedule={calendarEvents} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Partners;