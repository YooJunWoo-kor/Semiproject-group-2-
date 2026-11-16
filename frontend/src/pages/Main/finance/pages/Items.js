import React, { useEffect, useState } from 'react';
import { getItems, getItemCategories, getApprovals, getPartners, createItem, updateItem, deleteItem, createPayment, getTransactionPayments, getBankAccounts, getCorporateCards } from "../../../../utils/financeService";
import ModalBase from '../../../../components/ModalBase';
import '../components/Finance.css';
import PaginationTable from '../../../../components/PaginationTable';
import { FilterTabs, RadioGroup, CheckboxFilter, SelectFilter } from '../../../../components/FilterControls';
import WeeklyCalendar from '../../../../components/weeklycalendar/WeeklyCalendar';
import BasicCalendar from '../../../../components/calendar/BasicCalendar';
import { toApprovedTradeRows, normalizeApprovalStatus } from '../components/approvedTradeRows';
import { toPayrollPurchaseRows } from '../components/payrollPurchaseRows';
import { API_BASE_URL, getLoginUser } from '../../../../utils/authStorage';
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";


function DetailSummary({
  title,
  amount,
  status
}) {
  return <dl aria-label="상세 요약" style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
    gap: '8px 12px',
    margin: '0 0 12px',
    padding: 12,
    background: 'var(--color-canvas)',
    borderRadius: 10,
    fontSize: 13
  }}>
    {[['제목', title], ['금액', amount], ['상태', status]].map(([label, value]) => <React.Fragment key={label}>
        <dt>{label}</dt>
        <dd style={{
        margin: 0,
        fontWeight: 600,
        overflowWrap: 'anywhere'
      }}>{value}</dd>
      </React.Fragment>)}
  </dl>;
}

// DB 값은 유지하고 목록과 필터에서만 공통 상태를 사용합니다.
export function getSettlementLabel(value) {
  const status = String(value || '').trim();
  if (['일부 지급', '일부 납부', '일부 입금', '일부 출금', '일부 완료', '부분 정산', 'PARTIAL', 'PARTIALLY_PAID'].includes(status)) return '일부 완료';
  if (['완료', '지급완료', '납부완료', '입금완료', '출금완료', '정산완료', 'PAID', 'COMPLETED'].includes(status)) return '완료';
  if (['미정산', '대기', '지급대기', '납부대기', '입금대기', '출금대기', '입출금 예정', 'PENDING', 'UNPAID'].includes(status)) return '대기';
  return '미등록';
}
export function getTradeApprovalStatus(item, documents = []) {
  if (item.isPayroll && !item.isPayrollDeduction) return 'APPROVED';
  const document = documents.find(row => item.transactionId != null && row.linked_transaction_id != null && String(row.linked_transaction_id) === String(item.transactionId) || item.linkedSourceType === 'draft' && row.source_type === 'draft' && String(row.document_id) === `draft-${item.linkedSourceId}` || item.linkedSourceType === 'approval' && row.source_type !== 'draft' && String(row.document_id) === String(item.linkedSourceId));
  return normalizeApprovalStatus(document?.approval_status ?? item.approvalStatus);
}
export function isTradeOverdue(item, today) {
  const dueDate = String(item.dueDate || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate < today && getSettlementLabel(item.status) !== '완료';
}
function Items({
  embedded = false,
  initialCreate = false,
  initialTradeType = '매입',
  initialTransactionId = null,
  onBusyChange,
  compact = false,
  scope = null,
  tradeRequest = null,
  onDataChange,
  onClassify,
  categoryFilter = null,
  categorySummary = null
}) {
  // 1. 매입 / 매출 탭 필터 ('ALL' | 'SALES' | 'PURCHASE')
  const [activeTab, setActiveTab] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const selectedTradeType = scope?.unified ? scope.tradeType || 'ALL' : activeTab;

  // 2. 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 3. 우측 달력 주기 모드 (주간 기본 권장, 필요시 월간 전환)
  const [calendarType, setCalendarType] = useState('week'); // 'week' | 'month'

  // 4. 선택된 품목 ID
  const [selectedItemId, setSelectedItemId] = useState(null);

  // DB에서 가져온 거래 품목 목록
  const [storedItemList, setItemList] = useState([]);
  const [approvedDocuments, setApprovedDocuments] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [approvalsError, setApprovalsError] = useState('');
  const [payrollSummaries, setPayrollSummaries] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState('');
  const [payrollRows, setPayrollRows] = useState([]);
  const [payrollDetailLoading, setPayrollDetailLoading] = useState(false);
  const [payrollDetailError, setPayrollDetailError] = useState('');
  const [payrollRefresh, setPayrollRefresh] = useState(0);
  const [payrollPaymentSaving, setPayrollPaymentSaving] = useState(false);
  const [payrollPaymentError, setPayrollPaymentError] = useState('');
  const [payrollPaymentNotice, setPayrollPaymentNotice] = useState('');
  const [payrollPayForm, setPayrollPayForm] = useState({
    account_id: '',
    payment_date: '',
    password: ''
  });
  const [deductionMonth, setDeductionMonth] = useState('');
  const [deductionRefresh, setDeductionRefresh] = useState(0);
  const [deductionData, setDeductionData] = useState(null);
  const [deductionLoading, setDeductionLoading] = useState(false);
  const [deductionSaving, setDeductionSaving] = useState(false);
  const [deductionError, setDeductionError] = useState('');
  const [deductionNotice, setDeductionNotice] = useState('');
  const [deductionForm, setDeductionForm] = useState({
    account_id: '',
    payment_date: '',
    password: ''
  });
  const deductionRecords = [...(scope?.scheduled || []), ...(scope?.entries || [])].filter(row => row.source_type === 'payroll_deduction');
  const payrollDeductionRows = [...new Map(deductionRecords.map(row => [String(row.source_id), {
    id: `payroll-deduction-${row.source_id}`,
    transactionId: null,
    isPayroll: true,
    isPayrollDeduction: true,
    type: 'PURCHASE',
    date: String(row.source_id),
    dueDate: '',
    itemName: `${row.source_id} 급여 공제액`,
    customer: '급여 공제액',
    spec: '급여 공제액 · 납부 내역',
    quantity: null,
    unitPrice: null,
    supplyAmount: Number(row.amount),
    vat: 0,
    totalAmount: Number(row.amount),
    status: '납부대기',
    closingDay: null
  }])).values()];
  const payrollItems = toPayrollPurchaseRows(payrollSummaries);
  const itemList = [...payrollDeductionRows, ...payrollItems, ...toApprovedTradeRows(approvedDocuments, payrollItems.map(row => row.date)), ...storedItemList];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 등록폼 표시 여부
  const [formOpen, setFormOpen] = useState(initialCreate);

  // 저장 진행 여부와 오류 메시지
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 등록폼에서 선택할 거래처 목록
  const [partnerOptions, setPartnerOptions] = useState([]);

  const [itemCategories, setItemCategories] = useState({ purchase: [], sales: [] });
  const [categoryError, setCategoryError] = useState("");
  useEffect(() => {
    let cancelled = false;
    getItemCategories().then(data => {
      if (!cancelled) setItemCategories(data);
    }).catch(() => {
      if (!cancelled) setCategoryError("분류 목록을 불러오지 못했습니다. 백엔드 재시작 후 새로고침해 주세요.");
    });
    return () => { cancelled = true; };
  }, []);

  // 신규 거래 입력값
  const [itemForm, setItemForm] = useState({
    partner_id: "",
    category_code: "",
    trade_type: initialTradeType === "매출" ? "매출" : "매입",
    trade_date: "",
    due_date: "",
    // 정산 마감일
    item_name: "",
    standard: "",
    quantity: "1",
    unit_price: "",
    vat: "0"
  });

  // null이면 신규 등록, ID가 있으면 해당 품목 수정
  const [editingItemId, setEditingItemId] = useState(null);
  const [linkingApproval, setLinkingApproval] = useState(null);

  // 입금·출금 처리 대상 거래
  const [paymentTarget, setPaymentTarget] = useState(null);

  // 입금·출금 입력값
  const [paymentForm, setPaymentForm] = useState({
    payment_date: "",
    amount: "",
    payment_method: "계좌이체",
    account_id: "",
    // 회사계좌 ID
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
    setActiveTab('ALL');
  }, [scope?.direction]);
  useEffect(() => {
    if (!scope?.unified) return;
    setActiveTab('ALL');
    setSearchTerm('');
    setSettlementFilter('ALL');
    setApprovalFilter('ALL');
    setOverdueOnly(false);
  }, [scope?.unified, scope?.month, scope?.filterReset]);
  const [handledRequestId, setHandledRequestId] = useState(null);
  useEffect(() => {
    if (!tradeRequest || handledRequestId === tradeRequest.requestId) return;
    if (tradeRequest.create) {
      setHandledRequestId(tradeRequest.requestId);
      openItemForm(tradeRequest.tradeType);
    } else if (tradeRequest.transactionId != null && !loading) {
      const item = storedItemList.find(row => Number(row.transactionId) === Number(tradeRequest.transactionId));
      if (item) {
        setHandledRequestId(tradeRequest.requestId);
        setSelectedItemId(item.id);
      }
    }
  }, [tradeRequest, loading, storedItemList, handledRequestId]);
  const [initialTransactionOpened, setInitialTransactionOpened] = useState(false);
  useEffect(() => {
    onBusyChange?.(saving || paymentSaving || payrollPaymentSaving || deductionSaving || Boolean(deductionMonth) || formOpen || paymentTarget !== null || selectedItemId !== null);
  }, [saving, paymentSaving, payrollPaymentSaving, deductionSaving, deductionMonth, formOpen, paymentTarget, selectedItemId, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {
    if (loading || initialTransactionOpened || initialTransactionId == null) return;
    const item = storedItemList.find(row => Number(row.transactionId) === Number(initialTransactionId));
    if (item) {
      setInitialTransactionOpened(true);
      setSelectedItemId(item.id);
    }
  }, [loading, storedItemList, initialTransactionId, initialTransactionOpened]);
  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환합니다.
        const items = data.map(item => ({
          id: item.item_id,
          categoryCode: item.category_code || "unclassified",
          transactionId: item.transaction_id,
          linkedSourceType: item.linked_source_type || null,
          linkedSourceId: item.linked_source_id || null,
          approvalStatus: item.approval_status || null,
          partnerId: item.partner_id,
          type: item.trade_type === "매출" ? "SALES" : "PURCHASE",
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

  // 최종 승인된 기안서에 연결된 월 급여만 조회합니다.
  useEffect(() => {
    const controller = new AbortController();
    async function loadPayrollSummaries() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payrolls/summary`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('월 급여 합계를 불러오지 못했습니다.');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('월 급여 조회 응답을 확인해 주세요.');
        if (!controller.signal.aborted) setPayrollSummaries(data);
      } catch (err) {
        if (!controller.signal.aborted) setPayrollError(err.message || '월 급여 조회 오류');
      } finally {
        if (!controller.signal.aborted) setPayrollLoading(false);
      }
    }
    loadPayrollSummaries();
    return () => controller.abort();
  }, [payrollRefresh, scope?.refresh]);

  // 기존 결재 목록 API를 조회합니다. 실제 거래/품목 테이블에는 복사하지 않습니다.
  useEffect(() => {
    let cancelled = false;
    async function loadApprovedDocuments() {
      setApprovalsLoading(true);
      setApprovalsError('');
      try {
        const data = await getApprovals();
        if (!Array.isArray(data)) throw new Error('잘못된 결재 목록 응답');
        if (!cancelled) setApprovedDocuments(data);
      } catch (err) {
        if (!cancelled) setApprovalsError(err.response?.data?.message || '결재·기안서 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setApprovalsLoading(false);
      }
    }
    loadApprovedDocuments();
    return () => {
      cancelled = true;
    };
  }, [scope?.refresh]);

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
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");

  // 거래 구분, 검색어, 정산 상태를 함께 확인합니다.
  function matchingRecords(item, rows) {
    return rows.filter(row => item.isPayroll && row.source_type === (item.isPayrollDeduction ? 'payroll_deduction' : 'payroll') && String(row.source_id) === String(item.date) || row.source_type === 'transaction' && item.transactionId != null && String(row.source_id) === String(item.transactionId) || item.isApprovalDocument && row.source_type === item.originType && String(row.source_id) === String(item.originId) || item.linkedSourceType && row.source_type === item.linkedSourceType && String(row.source_id) === String(item.linkedSourceId));
  }
  const scopeRecordSource = !scope ? [] : scope.unified ? [...scope.entries, ...scope.scheduled] : scope.view === 'completed' ? scope.entries : scope.scheduled;
  function categoryMatches(row, item) {
    if (!scope.unified) return (scope.groupId === 'all' || row.group_id === scope.groupId) && scope.selectedCodes.includes(row.category_code);
    // Unclassified is separated by payment direction so expense/income filters never collide.
    const direction = row.payment_direction || (item.type === 'SALES' ? '입금' : '출금');
    return scope.selectedCodes.length === 0 || scope.selectedCodes.includes(`${direction}:${row.category_code}`);
  }
  const scopedList = !scope ? itemList : itemList.filter(item => {
    if (scope.direction !== '전체' && scope.direction === '입금' !== (item.type === 'SALES')) return false;
    const rows = matchingRecords(item, scopeRecordSource);
    if (rows.length) return rows.some(row => categoryMatches(row, item));
    if (item.isPayroll) return false;
    if (item.isApprovalDocument) {
      // 미승인 문서는 지급 일정이 없으므로 작성 월을 기준으로 표시합니다.
      const date = item.createdAt;
      return scope.view !== 'completed' && String(date || '').slice(0, 7) === scope.month && categoryMatches({
        category_code: 'unclassified',
        group_id: 'unclassified'
      }, item);
    }
    // Completed rows come from actual payments. Outstanding unclassified drafts/transactions may not yet have payment records.
    if (scope.view === 'completed' || getSettlementLabel(item.status) === '완료') return false;
    const date = item.dueDate || (item.date !== '미등록' ? item.date : item.createdAt);
    return String(date || '').slice(0, 7) === scope.month && categoryMatches({
      category_code: 'unclassified',
      group_id: 'unclassified'
    }, item);
  }).map(item => {
    if (!item.isPayroll) return item;
    const records = matchingRecords(item, scopeRecordSource);
    const completed = matchingRecords(item, scope.entries);
    const scheduled = matchingRecords(item, scope.scheduled);
    const status = item.isPayrollDeduction ? scheduled.length ? completed.length ? '일부 납부' : '납부대기' : '납부완료' : scheduled.length ? completed.length ? '일부 지급' : '지급대기' : '지급완료';
    return {
      ...item,
      totalAmount: records.reduce((sum, row) => sum + Number(row.amount), 0),
      spec: item.isPayrollDeduction ? '급여 공제액 · 납부 내역' : scope.view === 'completed' ? '급여 실지급 내역 · 계좌이체' : item.spec,
      ...(scope.unified || item.isPayrollDeduction ? {
        status: scope.unified ? status : scope.view === 'completed' ? '납부완료' : '납부대기'
      } : {})
    };
  });
  const filteredList = scopedList.filter(item => {
    const matchesTab = selectedTradeType === "ALL" || item.type === selectedTradeType;
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch = item.itemName.toLowerCase().includes(keyword) || item.customer.toLowerCase().includes(keyword);
    const matchesSettlement = settlementFilter === 'ALL' || getSettlementLabel(item.status) === settlementFilter;
    const matchesApproval = approvalFilter === 'ALL' || getTradeApprovalStatus(item, approvedDocuments) === approvalFilter;
    return matchesTab && matchesSearch && matchesSettlement && matchesApproval && (!overdueOnly || isTradeOverdue(item, today));
  });
  const filteredTotal = filteredList.reduce((sum, item) => sum + Math.round(Number(item.totalAmount || 0) * 100), 0) / 100;

  // 사용 가능한 원화 회사계좌 조회
  useEffect(() => {
    async function loadPaymentAccounts() {
      try {
        const data = await getBankAccounts();
        setPaymentAccounts(data.filter(account => account.currency === "KRW" && ["사용", "ACTIVE"].includes(account.account_status)));
      } catch (err) {
        console.error("정산용 회사계좌 조회 오류:", err);
        setAccountsError("회사계좌 목록을 불러오지 못했습니다.");
      } finally {
        setAccountsLoading(false);
      }
    }
    loadPaymentAccounts();
  }, [payrollRefresh]);

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
          setPaymentCards(data.filter(card => ["사용", "ACTIVE"].includes(card.card_status)));
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
    return () => {
      cancelled = true;
    };
  }, [paymentTransactionId, paymentRefresh]);

  // 상단 요약 집계 연산
  const totalSalesAmount = itemList.filter(item => item.type === 'SALES').reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPurchaseAmount = itemList.filter(item => item.type === 'PURCHASE').reduce((sum, item) => sum + item.totalAmount, 0);
  const operatingProfit = totalSalesAmount - totalPurchaseAmount;

  // 테이블 헤더 규격 정의
  const itemTableTitle = "매입/매출 품목 거래 현황";
  const itemHeaders = ["구분", "거래일 (마감일)", "거래처", "품목 (규격)", "합계 금액", "상태", "관리"];

  // PaginationTable 규격에 맞춘 데이터 매핑 ({ content: [...] })
  const tItemData = filteredList.map(item => {
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
            {item.isPayroll ? "급여 대상 월" : item.isApprovalDocument ? "처리 마감" : "정산 마감"}: {item.isPayroll ? item.date : item.dueDate || "미등록"}
          </div>
          <small className="subtext">
            {item.isPayrollDeduction ? "(급여 공제액 · 별도 납부)" : item.isPayroll ? scope?.view === "completed" ? "(급여 실지급액)" : "(인건비 · 세전 급여 합계)" : item.closingDay ? Number(item.closingDay) === 31 ? "(정기 마감: 매월 말일)" : `(정기 마감: 매월 ${item.closingDay}일)` : "(정기 마감일 미등록)"}
          </small>
        </div>,
      // 3. 거래처
      item.customer,
      // 4. 품목명 + 규격/수량 (세로 2줄 결합)
      <div>
          <strong>{item.itemName}</strong>
          <div className="subtext">
            {item.isPayroll ? item.spec : item.isApprovalDocument ? "품목·수량 미등록" : `${item.spec} · ${item.quantity}개`}
          </div>
        </div>,
      // 5. 총 합계금액 (공급가/부가세는 덜어내고 최종 금액만 강조)
      <strong>{item.totalAmount == null ? "미등록" : `${item.totalAmount.toLocaleString()}원`}</strong>,
      // 6. 상태
      <div className="finance-trade-status">
          <span className={`status-badge ${getSettlementLabel(item.status) === '완료' ? 'status-success' : 'status-pending'}`}>
            {getSettlementLabel(item.status)}
          </span>
          <small className="subtext">{getTradeApprovalStatus(item, approvedDocuments) === 'APPROVED' ? '승인' : getTradeApprovalStatus(item, approvedDocuments) === 'UNAPPROVED' ? '미승인' : '승인 미확인'}</small>
          {isTradeOverdue(item, today) && <small className="finance-overdue-label">기한 초과</small>}
        </div>,
      // 7. 관리 버튼
      <button type="button" disabled={saving || paymentSaving || payrollPaymentSaving || deductionSaving} title={item.isPayrollDeduction ? "급여 공제액 납부 내역" : item.isPayroll ? "직원별 급여 상세" : undefined} onClick={() => openVoucher(item.id)}>
          {item.isPayrollDeduction ? "상세" : item.isPayroll ? "상세" : item.isApprovalDocument ? "상세" : "전표"}
        </button>]
    };
  });

  // 우측 달력용 이벤트 데이터
  const calendarEvents = itemList.filter(item => item.dueDate).map(item => ({
    id: item.id,
    title: `[${item.type === "SALES" ? "입금" : "출금"}] ${item.customer}`,
    start: item.dueDate,
    end: item.dueDate,
    typeId: item.type === "SALES" ? 0 : 2
  }));

  // 신규 등록폼 열기
  function openItemForm(tradeType) {
    if (saving || paymentSaving) return;
    setLinkingApproval(null);
    setPaymentTarget(null); // 입금·출금 입력폼 닫기
    setEditingItemId(null); // 신규 등록 모드

    setItemForm({
      partner_id: "",
    category_code: "",
      trade_type: tradeType === "매출" ? "매출" : "매입",
      trade_date: "",
      due_date: "",
      // 새 등록폼을 열면 마감일 초기화
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
  function openApprovedTradeForm(item) {
    if (saving || paymentSaving || !item.isApprovalDocument || item.isPayrollDraft || getTradeApprovalStatus(item, approvedDocuments) !== 'APPROVED') return;
    if (!Number.isSafeInteger(item.totalAmount) || item.totalAmount <= 0) {
      alert('원본 승인 금액이 미등록입니다. 금액이 있는 기안서부터 등록해주세요.');
      return;
    }
    setLinkingApproval(item);
    setEditingItemId(null);
    setPaymentTarget(null);
    setFormError('');
    setItemForm({
      partner_id: '',
      category_code: '',
      trade_type: '매입',
      trade_date: today,
      due_date: item.dueDate || '',
      item_name: '',
      standard: '',
      quantity: '1',
      unit_price: '',
      vat: '0'
    });
    setFormOpen(true);
  }

  // 입력칸의 name에 해당하는 값을 변경합니다.
  function handleItemChange(e) {
    const {
      name,
      value
    } = e.target;
    setItemForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "trade_type" ? { category_code: "" } : {})
    }));
  }
  async function handleItemSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const isEditing = editingItemId !== null;
    if (linkingApproval) {
      const total = Number(itemForm.quantity) * Number(itemForm.unit_price) + Number(itemForm.vat);
      if (itemForm.trade_type !== '매입' || total !== linkingApproval.totalAmount) {
        setFormError('수량 × 단가 + 부가세 합계가 원본 승인 금액과 같아야 합니다.');
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      // 수정과 신규 등록을 구분합니다.
      const result = isEditing ? await updateItem(editingItemId, itemForm) : await createItem(linkingApproval ? {
        ...itemForm,
        source_type: linkingApproval.originType,
        source_id: linkingApproval.originId
      } : itemForm);
      const partner = partnerOptions.find(item => Number(item.partner_id) === Number(itemForm.partner_id));
      const existingItem = isEditing ? itemList.find(item => item.id === editingItemId) : null;
      const quantity = Number(itemForm.quantity);
      const unitPrice = Number(itemForm.unit_price);
      const supplyAmount = quantity * unitPrice;
      const vat = Number(itemForm.vat);
      const savedItem = {
        id: isEditing ? editingItemId : result.item_id,
        transactionId: result.transaction_id,
        linkedSourceType: result.linked_source_type || existingItem?.linkedSourceType || null,
        linkedSourceId: result.linked_source_id || existingItem?.linkedSourceId || null,
        approvalStatus: result.approval_status || (linkingApproval ? '승인' : existingItem?.approvalStatus) || null,
        partnerId: Number(itemForm.partner_id),
        type: itemForm.trade_type === "매출" ? "SALES" : "PURCHASE",
        date: itemForm.trade_date,
        categoryCode: result.category_code || itemForm.category_code || "unclassified",
        itemName: itemForm.item_name.trim(),
        spec: itemForm.standard.trim() || "-",
        // 기존 거래처를 유지하면 저장 당시의 거래처명도 유지합니다.
        customer: existingItem && Number(existingItem.partnerId) === Number(itemForm.partner_id) ? existingItem.customer : partner?.company_name || "-",
        unitPrice,
        quantity,
        supplyAmount,
        vat,
        totalAmount: supplyAmount + vat,
        status: existingItem?.status || "미정산",
        closingDay: partner?.closing_day ?? null,
        dueDate: itemForm.due_date || ""
      };
      setItemList(prev => isEditing
      // 기존 품목을 찾아 교체합니다.
      ? prev.map(item => item.id === editingItemId ? savedItem : item)
      // 신규 품목은 맨 위에 추가합니다.
      : [savedItem, ...prev]);
      if (linkingApproval) {
        setApprovedDocuments(previous => previous.map(document => String(document.document_id) === String(linkingApproval.sourceDocumentId) ? {
          ...document,
          linked_transaction_id: result.transaction_id
        } : document));
      }
      setLinkingApproval(null);
      setActiveTab("ALL");
      setSearchTerm("");
      setSettlementFilter("ALL");
      setSelectedItemId(savedItem.id);
      setPaymentRefresh(prev => prev + 1);
      onDataChange?.();
      setFormOpen(false);
      setEditingItemId(null);
      alert(isEditing ? "거래 품목이 수정되었습니다." : "거래 품목이 등록되었습니다.");
    } catch (err) {
      setFormError(err.response?.data?.message || (isEditing ? "거래 품목 수정에 실패했습니다." : "거래 품목 등록에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  // 선택한 거래 품목 삭제
  async function handleItemDelete() {
    if (!selectedItem || selectedItem.isApprovalDocument || saving || paymentSaving) return;
    const confirmed = window.confirm(`"${selectedItem.itemName}" 품목을 삭제하시겠습니까?\n` + "이 거래의 마지막 품목이면 거래 정보도 함께 삭제됩니다.");
    if (!confirmed) return;
    const itemId = selectedItem.id;
    setSaving(true);
    try {
      // 서버에서 삭제에 성공한 뒤 화면 목록도 변경합니다.
      await deleteItem(itemId);
      onDataChange?.();
      setItemList(prev => prev.filter(item => item.id !== itemId));

      // 삭제한 품목의 상세정보와 수정폼을 닫습니다.
      setSelectedItemId(null);
      setFormOpen(false);
      setEditingItemId(null);
      setFormError("");
      try {
        setApprovedDocuments(await getApprovals());
      } catch {
        setApprovalsError('거래는 삭제되었지만 원본 목록 재조회에 실패했습니다. 새로고침해주세요.');
      }
      alert("거래 품목이 삭제되었습니다.");
    } catch (err) {
      alert(err.response?.data?.message || "거래 품목 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // 선택한 ID와 일치하는 품목 정보를 찾습니다.
  const selectedItem = itemList.find(item => item.id === selectedItemId);
  const payrollMonth = selectedItem?.isPayroll && !selectedItem.isPayrollDeduction ? selectedItem.date : '';
  useEffect(() => {
    setPayrollPayForm({
      account_id: '',
      payment_date: new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()),
      password: ''
    });
    setPayrollPaymentError('');
    setPayrollPaymentNotice('');
  }, [payrollMonth]);
  useEffect(() => {
    const controller = new AbortController();
    setPayrollRows([]);
    setPayrollDetailError('');
    setPayrollDetailLoading(Boolean(payrollMonth));
    if (!payrollMonth) return () => controller.abort();
    async function loadPayrollDetail() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payrolls/${payrollMonth}/details`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('급여 상세를 불러오지 못했습니다.');
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('급여 상세 응답을 확인해 주세요.');
        if (!controller.signal.aborted) setPayrollRows(rows);
      } catch (error) {
        if (!controller.signal.aborted) setPayrollDetailError(error.message);
      } finally {
        if (!controller.signal.aborted) setPayrollDetailLoading(false);
      }
    }
    loadPayrollDetail();
    return () => controller.abort();
  }, [payrollMonth, payrollRefresh]);
  const payrollMoneyKeys = ['base_salary', 'allowance', 'bonus', 'deduction', 'gross_pay', 'net_pay'];
  const payrollWon = value => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  const payrollUnpaidRows = payrollRows.filter(row => row.payment_status !== '지급완료');
  const payrollNetPending = payrollUnpaidRows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0);
  const payrollCurrentUser = getLoginUser();
  const payrollCanPay = payrollCurrentUser?.role === 'MASTER' || Number(payrollCurrentUser?.department_id ?? payrollCurrentUser?.department) === 1;
  async function handlePayrollPayment(event) {
    event.preventDefault();
    if (payrollPaymentSaving || payrollDetailLoading || !payrollMonth || !payrollCanPay) return;
    const currentUser = getLoginUser();
    const employeeId = Number(currentUser?.employee_id ?? currentUser?.employeeKey);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      setPayrollPaymentError('로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!payrollPayForm.account_id || !payrollPayForm.payment_date || !payrollPayForm.password || payrollNetPending <= 0) {
      setPayrollPaymentError('회사계좌, 지급일, 로그인 비밀번호와 실지급액을 확인해 주세요.');
      return;
    }
    setPayrollPaymentSaving(true);
    setPayrollPaymentError('');
    setPayrollPaymentNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/finance/payrolls/${payrollMonth}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_id: Number(payrollPayForm.account_id),
          payment_date: payrollPayForm.payment_date,
          expected_amount: payrollNetPending,
          expected_payroll_ids: payrollUnpaidRows.map(row => Number(row.payroll_id)),
          employee_id: employeeId,
          password: payrollPayForm.password
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '급여 지급 등록에 실패했습니다.');
      setPayrollPaymentNotice(`${result.message} 실지급 ${Number(result.amount).toLocaleString()}원 · 공제액 ${Number(result.deduction_pending).toLocaleString()}원은 별도 납부대기입니다.`);
      setPayrollRefresh(value => value + 1);
      onDataChange?.();
    } catch (error) {
      setPayrollPaymentError(error.message || '서버 응답을 확인하지 못했습니다. 다시 등록하기 전에 새로고침해 지급 상태를 확인해 주세요.');
    } finally {
      setPayrollPayForm(previous => ({
        ...previous,
        password: ''
      }));
      setPayrollPaymentSaving(false);
    }
  }
  useEffect(() => {
    setDeductionForm({
      account_id: '',
      payment_date: new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()),
      password: ''
    });
    setDeductionNotice('');
    setDeductionError('');
  }, [deductionMonth]);
  useEffect(() => {
    const controller = new AbortController();
    setDeductionData(null);
    setDeductionError('');
    setDeductionLoading(Boolean(deductionMonth));
    if (!deductionMonth) return () => controller.abort();
    async function loadDeduction() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payroll-deductions/${deductionMonth}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || '공제액을 불러오지 못했습니다.');
        if (!Array.isArray(data.items) || !Array.isArray(data.history)) throw new Error('공제액 조회 응답을 확인해 주세요.');
        if (!controller.signal.aborted) setDeductionData(data);
      } catch (error) {
        if (!controller.signal.aborted) setDeductionError(error.message);
      } finally {
        if (!controller.signal.aborted) setDeductionLoading(false);
      }
    }
    loadDeduction();
    return () => controller.abort();
  }, [deductionMonth, deductionRefresh]);
  async function handleDeductionPayment(event) {
    event.preventDefault();
    if (deductionSaving || deductionLoading || !deductionMonth || !payrollCanPay) return;
    const user = getLoginUser();
    const employeeId = Number(user?.employee_id ?? user?.employeeKey);
    const pending = (deductionData?.items || []).filter(row => row.status === '납부대기' && Number(row.amount) > 0);
    const amount = Number(deductionData?.pending_total);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      setDeductionError('로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!deductionForm.account_id || !deductionForm.payment_date || !deductionForm.password || !pending.length || !Number.isSafeInteger(amount) || amount <= 0) {
      setDeductionError('회사계좌, 납부일, 비밀번호와 공제액을 확인해 주세요.');
      return;
    }
    setDeductionSaving(true);
    setDeductionError('');
    setDeductionNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/finance/payroll-deductions/${deductionMonth}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_id: Number(deductionForm.account_id),
          payment_date: deductionForm.payment_date,
          employee_id: employeeId,
          password: deductionForm.password,
          expected_amount: amount,
          expected_salary_payment_ids: pending.map(row => Number(row.salary_payment_id))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '공제액 납부 등록에 실패했습니다.');
      setDeductionNotice(`${result.message} ${payrollWon(result.amount)} · 출금 이력 #${result.payment_id}`);
      setDeductionRefresh(value => value + 1);
      setPayrollRefresh(value => value + 1);
      onDataChange?.();
    } catch (error) {
      setDeductionError(error.message || '응답을 확인하지 못했습니다. 새로고침해 납부 이력을 먼저 확인해 주세요.');
    } finally {
      setDeductionForm(previous => ({
        ...previous,
        password: ''
      }));
      setDeductionSaving(false);
    }
  }

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
        const data = await getTransactionPayments(selectedTransactionId);

        // 다른 거래를 선택했다면 이전 조회 결과를 반영하지 않습니다.
        if (!cancelled) {
          setPaymentSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentHistoryError(err.response?.data?.message || "입금·출금 이력을 불러오지 못했습니다.");
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
    if (item.isApprovalDocument || saving || paymentSaving) return;
    setLinkingApproval(null);
    setPaymentTarget(null);
    setEditingItemId(item.id);
    setItemForm({
      partner_id: String(item.partnerId),
      category_code: item.categoryCode || "unclassified",
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
    if (item.isApprovalDocument || getTradeApprovalStatus(item, approvedDocuments) === 'UNAPPROVED' || saving || paymentSaving) return;
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
    const {
      name,
      value
    } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value,
      // 결제수단을 바꾸면 이전 계좌·카드 선택을 초기화합니다.
      ...(name === "payment_method" ? {
        account_id: "",
        card_id: ""
      } : {})
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
      const result = await createPayment(paymentTarget.transactionId, paymentForm);

      // 같은 거래에 속한 모든 품목의 정산 상태를 변경합니다.
      setItemList(prev => prev.map(item => Number(item.transactionId) === Number(result.transaction_id) ? {
        ...item,
        status: result.settlement_status
      } : item));
      // 저장 후 정산 이력과 남은 금액을 다시 조회합니다.
      setPaymentRefresh(prev => prev + 1);
      onDataChange?.();
      setPaymentTarget(null);
      alert(`${result.message}\n남은 금액: ${Number(result.remaining_amount).toLocaleString()}원`);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "입금·출금 등록에 실패했습니다.");
    } finally {
      setPaymentSaving(false);
    }
  }

  // 전표 상세와 입력 폼은 한 번에 하나씩 표시합니다.
  function openVoucher(itemId) {
    if (saving || paymentSaving || payrollPaymentSaving || deductionSaving) return;
    const item = itemList.find(row => row.id === itemId);
    setDeductionMonth(item?.isPayrollDeduction ? item.date : '');
    setFormOpen(false);
    setPaymentTarget(null);
    setSelectedItemId(itemId);
  }
  function closeVoucher() {
    if (saving || paymentSaving || payrollPaymentSaving || deductionSaving) return;
    setDeductionMonth('');
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
  return <div className={`border-container finance-items erp-controls${compact ? ' finance-items-compact' : ''}`}>
      {/* 1. 상단 공통 헤더 및 액션 버튼 */}
      {!compact && <header className="dashboard-header">
        <span className="subtitle">{embedded ? "거래·정산" : "매입/매출 품목관리"}</span>
        <div className="dashboard-top">
          <button type="button" className="register-btn" disabled={saving || paymentSaving} onClick={openItemForm}>
            + 품목 거래내역 신규 등록
          </button>
        </div>
      </header>}

      

      {!compact && <p>승인 지출의 상세에서 거래정보를 등록할 수 있습니다. 월 급여는 연결된 기안서가 최종 승인된 경우에만 매입(인건비)에 표시합니다. 금액은 승인된 급여의 세전 합계이며, 급여 상세에서 직원별 금액을 확인하고 실제 송금한 급여의 지급 내역을 등록할 수 있습니다.</p>}

      {payrollLoading && <p role="status">월 급여 조회 중…</p>}
      {payrollError && <p role="alert">{payrollError} 급여 합계가 누락되어 있으니 백엔드 재시작 후 새로고침해 주세요.</p>}

      {/* 2. 상단 누적 손익 요약 카드 */}
      {!compact && <section className="finance-trade-summary">
        <h3>전체 거래 총액 요약</h3>
        <p>
          <span>총 매출: <strong>{totalSalesAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>총 매입: <strong>{totalPurchaseAmount.toLocaleString()}원</strong></span>
          {' '}|{' '}
          <span>
            매출·매입 차액(부가세 포함): <strong className={operatingProfit >= 0 ? "finance-positive" : "finance-negative"}>
              {operatingProfit.toLocaleString()}원
            </strong>
          </span>
        </p>
      </section>}

      {!compact && <hr />}

      {/* 3. 좌우 2단 분할 레이아웃 컨테이너 */}
      <div style={{
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start',
      marginTop: compact ? 0 : '16px'
    }}>

        {/* [좌측 영역] 탭 + 검색 필터 + PaginationTable (약 62% 너비) */}
        <div style={{
        flex: compact ? '1 1 100%' : '1 1 62%',
        minWidth: 0
      }}>
          {/* 탭 전환 및 검색 필터 */}
          <div className="finance-item-toolbar">
            {!scope?.unified && <FilterTabs label="거래 구분" value={activeTab} onChange={value => {
            if (value !== 'ALL' && scope?.direction !== '전체') scope?.onDirectionChange?.(value === 'SALES' ? '입금' : '출금');
            setActiveTab(value);
          }} options={[{
            value: 'ALL',
            label: `전체 (${scopedList.length})`
          }, {
            value: 'SALES',
            label: '매출(판매)'
          }, {
            value: 'PURCHASE',
            label: '매입(구매)'
          }]} />}
            <div className="finance-approval-toolbar">
              <RadioGroup label="승인 여부" value={approvalFilter} onChange={setApprovalFilter} options={[{
              value: 'ALL',
              label: '전체'
            }, {
              value: 'APPROVED',
              label: '승인'
            }, {
              value: 'UNAPPROVED',
              label: '미승인'
            }]} />
              <CheckboxFilter label="기한 초과만 보기" checked={overdueOnly} onChange={setOverdueOnly} />
            </div>

            <div className={scope?.unified ? 'pm-unified-filters' : 'finance-trade-filters'}>
              {categoryFilter}
              <SelectFilter label="정산 상태" value={settlementFilter} onChange={setSettlementFilter} options={[{
              value: 'ALL',
              label: '전체 상태'
            }, ...['미등록', '대기', '일부 완료', '완료'].map(status => ({
              value: status,
              label: status
            }))]} />
              <input type="text" aria-label="품목명 또는 거래처명 검색" placeholder="품목명 또는 거래처명 검색" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
              width: '100%'
            }} />
            </div>
          </div>

          {categorySummary && <div className="pm-filter-summary">
            {categorySummary}
            <span className="pm-filter-total">선택 거래 합계 <strong>{filteredTotal.toLocaleString('ko-KR')}원</strong></span>
          </div>}
          {approvalFilter !== 'ALL' && <p className="finance-approval-note">승인 여부가 확인되는 거래만 표시합니다. 승인 정보가 없는 거래는 전체에서 확인할 수 있습니다.</p>}
          {approvalsLoading && <p>결재·기안서를 불러오는 중입니다.</p>}
          {approvalsError && <p role="alert">{approvalsError}</p>}
          {loading && <p>거래 품목을 불러오는 중입니다.</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !approvalsLoading && !error && !approvalsError && filteredList.length === 0 && <p>표시할 거래 품목이 없습니다.</p>}

          {formOpen && <div className="finance-registration-modal">
              <ModalBase title={linkingApproval ? "승인 지출 거래정보 등록" : editingItemId === null ? "신규 매입·매출 거래 등록" : "거래 품목 수정"} onClose={closeRegistrationModal} layout={<form onSubmit={handleItemSubmit}>
                  
                    <fieldset disabled={saving}>
                      {linkingApproval && <p>원본: {linkingApproval.itemName}<br />승인 금액: {linkingApproval.totalAmount.toLocaleString()}원 · 입력 합계가 이 금액과 같아야 합니다.</p>}
                      <div>
                        <label htmlFor="item-partner">거래처 *</label>
                        <select id="item-partner" name="partner_id" value={itemForm.partner_id} onChange={handleItemChange} required>
                          <option value="">거래처 선택</option>
                  
                          {partnerOptions.map(partner => <option key={partner.partner_id} value={partner.partner_id}>
                              {partner.company_name}
                            </option>)}
                        </select>
                      </div>
                  
                      <div>
                        <label htmlFor="item-trade-type">거래 구분 *</label>
                        <select id="item-trade-type" disabled={Boolean(linkingApproval)} name="trade_type" value={itemForm.trade_type} onChange={handleItemChange} required>
                          <option value="매입">매입</option>
                          <option value="매출">매출</option>
                        </select>
                      </div>
                  
                      <div>
                        <label htmlFor="item-category">거래 분류</label>
                        <select id="item-category" name="category_code" value={itemForm.category_code || ""}
                          onChange={handleItemChange} disabled={saving}>
                          <option value="">{linkingApproval ? "원본 분류 유지 (없으면 미분류)" : "분류 선택 (미선택 시 미분류)"}</option>
                          {(itemForm.trade_type === "매출" ? itemCategories.sales : itemCategories.purchase).map(group =>
                            <optgroup key={group.id} label={group.label}>
                              {group.items.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
                            </optgroup>)}
                        </select>
                        {categoryError && <p role="alert">{categoryError}</p>}
                      </div>

                      {/* 같은 구조의 입력칸은 map으로 만듭니다. */}
                      {[{
                name: "trade_date",
                label: "거래일",
                type: "date",
                required: true
              }, {
                name: "due_date",
                label: "정산 마감일",
                type: "date"
              }, {
                name: "item_name",
                label: "품목명",
                type: "text",
                required: true,
                maxLength: 100
              }, {
                name: "standard",
                label: "규격",
                type: "text",
                maxLength: 50
              }, {
                name: "quantity",
                label: "수량",
                type: "number",
                required: true,
                min: 1,
                step: 1
              }, {
                name: "unit_price",
                label: "단가(공급가액 기준)",
                type: "number",
                required: true,
                min: 0,
                step: 1
              }, {
                name: "vat",
                label: "부가세",
                type: "number",
                required: true,
                min: 0,
                step: 1
              }].map(field => <div key={field.name}>
                          <label htmlFor={`item-${field.name}`}>
                            {field.label}{field.required ? " *" : ""}
                          </label>
                  
                          <input id={`item-${field.name}`} name={field.name} type={field.type} value={itemForm[field.name]} onChange={handleItemChange} required={field.required} maxLength={field.maxLength} min={field.min} step={field.step} />
                        </div>)}
                  
                      <p>
                        공급가액:{" "}
                        {(Number(itemForm.quantity) * Number(itemForm.unit_price)).toLocaleString()}원
                      </p>
                  
                      <p>
                        합계 금액:{" "}
                        {(Number(itemForm.quantity) * Number(itemForm.unit_price) + Number(itemForm.vat)).toLocaleString()}원
                      </p>
                  
                      <p>신규 거래는 미정산 상태로 등록됩니다.</p>
                  
                      {formError && <p role="alert">{formError}</p>}
                  
                      <button type="submit">
                        {saving ? "저장 중..." : "저장"}
                      </button>
                  
                      <button type="button" onClick={closeRegistrationModal}>
                        취소
                      </button>
                    </fieldset>
                  </form>} />
            </div>}

          {paymentTarget && <div className="finance-registration-modal">
              <ModalBase title={paymentTarget.type === "SALES" ? "입금 등록" : "출금 등록"} onClose={closePaymentModal} layout={<form onSubmit={handlePaymentSubmit}>

              <p>거래 ID: {paymentTarget.transactionId}</p>
              <p>거래처: {paymentTarget.customer}</p>
              <p>선택한 품목이 속한 거래 전체를 기준으로 정산합니다.</p>

              <fieldset disabled={paymentSaving}>
                <div>
                  <label htmlFor="payment-date">처리 날짜 *</label>
                  <input id="payment-date" name="payment_date" type="date" value={paymentForm.payment_date} onChange={handlePaymentChange} required />
                </div>

                <div>
                  <label htmlFor="payment-amount">처리 금액 *</label>
                  <input id="payment-amount" name="amount" type="number" min="1" step="1" value={paymentForm.amount} onChange={handlePaymentChange} required />
                </div>

                <div>
                  <label htmlFor="payment-method">결제수단 *</label>
                  <select id="payment-method" name="payment_method" value={paymentForm.payment_method} onChange={handlePaymentChange} required>
                    <option value="계좌이체">계좌이체</option>
                    <option value="현금">현금</option>
                    {paymentTarget.type === "PURCHASE" && <option value="법인카드">법인카드</option>}
                  </select>
                </div>

                {paymentForm.payment_method === "계좌이체" && <div>
                    <label htmlFor="payment-account">회사계좌 *</label>

                    <select id="payment-account" name="account_id" value={paymentForm.account_id} onChange={handlePaymentChange} disabled={accountsLoading || Boolean(accountsError)} required>
                      <option value="">회사계좌 선택</option>

                      {paymentAccounts.map(account => <option key={account.account_id} value={account.account_id}>
                          {account.bank_name} / {account.account_name}
                          {" / "}{account.account_number}
                        </option>)}
                    </select>

                    {accountsLoading && <p>회사계좌를 불러오는 중입니다.</p>}
                    {accountsError && <p role="alert">{accountsError}</p>}

                    {!accountsLoading && !accountsError && paymentAccounts.length === 0 && <p>선택 가능한 원화 계좌가 없습니다.</p>}
                  </div>}

                {paymentForm.payment_method === "법인카드" && <div>
                    <label htmlFor="payment-card">법인카드 *</label>
                    <select id="payment-card" name="card_id" value={paymentForm.card_id} onChange={handlePaymentChange} required disabled={cardsLoading || Boolean(cardsError)}>
                      <option value="">법인카드 선택</option>
                      {paymentCards.map(card => <option key={card.card_id} value={card.card_id}>
                          {card.card_name} / 잔여 한도 {Number(card.remaining_limit).toLocaleString()}원
                        </option>)}
                    </select>
                    {cardsLoading && <p>법인카드를 불러오는 중입니다.</p>}
                    {cardsError && <p role="alert">{cardsError}</p>}
                    {!cardsLoading && !cardsError && paymentCards.length === 0 && <p>선택 가능한 법인카드가 없습니다.</p>}
                    <p>카드 결제 시 사용량이 증가하고 잔여 한도가 감소합니다.</p>
                  </div>}

                {paymentError && <p role="alert">{paymentError}</p>}

                <button type="submit">
                  {paymentSaving ? "저장 중..." : "저장"}
                </button>

                <button type="button" onClick={closePaymentModal}>
                  취소
                </button>
              </fieldset>
            </form>} />
            </div>}

          <PaginationTable key={`${selectedTradeType}-${approvalFilter}-${overdueOnly}-${searchTerm}-${settlementFilter}-${scope?.month}-${scope?.direction}-${scope?.view}-${scope?.groupId}-${scope?.selectedCodes.join(',')}-${tItemData.length}`} title={itemTableTitle} th={itemHeaders} allData={tItemData} itemsPerPage={5} />
          {compact && !scope?.unified && <p className="finance-workspace-note">{scope?.view === 'completed' ? '조회 기간에 입출금한 거래입니다. 합계 금액은 품목의 전체 거래금액입니다.' : '조회 월 마감의 미정산 거래입니다. 분류가 없는 거래는 미분류에서 확인하세요.'}</p>}
          {deductionMonth && !formOpen && !paymentTarget && <div className="finance-registration-modal">
              <ModalBase className="finance-deduction-modal" title={`${deductionMonth} 급여 공제액`} onClose={closeVoucher} layout={<section style={{
            width: '100%',
            minWidth: 0
          }}>
                    <style>{`
                      .finance-registration-modal .modal-boder.finance-deduction-modal { width: min(560px, calc(100vw - 32px)); min-width: 0; max-width: 100%; }
                      .finance-deduction-modal table { width: 100%; table-layout: fixed; }
                      .finance-deduction-modal th, .finance-deduction-modal td { padding: 9px; font-size: 13px; overflow-wrap: anywhere; }
                    `}</style>
                    {deductionNotice && <p role="status">{deductionNotice}</p>}
                    {deductionError && <p role="alert">{deductionError}</p>}
                    {deductionLoading && <p role="status">공제액 조회 중…</p>}
                    {deductionData && !deductionLoading && <>
                      <DetailSummary title={`${deductionMonth} 급여 공제액`} amount={payrollWon(Number(deductionData.pending_total) + Number(deductionData.paid_total))} status={Number(deductionData.pending_total) > 0 ? Number(deductionData.paid_total) > 0 ? '일부 완료' : '대기' : deductionData.items.length > 0 ? '완료' : '미등록'} />
                      <dl style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                margin: '0 0 12px',
                padding: 12,
                background: 'var(--color-canvas, #f5f8fc)',
                borderRadius: 10
              }}>
                        <dt>남은 공제액</dt><dd style={{
                  margin: 0,
                  fontWeight: 700
                }}>{payrollWon(deductionData.pending_total)}</dd>
                        <dt>납부완료</dt><dd style={{
                  margin: 0
                }}>{payrollWon(deductionData.paid_total)}</dd>
                      </dl>
                      {deductionData.items.length === 0 ? <p>지급된 급여의 공제액 내역이 없습니다.</p> : <div className="table-shell">
                        <table><thead><tr><th>직원</th><th>공제액</th><th>납부 상태</th></tr></thead>
                          <tbody>{deductionData.items.map(row => <tr key={row.salary_payment_id}>
                            <td>{row.name}</td><td>{payrollWon(row.amount)}</td><td>{row.status}</td>
                          </tr>)}</tbody>
                        </table>
                      </div>}
                      {deductionData.history.length > 0 && <section style={{
                marginTop: 12
              }} aria-label="공제액 납부 이력">
                        <h4 style={{
                  margin: '0 0 8px'
                }}>납부 이력</h4>
                        {deductionData.history.map(row => <p key={row.payment_id} style={{
                  fontSize: 13
                }}>
                          #{row.payment_id} · {row.payment_date} · {payrollWon(row.amount)}<br />{row.bank_name} · {row.account_name}
                        </p>)}
                      </section>}
                      {Number(deductionData.pending_total) > 0 && payrollCanPay && <form onSubmit={handleDeductionPayment} style={{
                marginTop: 14
              }}>
                        <fieldset disabled={deductionSaving || accountsLoading} style={{
                  minWidth: 0,
                  padding: 12,
                  border: '1px solid var(--color-line, #dde4ee)',
                  borderRadius: 10
                }}>
                          <legend>공제액 납부 내역 등록</legend>
                          <p className="subtext" style={{
                    fontSize: 12
                  }}>실제 납부 후 등록하세요. 해당 월 미납 공제액 전액을 한 건으로 등록하며, 은행 송금이나 기관 납부를 실행하지 않습니다.</p>
                          <div style={{
                    display: 'grid',
                    gap: 8
                  }}>
                            <label htmlFor="deduction-account">출금 회사계좌</label>
                            <select id="deduction-account" required value={deductionForm.account_id} onChange={event => setDeductionForm(previous => ({
                      ...previous,
                      account_id: event.target.value
                    }))}>
                              <option value="">회사계좌 선택</option>
                              {paymentAccounts.map(account => <option key={account.account_id} value={account.account_id}>{account.bank_name} · {account.account_name} · 잔액 {payrollWon(account.balance)}</option>)}
                            </select>
                            {accountsError && <p role="alert">{accountsError}</p>}
                            <label htmlFor="deduction-date">실제 납부일</label>
                            <input id="deduction-date" type="date" required max={today} value={deductionForm.payment_date} onChange={event => setDeductionForm(previous => ({
                      ...previous,
                      payment_date: event.target.value
                    }))} />
                            <label htmlFor="deduction-password">로그인 비밀번호 확인</label>
                            <input id="deduction-password" type="password" autoComplete="current-password" required value={deductionForm.password} onChange={event => setDeductionForm(previous => ({
                      ...previous,
                      password: event.target.value
                    }))} />
                            <button type="submit" className="register-btn" disabled={paymentAccounts.length === 0}>{deductionSaving ? '등록 중…' : `${payrollWon(deductionData.pending_total)} 납부 등록`}</button>
                          </div>
                        </fieldset>
                      </form>}
                      {deductionData.items.length > 0 && Number(deductionData.pending_total) === 0 && <p>공제액 납부가 모두 등록되었습니다.</p>}
                    </>}
                  </section>} />
            </div>}

          {selectedItem?.isPayroll && !selectedItem.isPayrollDeduction && !formOpen && !paymentTarget && <div className="finance-registration-modal finance-voucher-detail">
              <ModalBase className="finance-payroll-modal" title={`${payrollMonth} 급여 상세`} onClose={closeVoucher} layout={<section style={{
            width: '100%',
            minWidth: 0
          }}>
                    <style>{`
                      .finance-registration-modal .modal-boder.finance-payroll-modal {
                        width: min(560px, calc(100vw - 32px));
                        min-width: 0;
                        max-width: 100%;
                      }
                      .finance-payroll-modal .modal-body { min-width: 0; }
                      .finance-payroll-modal .payroll-employee-card {
                        border: 1px solid var(--color-line, #dde4ee);
                        border-radius: 10px;
                        padding: 12px;
                        margin-top: 10px;
                      }
                      .finance-payroll-modal .payroll-employee-values {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 8px 10px;
                        margin: 10px 0 0;
                      }
                      .finance-payroll-modal .payroll-employee-values dt {
                        color: var(--color-muted, #697386);
                        font-size: 12px;
                        margin-bottom: 2px;
                      }
                      .finance-payroll-modal .payroll-employee-values dd {
                        margin: 0;
                        font-size: 13px;
                        font-weight: 600;
                        overflow-wrap: anywhere;
                        font-variant-numeric: tabular-nums;
                      }
                      @media (max-width: 420px) {
                        .finance-payroll-modal .payroll-employee-values {
                          grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                      }
                    `}</style>
                    <DetailSummary title={`${payrollMonth} 급여 (인건비)`} amount={selectedItem.totalAmount == null ? '미등록' : payrollWon(selectedItem.totalAmount)} status={getSettlementLabel(selectedItem.status)} />
                    {payrollDetailLoading && <p role="status">급여 내역 조회 중…</p>}
                    {payrollDetailError && <p role="alert">{payrollDetailError}</p>}
                    {!payrollDetailLoading && !payrollDetailError && (payrollRows.length === 0 ? <p>현재 승인된 급여 내역이 없습니다.</p> : <>
                        <p style={{
                margin: '0 0 12px',
                fontSize: 13
              }}>직원 {new Set(payrollRows.map(row => row.employee_id)).size}명 · 급여 승인 완료</p>
                        <dl style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '6px 12px',
                margin: 0,
                padding: 12,
                fontSize: 14,
                background: 'var(--color-canvas, #f5f8fc)',
                borderRadius: 10
              }}>
                          {[['세전 합계', 'gross_pay'], ['공제 합계', 'deduction'], ['실지급 합계', 'net_pay']].map(([label, key]) => <React.Fragment key={key}>
                              <dt>{label}</dt>
                              <dd style={{
                    margin: 0,
                    textAlign: 'right',
                    fontWeight: 700
                  }}>
                                {payrollWon(payrollRows.reduce((sum, row) => sum + Number(row[key] || 0), 0))}
                              </dd>
                            </React.Fragment>)}
                        </dl>
                        {payrollRows.map(row => <article key={row.payroll_id} className="payroll-employee-card" aria-label={`${row.name} 급여 내역`}>
                            <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                              <strong style={{
                    fontSize: 14
                  }}>{row.name}</strong>
                              <span className="subtext" style={{
                    fontSize: 12
                  }} title={row.draft_title}>기안서 #{row.draft_id} · {row.payment_status || '미등록'}</span>
                            </div>
                            <dl className="payroll-employee-values">
                              {payrollMoneyKeys.map((key, index) => <div key={key}>
                                  <dt>{['기본급', '수당', '상여금', '공제액', '세전 급여', '실지급액'][index]}</dt>
                                  <dd>{payrollWon(row[key])}</dd>
                                </div>)}
                            </dl>
                            {row.payment_id && <p style={{
                  margin: '10px 0 0',
                  fontSize: 12
                }}>
                              지급 이력 #{row.payment_id} · {row.registered_payment_date}<br />
                              {row.payment_bank_name} · {row.payment_account_name} · {payrollWon(row.registered_payment_amount)}
                            </p>}
                          </article>)}
                        {payrollPaymentNotice && <p role="status">{payrollPaymentNotice}</p>}
                        {payrollPaymentError && <p role="alert">{payrollPaymentError}</p>}
                        {payrollCanPay && payrollUnpaidRows.length > 0 && <form onSubmit={handlePayrollPayment} style={{
                marginTop: 16
              }}>
                            <fieldset disabled={payrollPaymentSaving || payrollDetailLoading || accountsLoading} style={{
                  minWidth: 0,
                  padding: 12,
                  border: '1px solid var(--color-line, #dde4ee)',
                  borderRadius: 10
                }}>
                              <legend>급여 지급 내역 등록</legend>
                              <p>미지급 {payrollUnpaidRows.length}명 · 실지급액 <strong>{payrollWon(payrollNetPending)}</strong></p>
                              <p className="subtext" style={{
                    fontSize: 12
                  }}>실제 은행 송금 후 등록하세요. 이 버튼은 은행 송금을 실행하지 않습니다.</p>
                              <div style={{
                    display: 'grid',
                    gap: 8
                  }}>
                                <label htmlFor="payroll-account">출금 회사계좌</label>
                                <select id="payroll-account" required value={payrollPayForm.account_id} onChange={event => setPayrollPayForm(previous => ({
                      ...previous,
                      account_id: event.target.value
                    }))}>
                                  <option value="">회사계좌 선택</option>
                                  {paymentAccounts.map(account => <option key={account.account_id} value={account.account_id}>
                                      {account.bank_name} · {account.account_name} · 잔액 {payrollWon(account.balance)}
                                    </option>)}
                                </select>
                                {accountsError && <p role="alert">{accountsError}</p>}
                                <label htmlFor="payroll-date">실제 지급일</label>
                                <input id="payroll-date" type="date" required max={today} value={payrollPayForm.payment_date} onChange={event => setPayrollPayForm(previous => ({
                      ...previous,
                      payment_date: event.target.value
                    }))} />
                                <label htmlFor="payroll-password">로그인 비밀번호 확인</label>
                                <input id="payroll-password" type="password" autoComplete="current-password" required value={payrollPayForm.password} onChange={event => setPayrollPayForm(previous => ({
                      ...previous,
                      password: event.target.value
                    }))} />
                                <button type="submit" className="register-btn" disabled={payrollNetPending <= 0 || paymentAccounts.length === 0}>
                                  {payrollPaymentSaving ? '등록 중…' : `${payrollWon(payrollNetPending)} 지급 등록`}
                                </button>
                              </div>
                            </fieldset>
                          </form>}
                        {payrollUnpaidRows.length === 0 && <p>모든 직원의 급여가 지급 등록되었습니다.</p>}
                        <p className="subtext" style={{
                margin: '10px 0 0',
                fontSize: 12
              }}>실지급액 = 세전 급여 − 공제액. 공제액의 납부 상태는 공제액 상세에서 확인할 수 있습니다.</p>
                      </>)}
                  </section>} />
            </div>}

          {selectedItem && !selectedItem.isPayroll && !formOpen && !paymentTarget && <div className="finance-registration-modal finance-voucher-detail">
              <ModalBase title={selectedItem.isApprovalDocument ? "결재·기안서 상세" : "매입·매출 전표"} onClose={closeVoucher} layout={<section aria-label="거래 전표 상세정보">
                    <DetailSummary title={selectedItem.itemName} amount={selectedItem.totalAmount == null ? '미등록' : payrollWon(selectedItem.totalAmount)} status={selectedItem.isApprovalDocument ? getTradeApprovalStatus(selectedItem, approvedDocuments) === 'APPROVED' ? '승인' : '미승인' : getSettlementLabel(selectedItem.status)} />


              <div className="table-shell">
              <table className="finance-voucher-fields">
                <tbody>
                  {(selectedItem.isApprovalDocument ? [["원본 결재 번호", selectedItem.sourceDocumentId], ["거래 구분", selectedItem.type === "SALES" ? "매출" : "매입"], ["거래일", selectedItem.date], ["정산 마감일", selectedItem.dueDate || "미등록"], ["거래처", selectedItem.customer], ["작성자", selectedItem.requester || "미등록"], ["작성일", selectedItem.createdAt || "미등록"]] : [["거래 ID", selectedItem.transactionId], ["품목 ID", selectedItem.id], ["거래 구분", selectedItem.type === "SALES" ? "매출" : "매입"], ["거래일", selectedItem.date], ["정산 마감일", selectedItem.dueDate || "미등록"], ["거래처", selectedItem.customer], ["제목", selectedItem.itemName], ["품목명", selectedItem.itemName], ["규격", selectedItem.spec], ["수량", selectedItem.quantity == null ? "미등록" : selectedItem.quantity.toLocaleString()], ["단가", selectedItem.unitPrice == null ? "미등록" : `${selectedItem.unitPrice.toLocaleString()}원`], ["공급가액", selectedItem.supplyAmount == null ? "미등록" : `${selectedItem.supplyAmount.toLocaleString()}원`], ["부가세", selectedItem.vat == null ? "미등록" : `${selectedItem.vat.toLocaleString()}원`], ["합계 금액", selectedItem.totalAmount == null ? "미등록" : `${selectedItem.totalAmount.toLocaleString()}원`], ["정산 상태", getSettlementLabel(selectedItem.status)]]).map(([label, value]) => <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value}</td>
                    </tr>)}
                </tbody>
              </table>
              </div>

              {selectedItem.isApprovalDocument && <p role="status">결재 상태: {getTradeApprovalStatus(selectedItem, approvedDocuments) === 'APPROVED' ? '승인' : '미승인'} (원본: {selectedItem.originalApprovalStatus}) · 작성자: {selectedItem.requester} · 작성일: {selectedItem.createdAt}<br />{selectedItem.content}<br />{getTradeApprovalStatus(selectedItem, approvedDocuments) !== 'APPROVED' ? "대기·반려 문서는 조회만 가능합니다. 최종 승인 후 지급·정산할 수 있습니다." : selectedItem.isPayrollDraft ? "급여 자료를 확인해주세요. 승인 급여는 월별 인건비 항목에서 지급합니다." : selectedItem.isSourceDraft ? "거래정보를 등록한 뒤 이 화면의 전표에서 지급·정산할 수 있습니다." : "거래정보 등록 버튼으로 거래처·품목을 입력하면 이 화면에서 지급·정산할 수 있습니다."}</p>}

              
              {paymentLoading ? <p>정산 정보를 불러오는 중입니다.</p> : paymentHistoryError ? <p role="alert">{paymentHistoryError}</p> : paymentSummary && Number(paymentSummary.transaction_id) === Number(selectedItem.transactionId) && <div>
                    <h4>입금·출금 이력</h4>

                    {paymentSummary.payments.length === 0 ? <p>등록된 입금·출금 이력이 없습니다.</p> : <div className="table-shell finance-voucher-history">
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
                          {paymentSummary.payments.map(payment => <tr key={payment.payment_id}>
                              <td>{payment.payment_date}</td>
                              <td>{payment.payment_direction}</td>
                              <td>{payment.payment_method}</td>
                              <td>
                                {Number(payment.amount).toLocaleString()}원
                              </td>
                              <td>{payment.payment_status}</td>
                            </tr>)}
                        </tbody>
                      </table>
                      </div>}
                  </div>}

              {selectedItem.linkedSourceType && <p>승인 문서에 연결된 거래입니다. 승인 금액을 유지하며 이 전표에서 지급·정산할 수 있습니다.</p>}
              <div className="finance-detail-actions">
              {compact && onClassify && matchingRecords(selectedItem, scopeRecordSource)[0] && <button type="button" disabled={saving || paymentSaving} onClick={() => {
                const row = matchingRecords(selectedItem, scopeRecordSource)[0];
                setSelectedItemId(null);
                onClassify(row);
              }}>분류 변경</button>}

              {selectedItem.isApprovalDocument && !selectedItem.isPayrollDraft && getTradeApprovalStatus(selectedItem, approvedDocuments) === 'APPROVED' && <button type="button" className="erp-primary-button" disabled={saving || paymentSaving || selectedItem.totalAmount == null} onClick={() => openApprovedTradeForm(selectedItem)}>거래정보 등록</button>}
              <button type="button" disabled={selectedItem.isApprovalDocument || getTradeApprovalStatus(selectedItem, approvedDocuments) === 'UNAPPROVED' || saving || paymentSaving} onClick={() => openPaymentForm(selectedItem)}>
                {selectedItem.type === "SALES" ? "입금 등록" : "출금 등록"}
              </button>

              <button type="button" disabled={selectedItem.isApprovalDocument || saving || paymentSaving} className="erp-primary-button" onClick={() => openEditItemForm(selectedItem)}>
                수정
              </button>

              <button type="button" disabled={selectedItem.isApprovalDocument || saving || paymentSaving} className="finance-detail-delete" onClick={handleItemDelete}>
                삭제
              </button>

            
              </div>

                  </section>} />
            </div>}
        </div>

        {/* [우측 영역] 상시 노출 정산 마감 달력 (약 38% 너비) */}
        {!compact && <div style={{
        flex: '0 0 38%',
        minWidth: '340px',
        borderLeft: '1px solid var(--color-line)',
        paddingLeft: '20px'
      }}>
          <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
            <h4 className="board-title finance-calendar-title">품목 정산 마감 일정</h4>
            <ul className="grouplist">
              <li><button type="button" className={calendarType === 'week' ? 'active' : ''} onClick={() => setCalendarType('week')}>
                주간
              </button></li>
              <li><button type="button" className={calendarType === 'month' ? 'active' : ''} onClick={() => setCalendarType('month')}>
                월간
              </button></li>
            </ul>
          </div>


          <div className="calendar-widget-wrapper">
            {calendarType === "week" ? <WeeklyCalendar schedule={calendarEvents} /> : <BasicCalendar schedule={calendarEvents} />}
          </div>
        </div>}

      </div>
    </div>;
}
export default Items;
