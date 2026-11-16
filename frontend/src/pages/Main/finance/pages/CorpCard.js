import FinanceResourceModal, { FinanceResourceDetails } from '../components/FinanceResourceModal';
// [공통화 추가] 재무 전용 공통 컴포넌트·함수 재사용 (상위 공용 파일 수정 없음)
import useFinanceHistory from '../components/useFinanceHistory';
import FinanceSearchForm from '../components/FinanceSearchForm';
import FinancePaymentHistory from '../components/FinancePaymentHistory';
import FinanceStatusBadge from '../components/FinanceStatusBadge';
import { getFinanceError, toFinanceCard } from '../components/financeUtils';
import React, { useEffect, useState, useRef } from 'react';
import { getCorporateCards, updateCorporateCardLimit, getCorporateCardPayments, createCorporateCard, getCorporateCardOptions, updateCorporateCard, updateCorporateCardStatus } from "../../../../utils/financeService";
import ModalBase from '../../../../components/ModalBase';
import '../components/Finance.css';
import PaginationTable from '../../../../components/PaginationTable';
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";
function CorpCard({
  embedded = false,
  onSummaryChange,
  onBusyChange
}) {
  const cardListRef = useRef(null);

  // DB에서 불러온 법인카드 목록
  const [cardList, setCardList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 입력 중인 검색 조건
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 조회 버튼을 눌렀을 때 적용할 검색 조건
  const [searchFilter, setSearchFilter] = useState({
    department: "ALL",
    keyword: ""
  });

  // 상세보기에서 선택한 카드 ID
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardView, setCardView] = useState("detail");

  // 한도를 변경할 카드와 입력값
  const [limitTarget, setLimitTarget] = useState(null);
  const [monthlyLimitInput, setMonthlyLimitInput] = useState("");
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitError, setLimitError] = useState("");

  // null이면 신규 등록, ID가 있으면 해당 카드의 기본정보 수정
  const [editingCardId, setEditingCardId] = useState(null);

  // 등록·수정폼의 표시 여부와 입력값
  const [cardFormOpen, setCardFormOpen] = useState(false);
  // 선택한 법인카드의 사용 이력
  // [공통화] 선택 이력 조회는 계좌·카드 공통 훅을 사용합니다.
  const { payments: cardPayments, loading: paymentsLoading, error: paymentsError } = useFinanceHistory(getCorporateCardPayments, cardView === "history" && !cardFormOpen && !limitTarget ? selectedCardId : null, "법인카드 사용 이력을 불러오지 못했습니다.");
  
  

  const [cardSaving, setCardSaving] = useState(false);
  const [cardFormError, setCardFormError] = useState("");
  const [cardForm, setCardForm] = useState({
    card_name: "",
    department_id: "",
    employee_id: "",
    monthly_limit: ""
  });

  // 등록폼에서 선택할 전체 부서와 사원 목록
  const [formDepartments, setFormDepartments] = useState([]);
  const [formEmployees, setFormEmployees] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  // 상태를 변경 중인 카드 ID와 오류 메시지
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [statusError, setStatusError] = useState("");
  useEffect(() => {
    if (!cardFormOpen) return;
    let cancelled = false;
    async function loadFormOptions() {
      setOptionsLoading(true);
      setOptionsError("");
      setFormDepartments([]);
      setFormEmployees([]);
      try {
        const data = await getCorporateCardOptions();
        if (!cancelled) {
          setFormDepartments(data.departments);
          setFormEmployees(data.employees);
        }
      } catch (err) {
        if (!cancelled) {
          setOptionsError(getFinanceError(err, "부서와 관리자 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }
    loadFormOptions();
    return () => {
      cancelled = true;
    };
  }, [cardFormOpen]);

  // 화면이 처음 열릴 때 법인카드 목록을 조회합니다.
  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        const data = await getCorporateCards();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환합니다.
        const cards = data.map(toFinanceCard);
        if (!cancelled) {
          setCardList(cards);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(getFinanceError(err, "법인카드 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadCards();

    // 다른 화면으로 이동한 뒤에는 조회 결과를 반영하지 않습니다.
    return () => {
      cancelled = true;
    };
  }, []);

  // 선택한 카드가 바뀌면 해당 카드의 사용 이력을 조회합니다.
  
  const cardTableTitle = "법인카드 목록 현황";
  useEffect(() => {
    onSummaryChange?.({
      loading,
      error: loadError,
      count: cardList.length,
      usage: cardList.reduce((sum, card) => sum + card.currentUsage, 0),
      remaining: cardList.filter(card => ['사용', 'ACTIVE'].includes(card.status)).reduce((sum, card) => sum + card.remainingLimit, 0)
    });
  }, [cardList, loading, loadError, onSummaryChange]);
  const interactionBusy = cardFormOpen || selectedCardId !== null || limitTarget !== null || cardSaving || limitSaving || statusSavingId !== null;
  useEffect(() => {
    onBusyChange?.(interactionBusy);
  }, [interactionBusy, onBusyChange]);

  // DB 목록에 있는 부서명으로 선택 항목을 만듭니다.
  const departmentOptions = [...new Set(cardList.map(card => card.department))];

  // 검색 조건에 맞는 카드만 표시합니다.
  const filteredCards = cardList.filter(card => {
    const matchesDepartment = searchFilter.department === "ALL" || card.department === searchFilter.department;
    const keyword = searchFilter.keyword.trim().toLowerCase();
    const matchesKeyword = card.cardName.toLowerCase().includes(keyword) || card.managerName.toLowerCase().includes(keyword);
    return matchesDepartment && matchesKeyword;
  });

  // 조회 버튼 또는 Enter를 누르면 검색 조건을 적용합니다.
  function handleCardSearch(e) {
    e.preventDefault();
    setSearchFilter({
      department: departmentFilter,
      keyword: searchKeyword
    });
  }

  // 사용 중인 카드는 중지하고, 중지된 카드는 다시 사용합니다.
  async function handleCardStatusChange(card) {
    if (statusSavingId !== null || cardSaving || limitSaving) return;
    const nextStatus = ["사용", "ACTIVE"].includes(card.status) ? "STOP" : "사용";
    setStatusSavingId(card.id);
    setStatusError("");
    try {
      const result = await updateCorporateCardStatus(card.id, nextStatus);

      // 같은 카드의 상태만 변경합니다.
      setCardList(prev => prev.map(item => item.id === card.id ? {
        ...item,
        status: result.card_status
      } : item));
      alert(result.message);
    } catch (err) {
      setStatusError(getFinanceError(err, "법인카드 상태 변경에 실패했습니다."));
    } finally {
      setStatusSavingId(null);
    }
  }

  // 신규 카드 등록폼을 엽니다.
  function openCardForm() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setEditingCardId(null);
    setCardView("detail");
    setCardForm({
      card_name: "",
      department_id: "",
      employee_id: "",
      monthly_limit: ""
    });
    setCardFormError("");
    setOptionsError("");
    setOptionsLoading(true);
    setLimitTarget(null);
    setSelectedCardId(null);
    setCardFormOpen(true);
  }

  // 기존 카드의 기본정보를 등록폼에 채워 수정 모드로 엽니다.
  function openEditCardForm(card) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardView("detail");
    setEditingCardId(card.id);
    setCardForm({
      card_name: card.cardName,
      department_id: card.departmentId == null ? "" : String(card.departmentId),
      employee_id: card.managerId == null ? "" : String(card.managerId),
      monthly_limit: String(card.monthlyLimit)
    });
    setCardFormError("");
    // 이미 열려 있는 폼에서는 선택 목록을 그대로 사용합니다.
    if (!cardFormOpen) {
      setOptionsError("");
      setOptionsLoading(true);
    }
    setLimitTarget(null);
    setSelectedCardId(card.id);
    setCardFormOpen(true);
  }

  // 입력칸의 name에 맞는 값만 변경합니다.
  function handleCardFormChange(e) {
    const {
      name,
      value
    } = e.target;
    setCardForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // 신규 등록은 POST, 기존 카드 수정은 PUT으로 저장합니다.
  async function handleCardSubmit(e) {
    e.preventDefault();
    if (cardSaving) return;
    if (optionsLoading || optionsError) {
      setCardFormError("부서·관리자 목록을 확인한 뒤 저장해 주세요. 오류가 나면 취소 후 다시 열어 주세요.");
      return;
    }
    const isEditing = editingCardId !== null;
    const monthlyLimit = Number(cardForm.monthly_limit);
    if (cardForm.card_name.trim() === "" || cardForm.card_name.trim().length > 50) {
      setCardFormError("카드명은 1~50자로 입력해 주세요.");
      return;
    }
    if (!isEditing && (cardForm.monthly_limit.trim() === "" || !Number.isSafeInteger(monthlyLimit) || monthlyLimit < 0)) {
      setCardFormError("월 한도는 0 이상의 정수로 입력해 주세요.");
      return;
    }

    // 수정 요청에는 카드명·부서·관리자만 전달합니다.
    const basicData = {
      card_name: cardForm.card_name.trim(),
      department_id: cardForm.department_id,
      employee_id: cardForm.employee_id
    };
    setCardSaving(true);
    setCardFormError("");
    try {
      const result = isEditing ? await updateCorporateCard(editingCardId, basicData) : await createCorporateCard({
        ...basicData,
        monthly_limit: cardForm.monthly_limit
      });
      const department = formDepartments.find(item => Number(item.department_id) === Number(cardForm.department_id));
      const employee = formEmployees.find(item => Number(item.employee_id) === Number(cardForm.employee_id));
      const basicInfo = {
        cardName: basicData.card_name,
        departmentId: cardForm.department_id === "" ? null : Number(cardForm.department_id),
        department: department?.department_name || "미지정",
        managerId: cardForm.employee_id === "" ? null : Number(cardForm.employee_id),
        managerName: employee?.name || "미지정"
      };
      const savedId = isEditing ? editingCardId : result.card_id;
      if (isEditing) {
        // 같은 ID의 기본정보만 바꾸고 기존 사용량·한도·상태를 유지합니다.
        setCardList(prev => prev.map(card => card.id === editingCardId ? {
          ...card,
          ...basicInfo
        } : card));
      } else {
        const newCard = {
          id: savedId,
          ...basicInfo,
          currentUsage: 0,
          monthlyLimit,
          remainingLimit: monthlyLimit,
          status: "사용"
        };
        setCardList(prev => [newCard, ...prev]);
      }
      setDepartmentFilter("ALL");
      setSearchKeyword("");
      setSearchFilter({
        department: "ALL",
        keyword: ""
      });
      setSelectedCardId(savedId);
      setCardFormOpen(false);
      setEditingCardId(null);
      alert(result.message || (isEditing ? "법인카드 정보가 수정되었습니다." : "법인카드가 등록되었습니다."));
    } catch (err) {
      setCardFormError(getFinanceError(err, isEditing ? "법인카드 정보 수정에 실패했습니다." : "법인카드 등록에 실패했습니다."));
    } finally {
      setCardSaving(false);
    }
  }

  // 선택한 카드의 현재 한도를 입력폼에 채웁니다.
  function openLimitForm(card) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setSelectedCardId(card.id);
    setCardView("detail");
    setLimitTarget(card);
    setMonthlyLimitInput(String(card.monthlyLimit));
    setLimitError("");
  }

  // 변경한 월 한도를 저장합니다.
  async function handleLimitSubmit(e) {
    e.preventDefault();
    if (!limitTarget || limitSaving) return;
    setLimitSaving(true);
    setLimitError("");
    try {
      const result = await updateCorporateCardLimit(limitTarget.id, monthlyLimitInput);

      // DB에서 목록을 다시 조회하여 최신 사용량과 잔여 한도를 표시합니다.
      const data = await getCorporateCards();
      const cards = data.map(toFinanceCard);
      setCardList(cards);
      setLimitTarget(null);
      alert(result.message);
    } catch (err) {
      setLimitError(getFinanceError(err, "한도 저장 또는 최신 목록 조회에 실패했습니다. 새로고침하여 저장 결과를 확인해 주세요."));
    } finally {
      setLimitSaving(false);
    }
  }

  // 선택한 ID와 일치하는 카드 정보를 찾습니다.
  const selectedCard = cardList.find(card => card.id === selectedCardId);
  // 목록 수정은 이 배열에서만 합니다.
  // label: 제목 / field: 표시할 카드 데이터 / render: 버튼·배지 등 별도 표시
  // 항목을 이동하거나 삭제하면 제목과 내용이 함께 변경됩니다.
  const cardColumns = [
    { key: 'id', width: '50px', label: 'ID', field: 'id' },
    { key: 'name', width: 'auto', label: '법인카드 명', render: card => <strong>{card.cardName}</strong> },
    { key: 'department', width: '130px', label: '발급부서', field: 'department' },
    { key: 'manager', width: '110px', label: '관리자', field: 'managerName' },
    {
      key: 'status', width: '80px', label: '상태',
      render: card => <FinanceStatusBadge tone={card.status === "STOP" ? "status-danger" : ""}>
        {card.status === "ACTIVE" ? "사용" : card.status === "STOP" ? "사용 중지" : card.status}
      </FinanceStatusBadge>
    },
    {
      key: 'actions', width: '210px', label: '관리',
      render: card => <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <button type="button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openCardDetail(card.id)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>상세</button>
        <button type="button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openCardHistory(card.id)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>거래내역</button>
        <button type="button" disabled={statusSavingId !== null || cardSaving || limitSaving || !["사용", "ACTIVE", "STOP"].includes(card.status)} onClick={() => handleCardStatusChange(card)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '6px 8px' }}>
          {statusSavingId === card.id ? "변경 중..." : card.status === "STOP" ? "사용 재개" : "사용 중지"}
        </button>
      </div>
    }
  ];

  // 제목과 셀을 같은 설정에서 생성합니다.
  const cardHeaders = cardColumns.map(column => column.label);
  const tCardData = filteredCards.map(card => ({
    content: cardColumns.map(column => <React.Fragment key={column.key}>
      {column.render ? column.render(card) : (card[column.field] ?? '-')}
    </React.Fragment>)
  }));

  // BasicTable은 thead 없이 첫 tr에 제목을 표시합니다.
  // 공통 파일 대신 이 목록의 DOM에만 인라인 너비·여백을 적용합니다.
  useEffect(() => {
    const container = cardListRef.current;
    if (!container) return;
    function applyLayout() {
      const table = container.querySelector('table');
      if (!table) return;
      Object.assign(table.style, {
        width: '100%', minWidth: '0', maxWidth: '100%',
        tableLayout: 'fixed', boxSizing: 'border-box'
      });
      const headers = table.rows[0]?.cells;
      const cols = table.querySelectorAll('colgroup > col');
      cardColumns.forEach((column, index) => {
        if (headers?.[index]) Object.assign(headers[index].style, {
          width: column.width || 'auto', minWidth: '0', boxSizing: 'border-box'
        });
        if (cols[index]) Object.assign(cols[index].style, { width: column.width || 'auto', minWidth: '0' });
      });
      table.querySelectorAll('th, td').forEach(cell => Object.assign(cell.style, {
        padding: '8px 10px', boxSizing: 'border-box',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }));
      table.querySelectorAll('button').forEach(button => Object.assign(button.style, {
        minHeight: '30px', height: '30px', padding: '6px 8px', fontSize: '12px',
        lineHeight: '16px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: '0',
        boxSizing: 'border-box', cursor: button.disabled ? 'default' : 'pointer'
      }));
      const card = container.querySelector('.attendance-card');
      if (card) Object.assign(card.style, { paddingBottom: '12px', minWidth: '0' });
      const title = card?.querySelector('h4');
      if (title) Object.assign(title.style, { marginTop: '0', marginBottom: '10px' });
      const shell = container.querySelector('.table-shell');
      if (shell) Object.assign(shell.style, { width: '100%', maxWidth: '100%', minWidth: '0', boxSizing: 'border-box' });
    }
    applyLayout();
    // 페이지 전환으로 교체되는 행에도 같은 여백을 적용합니다.
    const observer = new MutationObserver(applyLayout);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  // 상세와 등록·수정·한도변경 모달은 한 번에 하나씩 표시합니다.
  function openCardHistory(cardId) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setLimitTarget(null);
    setCardView("history");
    setSelectedCardId(cardId);
  }
  function openCardDetail(cardId) {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
    setLimitTarget(null);
    setCardView("detail");
    setSelectedCardId(cardId);
  }
  function closeCardDetail() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setSelectedCardId(null);
  }
  function closeLimitModal() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setLimitTarget(null);
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (cardSaving || limitSaving || statusSavingId !== null) return;
    setCardFormOpen(false);
  }
  return <div className={`border-container finance-cards finance-resource${embedded ? " finance-resource-embedded" : ""}`}>
      <header className="dashboard-header finance-resource-header">
        {!embedded && <span className="subtitle">법인카드 관리</span>}
        <div className="dashboard-top">
          <button type="button" className="register-btn" disabled={cardSaving || limitSaving || cardFormOpen || statusSavingId !== null} onClick={openCardForm}>
            + 카드 등록
          </button>
        </div>
      </header>

      {!embedded && <hr />}

      {cardFormOpen && <div className="finance-registration-modal">
          <ModalBase title={editingCardId === null ? "법인카드 신규 등록" : "법인카드 기본정보 수정"} onClose={closeRegistrationModal} layout={<form onSubmit={handleCardSubmit}>
                <fieldset disabled={cardSaving}>
                  <div>
                    <label htmlFor="new-card-name">법인카드명 *</label>
                    <input id="new-card-name" name="card_name" type="text" maxLength={50} value={cardForm.card_name} onChange={handleCardFormChange} required />
                  </div>
                  <div>
                    <label htmlFor="new-card-department">발급부서</label>
                    <select id="new-card-department" name="department_id" value={cardForm.department_id} onChange={handleCardFormChange} disabled={optionsLoading || Boolean(optionsError)}>
                      <option value="">미지정</option>
                      {formDepartments.map(department => <option key={department.department_id} value={department.department_id}>
                          {department.department_name}
                        </option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-card-manager">관리자</label>
                    <select id="new-card-manager" name="employee_id" value={cardForm.employee_id} onChange={handleCardFormChange} disabled={optionsLoading || Boolean(optionsError)}>
                      <option value="">미지정</option>
                      {formEmployees.map(employee => <option key={employee.employee_id} value={employee.employee_id}>
                          {employee.name} / {employee.department_name || "부서 미지정"} / {employee.employee_number}
                        </option>)}
                    </select>
                  </div>
                  {editingCardId === null ? <div>
                      <label htmlFor="new-card-limit">월 한도 *</label>
                      <input id="new-card-limit" name="monthly_limit" type="number" min="0" step="1" value={cardForm.monthly_limit} onChange={handleCardFormChange} required />
                    </div> : <p>월 한도는 목록의 ‘한도변경’ 버튼에서 변경할 수 있습니다.</p>}
                  {editingCardId === null && <p>신규 카드의 사용량은 0원이며 잔여 한도는 입력한 월 한도와 같습니다.</p>}
                  {optionsLoading && <p>부서와 관리자 목록을 불러오는 중입니다.</p>}
                  {optionsError && <p role="alert">{optionsError}</p>}
                  {cardFormError && <p role="alert">{cardFormError}</p>}
                  <button type="submit" disabled={optionsLoading || Boolean(optionsError) || loading || Boolean(loadError)}>
                    {cardSaving ? "저장 중..." : "저장"}
                  </button>
                  <button type="button" onClick={closeRegistrationModal}>취소</button>
                </fieldset>
              </form>} />
        </div>}

      {/* 법인카드 검색 및 부서 필터 */}
      <section className="finance-resource-filters">
        <FinanceSearchForm className="finance-card-search finance-resource-search" onSubmit={handleCardSearch} filters={[
  { id: 'deptFilter', label: '부서 선택: ', value: departmentFilter, onChange: setDepartmentFilter, options: [{ value: 'ALL', label: '전체 부서' }, ...departmentOptions.map(value => ({ value, label: value }))] }
 ]} keyword={{ id: 'card-search-keyword', placeholder: '카드명 또는 관리자명 입력', value: searchKeyword, onChange: setSearchKeyword }} />
      </section>


      {loading && <p>법인카드 목록을 불러오는 중입니다.</p>}

      {loadError && <p role="alert">{loadError}</p>}

      {statusError && <p role="alert">{statusError}</p>}

      {/* PaginationTable 연동 */}
      <div className="finance-resource-list" ref={cardListRef} style={{ width: '100%', minWidth: 0 }}>
      <PaginationTable key={JSON.stringify(searchFilter)} title={cardTableTitle} th={cardHeaders} allData={tCardData} itemsPerPage={5} // 5건씩 페이징 처리
      />
      </div>

      {limitTarget && <div className="finance-registration-modal">
          <ModalBase title="법인카드 한도변경" onClose={closeLimitModal} layout={<section aria-label="법인카드 한도변경">


                <p>법인카드: {limitTarget.cardName}</p>
                <p>
                  당월 사용량: {limitTarget.currentUsage.toLocaleString()}원
                </p>

                <form onSubmit={handleLimitSubmit}>
                  <label htmlFor="card-monthly-limit">월 한도 *</label>
                  <input id="card-monthly-limit" type="number" min="0" step="1" value={monthlyLimitInput} onChange={e => setMonthlyLimitInput(e.target.value)} required disabled={limitSaving} />

                  <p>월 한도는 당월 사용량 이상이어야 합니다.</p>

                  {limitError && <p role="alert">{limitError}</p>}

                  <button type="submit" disabled={limitSaving}>
                    {limitSaving ? "저장 중..." : "저장"}
                  </button>

                  <button type="button" disabled={limitSaving} onClick={closeLimitModal}>
                    취소
                  </button>
                </form>

              </section>} />
        </div>}

      {selectedCard && !cardFormOpen && !limitTarget && <FinanceResourceModal
        key={cardView}
        title={cardView === "detail" ? "법인카드 상세정보" : "법인카드 거래내역"}
        onClose={closeCardDetail} busy={cardSaving || limitSaving || statusSavingId !== null}
        actions={cardView === "detail" ? <>
          <button type="button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openCardHistory(selectedCard.id)}>거래내역</button>
          <button type="button" className="erp-primary-button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openEditCardForm(selectedCard)}>수정</button>
          <button type="button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openLimitForm(selectedCard)}>한도변경</button>
        </> : <button type="button" disabled={cardSaving || limitSaving || statusSavingId !== null} onClick={() => openCardDetail(selectedCard.id)}>상세</button>}>
        {cardView === "detail" ? <FinanceResourceDetails rows={[["카드 ID", selectedCard.id], ["법인카드명", selectedCard.cardName], ["발급부서", selectedCard.department], ["관리자명", selectedCard.managerName], ["당월 사용량", `${selectedCard.currentUsage.toLocaleString()}원`], ["월 한도", `${selectedCard.monthlyLimit.toLocaleString()}원`], ["잔여 한도", `${selectedCard.remainingLimit.toLocaleString()}원`], ["상태", selectedCard.status === "ACTIVE" ? "사용" : selectedCard.status === "STOP" ? "사용 중지" : selectedCard.status]]} /> : <>
          <p style={{ margin: '0 0 8px', overflowWrap: 'anywhere' }}>{selectedCard.cardName}</p>
          {paymentsLoading ? <p>거래내역을 불러오는 중입니다.</p> : paymentsError ? <p role="alert">{paymentsError}</p> : <FinancePaymentHistory key={selectedCard.id} className="finance-card-history" payments={cardPayments} showPartner statusLabel="상태" enablePeriodFilter currency="KRW" />}
        </>}
      </FinanceResourceModal>}
    </div>;
}
export default CorpCard;
