import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const won = value => `${Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date());
}
function total(rows) {
  return rows.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100;
}

export default function PaymentManagement({ embedded = false, onOpenApprovals, onOpenTrades, onBusyChange }) {
  const navigate = useNavigate();
  const user = getLoginUser();
  const permitted = user?.role === 'MASTER' || Number(user?.department_id) === 1;
  const [direction, setDirection] = useState('출금');
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [month, setMonth] = useState(currentMonth);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupId, setGroupId] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [view, setView] = useState('completed');
  const [selectedRow, setSelectedRow] = useState(null);
  const [classification, setClassification] = useState('unclassified');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [tradeRequest, setTradeRequest] = useState(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const allRef = useRef(null);
  const saveLock = useRef(false);
  const expenseGroups = useRef([]);

  useEffect(() => {
    onBusyChange?.(saving || selectedRow !== null || workflowBusy || tradeBusy);
  }, [saving, selectedRow, workflowBusy, tradeBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  function openApprovals(options = {}) {
    if (onOpenApprovals) onOpenApprovals({ ...options, expenseGroups: expenseGroups.current });
    else setWorkflow(options);
  }
  function openTrades(options = {}) {
    if (embedded) setTradeRequest({ ...options, requestId: Date.now() });
    else if (onOpenTrades) onOpenTrades(options);
    else navigate('/main/finance/items');
  }

  useEffect(() => {
    if (!permitted || workflow) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    getPaymentManagement({ month, direction }).then(result => {
      if (cancelled) return;
      setData(result);
      if (direction === '출금') expenseGroups.current = result.groups.filter(group => group.id !== 'unclassified');
      setGroupId(previous => result.groups.some(group => group.id === previous) ? previous : result.groups[0]?.id || '');
    }).catch(err => {
      if (!cancelled) setError(err.response?.data?.message || '결제 관리 정보를 불러오지 못했습니다.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [direction, month, refresh, permitted, workflow]);

  const groups = useMemo(() => data?.groups || [], [data]);
  const group = groups.find(item => item.id === groupId);
  const categoryCodes = JSON.stringify(group?.items.map(item => item.code) || []);
  // 분류 구성이나 조회 기간이 바뀔 때만 선택을 초기화합니다.
  useEffect(() => {
    setSelectedCodes(JSON.parse(categoryCodes));
  }, [groupId, direction, month, categoryCodes]);
  const allSelected = Boolean(group?.items.length) && selectedCodes.length === group.items.length;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedCodes.length > 0 && !allSelected;
  }, [selectedCodes, allSelected]);

  const records = (view === 'completed' ? data?.entries : data?.scheduled) || [];
  const summary = data?.summary;
  const isExpense = direction === '출금';
  const scheduledLabel = isExpense ? '지급예정' : '수입예정';
  const difference = summary?.difference || 0;
  const comparison = data?.range.currentMonth ? '전월 동일 기간 대비' : '전월 대비';

  function openDetail(row) {
    setSelectedRow(row);
    setClassification(row.category_code);
    setPassword('');
    setSaveError('');
  }
  function closeDetail() {
    if (saveLock.current) return;
    setSelectedRow(null);
    setPassword('');
  }
  async function handleClassification(event) {
    event.preventDefault();
    if (saveLock.current || !selectedRow) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError('');
    try {
      await savePaymentClassification({ source_type: selectedRow.source_type,
        source_id: selectedRow.source_id, category_code: classification,
        employee_id: user.employee_id, password });
      setSelectedRow(null);
      setRefresh(value => value + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || '분류를 저장하지 못했습니다.');
    } finally {
      setPassword('');
      saveLock.current = false;
      setSaving(false);
    }
  }
  function switchDirection(next) {
    if (next === direction) return;
    setDirection(next);
    setGroupId('');
    setSelectedCodes([]);
    setView('completed');
  }
  const listRows = groups.map(item => ({ content: [
    <button type="button" key={item.id} className="pm-category-button"
      aria-pressed={item.id === groupId} onClick={() => setGroupId(item.id)}>
      <span>{item.label}</span><strong>{won(total(records.filter(row => row.group_id === item.id)))}</strong>
    </button>
  ] }));
  const subRows = (group?.items || []).map(item => ({ content: [
    <label key={item.code} className="pm-checkbox-row" data-selected={selectedCodes.includes(item.code)}>
      <input type="checkbox" checked={selectedCodes.includes(item.code)}
        onChange={event => setSelectedCodes(previous => event.target.checked ? [...previous, item.code] : previous.filter(code => code !== item.code))} />
      <span>{item.label}</span>
      <strong>{won(total(records.filter(row => row.category_code === item.code)))}</strong>
    </label>
  ] }));

  if (!permitted) return <div className="border-container"><h2 className="subtitle">결제 관리</h2><p role="alert">재무부 또는 MASTER 계정만 이용할 수 있습니다.</p></div>;
  if (workflow) return <div className="pm-workflow">
    <button type="button" disabled={workflowBusy} onClick={() => setWorkflow(null)}>← 결제 관리로 돌아가기</button>
    <Approval key={`${workflow.documentId || ''}-${workflow.draft || false}`}
      initialDocumentId={workflow.documentId} initialDraftOpen={workflow.draft}
      expenseGroups={expenseGroups.current} onBusyChange={setWorkflowBusy} />
  </div>;

  return <div className="border-container payment-management">
    <header className="dashboard-header">
      <span className="subtitle">{embedded ? "지출·거래 관리" : "결제 관리"}</span>
      <div className="dashboard-top">
        <button type="button" onClick={() => openApprovals({})} disabled={loading || tradeBusy}>{embedded ? "기존 결재·이력" : "기안·지급 관리"}</button>
        <button type="button" className="register-btn" disabled={loading || Boolean(error) || tradeBusy}
          onClick={() => embedded ? openTrades({ create: true, tradeType: isExpense ? '매입' : '매출' }) : isExpense ? setWorkflow({ draft: true }) : openTrades()}>
          {isExpense ? '매입·출금 등록' : '매출·입금 등록'}
        </button>
      </div>
    </header>
    <div className="pm-toolbar">
      <div className="grouborad"><ul className="grouplist" aria-label="입출금 구분">
        {['출금', '입금'].map(value => <li key={value}><button type="button" aria-pressed={direction === value}
          className={direction === value ? 'active' : ''} disabled={tradeBusy} onClick={() => switchDirection(value)}>{value === '출금' ? '지출 관리' : '수입 관리'}</button></li>)}
      </ul></div>
      <form className="form-inputs" onSubmit={event => {
        event.preventDefault(); setMonth(monthInput); setRefresh(value => value + 1);
      }}>
        <label htmlFor="pm-month">조회 월</label>
        <input id="pm-month" type="month" min="1000-01" max="9998-12" required value={monthInput} onChange={event => setMonthInput(event.target.value)} />
        <button type="submit" disabled={loading || tradeBusy}>조회</button>
        <button type="button" disabled={loading || tradeBusy} onClick={() => {
          const now = currentMonth(); setMonthInput(now); setMonth(now); setGroupId('');
          setView('completed'); setRefresh(value => value + 1);
        }}>초기화</button>
      </form>
    </div>
    {loading && <p role="status">결제 관리 정보를 불러오는 중입니다.</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>다시 조회</button></div>}
    {data && <>
      <section className="stats-section pm-stats" aria-label="기간별 입출금 요약">
        <article className="content-card"><h3>조회 기간 {isExpense ? '지출총액' : '수입총액'}</h3><strong>{won(summary.total)}</strong>
          <small>{data.range.start} ~ {data.range.end} · 완료 내역 기준</small></article>
        <article className="content-card"><h3>{scheduledLabel}</h3><strong>{won(summary.scheduled)}</strong>
          <small>{month} 마감 · 현재 미정산 잔액</small></article>
        <article className="content-card"><h3>{comparison}</h3><strong className={difference > 0 ? 'pm-increase' : difference < 0 ? 'pm-decrease' : ''}>
          {difference > 0 ? '▲ ' : difference < 0 ? '▼ ' : ''}{won(Math.abs(difference))}</strong>
          <small>{summary.change_percent === null ? (summary.total === 0 ? '비교 기간 실적 없음' : '비교 기간 실적 없음 · 증감률 계산 불가') :
            difference === 0 ? '변동 없음' : `${Math.abs(summary.change_percent)}% ${difference > 0 ? '증가' : '감소'}`}
            {' · '}{data.range.previousStart} ~ {data.range.previousEnd}</small></article>
      </section>
      <div className="pm-view-tabs grouborad"><ul className="grouplist" aria-label="내역 구분">
        {['completed', 'scheduled'].map(value => <li key={value}><button type="button" aria-pressed={view === value}
          className={view === value ? 'active' : ''} disabled={tradeBusy} onClick={() => setView(value)}>{value === 'completed' ? '완료 내역' : `${scheduledLabel} 내역`}</button></li>)}
      </ul><p>아래 분류별 금액은 {view === 'completed' ? '조회 기간의 완료 금액' : '조회 월 마감 건의 현재 미정산 잔액'}입니다.</p></div>
      <div className="pm-columns">
        <section className="pm-list-panel" aria-label="대분류">
          <BasicTable title={isExpense ? '지출 분류' : '수입 분류'} th={['대분류 / 합계']} td={listRows} />
          <p>미분류 내역은 상세에서 분류를 지정할 수 있습니다.</p>
        </section>
        <section className="pm-list-panel" aria-label="세부 항목">
          <p className="pm-group-name">{group?.label}</p>
          <label className="pm-select-all"><input ref={allRef} type="checkbox" checked={allSelected}
            onChange={event => setSelectedCodes(event.target.checked ? group?.items.map(item => item.code) || [] : [])} />전체 선택</label>
          <BasicTable title="세부 항목" th={['선택 항목 / 합계']} td={subRows} />
          <p>체크한 항목의 금액을 합산합니다.</p>
        </section>
        <section className="pm-detail-panel" aria-label="선택 항목 내역">
          <Items embedded compact tradeRequest={tradeRequest} onBusyChange={setTradeBusy}
            onDataChange={() => setRefresh(value => value + 1)}
            scope={{ month, direction, view, groupId, selectedCodes, entries: data.entries || [], scheduled: data.scheduled || [], onDirectionChange: switchDirection }}
            onClassify={openDetail} />
        </section>
      </div>
    </>}
    {selectedRow && <div className="finance-registration-modal"><ModalBase title="입출금 상세 및 분류" onClose={closeDetail} layout={<>
      <BasicTable title={selectedRow.title} th={['항목', '내용']} td={[
        ['기준일', selectedRow.payment_date], ['금액', won(selectedRow.amount)],
        ['내역 구분', view === 'completed' ? '완료' : scheduledLabel],
        ['결제수단', selectedRow.payment_method || '-'], ['현재 분류', `${selectedRow.group_label} / ${selectedRow.category_label}`],
        ['연결 번호', `${selectedRow.source_type === 'approval' ? '결재 문서' : selectedRow.source_type === 'transaction' ? '매입·매출 거래' : '입출금'} #${selectedRow.source_id}`]
      ].map(content => ({ content }))} />
      <form className="pm-classification-form" onSubmit={handleClassification}>
        <fieldset disabled={saving}>
          <label htmlFor="pm-classification">분류 변경</label>
          <select id="pm-classification" value={classification} onChange={event => setClassification(event.target.value)} required>
            {groups.map(item => <optgroup key={item.id} label={item.label}>{item.items.map(sub => <option key={sub.code} value={sub.code}>{sub.label}</option>)}</optgroup>)}
          </select>
          <p>같은 문서·거래의 분할 입출금에는 동일한 분류가 적용됩니다.</p>
          <label htmlFor="pm-password">로그인 비밀번호 확인</label>
          <input id="pm-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          <button type="submit">{saving ? '저장 중…' : '분류 저장'}</button>
        </fieldset>
      </form>
      {saveError && <p role="alert">{saveError}</p>}
      {selectedRow.source_type === 'approval' && <button type="button" disabled={saving} onClick={() => {
        const documentId = Number(selectedRow.source_id); closeDetail(); openApprovals({ documentId });
      }}>결재 문서 및 지급 관리</button>}
      {selectedRow.source_type === 'transaction' && <button type="button" disabled={saving} onClick={() => { const transactionId = Number(selectedRow.source_id); closeDetail(); openTrades({ transactionId }); }}>거래 전표 및 정산</button>}
    </>} /></div>}
  </div>;
}
