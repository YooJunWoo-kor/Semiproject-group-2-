import React, { useEffect, useRef, useState } from 'react';
import { DOCUMENT_TYPES, localDate, currencyDigits, money, calculateRows, calculateTotals, printDocument, saveFinanceDocument, getDocumentPartners } from './financeDocumentUtils';
import './Finance.css';
import { getLoginUser } from '../../../../utils/authStorage';
import { API_BASE_URL } from '../../../../utils/authStorage';

let itemId = 0;
const newItem = () => ({ id: ++itemId, name: '', description: '', quantity: '1', unitPrice: '', taxRate: '10' });
const emptyParty = () => ({ name: '', email: '', address: '', city: '', country: '대한민국', phone: '', businessNumber: '' });
const initialDocument = type => ({
    business: emptyParty(), customer: emptyParty(),
    // 확정 번호는 저장 시 서버에서 발급합니다.
    number: '', partnerId: '',
    date: localDate(), extraDate: '', method: '계좌이체', currency: 'KRW',
    account: '', note: '', items: [newItem()],
});

function Field({ label, required, ...props }) {
    return <label className="fd-field"><span>{label}{required && <b aria-hidden="true"> *</b>}</span><input required={required} {...props} /></label>;
}

function PartyFields({ title, value, onChange, business = false }) {
    const field = (name, label, props = {}) => (
        <Field label={label} value={value[name]} onChange={e => onChange(name, e.target.value)} maxLength={name === 'address' ? 200 : 100} {...props} />
    );
    return <section className="fd-card">
        <h3>{title}</h3>
        <div className="fd-grid">
            {field('name', business ? '회사명 / 이름' : '고객명 / 회사명', { required: true })}
            {field('email', '이메일', { type: 'email', placeholder: 'example@company.com' })}
            {field('address', '주소')}
            {field('city', '도시')}
            {field('country', '국가')}
            {field('phone', '전화번호', { type: 'tel' })}
            {field('businessNumber', '사업자등록번호', { placeholder: '000-00-00000' })}
        </div>
    </section>;
}

function PartyPreview({ title, party }) {
    return <div>
        <h2>{title}</h2>
        <p className="fdp-name">{party.name || '회사명 / 고객명'}</p>
        {party.businessNumber && <p>사업자번호 {party.businessNumber}</p>}
        {(party.address || party.city || party.country) && <p>{[party.address, party.city, party.country].filter(Boolean).join(' ')}</p>}
        {party.phone && <p>{party.phone}</p>}
        {party.email && <p>{party.email}</p>}
    </div>;
}

export default function FinanceDocumentForm({ type = 'receipt', onClose, storedDocument = null, onBusyChange }) {
    const config = DOCUMENT_TYPES[type] || DOCUMENT_TYPES.receipt;
    const [savedDocument, setSavedDocument] = useState(storedDocument);
    const [data, setData] = useState(() => storedDocument
        ? { ...storedDocument.snapshot_json.data, number: storedDocument.document_number }
        : initialDocument(DOCUMENT_TYPES[type] ? type : 'receipt'));
    const [saving, setSaving] = useState(false);
    const [storageError, setStorageError] = useState('');
    const [partners, setPartners] = useState([]);
    const [partnerError, setPartnerError] = useState('');
    const saveLock = useRef(false);
    const mounted = useRef(true);
    const readOnly = Boolean(savedDocument);

    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        if (readOnly) return;
        const controller = new AbortController();
        getDocumentPartners(controller.signal).then(value => {
            if (!controller.signal.aborted) {
                if (!Array.isArray(value)) throw new Error('거래처 목록 형식을 확인해주세요.');
                setPartners(value);
            }
        }).catch(error => {
            if (error.name !== 'AbortError') setPartnerError('거래처 목록을 불러오지 못했습니다. 고객 정보 직접 입력은 가능합니다.');
        });
        return () => controller.abort();
    }, [readOnly]);
    const formRef = useRef(null);
    const previewRef = useRef(null);
    const rows = calculateRows(data.items, data.currency);
    const totals = calculateTotals(rows, data.currency);
    const format = value => money(value, data.currency);
    const update = (key, value) => setData(old => ({ ...old, [key]: value }));
    const updateParty = key => (field, value) => setData(old => ({ ...old, [key]: { ...old[key], [field]: value } }));
    const updateItem = (id, key, value) => setData(old => ({ ...old, items: old.items.map(item => item.id === id ? { ...item, [key]: value } : item) }));
    const loginUser = getLoginUser();
    const employeeName = savedDocument?.snapshot_json?.author?.name || loginUser?.name || '담당자 미정';
    const [openedDate] = useState(() => localDate());
    const nowDate = savedDocument?.snapshot_json?.createdDate || openedDate;

    async function handleSave() {
        if (saveLock.current || savedDocument) return;
        if (!formRef.current.reportValidity()) return;
        if (!loginUser?.employee_id) { setStorageError('로그인한 사원 정보를 확인할 수 없습니다. 다시 로그인해주세요.'); return; }
        saveLock.current = true;
        setSaving(true);
        setStorageError('');
        onBusyChange?.(true);
        try {
            const result = await saveFinanceDocument({ document_type: type,
                employee_id: loginUser.employee_id, partner_id: data.partnerId || null, data });
            if (mounted.current) {
                setData({ ...result.document.snapshot_json.data, number: result.document.document_number });
                setSavedDocument(result.document);
            }
        } catch (error) {
            if (mounted.current) setStorageError(`${error.message} 응답을 받지 못한 경우 재시도 전에 저장 문서 목록에서 저장 여부를 확인해주세요.`);
        } finally {
            saveLock.current = false;
            if (mounted.current) setSaving(false);
            onBusyChange?.(false);
        }
    }

    function handlePrint() {
        if (!savedDocument || saving) return;
        try { printDocument(previewRef.current, `${config.title}_${savedDocument.document_number}`); }
        catch (error) { setStorageError(error.message || '인쇄 창을 열지 못했습니다. 브라우저 설정을 확인해주세요.'); }
    }

    function selectPartner(event) {
        const id = event.target.value;
        const partner = partners.find(value => String(value.partner_id) === id);
        setData(old => ({ ...old, partnerId: id,
            customer: partner ? { ...emptyParty(), name: partner.company_name || '',
                address: partner.company_address || '', phone: partner.company_phone || '',
                businessNumber: partner.tax_id || '' } : old.customer }));
    }

    return <div className="finance-document-form">
        <header className="fd-header">
            <div><span className="fd-eyebrow">FINANCE DOCUMENT</span><h2>{config.title} {readOnly ? '조회' : '작성'}</h2><p>{readOnly ? '저장 당시의 문서 내용입니다.' : '정보 입력 후 저장하면 문서 번호가 발급됩니다.'}</p></div>
            {onClose && <button
                type="button"
                className="finance-document-close"
                onClick={onClose}
                disabled={saving}
                aria-label="닫기"
            >
                ✕
            </button>}
        </header>
        <div className="fd-layout">
            <form ref={formRef} className="fd-editor" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <fieldset className="fd-storage-fields" disabled={saving || readOnly}>
                <PartyFields title="01  사업자 정보" value={data.business} onChange={updateParty('business')} business />
                <section className="fd-card">
                    <h3>고객 정보 입력 방식</h3>
                    {readOnly ? <p className="fd-storage-info subtext">{savedDocument.partner_id ? '기존 거래처와 연결된 문서' : '고객 정보를 직접 입력한 문서'}</p> : <>
                        <label className="fd-field fd-partner-select"><span>기존 거래처 선택 (선택사항)</span>
                            <select value={data.partnerId} onChange={selectPartner}>
                                <option value="">미등록 고객 / 직접 입력</option>
                                {partners.map(partner => <option key={partner.partner_id} value={String(partner.partner_id)}>{partner.company_name} (#{partner.partner_id})</option>)}
                            </select>
                        </label>
                        {partnerError && <p className="fd-storage-info subtext">{partnerError}</p>}
                        <p className="fd-storage-info subtext">거래처를 등록하지 않아도 고객 정보를 직접 입력해 저장할 수 있습니다.</p>
                    </>}
                </section>
                <PartyFields title={`02  ${config.party} 정보`} value={data.customer} onChange={updateParty('customer')} />
                <section className="fd-card">
                    <h3>03  {config.title} 상세</h3>
                    <div className="fd-grid">
                        <Field label={`${config.title} 번호`} value={data.number} readOnly placeholder="저장 시 자동 발급" />
                        <Field label={config.date} type="date" required value={data.date} onChange={e => update('date', e.target.value)} />
                        {config.extraDate && <Field label={config.extraDate} type="date" min={data.date} required value={data.extraDate} onChange={e => update('extraDate', e.target.value)} />}
                        <label className="fd-field"><span>통화</span><select value={data.currency} onChange={e => update('currency', e.target.value)}><option value="KRW">KRW — 원</option><option value="USD">USD — 달러</option><option value="EUR">EUR — 유로</option><option value="JPY">JPY — 엔</option></select></label>
                        {type !== 'estimate' && <label className="fd-field"><span>{type === 'receipt' ? '결제 방법' : '지급 방법'}</span><select value={data.method} onChange={e => update('method', e.target.value)}><option>계좌이체</option><option>카드</option><option>현금</option><option>기타</option></select></label>}
                        {type === 'invoice' && <Field label="입금 계좌 / 지급 안내" value={data.account} maxLength={200} onChange={e => update('account', e.target.value)} />}
                    </div>
                </section>
                <section className="fd-card">
                    <div className="fd-section-title"><h3>04  품목</h3><span>부가세 별도</span></div>
                    {rows.map((item, index) => <div className="fd-item" key={item.id}>
                        <div className="fd-item-title"><strong>품목 {index + 1}</strong><button type="button" className="fd-text-button" disabled={rows.length === 1} onClick={() => update('items', data.items.filter(row => row.id !== item.id))} aria-label={`품목 ${index + 1} 삭제`}>삭제</button></div>
                        <Field label="품목명" required maxLength={150} value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="예: 화장품 샘플 제작" />
                        <div className="fd-item-numbers">
                            <Field label="수량" type="number" min="0.001" max="1000000" step="0.001" required value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                            <Field label="단가" type="number" min="0" max="1000000000" step={10 ** -currencyDigits(data.currency)} required value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} />
                            <Field label="세율 (%)" type="number" min="0" max="100" step="0.01" required value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', e.target.value)} />
                        </div>
                        <Field label="추가 설명 (선택)" value={item.description} maxLength={300} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                        <p className="fd-item-total">품목 합계 <strong>{format(item.total)}</strong></p>
                    </div>)}
                    <button type="button" className="fd-secondary" disabled={data.items.length >= 50} onClick={() => update('items', [...data.items, newItem()])}>＋ 품목 추가</button>
                </section>
                <section className="fd-card"><h3>05  비고</h3><label className="fd-field"><span>안내 사항 / 추가 메모</span><textarea rows={4} maxLength={2000} value={data.note} onChange={e => update('note', e.target.value)} placeholder="거래 조건, 감사 인사 등을 입력해주세요." /></label></section>
                </fieldset>
            </form>
            <aside className="fd-side">
                <section className="fd-preview-card">
                    <div className="fd-section-title">
                        <h3>실시간 미리보기</h3>
                        <span>A4 문서</span>
                    </div>

                    <div className="fd-paper-scroll">
                        <article
                            className="finance-doc-paper"
                            ref={previewRef}
                            aria-label={`${config.title} 미리보기`}
                        >
                            <div className="fdp-head">
                                <div>
                                    <div className="fdp-muted">{config.en}</div>
                                    <h1>{config.title}</h1>
                                </div>

                                <div className="fdp-meta">
                                    <strong>{data.number || '저장 전'}</strong>
                                    <p>{config.date} {data.date}</p>

                                    {config.extraDate && (
                                        <p>
                                            {config.extraDate} {data.extraDate || '미입력'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="fdp-parties">
                                <PartyPreview
                                    title="공급자"
                                    party={data.business}
                                />
                                <PartyPreview
                                    title={config.party}
                                    party={data.customer}
                                />
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">품목 / 설명</th>
                                        <th scope="col">수량</th>
                                        <th scope="col">단가</th>
                                        <th scope="col">세율</th>
                                        <th scope="col">합계</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                {item.name || '품목명'}

                                                {item.description && (
                                                    <div className="fdp-description">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{item.quantity || '0'}</td>
                                            <td>
                                                {format(Number(item.unitPrice || 0))}
                                            </td>
                                            <td>{item.taxRate || '0'}%</td>
                                            <td>{format(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 문서 금액 합계 */}
                            <div className="fdp-totals">
                                <p>
                                    <span>공급가액</span>
                                    <span>{format(totals.supply)}</span>
                                </p>
                                <p>
                                    <span>부가세</span>
                                    <span>{format(totals.tax)}</span>
                                </p>
                                <p className="fdp-grand">
                                    <span>{config.total}</span>
                                    <span>{format(totals.total)}</span>
                                </p>
                            </div>

                            {/* 비고 */}
                            {data.note && (
                                <div className="fdp-note">
                                    <h2>비고</h2>
                                    <p>{data.note}</p>
                                </div>
                            )}

                            {/* 청구서에만 표시 */}
                            {type === 'invoice' && (
                                <div>
                                    <p>지급 방법: {data.method}</p>
                                    <p>아래 계좌로 입금 부탁드립니다.</p>

                                    {data.account && (
                                        <p>입금 계좌 / 지급 안내: {data.account}</p>
                                    )}
                                </div>
                            )}

                            {/* 모든 문서에 표시 */}
                            <div className="fdp-footer">
                                <p>회사명: {data.business.name || '회사명 미정'}</p>
                                <p>담당 사원: {employeeName}</p>
                                <p>작성일: {nowDate}</p>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="fd-summary">
                    <h3>{config.title} 요약</h3>

                    <p>
                        <span>공급가액</span>
                        <strong>{format(totals.supply)}</strong>
                    </p>
                    <p>
                        <span>부가세</span>
                        <strong>{format(totals.tax)}</strong>
                    </p>
                    <p className="fd-summary-total">
                        <span>{config.total}</span>
                        <strong>{format(totals.total)}</strong>
                    </p>

                    {!readOnly && <button type="button" className="fd-primary fd-save-button erp-primary-button" disabled={saving} onClick={handleSave}>
                        {saving ? '저장 중…' : '문서 저장'}
                    </button>}
                    {savedDocument && <p className="fd-storage-success" role="status">저장 완료 · {savedDocument.document_number}</p>}
                    {storageError && <p className="fd-storage-error" role="alert">{storageError}</p>}

                    <button
                        type="button"
                        className="fd-primary erp-primary-button"
                        onClick={handlePrint}
                        disabled={!readOnly || saving}
                    >
                        인쇄 / PDF 저장
                    </button>

                    <small>
                        인쇄 창의 대상을 ‘PDF로 저장’으로 선택해주세요.
                    </small>
                </section>

                <p className="fd-draft-note subtext">
                    {readOnly
                        ? '저장된 문서는 조회 전용입니다. 문서 목록에서 다시 열어 출력할 수 있습니다.'
                        : '문서 저장 후 인쇄하거나 PDF로 저장할 수 있습니다.'}
                </p>
            </aside>
        </div>
    </div>;
}
