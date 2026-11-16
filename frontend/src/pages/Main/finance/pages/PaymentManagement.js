import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicTable from '../../../../components/BasicTable';
import Items from './Items';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';
import { getPaymentManagement, savePaymentClassification } from '../../../../utils/financeService';
import Approval from './Approval';
import '../../../../css/SubMain.css';
import '../../../../css/ADComp.css';
import '../../../../css/Table.css';
import '../../../../css/GroupBord.css';
import '../../../../css/Form.css';
import '../components/Finance.css';
import ColorTeg from '../../../../components/ColorTeg';
import { FilterTabs } from '../../../../components/FilterControls';
import "../../../../css/ModalPopup.css";
const won = value => `${Number(value || 0).toLocaleString('ko-KR', {
  maximumFractionDigits: 2
})}원`;
function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date());
}
function total(rows) {
  return rows.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100;
}
function CategoryDropdown({
  groups,
  selectedCodes,
  onChange,
  disabled,
  resetKey
}) {
  const [open, setOpen] = useState(false);
  const [rootElement, setRootElement] = useState(null);
  const [triggerElement, setTriggerElement] = useState(null);
  const items = groups.flatMap(group => group.items);
  const selected = items.filter(item => selectedCodes.includes(item.key));
  const allSelected = items.length > 0 && selected.length === items.length;
  useEffect(() => {
    setOpen(false);
  }, [resetKey, disabled]);
  useEffect(() => {
    if (!open) return undefined;
    function outside(event) {
      if (!rootElement?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerElement?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, rootElement, triggerElement]);
  function close() {
    setOpen(false);
    triggerElement?.focus();
  }
  const label = selected.length === 0 ? '세부 항목 선택' : allSelected ? '전체 항목' : `${selected[0].label}${selected.length > 1 ? ` 외 ${selected.length - 1}개` : ''}`;
  return <div className="pm-category-dropdown" ref={setRootElement} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" className="pm-dropdown-trigger" ref={setTriggerElement} disabled={disabled} aria-expanded={open} aria-controls="pm-category-options" aria-label={`세부 항목: ${label}`} onClick={() => setOpen(value => !value)}>
      <span>{label}</span><span aria-hidden="true">▾</span>
    </button>
    {open && <div id="pm-category-options" className="pm-dropdown-popover" role="group" aria-label="세부 항목 선택">
      <h4>세부 항목 선택</h4>
      <label className="pm-dropdown-check"><input type="checkbox" ref={element => {
          if (element) element.indeterminate = selected.length > 0 && !allSelected;
        }} checked={allSelected} onChange={event => onChange(event.target.checked ? items.map(item => item.key) : [])} />전체 선택</label>
      <div className="pm-dropdown-options">{groups.map(group => <fieldset key={group.key}>
        <legend>{group.heading}</legend>
        {group.items.map(item => <label key={item.key} className="pm-dropdown-check">
          <input type="checkbox" checked={selectedCodes.includes(item.key)} onChange={event => onChange(event.target.checked ? [...selectedCodes, item.key] : selectedCodes.filter(code => code !== item.key))} />{item.label}
        </label>)}
      </fieldset>)}</div>
      <div className="pm-dropdown-footer"><span>{selected.length}개 선택</span><button type="button" onClick={close}>확인</button></div>
    </div>}
  </div>;
}
export default function PaymentManagement({
  embedded = false,
  onOpenApprovals,
  onOpenTrades,
  onBusyChange
}) {
  const navigate = useNavigate();
  const user = getLoginUser();
  const permitted = user?.role === 'MASTER' || Number(user?.department_id) === 1;
  const direction = '전체';
  const [tradeType, setTradeType] = useState('ALL');
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [month, setMonth] = useState(currentMonth);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [classification, setClassification] = useState('unclassified');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [tradeRequest, setTradeRequest] = useState(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [filterReset, setFilterReset] = useState(0);
  const expenseGroups = data ? data.overview.expense.groups.filter(group => group.id !== 'unclassified') : [];
  useEffect(() => {
    onBusyChange?.(saving || selectedRow !== null || workflowBusy || tradeBusy);
  }, [saving, selectedRow, workflowBusy, tradeBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  function openApprovals(options = {}) {
    if (onOpenApprovals) onOpenApprovals({
      ...options,
      expenseGroups: expenseGroups
    });else setWorkflow(options);
  }
  function openTrades(options = {}) {
    if (embedded) setTradeRequest({
      ...options,
      requestId: Date.now()
    });else if (onOpenTrades) onOpenTrades(options);else navigate('/main/finance/items');
  }
  useEffect(() => {
    if (!permitted || workflow) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    // 전체 화면은 기존 입금·출금 API의 같은 조회 월 결과를 함께 사용합니다.
    const request = Promise.all(['출금', '입금'].map(value => getPaymentManagement({
      month,
      direction: value
    }))).then(([expense, income]) => ({
      range: expense.range,
      entries: [...expense.entries.map(row => ({
        ...row,
        payment_direction: '출금',
        record_view: 'completed'
      })), ...income.entries.map(row => ({
        ...row,
        payment_direction: '입금',
        record_view: 'completed'
      }))],
      scheduled: [...expense.scheduled.map(row => ({
        ...row,
        payment_direction: '출금',
        record_view: 'scheduled'
      })), ...income.scheduled.map(row => ({
        ...row,
        payment_direction: '입금',
        record_view: 'scheduled'
      }))],
      overview: {
        expense,
        income
      }
    }));
    request.then(result => {
      if (cancelled) return;
      setData(result);
    }).catch(err => {
      if (!cancelled) {
        setData(null);
        setError(err.response?.data?.message || '결제 관리 정보를 불러오지 못했습니다.');
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [direction, month, refresh, permitted, workflow]);

  // 선택한 탭에 맞는 세부 항목 목록을 만듭니다.
  function getFilterGroups() {
    if (!data) return [];
    const groups = [];
    if (tradeType !== 'SALES') {
      data.overview.expense.groups.forEach(group => {
        groups.push({
          ...group,
          direction: '출금',
          heading: `지출 · ${group.label}`
        });
      });
    }
    if (tradeType !== 'PURCHASE') {
      data.overview.income.groups.forEach(group => {
        groups.push({
          ...group,
          direction: '입금',
          heading: `수입 · ${group.label}`
        });
      });
    }
    return groups.map(group => ({
      ...group,
      key: `${group.direction}:${group.id}`,
      items: group.items.map(item => ({
        ...item,
        key: `${group.direction}:${item.code}`
      }))
    }));
  }
  const filterGroups = getFilterGroups();
  const categoryItems = filterGroups.flatMap(group => group.items);
  // 선택이 없으면 분류 제한 없이 조회합니다. 처음 열 때 체크박스는 비워 둡니다.
  useEffect(() => {
    setSelectedCodes([]);
    setTradeType('ALL');
  }, [month]);
  const selectedItems = categoryItems.filter(item => selectedCodes.includes(item.key));
  const classificationGroups = data ? selectedRow?.payment_direction === '입금' ? data.overview.income.groups : data.overview.expense.groups : [];
  function openDetail(row) {
    setSelectedRow(row);
    setClassification(row.category_code);
    setPassword('');
    setSaveError('');
  }
  function closeDetail() {
    if (saving) return;
    setSelectedRow(null);
    setPassword('');
  }
  async function handleClassification(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (saving || form.dataset.saving === 'true' || !selectedRow) return;
    const employeeId = Number(user?.employee_id ?? user?.employeeKey);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      setSaveError('로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!password) {
      setSaveError('로그인 비밀번호를 입력해 주세요.');
      return;
    }
    // 연속 제출을 즉시 막고, 화면 표시는 saving 상태로 처리합니다.
    form.dataset.saving = 'true';
    setSaving(true);
    setSaveError('');
    try {
      await savePaymentClassification({
        source_type: selectedRow.source_type,
        source_id: selectedRow.source_id,
        category_code: classification,
        employee_id: employeeId,
        password
      });
      setSelectedRow(null);
      setRefresh(value => value + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || '분류를 저장하지 못했습니다.');
    } finally {
      setPassword('');
      delete form.dataset.saving;
      setSaving(false);
    }
  }
  if (!permitted) return <div className="border-container"><h2 className="subtitle">결제 관리</h2><p role="alert">재무부 또는 MASTER 계정만 이용할 수 있습니다.</p></div>;
  if (workflow) return <div className="pm-workflow">
    <button type="button" disabled={workflowBusy} onClick={() => setWorkflow(null)}>← 결제 관리로 돌아가기</button>
    <Approval key={`${workflow.documentId || ''}-${workflow.draft}`} initialDocumentId={workflow.documentId} initialDraftOpen={workflow.draft} expenseGroups={expenseGroups} onBusyChange={setWorkflowBusy} />
  </div>;
  return <div className="border-container payment-management erp-controls">
    <header className="dashboard-header pm-unified-header">
      <div className="pm-header-summary">
        <span className="subtitle">지출·거래 관리</span>
        {data && <div className="pm-summary-badges" aria-label="입출금 요약">
          <ColorTeg title={'지급예정'} count={data.overview.expense.summary.scheduled} type={'원'} color={'blue'} />
          <ColorTeg title={'수입예정'} count={data.overview.income.summary.scheduled} type={'원'} color={'green'} />
          <ColorTeg title={'입출금 차액'} count={data.overview.income.summary.total - data.overview.expense.summary.total} type={'원'} color={'purple'} />
        </div>}
      </div>
      <div className="dashboard-top">
        <button type="button" className="register-btn" disabled={loading || Boolean(error) || tradeBusy} onClick={() => openTrades({
          create: true,
          tradeType: '매입'
        })}>매입·매출 등록</button>
      </div>
    </header>
    <div className="pm-toolbar pm-trade-toolbar">
      <FilterTabs label="거래 구분" value={tradeType} onChange={value => {
        setTradeType(value);
        setSelectedCodes([]);
      }} disabled={loading || tradeBusy} options={[{
        value: 'ALL',
        label: '전체'
      }, {
        value: 'SALES',
        label: '매출(판매)'
      }, {
        value: 'PURCHASE',
        label: '매입(구매)'
      }]} />
      <form className="form-inputs" onSubmit={event => {
        event.preventDefault();
        setMonth(monthInput);
        setRefresh(value => value + 1);
      }}>
        <label htmlFor="pm-month">조회 월</label>
        <input id="pm-month" type="month" min="1000-01" max="9998-12" required value={monthInput} onChange={event => setMonthInput(event.target.value)} />
        <button type="submit" disabled={loading || tradeBusy}>조회</button>
        <button type="button" disabled={loading || tradeBusy} onClick={() => {
          const now = currentMonth();
          setMonthInput(now);
          setMonth(now);
          setSelectedCodes([]);
          setTradeType('ALL');
          setFilterReset(value => value + 1);
          setRefresh(value => value + 1);
        }}>초기화</button>
      </form>
    </div>
    {loading && <p role="status">결제 관리 정보를 불러오는 중입니다.</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>다시 조회</button></div>}
    {data && <div className="pm-columns pm-unified-columns">
      <section className="pm-overview-panel" aria-label="지출·수입 분류 요약">
        {[['expense', '출금', '지출·매입 요약'], ['income', '입금', '수입·매출 요약']].map(([key, value, title]) => {
          const source = data.overview[key];
          return <div className="pm-overview-card" key={key}>
            <div className="pm-panel-heading"><h4>{title}</h4><strong>{won(source.summary.total)}</strong></div>
            <div className="pm-overview-groups">{source.groups.map(group => {
                const keys = group.items.map(item => `${value}:${item.code}`);
                const selected = keys.length === selectedCodes.length && keys.every(code => selectedCodes.includes(code));
                return <button type="button" key={group.id} className="pm-category-button" aria-pressed={selected} disabled={loading || tradeBusy} onClick={() => {
                  setTradeType(value === '입금' ? 'SALES' : 'PURCHASE');
                  setSelectedCodes(selected ? [] : keys);
                }}>
                <span>{group.label}</span><strong>{won(total(source.entries.filter(row => row.group_id === group.id)))}</strong>
              </button>;
              })}</div>
          </div>;
        })}
      </section>
      <section className="pm-detail-panel" aria-label="선택 항목 내역">
        <Items embedded compact tradeRequest={tradeRequest} onBusyChange={setTradeBusy} onDataChange={() => setRefresh(value => value + 1)} scope={{
          month,
          refresh,
          direction,
          tradeType,
          view: 'all',
          unified: true,
          filterReset,
          groupId: 'all',
          selectedCodes,
          entries: data.entries,
          scheduled: data.scheduled
        }} categoryFilter={<CategoryDropdown groups={filterGroups} selectedCodes={selectedCodes} onChange={setSelectedCodes} disabled={loading || tradeBusy} resetKey={`${month}-${filterReset}-${tradeType}`} />} categorySummary={selectedItems.length ? <div className="pm-selection-chips">
            {selectedItems.map(item => <button type="button" key={item.key} disabled={tradeBusy} aria-label={`${item.label} 선택 해제`} onClick={() => setSelectedCodes(previous => previous.filter(code => code !== item.key))}>{item.label} <span aria-hidden="true">×</span></button>)}
            <button type="button" className="pm-clear-selection" disabled={tradeBusy} onClick={() => setSelectedCodes([])}>선택 해제</button>
          </div> : null} onClassify={openDetail} />
      </section>
    </div>}
    {selectedRow && <div className="finance-registration-modal"><ModalBase title="입출금 상세 및 분류" onClose={closeDetail} layout={<>
      <BasicTable title={selectedRow.title} th={['항목', '내용']} td={[['기준일', selectedRow.payment_date], ['금액', won(selectedRow.amount)], ['내역 구분', selectedRow.record_view === 'completed' ? '완료' : '입출금 예정'], ['결제수단', selectedRow.payment_method || '-'], ['현재 분류', `${selectedRow.group_label} / ${selectedRow.category_label}`], ['연결 번호', `${selectedRow.source_type === 'approval' ? '결재 문서' : selectedRow.source_type === 'transaction' ? '매입·매출 거래' : '입출금'} #${selectedRow.source_id}`]].map(content => ({
          content
        }))} />
      <form className="pm-classification-form" onSubmit={handleClassification}>
        <fieldset disabled={saving}>
          <label htmlFor="pm-classification">분류 변경</label>
          <select id="pm-classification" value={classification} onChange={event => setClassification(event.target.value)} required>
            {classificationGroups.map(item => <optgroup key={item.id} label={item.label}>{item.items.map(sub => <option key={sub.code} value={sub.code}>{sub.label}</option>)}</optgroup>)}
          </select>
          <p>같은 문서·거래의 분할 입출금에는 동일한 분류가 적용됩니다.</p>
          <label htmlFor="pm-password">로그인 비밀번호 확인</label>
          <input id="pm-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          <button type="submit">{saving ? '저장 중…' : '분류 저장'}</button>
        </fieldset>
      </form>
      {saveError && <p role="alert">{saveError}</p>}
      {selectedRow.source_type === 'approval' && <button type="button" disabled={saving} onClick={() => {
          const documentId = Number(selectedRow.source_id);
          closeDetail();
          openApprovals({
            documentId
          });
        }}>결재 문서 및 지급 관리</button>}
      {selectedRow.source_type === 'transaction' && <button type="button" disabled={saving} onClick={() => {
          const transactionId = Number(selectedRow.source_id);
          closeDetail();
          openTrades({
            transactionId
          });
        }}>거래 전표 및 정산</button>}
    </>} /></div>}
  </div>;
}
