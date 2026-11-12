import React, { useEffect, useState } from 'react';
import ScheduleBoard from '../../../components/ScheduleBoard';
import StatisticsCard from '../../../components/StatisticsCard';
import './components/Finance.css';
import '../../../css/Table.css';
import { API_BASE_URL } from '../../../utils/authStorage';
import ModalBase from '../../../components/ModalBase';
import FinanceDocumentForm from './components/FinanceDocumentForm';

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
                <ul className="fd-periods grouplist" role="group" aria-label={`${title} 조회 기간`}>
                    {PERIODS.map(([key, label]) => (
                        <li key={key}><button type="button" aria-pressed={period === key}
                            className={period === key ? 'active' : ''}
                            onClick={() => setPeriod(key)}>{label}</button></li>
                    ))}
                </ul>
            </div>
            <div className="fd-amount-area" aria-live="polite">
                <p className="fd-date subtext">{range ? (range.start === range.last ? range.start : `${range.start} ~ ${range.last}`) : '—'}</p>
                <p className="fd-amount">{loading || !data ? '—' : `${numberText(amount)}원`}</p>
                <p className="fd-caption subtext">{PERIOD_TEXT[period]} 지급 {kind === 'completed' ? '완료' : '예정'} 금액</p>
            </div>
        </section>
    );
}

function FinanceModul() {

    // null: 모달 닫힘
    // documentId가 null이면 같은 제목의 문서 선택 화면
    const [scheduleDialog, setScheduleDialog] = useState(null);
    const [documentDetail, setDocumentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const detailDocumentId = scheduleDialog?.documentId ?? null;

    function openDocumentDetail(documentId) {
        const id = Number(documentId);

        if (!Number.isSafeInteger(id) || id <= 0) return;

        setDocumentDetail(null);
        setDetailError('');
        setDetailLoading(true);
        setScheduleDialog({
            documentId: id,
            candidates: []
        });
    }

    function closeScheduleDetail() {
        setScheduleDialog(null);
        setDocumentDetail(null);
        setDetailError('');
        setDetailLoading(false);
    }

    // 공용 달력의 일정 버튼 클릭을 부모에서 감지합니다.
    function handleCalendarClick(event) {
        if (!(event.target instanceof Element)) return;

        const button = event.target.closest('button.g-cal-bar');

        if (!button || !event.currentTarget.contains(button)) return;

        // 공용 달력의 기존 클릭 처리 대신 상세보기를 실행합니다.
        event.stopPropagation();

        const title = button.getAttribute('title');

        if (!title) return;

        const matches = (data?.schedules || []).filter(
            (schedule) => String(schedule.title) === title
        );

        // 문서 ID 기준으로 중복 제거
        const candidates = Array.from(
            new Map(
                matches.map((schedule) => [
                    String(schedule.id),
                    schedule
                ])
            ).values()
        );

        if (candidates.length === 0) return;

        if (candidates.length === 1) {
            openDocumentDetail(candidates[0].id);
            return;
        }

        // 제목이 같으면 임의로 문서를 열지 않고 선택하도록 합니다.
        setDocumentDetail(null);
        setDetailError('');
        setDetailLoading(false);
        setScheduleDialog({
            documentId: null,
            candidates
        });
    }

    useEffect(() => {
        if (detailDocumentId === null) return;

        const controller = new AbortController();

        async function loadDetail() {
            setDetailLoading(true);
            setDetailError('');

            try {
                const response = await fetch(
                    `${DASHBOARD_API}/schedules/${detailDocumentId}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        response.status === 404
                            ? '조회할 지급 문서를 찾을 수 없습니다.'
                            : '상세정보를 불러오지 못했습니다.'
                    );
                }

                const result = await response.json();

                if (!controller.signal.aborted) {
                    setDocumentDetail(result);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setDetailError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        }

        loadDetail();

        return () => controller.abort();
    }, [detailDocumentId]);


    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    // 입력 중인 조건과 실제 적용한 조건을 분리합니다. Enter로도 검색합니다.

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

    const [documentType, setDocumentType] = useState(null);
    const closeDocument = () => setDocumentType(null);

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
            {error && <div className="fd-error" role="alert">{error}</div>}
            {loading && <p role="status" className="subtext">재무 현황을 불러오는 중입니다.</p>}
            <div className="fd-top-row">
                {!loading && data && (
                    <section className="stats-section fd-stats" aria-label="재무 현황">
                        {stats.map(([key, label]) => (
                            <StatisticsCard
                                key={key}
                                title={label}
                                count={data.counts[key]}
                                stiyle={0}
                                color="var(--color-brand)"
                            />
                        ))}
                    </section>
                )}
                <section className="fd-documents fd-panel">
                    <h2>문서 작성</h2>
                    <div className="fd-document-grid">
                        {[
                            ['receipt', '영수증 작성'],
                            ['invoice', '청구서 작성'],
                            ['quote', '견적서 작성'],
                        ].map(([type, label]) => (
                            <button
                                type="button"
                                className="fd-document"
                                key={type}
                                onClick={() =>
                                    setDocumentType(type === 'quote' ? 'estimate' : type)
                                }
                            >
                                <DocumentIcon type={type} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
            <div className="fd-bottom">
                <section className="fd-calendar fd-panel">
                    <h2>재무 일정</h2>
                    <div className="fd-calendar-layout">
                        <div
                            className="fd-board"
                            onClickCapture={handleCalendarClick}
                        >
                            {loading ? <p className="fd-state subtext">지급 일정을 불러오는 중입니다.</p> : error ?
                                <p className="fd-state subtext">서버 연결 후 지급 일정을 확인할 수 있습니다.</p> :
                                <>
                                    <ScheduleBoard schedule={data?.schedules || []} />
                                    {!data?.schedules?.length && (
                                        <p className="fd-note subtext">
                                            등록된 지급 일정이 없습니다.
                                        </p>
                                    )}
                                </>}
                        </div>

                        {scheduleDialog && (
                            <div className="finance-registration-modal finance-schedule-detail">
                                <ModalBase
                                    title={
                                        detailDocumentId === null
                                            ? '조회할 지급 문서 선택'
                                            : '지급 일정 상세정보'
                                    }
                                    onClose={closeScheduleDetail}
                                    layout={
                                        <div aria-busy={detailLoading}>
                                            {/* 같은 제목의 문서가 여러 개인 경우 */}
                                            {detailDocumentId === null && (
                                                <>
                                                    <p className="finance-schedule-guide">
                                                        같은 제목의 일정이 여러 개입니다.
                                                        조회할 문서를 선택해주세요.
                                                    </p>

                                                    <div className="finance-schedule-choices">
                                                        {scheduleDialog.candidates.map((schedule) => (
                                                            <button
                                                                type="button"
                                                                key={schedule.id}
                                                                onClick={() => openDocumentDetail(schedule.id)}
                                                            >
                                                                <strong>{schedule.title}</strong>

                                                                <span>
                                                                    문서 번호: {schedule.id}
                                                                    {' · '}
                                                                    마감일: {schedule.start}
                                                                </span>

                                                                <span>{schedule.description}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {detailLoading && (
                                                <p role="status">
                                                    상세정보를 불러오는 중입니다.
                                                </p>
                                            )}

                                            {detailError && (
                                                <p role="alert">{detailError}</p>
                                            )}

                                            {detailDocumentId !== null &&
                                                !detailLoading &&
                                                !detailError &&
                                                documentDetail && (
                                                    <div className="table-shell">
                                                        <table className="finance-schedule-fields">
                                                            <tbody>
                                                                {[
                                                                    ['문서 번호', documentDetail.document_id],
                                                                    ['문서명', documentDetail.title],
                                                                    ['문서 구분', documentDetail.document_type],
                                                                    ['신청자', documentDetail.requester_name],
                                                                    ['신청 부서', documentDetail.department_name],
                                                                    ['마감일', documentDetail.due_date],
                                                                    ['결재 상태', documentDetail.approval_status],
                                                                    [
                                                                        '문서 금액',
                                                                        `${numberText(documentDetail.amount)}원`
                                                                    ],
                                                                    [
                                                                        '지급 완료',
                                                                        `${numberText(documentDetail.paid_amount)}원`
                                                                    ],
                                                                    [
                                                                        '남은 지급액',
                                                                        `${numberText(documentDetail.remaining_amount)}원`
                                                                    ],
                                                                    ['내용', documentDetail.content]
                                                                ].map(([label, value]) => (
                                                                    <tr key={label}>
                                                                        <th scope="row">{label}</th>
                                                                        <td>
                                                                            {value === '' || value == null
                                                                                ? '—'
                                                                                : value}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                            <div className="finance-schedule-actions">
                                                <button
                                                    type="button"
                                                    onClick={closeScheduleDetail}
                                                >
                                                    닫기
                                                </button>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                        )}

                    </div>
                </section>
                <div className="fd-summaries fd-panel">
                    <PaymentSummary title="지급총액" kind="completed" data={data} loading={loading} />
                    <PaymentSummary title="지급예정" kind="planned" data={data} loading={loading} />
                    <p className="fd-note subtext">지급예정: 승인된 결재 문서의 미지급 잔액 · 지급기한 기준</p>
                </div>
            </div>

            {documentType && (
                <div className="finance-document-modal">
                    <ModalBase
                        onClose={closeDocument}
                        layout={
                            <FinanceDocumentForm
                                key={documentType}
                                type={documentType}
                                onClose={closeDocument}
                            />
                        }
                    />
                </div>
            )}
        </div>
    );
}

export default FinanceModul;