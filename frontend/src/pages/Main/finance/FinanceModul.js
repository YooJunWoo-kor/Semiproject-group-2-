import React, { useEffect, useState } from 'react';
import ScheduleBoard from '../../../components/ScheduleBoard';
import StatisticsCard from '../../../components/StatisticsCard';
import './FinanceDashboard.css';
import { API_BASE_URL } from '../../../utils/authStorage';

// server.js의 app.use('/api/finance', financeRouters) 경로와 맞춰 주세요.
// 다른 주소라면 이 상수만 기존 재무관리 API 주소로 변경합니다.
const DASHBOARD_API = API_BASE_URL + '/finance/dashboard';
const PERIODS = [['day', '일간'], ['week', '주간'], ['month', '월간'], ['year', '연간']];
const PERIOD_TEXT = { day: '오늘', week: '이번 주', month: '이번 달', year: '올해' };
const numberText = (value) => Number(value || 0).toLocaleString('ko-KR');

function DocumentIcon({ type }) {
    return (
        <svg viewBox="0 0 48 56" fill="none" aria-hidden="true">
            <path d="M8 2h23l11 12v37a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />
            <path d="M31 2v12h11M13 24h21M13 33h21M13 42h21" />
            {type === 'invoice' && <path d="M13 24v18M25 24v18M34 24v18" />}
        </svg>
    );
}

function PaymentSummary({ title, kind, data, loading }) {
    // 두 요약의 기간 선택은 서로 독립적입니다.
    const [period, setPeriod] = useState('day');
    const range = data?.ranges?.[period];
    const amount = data?.[kind]?.[period];
    return (
        <section className={`fd-summary fd-summary-${kind}`} aria-label={title}>
            <div className="fd-summary-heading">
                <h2>{title}</h2>
                <div className="fd-periods" role="group" aria-label={`${title} 조회 기간`}>
                    {PERIODS.map(([key, label]) => (
                        <button type="button" key={key} aria-pressed={period === key}
                            onClick={() => setPeriod(key)}>{label}</button>
                    ))}
                </div>
            </div>
            <div className="fd-amount-area" aria-live="polite">
                <p className="fd-date">{range ? (range.start === range.last ? range.start : `${range.start} ~ ${range.last}`) : '—'}</p>
                <p className="fd-amount">{loading || !data ? '—' : `${numberText(amount)}원`}</p>
                <p className="fd-caption">{PERIOD_TEXT[period]} 지급 {kind === 'completed' ? '완료' : '예정'} 금액</p>
            </div>
        </section>
    );
}

// 지급 일정만 검색합니다. 오른쪽 금액 요약은 검색 조건의 영향을 받지 않습니다.
function filterSchedules(schedules, filters) {
    const keyword = filters.keyword.trim().toLocaleLowerCase('ko-KR');
    return schedules.filter((schedule) => {
        const dueDate = String(schedule.start || '').slice(0, 10);
        return String(schedule.title || '').toLocaleLowerCase('ko-KR').includes(keyword)
            && (!filters.startDate || dueDate >= filters.startDate)
            && (!filters.endDate || dueDate <= filters.endDate);
    });
}

function FinanceModul() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    // 입력 중인 조건과 실제 적용한 조건을 분리합니다. Enter로도 검색합니다.
    const emptyFilters = { keyword: '', startDate: '', endDate: '' };
    const [searchInput, setSearchInput] = useState(emptyFilters);
    const [filters, setFilters] = useState(emptyFilters);
    const [searchError, setSearchError] = useState('');
    const filteredSchedules = filterSchedules(data?.schedules || [], filters);
    const isFiltered = Boolean(filters.keyword.trim() || filters.startDate || filters.endDate);

    function searchSchedules(event) {
        event.preventDefault();
        if (searchInput.startDate && searchInput.endDate && searchInput.startDate > searchInput.endDate) {
            setSearchError('시작일은 종료일보다 늦을 수 없습니다.');
            return;
        }
        setSearchError('');
        setFilters({ ...searchInput });
    }

    function resetSearch() {
        setSearchInput(emptyFilters);
        setFilters(emptyFilters);
        setSearchError('');
    }

    useEffect(() => {
        const controller = new AbortController();
        async function loadDashboard() {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(DASHBOARD_API, { signal: controller.signal });
                if (!response.ok) throw new Error('재무 현황을 불러오지 못했습니다. 서버 연결을 확인해 주세요.');
                const result = await response.json();
                if (!result.counts || !result.ranges || !Array.isArray(result.schedules)) {
                    throw new Error('대시보드 응답을 확인해 주세요. API 주소가 맞는지 확인해 주세요.');
                }
                setData(result);
            } catch (err) {
                if (err.name !== 'AbortError') { setData(null); setError(err.message); }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        loadDashboard();
        return () => controller.abort();
    }, [reload]);

    const stats = [
        ['cards', '법인카드'], ['accounts', '회사계좌'], ['approvals', '신규 기안'],
        ['partners', '거래처'], ['items', '관리 품목']
    ];
    return (
        <div className="border-container finance-dashboard">
            <header className="dashboard-header">
                <span className="subtitle">재무관리 대시보드</span>
                <div className="dashboard-top">
                    <button type="button" className="register-btn" disabled={loading} onClick={() => setReload(reload + 1)}>
                        {loading ? '조회 중…' : '새로고침'}
                    </button>
                </div>
            </header>
            <p className="subtext">재무 현황과 문서 작성을 한눈에 확인하세요.</p>
            {error && <div className="fd-error" role="alert">{error}</div>}
            {loading && <p role="status" className="subtext">재무 현황을 불러오는 중입니다.</p>}
            {!loading && data && (
                <section className="stats-section" aria-label="재무 현황">
                    {stats.map(([key, label]) => (
                        <StatisticsCard key={key} title={label} count={data.counts[key]} stiyle={0} />
                    ))}
                </section>
            )}
            <section className="fd-documents fd-panel">
                <h2>문서 작성</h2>
                <div className="fd-document-grid">
                    {[['receipt', '영수증 작성'], ['invoice', '청구서 작성'], ['quote', '견적서 작성']].map(([type, label]) => (
                        <button type="button" className="fd-document" key={type} disabled>
                            <DocumentIcon type={type} /><span>{label}</span><small>예정</small>
                        </button>
                    ))}
                </div>
                <p className="fd-note">문서 작성 및 PDF 저장 기능은 추후 제공됩니다.</p>
            </section>
            <div className="fd-bottom">
                <section className="fd-calendar fd-panel">
                    <h2>지급 일정</h2>
                    <div className="fd-calendar-layout">
                        <div className="fd-board">
                            {loading ? <p className="fd-state">지급 일정을 불러오는 중입니다.</p> : error ?
                                <p className="fd-state">서버 연결 후 지급 일정을 확인할 수 있습니다.</p> :
                                <>
                                    <ScheduleBoard schedule={filteredSchedules} />
                                    {!filteredSchedules.length && <p className="fd-note">
                                        {isFiltered ? '검색 조건에 맞는 지급 일정이 없습니다.' : '등록된 지급 일정이 없습니다.'}
                                    </p>}
                                </>}
                        </div>
                        <aside className="fd-search" aria-label="지급 일정 검색">
                            <h3>마감일 검색</h3>
                            <form onSubmit={searchSchedules}>
                                <label htmlFor="fd-keyword">문서명</label>
                                <input id="fd-keyword" type="search" placeholder="예: 서버, 구매"
                                    value={searchInput.keyword}
                                    onChange={(event) => setSearchInput({ ...searchInput, keyword: event.target.value })} />
                                <label htmlFor="fd-start-date">마감일 시작</label>
                                <input id="fd-start-date" type="date" value={searchInput.startDate}
                                    onChange={(event) => setSearchInput({ ...searchInput, startDate: event.target.value })} />
                                <label htmlFor="fd-end-date">마감일 종료</label>
                                <input id="fd-end-date" type="date" value={searchInput.endDate}
                                    onChange={(event) => setSearchInput({ ...searchInput, endDate: event.target.value })} />
                                {searchError && <p className="fd-search-error" role="alert">{searchError}</p>}
                                <div className="fd-search-actions">
                                    <button type="submit" disabled={loading || Boolean(error)}>검색</button>
                                    <button type="button" onClick={resetSearch}>초기화</button>
                                </div>
                            </form>
                            <p className="fd-search-help">검색한 마감일만 달력에 표시합니다. 다른 달의 일정은 달력의 이전·다음 버튼으로 확인해 주세요.</p>
                            <div className="fd-search-results" aria-live="polite" aria-busy={loading}>
                                <h4>{isFiltered ? '검색 결과' : '전체 지급 일정'}
                                    {!loading && !error && <span> {filteredSchedules.length}건</span>}</h4>
                                {loading ? <p>조회 중입니다.</p> : error ? <p>데이터를 불러오지 못했습니다.</p> :
                                    filteredSchedules.length ? <ul tabIndex={0} aria-label="검색 결과 목록">
                                        {filteredSchedules.map((schedule) => (
                                            <li key={schedule.id}>
                                                <strong title={schedule.title}>{schedule.title}</strong>
                                                <span>마감일: {schedule.start}</span>
                                                <span>{schedule.description}</span>
                                            </li>
                                        ))}
                                    </ul> : <p>{isFiltered ? '검색 결과가 없습니다.' : '등록된 지급 일정이 없습니다.'}</p>}
                            </div>
                        </aside>
                    </div>
                </section>
                <div className="fd-summaries fd-panel">
                    <PaymentSummary title="지급총액" kind="completed" data={data} loading={loading} />
                    <PaymentSummary title="지급예정" kind="planned" data={data} loading={loading} />
                    <p className="fd-note">지급예정: 승인된 결재 문서의 미지급 잔액 · 지급기한 기준</p>
                </div>
            </div>
        </div>
    );
}
export default FinanceModul;
