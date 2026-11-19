const queries = require("../../queries/finance/documentQueries");
const companyQueries = require("../../queries/finance/companyQueries");
const express = require("express");
const db = require("../../db");
const financeMysql = require("mysql2/promise");

const router = express.Router();

// 영수증·청구서·견적서 보관: 실제 거래/결재/지급과 별도로 저장합니다.
const financeDocumentTypes = { receipt: 'REC', invoice: 'INV', estimate: 'EST' };
const financeDocumentCurrencies = { KRW: 0, USD: 2, EUR: 2, JPY: 0 };
const financeDocumentSelect = queries.selectFinanceDocuments;

function financeDocumentFail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function financeDocumentText(value, label, max, required = false) {
    if (value == null && !required) return '';
    if (typeof value !== 'string') financeDocumentFail(400, `${label}은 문자로 입력해주세요.`);
    const text = value.trim();
    if ((required && !text) || text.length > max) financeDocumentFail(400, `${label}을 확인해주세요. (최대 ${max}자)`);
    return text;
}

function financeDocumentDate(value, label, optional = false) {
    if (optional && (value == null || value === '')) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) financeDocumentFail(400, `${label}을 확인해주세요.`);
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1000-01-01') financeDocumentFail(400, `${label}이 올바른 날짜가 아닙니다.`);
    return value;
}

function financeDocumentId(value, label, optional = false) {
    if (optional && (value == null || value === '')) return null;
    const text = String(value ?? '');
    if (!/^[1-9]\d*$/.test(text) || text.length > 20 || BigInt(text) > 18446744073709551615n) financeDocumentFail(400, `${label}이 올바르지 않습니다.`);
    return text;
}

// 소수 계산은 정수 단위로 처리하여 미리보기와 저장 금액의 반올림을 맞춥니다.
function financeDocumentScaled(value, digits, label, max, allowZero = true) {
    if (typeof value !== 'string' && typeof value !== 'number') financeDocumentFail(400, `${label}을 확인해주세요.`);
    const text = String(value);
    if (text.length > 40 || !/^\d+(?:\.\d+)?$/.test(text)) financeDocumentFail(400, `${label}은 일반 숫자 형식으로 입력해주세요.`);
    const [whole, rawFraction = ''] = text.split('.');
    const fraction = rawFraction.replace(/0+$/, '');
    if (fraction.length > digits) financeDocumentFail(400, `${label}은 소수점 ${digits}자리까지 입력할 수 있습니다.`);
    const scaled = BigInt(whole) * (10n ** BigInt(digits)) + BigInt(fraction.padEnd(digits, '0') || '0');
    if ((!allowZero && scaled === 0n) || scaled > BigInt(max) * (10n ** BigInt(digits))) financeDocumentFail(400, `${label}의 입력 범위를 확인해주세요.`);
    return scaled;
}

function financeDocumentDecimal(value, digits) {
    if (!digits) return value.toString();
    const text = value.toString().padStart(digits + 1, '0');
    return `${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

function financeDocumentParty(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) financeDocumentFail(400, `${label}를 입력해주세요.`);
    const fields = { name: 100, email: 100, address: 200, city: 100, country: 100, phone: 100, businessNumber: 100 };
    const party = Object.fromEntries(Object.entries(fields).map(([key, max]) => [key,
        financeDocumentText(value[key], `${label} ${key === 'name' ? '이름' : key}`, max, key === 'name')]));
    if (party.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email)) financeDocumentFail(400, `${label} 이메일을 확인해주세요.`);
    return party;
}

// [회사 정보 DB 연동] 새 문서의 공급자 정보는 company_info에서 조회합니다.
async function documentBusiness() {
    const rows = await new Promise((resolve, reject) => {
        db.query(companyQueries.selectDocumentBusiness, [], (error, rows) => error ? reject(error) : resolve(rows));
    });
    if (!rows.length) financeDocumentFail(400, 'company_info 테이블에 회사 기본정보를 먼저 등록해주세요.');
    return financeDocumentParty(rows[0], '회사 기본정보');
}

router.get('/document-business', async (req, res) => {
    try { return res.json(await documentBusiness()); }
    catch (error) { return financeDocumentError(res, error); }
});

function financeDocumentPayload(body, business) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) financeDocumentFail(400, '문서 입력값을 확인해주세요.');
    const type = body.document_type;
    if (!Object.prototype.hasOwnProperty.call(financeDocumentTypes, type)) financeDocumentFail(400, '문서 종류를 확인해주세요.');
    const raw = body.data;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) financeDocumentFail(400, '문서 내용이 없습니다.');
    const currency = raw.currency;
    if (!Object.prototype.hasOwnProperty.call(financeDocumentCurrencies, currency)) financeDocumentFail(400, '지원하지 않는 통화입니다.');
    const digits = financeDocumentCurrencies[currency];
    const date = financeDocumentDate(raw.date, '발행일');
    const extraDate = type === 'receipt' ? null : financeDocumentDate(raw.extraDate, type === 'invoice' ? '지급 기한' : '견적 유효기한');
    if (extraDate && extraDate < date) financeDocumentFail(400, '기한은 발행일 이후로 입력해주세요.');
    if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 50) financeDocumentFail(400, '품목은 1~50개까지 저장할 수 있습니다.');
    let supplyMinor = 0n;
    let taxMinor = 0n;
    const items = raw.items.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) financeDocumentFail(400, '품목 정보를 확인해주세요.');
        if (!/^[1-9]\d*$/.test(String(item.quantity))) financeDocumentFail(400, '수량은 1 이상의 정수로 입력해주세요.');
        const quantity = financeDocumentScaled(item.quantity, 0, '수량', 1000000, false);
        const price = financeDocumentScaled(item.unitPrice, digits, '단가', 1000000000);
        const rate = financeDocumentScaled(item.taxRate, 2, '세율', 100);
        const supply = quantity * price;
        const tax = (supply * rate + 5000n) / 10000n;
        supplyMinor += supply;
        taxMinor += tax;
        return {
            id: index + 1,
            name: financeDocumentText(item.name, '품목명', 150, true),
            description: financeDocumentText(item.description, '품목 설명', 300),
            quantity: financeDocumentDecimal(quantity, 0),
            unitPrice: financeDocumentDecimal(price, digits),
            taxRate: financeDocumentDecimal(rate, 2)
        };
    });
    const totalMinor = supplyMinor + taxMinor;
    if (totalMinor > 99999999999999n) financeDocumentFail(400, '문서 합계가 저장 가능한 범위를 초과했습니다. 품목 수량과 단가를 확인해주세요.');
    const method = raw.method == null ? '계좌이체' : raw.method;
    if (!['계좌이체', '카드', '현금', '기타'].includes(method)) financeDocumentFail(400, '결제 방법을 확인해주세요.');
    return {
        type, partnerId: financeDocumentId(body.partner_id, '거래처 ID', true),
        data: {
            business, customer: financeDocumentParty(raw.customer, '고객 정보'),
            date, extraDate: extraDate || '', currency, method,
            account: financeDocumentText(raw.account, '입금 계좌 안내', 200),
            note: financeDocumentText(raw.note, '비고', 2000), items
        },
        totals: { supply: financeDocumentDecimal(supplyMinor, digits), tax: financeDocumentDecimal(taxMinor, digits), total: financeDocumentDecimal(totalMinor, digits) }
    };
}

function financeDocumentDecode(row) {
    let snapshot = row.snapshot_json;
    if (Buffer.isBuffer(snapshot)) snapshot = snapshot.toString('utf8');
    if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
    if (!snapshot || snapshot.version !== 1 || !snapshot.data || !Array.isArray(snapshot.data.items)) financeDocumentFail(500, '저장 문서의 형식을 확인해주세요.');
    return { ...row, snapshot_json: snapshot };
}

function financeDocumentError(res, error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ER_NO_SUCH_TABLE' && /company_info/.test(error.sqlMessage || error.message || '')) {
        return res.status(500).json({ message: 'company_info 테이블이 없습니다. 회사 정보 테이블을 먼저 생성해주세요.' });
    }
    console.error('재무 문서 보관 오류:', error);
    return res.status(500).json({ message: '문서를 처리하지 못했습니다. finance_documents 테이블과 서버 연결을 확인해주세요.' });
}

// 목록은 문서 번호, 작성 당시 고객명/담당자 이름으로 검색합니다.
router.get('/documents', async (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);
        if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) financeDocumentFail(400, '조회 페이지를 확인해주세요.');
        const type = req.query.type || '';
        if (type && !Object.prototype.hasOwnProperty.call(financeDocumentTypes, type)) financeDocumentFail(400, '문서 종류를 확인해주세요.');
        const search = financeDocumentText(req.query.search ?? '', '검색어', 100);
        const where = [];
        const params = [];
        if (type) { where.push(queries.fSummary); params.push(type); }
        if (search) {
            where.push(queries.querySummary);
            params.push(search, search, search);
        }
        const filter = where.length ? queries.whereSummary(where.join(' AND ')) : '';
        const query = (sql, values) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
        const counts = await query(queries.selectFinanceDocuments2(filter), params);
        const rows = await query(queries.selectFinanceDocuments3(filter), [...params, limit, (page - 1) * limit]);
        return res.json({ items: rows, total: Number(counts[0].total), page, limit });
    } catch (error) { return financeDocumentError(res, error); }
});

router.get('/documents/:docId', (req, res) => {
    let id;
    try { id = financeDocumentId(req.params.docId, '문서 ID'); }
    catch (error) { return financeDocumentError(res, error); }
    db.query(queries.whereSummary2(financeDocumentSelect), [id], (error, rows) => {
        if (error) return financeDocumentError(res, error);
        if (!rows.length) return res.status(404).json({ message: '저장 문서를 찾을 수 없습니다.' });
        try { return res.json(financeDocumentDecode(rows[0])); }
        catch (decodeError) { return financeDocumentError(res, decodeError); }
    });
});

router.post('/documents', async (req, res) => {
    let connection;
    try {
        // [회사 정보 DB 연동] 클라이언트의 공급자 값 대신 DB 값을 문서에 저장합니다.
        const payload = financeDocumentPayload(req.body, await documentBusiness());
        // 제공된 기존 API와 동일한 사원 ID 전달 방식입니다.
        // 서버 인증 미들웨어가 있다면 인증된 req.user.employee_id를 우선 사용합니다.
        const employeeId = financeDocumentId(req.user?.employee_id ?? req.body.employee_id, '작성 사원 ID');
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
            supportBigNumbers: true, bigNumberStrings: true
        });
        await connection.beginTransaction();
        const [employees] = await connection.execute(queries.selectEmployees, [employeeId]);
        if (!employees.length) financeDocumentFail(400, '작성 사원을 찾을 수 없습니다. 다시 로그인해주세요.');
        if (payload.partnerId !== null) {
            const [partners] = await connection.execute(queries.selectPartners, [payload.partnerId]);
            if (!partners.length) financeDocumentFail(400, '선택한 거래처가 없습니다. 거래처 목록을 다시 불러오거나 직접 입력으로 변경해주세요.');
        }
        // 저장 직전에도 계좌 상태를 확인하여 중지 계좌 선택을 차단합니다.
        if (payload.type === 'invoice' && payload.data.method === '계좌이체') {
            const accountId = financeDocumentId(req.body.data.accountId, '입금 계좌');
            const [accounts] = await connection.execute(
                'SELECT bank_name, account_number, account_name FROM bank_accounts WHERE account_id = ? AND account_status IN (?, ?) FOR UPDATE',
                [accountId, '사용', 'ACTIVE']);
            if (!accounts.length) financeDocumentFail(400, '사용 가능한 입금 계좌를 다시 선택해주세요.');
            const account = accounts[0];
            payload.data.accountId = accountId;
            payload.data.account = [account.bank_name, account.account_number, account.account_name].filter(Boolean).join(' / ');
        } else {
            payload.data.account = '';
        }
        const createdDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const snapshot = {
            version: 1, type: payload.type, data: payload.data, totals: payload.totals,
            author: { employee_id: employeeId, name: employees[0].name }, createdDate
        };
        // NOT NULL + UNIQUE를 유지하면서, 확정 번호를 같은 트랜잭션 안에서 발급합니다.
        const temporaryNumber = 'TMP-' + require('crypto').randomBytes(12).toString('hex');
        const [insert] = await connection.execute(queries.insertFinanceDocuments,
            [temporaryNumber, payload.type, employeeId, payload.partnerId, payload.data.date, payload.data.extraDate || null,
                payload.data.currency, payload.totals.total, JSON.stringify(snapshot)]);
        const id = String(insert.insertId);
        financeDocumentId(id, '생성 문서 ID');
        const documentNumber = `${financeDocumentTypes[payload.type]}-${id.padStart(6, '0')}`;
        snapshot.data.number = documentNumber;
        snapshot.data.partnerId = payload.partnerId || '';
        await connection.execute(queries.updateFinanceDocuments,
            [documentNumber, JSON.stringify(snapshot), id]);
        const [rows] = await connection.execute(queries.whereSummary3(financeDocumentSelect), [id]);
        const document = financeDocumentDecode(rows[0]);
        await connection.commit();
        return res.status(201).json({ message: '문서가 저장되었습니다.', document });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rollbackError) { console.error('재무 문서 롤백 실패:', rollbackError); } }
        return financeDocumentError(res, error);
    } finally {
        if (connection) { try { await connection.end(); } catch (closeError) { console.error('재무 문서 DB 연결 종료 실패:', closeError); } }
    }
});



module.exports = router;
