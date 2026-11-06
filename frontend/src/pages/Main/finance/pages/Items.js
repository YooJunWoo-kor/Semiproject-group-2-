import React, { useEffect, useState } from 'react';
import { getItems, getPartners, createItem, updateItem, deleteItem, createPayment, getTransactionPayments, getBankAccounts, getCorporateCards } from "../../../../utils/financeService";
import ModalBase from '../../../../components/ModalBase';
import '../FinanceRegistration.css';
import PaginationTable from '../../../../components/PaginationTable';
import WeeklyCalendar from '../../../../components/weeklycalendar/WeeklyCalendar';
import BasicCalendar from '../../../../components/calendar/BasicCalendar';

function Items() {
  // 1. 매입 / 매출 탭 필터 ('ALL' | 'SALES' | 'PURCHASE')
  const [activeTab, setActiveTab] = useState('ALL');

  // 2. 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 3. 우측 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState('week'); // 'week' | 'month'

  // 4. 선택된 품목 ID
  const [selectedItemId, setSelectedItemId] = useState(null);

  // DB에서 가져온 거래 품목 목록
  const [itemList, setItemList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 등록폼 표시 여부
  const [formOpen, setFormOpen] = useState(false);

  // 저장 진행 여부와 오류 메시지
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 등록폼에서 선택할 거래처 목록
  const [partnerOptions, setPartnerOptions] = useState([]);

  // 신규 거래 입력값
  const [itemForm, setItemForm] = useState({
    partner_id: "",
    trade_type: "매입",
    trade_date: "",
    due_date: "", // 정산 마감일
    item_name: "",
    standard: "",
    quantity: "1",
    unit_price: "",
    vat: "0"
  });

  // null이면 신규 등록, ID가 있으면 해당 품목 수정
  const [editingItemId, setEditingItemId] = useState(null);

  // 입금·출금 처리 대상 거래
  const [paymentTarget, setPaymentTarget] = useState(null);

  // 입금·출금 입력값
  const [paymentForm, setPaymentForm] = useState({
    payment_date: "",
    amount: "",
    payment_method: "계좌이체",
    account_id: "", // 회사계좌 ID
    card_id: "" // 법인카드 ID
  });

  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // 선택한 거래의 정산 정보
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");

  // 입금·출금 저장 후 이력을 다시 조회하는 데 사용합니다.
  const [paymentRefresh, setPaymentRefresh] = useState(0);

  // 정산 상태 필터
  const [settlementFilter, setSettlementFilter] = useState("ALL");

  // 입금·출금에 사용할 회사계좌 목록
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환합니다.
        const items = data.map((item) => ({
          id: item.item_id,
          transactionId: item.transaction_id,
          partnerId: item.partner_id,
          type:
            item.trade_type === "매출"
              ? "SALES"
              : "PURCHASE",
          date: item.trade_date,
          itemName: item.item_name || "-",
          spec: item.standard || "-",
          customer: item.company_name || "-",
          unitPrice: Number(item.unit_price),
          quantity: Number(item.quantity),
          supplyAmount: Number(item.supply_price),
          vat: Number(item.vat),
          totalAmount: Number(item.total_amount),
          status: item.settlement_status || "-",
          closingDay: item.closing_day,
          dueDate: item.due_date || ""
        }));

        setItemList(items);
      } catch (err) {
        console.error("거래 품목 조회 오류:", err);
        setError("거래 품목 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  // 등록폼에서 선택할 거래처 목록 조회
  useEffect(() => {
    async function loadPartnerOptions() {
      try {
        const data = await getPartners();
        setPartnerOptions(data);
      } catch (err) {
        console.error("거래처 목록 조회 오류:", err);
        setFormError("거래처 목록을 불러오지 못했습니다.");
      }
    }

    loadPartnerOptions();
  }, []);

  // 사용자 컴퓨터의 오늘 날짜를 YYYY-MM-DD 형식으로 만듭니다.
  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  // 거래 구분, 검색어, 정산 상태를 함께 확인합니다.
  const filteredList = itemList.filter((item) => {
    const matchesTab =
      activeTab === "ALL" || item.type === activeTab;

    const keyword = searchTerm.trim().toLowerCase();

    const matchesSearch =
      item.itemName.toLowerCase().includes(keyword) ||
      item.customer.toLowerCase().includes(keyword);

    const isOverdue =
      item.status === "미정산" &&
      Boolean(item.dueDate) &&
      item.dueDate < today;

    const matchesSettlement =
      settlementFilter === "ALL" ||
      (settlementFilter === "OVERDUE"
        ? isOverdue
        : item.status === settlementFilter);

    return matchesTab && matchesSearch && matchesSettlement;
  });

  // 사용 가능한 원화 회사계좌 조회
  useEffect(() => {
    async function loadPaymentAccounts() {
      try {
        const data = await getBankAccounts();

        setPaymentAccounts(
          data.filter((account) =>
            account.currency === "KRW" &&
            ["사용", "ACTIVE"].includes(account.account_status)
          )
        );
      } catch (err) {
        console.error("정산용 회사계좌 조회 오류:", err);
        setAccountsError("회사계좌 목록을 불러오지 못했습니다.");
      } finally {
        setAccountsLoading(false);
      }
    }

    loadPaymentAccounts();
  }, []);

  // 법인카드 선택 목록: 폼을 열거나 정산을 저장하면 최신 한도를 조회합니다.
  const [paymentCards, setPaymentCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState("");
  const paymentTransactionId = paymentTarget?.transactionId ?? null;

  useEffect(() => {
    let cancelled = false;
    setPaymentCards([]);
    setCardsError("");

    if (paymentTransactionId === null) {
      setCardsLoading(false);
      return;
    }

    async function loadPaymentCards() {
      setCardsLoading(true);
      try {
        const data = await getCorporateCards();
        if (!cancelled) {
          setPaymentCards(data.filter((card) =>
            ["사용", "ACTIVE"].includes(card.card_status)
          ));
        }
      } catch (err) {
        if (!cancelled) {
          setCardsError("법인카드 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    }

    loadPaymentCards();
    return () => { cancelled = true; };
  }, [paymentTransactionId, paymentRefresh]);

  // 상단 요약 집계 연산
  const totalSalesAmount = itemList
    .filter((item) => item.type === 'SALES')
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const totalPurchaseAmount = itemList
    .filter((item) => item.type === 'PURCHASE')
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const operatingProfit = totalSalesAmount - totalPurchaseAmount;

  // 테이블 헤더 규격 정의
  const itemTableTitle = "매입/매출 품목 거래 현황";
  const itemHeaders = [
    "구분",
    "거래일 (마감일)",
    "거래처",
    "품목 (규격)",
    "합계 금액",
    "상태",
    "관리"
  ];

  // PaginationTable 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tItemData = filteredList.map((item) => {
    const isSales = item.type === 'SALES';




    return {
      content: [
        // 1. 구분 뱃지
        <span className={`status-badge ${isSales ? 'status-success' : 'status-danger'}`}>
          {isSales ? '매출' : '매입'}
        </span>,

        // 2. 거래일 + 마감일 (세로 2줄 결합)
        <div>
          <div>{item.date}</div>
          {/* 이번 거래의 실제 정산 마감일 */}
          <div>
            정산 마감: {item.dueDate || "미등록"}
          </div>
          <small style={{ color: "#64748b" }}>
            {item.closingDay
              ? Number(item.closingDay) === 31
                ? "(정기 마감: 매월 말일)"
                : `(정기 마감: 매월 ${item.closingDay}일)`
              : "(정기 마감일 미등록)"}
          </small>
        </div>,

        // 3. 거래처
        item.customer,

        // 4. 품목명 + 규격/수량 (세로 2줄 결합)
        <div>
          <strong>{item.itemName}</strong>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {item.spec} · {item.quantity}개
          </div>
        </div>,

        // 5. 총 합계금액 (공급가/부가세는 덜어내고 최종 금액만 강조)
        <strong>{item.totalAmount.toLocaleString()}원</strong>,

        // 6. 상태
        <span className={`status-badge ${item.status.includes('완료') ? 'status-success' : 'status-pending'}`}>
          {item.status}
        </span>,

        // 7. 관리 버튼
        <button
          type="button"
          disabled={saving || paymentSaving}
          onClick={() => openVoucher(item.id)}
        >
          전표
        </button>
      ]
    };
  });

  // 우측 달력용 이벤트 데이터
  const calendarEvents = itemList
    .filter((item) => item.dueDate)
    .map((item) => ({
      id: item.id,
      title: `[${item.type === "SALES" ? "입금" : "출금"}] ${item.customer}`,
      start: item.dueDate,
      end: item.dueDate,
      typeId: item.type === "SALES" ? 0 : 2
    }));

  // 신규 등록폼 열기
  function openItemForm() {
    if (saving || paymentSaving) return;
    setPaymentTarget(null); // 입금·출금 입력폼 닫기
    setEditingItemId(null); // 신규 등록 모드

    setItemForm({
      partner_id: "",
      trade_type: "매입",
      trade_date: "",
      due_date: "", // 새 등록폼을 열면 마감일 초기화
      item_name: "",
      standard: "",
      quantity: "1",
      unit_price: "",
      vat: "0"
    });


    setFormError("");
    setSelectedItemId(null);
    setFormOpen(true);
  }

  // 입력칸의 name에 해당하는 값을 변경합니다.
  function handleItemChange(e) {
    const { name, value } = e.target;

    setItemForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleItemSubmit(e) {
    e.preventDefault();

    if (saving) return;

    const isEditing = editingItemId !== null;

    setSaving(true);
    setFormError("");

    try {
      // 수정과 신규 등록을 구분합니다.
      const result = isEditing
        ? await updateItem(editingItemId, itemForm)
        : await createItem(itemForm);

      const partner = partnerOptions.find(
        (item) =>
          Number(item.partner_id) === Number(itemForm.partner_id)
      );

      const existingItem = isEditing
        ? itemList.find((item) => item.id === editingItemId)
        : null;

      const quantity = Number(itemForm.quantity);
      const unitPrice = Number(itemForm.unit_price);
      const supplyAmount = quantity * unitPrice;
      const vat = Number(itemForm.vat);

      const savedItem = {
        id: isEditing ? editingItemId : result.item_id,
        transactionId: result.transaction_id,
        partnerId: Number(itemForm.partner_id),
        type: itemForm.trade_type === "매출" ? "SALES" : "PURCHASE",
        date: itemForm.trade_date,
        itemName: itemForm.item_name.trim(),
        spec: itemForm.standard.trim() || "-",

        // 기존 거래처를 유지하면 저장 당시의 거래처명도 유지합니다.
        customer:
          existingItem &&
            Number(existingItem.partnerId) === Number(itemForm.partner_id)
            ? existingItem.customer
            : partner?.company_name || "-",

        unitPrice,
        quantity,
        supplyAmount,
        vat,
        totalAmount: supplyAmount + vat,
        status: existingItem?.status || "미정산",
        closingDay: partner?.closing_day ?? null,
        dueDate: itemForm.due_date || ""
      };

      setItemList((prev) =>
        isEditing
          // 기존 품목을 찾아 교체합니다.
          ? prev.map((item) =>
            item.id === editingItemId ? savedItem : item
          )
          // 신규 품목은 맨 위에 추가합니다.
          : [savedItem, ...prev]
      );

      setActiveTab("ALL");
      setSearchTerm("");
      setSettlementFilter("ALL");
      setSelectedItemId(savedItem.id);

      setPaymentRefresh((prev) => prev + 1); // 이 줄 추가

      setFormOpen(false);
      setEditingItemId(null);

      alert(
        isEditing
          ? "거래 품목이 수정되었습니다."
          : "거래 품목이 등록되었습니다."
      );
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (isEditing
          ? "거래 품목 수정에 실패했습니다."
          : "거래 품목 등록에 실패했습니다.")
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 거래 품목 삭제
  async function handleItemDelete() {
    if (!selectedItem || saving || paymentSaving) return;

    const confirmed = window.confirm(
      `"${selectedItem.itemName}" 품목을 삭제하시겠습니까?\n` +
      "이 거래의 마지막 품목이면 거래 정보도 함께 삭제됩니다."
    );

    if (!confirmed) return;

    const itemId = selectedItem.id;

    setSaving(true);

    try {
      // 서버에서 삭제에 성공한 뒤 화면 목록도 변경합니다.
      await deleteItem(itemId);

      setItemList((prev) =>
        prev.filter((item) => item.id !== itemId)
      );

      // 삭제한 품목의 상세정보와 수정폼을 닫습니다.
      setSelectedItemId(null);
      setFormOpen(false);
      setEditingItemId(null);
      setFormError("");

      alert("거래 품목이 삭제되었습니다.");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "거래 품목 삭제에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  // 선택한 ID와 일치하는 품목 정보를 찾습니다.
  const selectedItem = itemList.find(
    (item) => item.id === selectedItemId
  );

  // 선택한 품목이 속한 거래 ID
  const selectedTransactionId = selectedItem?.transactionId;

  // 거래 선택 또는 입금·출금 저장 후 정산 정보 조회
  useEffect(() => {
    let cancelled = false;

    setPaymentSummary(null);
    setPaymentHistoryError("");

    if (selectedTransactionId == null) {
      setPaymentLoading(false);
      return;
    }

    setPaymentLoading(true);

    async function loadPaymentHistory() {
      try {
        const data = await getTransactionPayments(
          selectedTransactionId
        );

        // 다른 거래를 선택했다면 이전 조회 결과를 반영하지 않습니다.
        if (!cancelled) {
          setPaymentSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentHistoryError(
            err.response?.data?.message ||
            "입금·출금 이력을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false);
        }
      }
    }

    loadPaymentHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedTransactionId, paymentRefresh]);

  // 선택한 품목의 기존 내용을 입력폼에 채웁니다.
  function openEditItemForm(item) {
    if (saving || paymentSaving) return;
    setPaymentTarget(null);
    setEditingItemId(item.id);

    setItemForm({
      partner_id: String(item.partnerId),
      trade_type: item.type === "SALES" ? "매출" : "매입",
      trade_date: item.date,
      due_date: item.dueDate || "",
      item_name: item.itemName,
      standard: item.spec === "-" ? "" : item.spec,
      quantity: String(item.quantity),
      unit_price: String(item.unitPrice),
      vat: String(item.vat)
    });

    setFormError("");
    setFormOpen(true);
  }

  // 입금·출금 입력폼 열기
  function openPaymentForm(item) {
    if (saving || paymentSaving) return;
    // 처리 대상을 따로 보관합니다.
    // 다른 품목을 선택해도 정산할 거래가 바뀌지 않습니다.
    setPaymentTarget({
      transactionId: item.transactionId,
      customer: item.customer,
      type: item.type
    });

    setPaymentForm({
      payment_date: "",
      amount: "",
      payment_method: "계좌이체",
      account_id: "",
      card_id: ""
    });

    setPaymentError("");
    setFormOpen(false);
  }

  // 입금·출금 입력값 변경
  function handlePaymentChange(e) {
    const { name, value } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
      // 결제수단을 바꾸면 이전 계좌·카드 선택을 초기화합니다.
      ...(name === "payment_method" ? { account_id: "", card_id: "" } : {})
    }));
  }

  // 입금·출금 저장
  async function handlePaymentSubmit(e) {
    e.preventDefault();

    if (!paymentTarget || paymentSaving) return;

    if (paymentForm.payment_method === "법인카드") {
      if (paymentTarget.type !== "PURCHASE") {
        setPaymentError("법인카드는 매입 거래의 출금에만 사용할 수 있습니다.");
        return;
      }
      if (cardsLoading || cardsError || !paymentForm.card_id) {
        setPaymentError("사용할 법인카드를 선택해 주세요. 목록 조회 실패 시 폼을 다시 열어 주세요.");
        return;
      }
    }

    setPaymentSaving(true);
    setPaymentError("");

    try {
      const result = await createPayment(
        paymentTarget.transactionId,
        paymentForm
      );

      // 같은 거래에 속한 모든 품목의 정산 상태를 변경합니다.
      setItemList((prev) =>
        prev.map((item) =>
          Number(item.transactionId) ===
            Number(result.transaction_id)
            ? {
              ...item,
              status: result.settlement_status
            }
            : item
        )
      );
      // 저장 후 정산 이력과 남은 금액을 다시 조회합니다.
      setPaymentRefresh((prev) => prev + 1);
      setPaymentTarget(null);

      alert(
        `${result.message}\n남은 금액: ${Number(result.remaining_amount).toLocaleString()
        }원`
      );
    } catch (err) {
      setPaymentError(
        err.response?.data?.message ||
        "입금·출금 등록에 실패했습니다."
      );
    } finally {
      setPaymentSaving(false);
    }
  }



  // 전표 상세와 입력 폼은 한 번에 하나씩 표시합니다.
  function openVoucher(itemId) {
    if (saving || paymentSaving) return;
    setFormOpen(false);
    setPaymentTarget(null);
    setSelectedItemId(itemId);
  }

  function closeVoucher() {
    if (saving || paymentSaving) return;
    setSelectedItemId(null);
  }

  function closePaymentModal() {
    if (saving || paymentSaving) return;
    setPaymentTarget(null);
  }

  // 공통 모달의 배경·닫기·취소 버튼에서 함께 사용합니다.
  function closeRegistrationModal() {
    if (saving || paymentSaving) return;
    setFormOpen(false);
  }

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 및 액션 버튼 */}
      <header className="dashboard-header">
        <span className="subtitle">매입/매출 품목관리</span>
        <div className="dashboard-top">
          <button
            type="button"
            className="register-btn"
            disabled={saving || paymentSaving}
            onClick={openItemForm}
          >
            + 품목 거래내역 신규 등록
          </button>
        </div>
      </header>

      <hr />

      {/* 2. 상단 누적 손익 요약 카드 */}
      <section>
        <h3>전체 거래 총액 요약</h3>
        <p>
          <span>총 매출: <strong>{totalSalesAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>총 매입: <strong>{totalPurchaseAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>
            매출·매입 차액(부가세 포함): <strong style={{ color: operatingProfit >= 0 ? '#2563eb' : '#dc2626' }}>
              {operatingProfit.toLocaleString()}원
            </strong>
          </span>
        </p>
      </section>

      <hr />

      {/* 3. 좌우 2단 분할 레이아웃 컨테이너 */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>

        {/* [좌측 영역] 탭 + 검색 필터 + PaginationTable (약 62% 너비) */}
        <div style={{ flex: '1 1 62%', minWidth: 0 }}>
          {/* 탭 전환 및 검색 필터 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                전체 ({itemList.length})
              </button>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'SALES' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('SALES')}
              >
                매출(판매)
              </button>
              <button
                type="button"
                className={`finance-tab ${activeTab === 'PURCHASE' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('PURCHASE')}
              >
                매입(구매)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '280px' }}>
              <select
                aria-label="정산 상태"
                value={settlementFilter}
                onChange={(e) => setSettlementFilter(e.target.value)}
              >
                <option value="ALL">전체 상태</option>
                <option value="미정산">미정산</option>
                <option value="완료">완료</option>
                <option value="OVERDUE">마감 초과</option>
              </select>
              <input
                type="text"
                placeholder="품목명 또는 거래처명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {loading && <p>거래 품목을 불러오는 중입니다.</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && filteredList.length === 0 && (
            <p>표시할 거래 품목이 없습니다.</p>
          )}

          {formOpen && (
            <div className="finance-registration-modal">
              <ModalBase
                title={editingItemId === null ? "신규 매입·매출 거래 등록" : "거래 품목 수정"}
                onClose={closeRegistrationModal}
  
                layout={(
                  <form onSubmit={handleItemSubmit}>
                  
                    <fieldset disabled={saving}>
                      <div>
                        <label htmlFor="item-partner">거래처 *</label>
                        <select
                          id="item-partner"
                          name="partner_id"
                          value={itemForm.partner_id}
                          onChange={handleItemChange}
                          required
                        >
                          <option value="">거래처 선택</option>
                  
                          {partnerOptions.map((partner) => (
                            <option
                              key={partner.partner_id}
                              value={partner.partner_id}
                            >
                              {partner.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                  
                      <div>
                        <label htmlFor="item-trade-type">거래 구분 *</label>
                        <select
                          id="item-trade-type"
                          name="trade_type"
                          value={itemForm.trade_type}
                          onChange={handleItemChange}
                          required
                        >
                          <option value="매입">매입</option>
                          <option value="매출">매출</option>
                        </select>
                      </div>
                  
                      {/* 같은 구조의 입력칸은 map으로 만듭니다. */}
                      {[
                        {
                          name: "trade_date",
                          label: "거래일",
                          type: "date",
                          required: true
                        },
                        {
                          name: "due_date",
                          label: "정산 마감일",
                          type: "date"
                        },
                        {
                          name: "item_name",
                          label: "품목명",
                          type: "text",
                          required: true,
                          maxLength: 100
                        },
                        {
                          name: "standard",
                          label: "규격",
                          type: "text",
                          maxLength: 50
                        },
                        {
                          name: "quantity",
                          label: "수량",
                          type: "number",
                          required: true,
                          min: 1,
                          step: 1
                        },
                        {
                          name: "unit_price",
                          label: "단가(공급가액 기준)",
                          type: "number",
                          required: true,
                          min: 0,
                          step: 1
                        },
                        {
                          name: "vat",
                          label: "부가세",
                          type: "number",
                          required: true,
                          min: 0,
                          step: 1
                        }
                      ].map((field) => (
                        <div key={field.name}>
                          <label htmlFor={`item-${field.name}`}>
                            {field.label}{field.required ? " *" : ""}
                          </label>
                  
                          <input
                            id={`item-${field.name}`}
                            name={field.name}
                            type={field.type}
                            value={itemForm[field.name]}
                            onChange={handleItemChange}
                            required={field.required}
                            maxLength={field.maxLength}
                            min={field.min}
                            step={field.step}
                          />
                        </div>
                      ))}
                  
                      <p>
                        공급가액:{" "}
                        {(
                          Number(itemForm.quantity) *
                          Number(itemForm.unit_price)
                        ).toLocaleString()}원
                      </p>
                  
                      <p>
                        합계 금액:{" "}
                        {(
                          Number(itemForm.quantity) *
                          Number(itemForm.unit_price) +
                          Number(itemForm.vat)
                        ).toLocaleString()}원
                      </p>
                  
                      <p>신규 거래는 미정산 상태로 등록됩니다.</p>
                  
                      {formError && <p role="alert">{formError}</p>}
                  
                      <button type="submit">
                        {saving ? "저장 중..." : "저장"}
                      </button>
                  
                      <button
                        type="button"
                        onClick={closeRegistrationModal}
                      >
                        취소
                      </button>
                    </fieldset>
                  </form>
                )}
              />
            </div>
          )}

          {paymentTarget && (
            <div className="finance-registration-modal">
              <ModalBase
                title={paymentTarget.type === "SALES" ? "입금 등록" : "출금 등록"}
                onClose={closePaymentModal}
                layout={(
                  <form onSubmit={handlePaymentSubmit}>

              <p>거래 ID: {paymentTarget.transactionId}</p>
              <p>거래처: {paymentTarget.customer}</p>
              <p>선택한 품목이 속한 거래 전체를 기준으로 정산합니다.</p>

              <fieldset disabled={paymentSaving}>
                <div>
                  <label htmlFor="payment-date">처리 날짜 *</label>
                  <input
                    id="payment-date"
                    name="payment_date"
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={handlePaymentChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="payment-amount">처리 금액 *</label>
                  <input
                    id="payment-amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="1"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="payment-method">결제수단 *</label>
                  <select
                    id="payment-method"
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={handlePaymentChange}
                    required
                  >
                    <option value="계좌이체">계좌이체</option>
                    <option value="현금">현금</option>
                    {paymentTarget.type === "PURCHASE" && (
                      <option value="법인카드">법인카드</option>
                    )}
                  </select>
                </div>

                {paymentForm.payment_method === "계좌이체" && (
                  <div>
                    <label htmlFor="payment-account">회사계좌 *</label>

                    <select
                      id="payment-account"
                      name="account_id"
                      value={paymentForm.account_id}
                      onChange={handlePaymentChange}
                      disabled={accountsLoading || Boolean(accountsError)}
                      required
                    >
                      <option value="">회사계좌 선택</option>

                      {paymentAccounts.map((account) => (
                        <option
                          key={account.account_id}
                          value={account.account_id}
                        >
                          {account.bank_name} / {account.account_name}
                          {" / "}{account.account_number}
                        </option>
                      ))}
                    </select>

                    {accountsLoading && <p>회사계좌를 불러오는 중입니다.</p>}
                    {accountsError && <p role="alert">{accountsError}</p>}

                    {!accountsLoading &&
                      !accountsError &&
                      paymentAccounts.length === 0 && (
                        <p>선택 가능한 원화 계좌가 없습니다.</p>
                      )}
                  </div>
                )}

                {paymentForm.payment_method === "법인카드" && (
                  <div>
                    <label htmlFor="payment-card">법인카드 *</label>
                    <select
                      id="payment-card"
                      name="card_id"
                      value={paymentForm.card_id}
                      onChange={handlePaymentChange}
                      required
                      disabled={cardsLoading || Boolean(cardsError)}
                    >
                      <option value="">법인카드 선택</option>
                      {paymentCards.map((card) => (
                        <option key={card.card_id} value={card.card_id}>
                          {card.card_name} / 잔여 한도 {Number(card.remaining_limit).toLocaleString()}원
                        </option>
                      ))}
                    </select>
                    {cardsLoading && <p>법인카드를 불러오는 중입니다.</p>}
                    {cardsError && <p role="alert">{cardsError}</p>}
                    {!cardsLoading && !cardsError && paymentCards.length === 0 && (
                      <p>선택 가능한 법인카드가 없습니다.</p>
                    )}
                    <p>카드 결제 시 사용량이 증가하고 잔여 한도가 감소합니다.</p>
                  </div>
                )}

                {paymentError && (
                  <p role="alert">{paymentError}</p>
                )}

                <button type="submit">
                  {paymentSaving ? "저장 중..." : "저장"}
                </button>

                <button
                  type="button"
                  onClick={closePaymentModal}
                >
                  취소
                </button>
              </fieldset>
            </form>
                )}
              />
            </div>
          )}

          <PaginationTable
            key={`${activeTab}-${searchTerm}-${settlementFilter}`}
            title={itemTableTitle}
            th={itemHeaders}
            allData={tItemData}
            itemsPerPage={5}
          />
          {selectedItem && !formOpen && !paymentTarget && (
            <div className="finance-registration-modal finance-voucher-detail">
              <ModalBase
                title="매입·매출 전표"
                onClose={closeVoucher}
                layout={(
                  <section aria-label="거래 전표 상세정보">


              <div className="table-shell">
              <table className="finance-voucher-fields">
                <tbody>
                  {[
                    ["거래 ID", selectedItem.transactionId],
                    ["품목 ID", selectedItem.id],
                    ["거래 구분", selectedItem.type === "SALES" ? "매출" : "매입"],
                    ["거래일", selectedItem.date],
                    ["정산 마감일", selectedItem.dueDate || "미등록"],
                    ["거래처", selectedItem.customer],
                    ["품목명", selectedItem.itemName],
                    ["규격", selectedItem.spec],
                    ["수량", selectedItem.quantity.toLocaleString()],
                    ["단가", `${selectedItem.unitPrice.toLocaleString()}원`],
                    ["공급가액", `${selectedItem.supplyAmount.toLocaleString()}원`],
                    ["부가세", `${selectedItem.vat.toLocaleString()}원`],
                    ["합계 금액", `${selectedItem.totalAmount.toLocaleString()}원`],
                    ["정산 상태", selectedItem.status]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <h3>거래 전체 정산 정보</h3>

              {paymentLoading ? (
                <p>정산 정보를 불러오는 중입니다.</p>
              ) : paymentHistoryError ? (
                <p role="alert">{paymentHistoryError}</p>
              ) : (
                paymentSummary &&
                Number(paymentSummary.transaction_id) ===
                Number(selectedItem.transactionId) && (
                  <div>
                    <p>
                      거래 전체 금액:{" "}
                      {Number(paymentSummary.total_amount).toLocaleString()}원
                    </p>

                    <p>
                      {paymentSummary.payment_direction} 처리 금액:{" "}
                      {Number(paymentSummary.paid_amount).toLocaleString()}원
                    </p>

                    <p>
                      남은 금액:{" "}
                      {Number(paymentSummary.remaining_amount).toLocaleString()}원
                    </p>

                    <h4>입금·출금 이력</h4>

                    {paymentSummary.payments.length === 0 ? (
                      <p>등록된 입금·출금 이력이 없습니다.</p>
                    ) : (
                      <div className="table-shell finance-voucher-history">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">처리 날짜</th>
                            <th scope="col">구분</th>
                            <th scope="col">결제수단</th>
                            <th scope="col">금액</th>
                            <th scope="col">처리 상태</th>
                          </tr>
                        </thead>

                        <tbody>
                          {paymentSummary.payments.map((payment) => (
                            <tr key={payment.payment_id}>
                              <td>{payment.payment_date}</td>
                              <td>{payment.payment_direction}</td>
                              <td>{payment.payment_method}</td>
                              <td>
                                {Number(payment.amount).toLocaleString()}원
                              </td>
                              <td>{payment.payment_status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}
                  </div>
                )
              )}

              <div className="finance-detail-actions">
              <button
                type="button"
                disabled={saving || paymentSaving}
                onClick={() => openPaymentForm(selectedItem)}
              >
                {selectedItem.type === "SALES" ? "입금 등록" : "출금 등록"}
              </button>

              <button
                type="button"
                disabled={saving || paymentSaving}
                className="erp-primary-button"
                onClick={() => openEditItemForm(selectedItem)}
              >
                수정
              </button>

              <button
                type="button"
                disabled={saving || paymentSaving}
                className="finance-detail-delete"
                onClick={handleItemDelete}
              >
                삭제
              </button>

            
              </div>

                  </section>
                )}
              />
            </div>
          )}
        </div>

        {/* [우측 영역] 상시 노출 정산 마감 달력 (약 38% 너비) */}
        <div style={{ flex: '0 0 38%', minWidth: '340px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>품목 정산 마감 일정</h4>
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

export default Items;