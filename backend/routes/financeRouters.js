// backend/routers/financeRouters.js
const express = require("express");
const db = require("../db");
const financeMysql = require("mysql2/promise");



const router = express.Router();

// 승인 기안서를 조회용 재무 목록 형식으로 변환합니다. DB에 복제하지 않습니다.
function readDetailData(value) {
    if (Buffer.isBuffer(value)) value = value.toString('utf8');
    if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { return {}; }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readAmount(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^[1-9]\d*(?:\.0+)?$/.test(value.trim())) return null;
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function readDueDate(value) {
    if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function toApprovedDraftView(rows) {
    const seen = new Set();
    return rows.filter((row) => {
        const id = String(row.draft_id ?? '');
        if (row.status !== 'APPROVED' || !/^[1-9]\d*$/.test(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
    }).map((row) => {
        const detail = readDetailData(row.detail_data);
        return {
            document_id: `draft-${row.draft_id}`,
            source_type: 'draft', source_draft_id: row.draft_id,
            is_payroll_draft: Number(row.is_payroll_draft) === 1,
            linked_transaction_id: row.linked_transaction_id ?? null,
            employee_id: row.employee_id,
            requester_name: row.requester_name,
            department_name: row.department_name,
            title: row.title, content: row.content || '',
            amount: readAmount(row.expense_amount ?? detail.amount),
            due_date: readDueDate(detail.due_date),
            approval_status: '승인', document_type: row.document_type,
            created_at: row.created_at,
            payment_methods: '', attachment_count: 0
        };
    });
}


// 연결 거래에서 완료한 지급도 원본 결재의 남은 지급액에 반영합니다.
const approvalPaidRowsSql = `
    SELECT document_id, amount FROM payments
    WHERE document_id IS NOT NULL AND payment_status = '완료' AND payment_direction = '출금'
    UNION ALL
    SELECT link.source_id AS document_id, p.amount
    FROM payments p
    INNER JOIN trade_transactions link ON link.transaction_id = p.transaction_id AND link.source_type = 'approval'
    WHERE p.payment_status = '완료' AND p.payment_direction = '출금'`;

// 결제 관리의 분류와 기간 계산. 금액은 실제 payments 완료 내역을 기준으로 집계합니다.
const expenseGroups = [
    ['production', '제품 생산 및 매입 비용', ['원재료비', '부자재비', '완제품 매입비', '외주가공비', '물류 및 보관비']],
    ['research', '연구개발 및 인증 비용', ['제품 연구개발비', '샘플 제작비', '시험·검사비', '인증·등록비']],
    ['marketing', '마케팅 및 유통 판매비', ['광고비', '콘텐츠 제작비', '인플루언서 협찬비', '판매 수수료', '배송비', '프로모션비']],
    ['administration', '일반 관리 및 인건비', ['급여', '복리후생비', '임차료', '공과금', '사무용품비', '시스템 이용료']],
    ['other', '기타', ['기타 지출']]
];
// 수입 분류는 기본안이며 회사 기준에 맞게 이 목록에서 변경할 수 있습니다.
const incomeGroups = [
    ['sales', '제품 매출', ['도매 매출', '소매 매출', '온라인 매출']],
    ['other_income', '기타 수입', ['환급금', '기타 수입']]
];
function groups(direction) {
    const prefix = direction === '출금' ? 'expense' : 'income';
    const source = direction === '출금' ? expenseGroups : incomeGroups;
    return [...source.map(([id, label, names]) => ({
        id, label,
        items: names.map((name, index) => ({ code: `${prefix}_${id}_${index + 1}`, label: name }))
    })), { id: 'unclassified', label: '미분류', items: [{ code: 'unclassified', label: '미분류' }] }];
}
function category(code, direction) {
    for (const group of groups(direction)) {
        const item = group.items.find(entry => entry.code === code);
        if (item) return { ...item, group_id: group.id, group_label: group.label };
    }
    return null;
}
function seoulToday() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function dateString(year, monthIndex, day) {
    return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}
function period(month, today = seoulToday()) {
    if (typeof month !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) || month > '9998-12') {
        const error = new Error('올바른 조회 월을 선택해 주세요.'); error.status = 400; throw error;
    }
    const [year, number] = month.split('-').map(Number);
    const index = number - 1;
    const currentMonth = today.slice(0, 7) === month;
    const lastDay = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const previousLastDay = new Date(Date.UTC(year, index, 0)).getUTCDate();
    const day = currentMonth ? Number(today.slice(8, 10)) : lastDay;
    // 완료 월은 전월 전체, 진행 중인 월은 전월 동일 일수(말일 이내)와 비교합니다.
    const previousDay = currentMonth ? Math.min(day, previousLastDay) : previousLastDay;
    return {
        start: `${month}-01`, end: dateString(year, index, day),
        endExclusive: dateString(year, index, day + 1), monthEndExclusive: dateString(year, index + 1, 1),
        previousStart: dateString(year, index - 1, 1), previousEnd: dateString(year, index - 1, previousDay),
        previousEndExclusive: dateString(year, index - 1, previousDay + 1), currentMonth
    };
}
function amount(value) {
    const number = Number(value);
    if (value == null || !Number.isFinite(number) || number < 0 || Math.abs(number * 100 - Math.round(number * 100)) > 0.001 || !Number.isSafeInteger(Math.round(number * 100))) {
        throw new Error('집계 금액이 처리 가능한 범위를 초과했습니다.');
    }
    return number;
}
function sum(rows) {
    let minor = 0;
    for (const row of rows) {
        minor += Math.round(amount(row.amount) * 100);
        if (!Number.isSafeInteger(minor)) throw new Error('합계 금액이 처리 가능한 범위를 초과했습니다.');
    }
    return minor / 100;
}
function summary(entries, previousEntries, scheduled) {
    const total = sum(entries), previous = sum(previousEntries);
    return {
        total, scheduled: sum(scheduled), previous_total: previous,
        difference: Math.round((total - previous) * 100) / 100,
        change_percent: previous === 0 ? null : Math.round((total - previous) / previous * 1000) / 10
    };
}


// 거래처 달력 색상의 종류 ID. 빈 값은 기존 입금/출금 기본 색상을 사용합니다.
function parsePartnerCalendarTypeId(value) {
    if (value === undefined || value === null || value === "") return null;
    if (!((typeof value === "number" && Number.isInteger(value)) ||
        (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)))) return undefined;
    const typeId = Number(value);
    return Number.isInteger(typeId) && typeId >= 0 && typeId <= 255 ? typeId : undefined;
}

// [재무관리] 거래처 목록 조회
router.get("/partners", (req, res) => {
    const query = `
SELECT
p.*,
COALESCE(b.receivable_amount, 0) AS receivable_amount,
COALESCE(b.payable_amount, 0) AS payable_amount,
COALESCE(b.missing_items, 0) AS missing_items
FROM partners p
LEFT JOIN (
SELECT
t.partner_id,
SUM(CASE WHEN t.trade_type='매출'
THEN i.total_amount - COALESCE(pay.income_amount, 0)
ELSE 0 END) AS receivable_amount,
SUM(CASE WHEN t.trade_type='매입'
THEN i.total_amount - COALESCE(pay.expense_amount, 0)
ELSE 0 END) AS payable_amount,
SUM(CASE WHEN i.transaction_id IS NULL THEN 1 ELSE 0 END) AS missing_items
FROM trade_transactions t
LEFT JOIN (
SELECT transaction_id, SUM(supply_price + vat) AS total_amount
FROM trade_items
GROUP BY transaction_id
) i ON t.transaction_id=i.transaction_id
LEFT JOIN (
SELECT
transaction_id,
SUM(CASE WHEN payment_direction='입금' THEN amount ELSE 0 END) AS income_amount,
SUM(CASE WHEN payment_direction='출금' THEN amount ELSE 0 END) AS expense_amount
FROM payments
WHERE payment_status='완료'
GROUP BY transaction_id
) pay ON t.transaction_id=pay.transaction_id
GROUP BY t.partner_id
) b ON p.partner_id=b.partner_id
ORDER BY p.partner_id DESC
`;
    //receivable_amount:매출 거래에서 앞으로 받을 금액
    //payable_amount:매입 거래에서 앞으로 지급할 금액
    //missing_items:품목이 없어 금액 계산을 확인해야 하는 거래 수

    db.query(query, (err, rows) => {
        if (err) {
            console.error("거래처 목록 조회 오류:", err);

            return res.status(500).json({
                message: "거래처 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// [재무관리] 신규 거래처 등록
router.post("/partners", (req, res) => {
    const {
        company_name,
        tax_id,
        representative_name,
        company_phone,
        company_address,
        memo,
        trade_role,
        company_type,
        closing_day,
        calendar_type_id,
        bank_name,
        account_number,
        account_holder
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function optionalText(value) {
        return typeof value === "string" && value.trim() !== ""
            ? value.trim()
            : null;
    }

    const companyName = optionalText(company_name);

    // 회사명은 필수 항목
    if (!companyName) {
        return res.status(400).json({
            message: "거래처명을 입력해 주세요."
        });
    }

    // 거래 구분은 현재 사용하는 DB 값에 맞춥니다.
    if (trade_role !== "매입" && trade_role !== "매출") {
        return res.status(400).json({
            message: "거래 구분을 매입 또는 매출로 선택해 주세요."
        });
    }

    // 마감일을 입력하지 않으면 NULL로 저장
    const closingDay =
        closing_day === "" || closing_day == null
            ? null
            : Number(closing_day);

    if (
        closingDay !== null &&
        (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
    ) {
        return res.status(400).json({
            message: "마감일은 1~31 사이의 정수로 입력해 주세요."
        });
    }

    const calendarTypeId = parsePartnerCalendarTypeId(calendar_type_id);
    if (calendarTypeId === undefined) {
        return res.status(400).json({ message: "일정 색상 값이 올바르지 않습니다." });
    }

    const query = `
INSERT INTO partners (
company_name, tax_id, representative_name, company_phone,
company_address, memo, trade_role, company_type,
closing_day, bank_name, account_number, account_holder, calendar_type_id
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    const values = [
        companyName,
        optionalText(tax_id),
        optionalText(representative_name),
        optionalText(company_phone),
        optionalText(company_address),
        optionalText(memo),
        trade_role,
        optionalText(company_type),
        closingDay,
        optionalText(bank_name),
        optionalText(account_number),
        optionalText(account_holder),
        calendarTypeId
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("거래처 등록 오류:", err);

            // 사업자번호의 UNIQUE 제약조건에 걸린 경우
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 사업자번호입니다."
                });
            }

            return res.status(500).json({
                message: "거래처 등록에 실패했습니다."
            });
        }

        return res.status(201).json({
            message: "거래처가 등록되었습니다.",
            partner_id: result.insertId
        });
    });
});

// [재무관리] 거래처 수정
router.put("/partners/:id", (req, res) => {
    const partnerId = Number(req.params.id);

    if (!Number.isInteger(partnerId) || partnerId < 1) {
        return res.status(400).json({
            message: "올바른 거래처 ID가 아닙니다."
        });
    }

    const {
        company_name,
        tax_id,
        representative_name,
        company_phone,
        company_address,
        memo,
        trade_role,
        company_type,
        closing_day,
        calendar_type_id,
        bank_name,
        account_number,
        account_holder
    } = req.body;

    // 선택 항목이 비어 있으면 NULL로 저장합니다.
    function optionalText(value) {
        return typeof value === "string" && value.trim() !== ""
            ? value.trim()
            : null;
    }

    const companyName = optionalText(company_name);

    if (!companyName) {
        return res.status(400).json({
            message: "거래처명을 입력해 주세요."
        });
    }

    if (trade_role !== "매입" && trade_role !== "매출") {
        return res.status(400).json({
            message: "거래 구분을 매입 또는 매출로 선택해 주세요."
        });
    }

    const closingDay =
        closing_day === "" || closing_day == null
            ? null
            : Number(closing_day);

    if (
        closingDay !== null &&
        (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
    ) {
        return res.status(400).json({
            message: "마감일은 1~31 사이의 정수로 입력해 주세요."
        });
    }

    const calendarTypeId = parsePartnerCalendarTypeId(calendar_type_id);
    if (calendarTypeId === undefined) {
        return res.status(400).json({ message: "일정 색상 값이 올바르지 않습니다." });
    }

    // 이전 클라이언트가 색상 필드를 보내지 않으면 기존 선택을 유지합니다.
    const hasCalendarColor = Object.prototype.hasOwnProperty.call(req.body, "calendar_type_id");

    // 수정할 거래처가 있는지 먼저 확인합니다.
    db.query(
        "SELECT partner_id FROM partners WHERE partner_id = ?",
        [partnerId],
        (err, rows) => {
            if (err) {
                console.error("거래처 확인 오류:", err);
                return res.status(500).json({
                    message: "거래처 확인에 실패했습니다."
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "해당 거래처가 없습니다."
                });
            }

            const query = `
UPDATE partners
SET company_name=?, tax_id=?, representative_name=?, company_phone=?,
company_address=?, memo=?, trade_role=?, company_type=?,
closing_day=?, bank_name=?, account_number=?, account_holder=?,
calendar_type_id=IF(?, ?, calendar_type_id)
WHERE partner_id=?
`;

            const values = [
                companyName,
                optionalText(tax_id),
                optionalText(representative_name),
                optionalText(company_phone),
                optionalText(company_address),
                optionalText(memo),
                trade_role,
                optionalText(company_type),
                closingDay,
                optionalText(bank_name),
                optionalText(account_number),
                optionalText(account_holder),
                hasCalendarColor ? 1 : 0,
                calendarTypeId,
                partnerId
            ];

            db.query(query, values, (err) => {
                if (err) {
                    console.error("거래처 수정 오류:", err);

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "이미 등록된 사업자번호입니다."
                        });
                    }

                    return res.status(500).json({
                        message: "거래처 수정에 실패했습니다."
                    });
                }

                res.json({
                    message: "거래처가 수정되었습니다.",
                    partner_id: partnerId
                });
            });
        }
    );
});

// [재무관리] 거래처 삭제
router.delete("/partners/:id", (req, res) => {
    const partnerId = Number(req.params.id);

    // 삭제할 거래처 ID 확인
    if (!Number.isInteger(partnerId) || partnerId < 1) {
        return res.status(400).json({
            message: "올바른 거래처 ID가 아닙니다."
        });
    }

    const query = "DELETE FROM partners WHERE partner_id = ?";

    db.query(query, [partnerId], (err, result) => {
        if (err) {
            // 연결된 거래 내역이 있으면 DB에서 삭제를 차단합니다.
            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    message: "연결된 거래 내역이 있어 삭제할 수 없습니다."
                });
            }

            console.error("거래처 삭제 오류:", err);

            return res.status(500).json({
                message: "거래처 삭제에 실패했습니다."
            });
        }

        // 해당 ID의 거래처가 없는 경우
        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "해당 거래처가 없습니다."
            });
        }

        res.json({
            message: "거래처가 삭제되었습니다.",
            partner_id: partnerId
        });
    });
});

// [재무관리] 매입·매출 거래 품목 목록 조회
router.get("/items", (req, res) => {
    const query = `
SELECT
i.item_id,
i.transaction_id,
t.partner_id,
t.trade_type,
DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date,
DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
COALESCE(t.company_name, p.company_name) AS company_name,
t.settlement_status,
i.item_name,
i.standard,
i.quantity,
i.unit_price,
i.supply_price,
i.vat,
(i.supply_price + i.vat) AS total_amount,
p.closing_day,
t.source_type AS linked_source_type,
t.source_id AS linked_source_id
FROM trade_items i
INNER JOIN trade_transactions t
ON i.transaction_id=t.transaction_id
INNER JOIN partners p
ON t.partner_id=p.partner_id
ORDER BY t.trade_date DESC, t.transaction_id DESC, i.item_id DESC
`;
    db.query(query, (err, rows) => {
        if (err) {
            console.error("거래 품목 조회 오류:", err);

            return res.status(500).json({
                message: "거래 품목 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 신규 거래 및 품목 등록
router.post("/items", async (req, res) => {
    const {
        partner_id,
        trade_type,
        trade_date,
        due_date,
        item_name,
        standard,
        quantity,
        unit_price,
        vat
    } = req.body;

    const sourceType = req.body.source_type ?? null;
    const sourceId = req.body.source_id == null ? null : Number(req.body.source_id);
    const hasSource = sourceType !== null || sourceId !== null;
    if (hasSource && (!['approval', 'draft'].includes(sourceType) || !Number.isSafeInteger(sourceId) || sourceId <= 0)) {
        return res.status(400).json({ message: "원본 승인 문서 정보를 확인해주세요." });
    }

    // 입력값을 숫자와 문자열로 정리합니다.
    const partnerId = Number(partner_id);
    const itemName = typeof item_name === "string"
        ? item_name.trim()
        : "";
    const itemStandard = typeof standard === "string"
        ? standard.trim()
        : "";

    const qty = Number(quantity);
    const unitPrice = Number(unit_price);
    const vatAmount = Number(vat);

    // 거래처와 거래 구분 확인
    if (
        !Number.isSafeInteger(partnerId) ||
        partnerId <= 0 ||
        !["매입", "매출"].includes(trade_type)
    ) {
        return res.status(400).json({
            message: "거래처와 거래 구분을 확인해 주세요."
        });
    }

    // 날짜 형식과 실제 존재하는 날짜인지 확인합니다.
    const parsedDate = new Date(`${trade_date}T00:00:00Z`);

    if (
        typeof trade_date !== "string" ||
        !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(trade_date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== trade_date
    ) {
        return res.status(400).json({
            message: "올바른 거래일을 입력해 주세요."
        });
    }

    // 품목명과 규격의 길이 확인
    if (
        !itemName ||
        itemName.length > 100 ||
        itemStandard.length > 50
    ) {
        return res.status(400).json({
            message: "품목명은 1~100자, 규격은 50자 이내로 입력해 주세요."
        });
    }

    // 수량은 양의 정수, 단가와 부가세는 0 이상의 정수입니다.
    const moneyValues = [unit_price, vat];

    if (
        quantity === "" ||
        quantity == null ||
        !Number.isSafeInteger(qty) ||
        qty <= 0 ||
        qty > 2147483647 ||
        moneyValues.some((value) =>
            value === "" ||
            value == null ||
            !Number.isSafeInteger(Number(value)) ||
            Number(value) < 0
        )
    ) {
        return res.status(400).json({
            message: "수량은 1 이상의 정수, 단가와 부가세는 0 이상의 정수로 입력해 주세요."
        });
    }

    // 공급가액은 서버에서 수량 × 단가로 계산합니다.
    const supplyPrice = qty * unitPrice;
    const totalAmount = supplyPrice + vatAmount;

    if (
        !Number.isSafeInteger(supplyPrice) ||
        !Number.isSafeInteger(totalAmount)
    ) {
        return res.status(400).json({
            message: "입력한 금액이 처리 가능한 범위를 초과했습니다."
        });
    }

    // 마감일은 선택 입력입니다. 비워두면 DB에 NULL로 저장합니다.
    const dueDate = due_date === "" || due_date == null
        ? null
        : due_date;

    if (dueDate !== null) {
        const parsedDueDate = new Date(`${dueDate}T00:00:00Z`);

        if (
            typeof dueDate !== "string" ||
            !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dueDate) ||
            Number.isNaN(parsedDueDate.getTime()) ||
            parsedDueDate.toISOString().slice(0, 10) !== dueDate
        ) {
            return res.status(400).json({
                message: "올바른 정산 마감일을 입력해 주세요."
            });
        }
    }

    let connection;

    try {
        // 이번 저장 작업 전용 연결을 사용합니다.
        // 기존 db 연결의 다른 요청과 트랜잭션이 섞이지 않게 합니다.
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await connection.beginTransaction();

        let approvedAmount = null;
        if (hasSource) {
            function failSource(status, message) { const error = new Error(message); error.status = status; throw error; }
            if (trade_type !== '매입') failSource(400, '승인 지출은 매입 거래로 등록해주세요.');
            // 원본을 먼저 잠가 같은 문서의 동시 등록/지급 요청을 직렬화합니다.
            if (sourceType === 'approval') {
                const [documents] = await connection.execute(
                    'SELECT amount, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE', [sourceId]);
                if (!documents.length) failSource(404, '원본 결재 문서를 찾을 수 없습니다.');
                if (documents[0].approval_status !== '승인') failSource(409, '최종 승인된 문서만 거래로 등록할 수 있습니다.');
                approvedAmount = readAmount(documents[0].amount);
                const [paid] = await connection.execute(
                    "SELECT payment_id FROM payments WHERE document_id = ? LIMIT 1 FOR UPDATE", [sourceId]);
                if (paid.length) failSource(409, '지급 이력이 있는 문서는 거래로 전환할 수 없습니다. 기존 지급 내역을 확인해주세요.');
            } else {
                const [drafts] = await connection.execute(
                    'SELECT status FROM my_draft WHERE draft_id = ? FOR UPDATE', [sourceId]);
                if (!drafts.length) failSource(404, '원본 기안서를 찾을 수 없습니다.');
                if (drafts[0].status !== 'APPROVED') failSource(409, '최종 승인된 기안서만 거래로 등록할 수 있습니다.');
                const [payrollRows] = await connection.execute(
                    'SELECT payroll_id FROM payrolls WHERE draft_id = ? LIMIT 1 FOR UPDATE', [sourceId]);
                if (payrollRows.length) failSource(409, '급여 기안서는 인건비 목록에 자동 표시됩니다. 일반 품목 거래로 중복 등록할 수 없습니다.');
                const [expenses] = await connection.execute('SELECT amount FROM draft_expense WHERE draft_id = ? FOR UPDATE', [sourceId]);
                if (expenses.length && expenses.every(row => readAmount(row.amount) !== null)) {
                    approvedAmount = expenses.reduce((total, row) => total + Number(row.amount), 0);
                }
            }
            if (!Number.isSafeInteger(approvedAmount) || approvedAmount <= 0) failSource(409, '원본의 승인 금액이 미등록입니다. 먼저 원본 금액을 확인해주세요.');
            const [links] = await connection.execute(
                'SELECT transaction_id FROM trade_transactions WHERE source_type = ? AND source_id = ? FOR UPDATE', [sourceType, sourceId]);
            if (links.length) failSource(409, '이미 거래로 등록한 문서입니다. 목록을 새로고침해주세요.');
            if (totalAmount !== approvedAmount) failSource(400, '품목 합계(수량 × 단가 + 부가세)가 원본 승인 금액과 같아야 합니다.');
        }

        // 선택한 거래처가 실제로 존재하는지 확인합니다.
        const [partners] = await connection.execute(
            "SELECT company_name FROM partners WHERE partner_id = ?",
            [partnerId]
        );

        if (partners.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "선택한 거래처를 찾을 수 없습니다."
            });
        }

        // 1. 거래 정보를 먼저 저장합니다.
        // 거래 정보와 정산 마감일을 함께 저장합니다.
        const [tradeResult] = await connection.execute(
            `INSERT INTO trade_transactions
        (partner_id, company_name, trade_type,
         trade_date, due_date, settlement_status, source_type, source_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                partnerId,
                partners[0].company_name,
                trade_type,
                trade_date,
                dueDate,
                "미정산",
                sourceType,
                sourceId
            ]
        );

        const transactionId = tradeResult.insertId;

        // 2. 생성된 거래 ID에 품목을 연결합니다.
        const [itemResult] = await connection.execute(
            `INSERT INTO trade_items
                (transaction_id, item_name, standard,
                 quantity, unit_price, supply_price, vat)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionId,
                itemName,
                itemStandard || null,
                qty,
                unitPrice,
                supplyPrice,
                vatAmount
            ]
        );

        if (hasSource && sourceType === 'approval') {
            await connection.execute(
                `INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
                 SELECT 'transaction', ?, category_code FROM finance_payment_classifications
                 WHERE source_type = 'approval' AND source_id = ?`, [transactionId, sourceId]);
        }

        // 거래·품목·원본 연결이 모두 저장돼야 확정합니다.
        await connection.commit();

        return res.status(201).json({
            message: "거래 품목이 등록되었습니다.",
            transaction_id: transactionId,
            item_id: itemResult.insertId,
            linked_source_type: sourceType, linked_source_id: sourceId
        });
    } catch (err) {
        // 저장 도중 실패하면 거래와 품목 저장을 모두 취소합니다.
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("거래 저장 취소 오류:", rollbackError);
            }
        }

        console.error("거래 품목 등록 오류:", err);

        return res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({
            message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? "이미 거래로 등록한 문서입니다. 목록을 새로고침해주세요." : "거래 품목 등록에 실패했습니다."
        });
    } finally {
        // 성공 또는 실패 후 전용 연결을 종료합니다.
        if (connection) {
            try {
                await connection.end();
            } catch (closeError) {
                console.error("DB 연결 종료 오류:", closeError);
            }
        }
    }
});

// 거래 품목 수정
router.put("/items/:itemId", async (req, res) => {
    const itemId = Number(req.params.itemId);

    const {
        partner_id,
        trade_type,
        trade_date,
        due_date,
        item_name,
        standard,
        quantity,
        unit_price,
        vat
    } = req.body;

    const partnerId = Number(partner_id);
    const itemName =
        typeof item_name === "string" ? item_name.trim() : "";
    const itemStandard =
        typeof standard === "string" ? standard.trim() : "";

    const qty = Number(quantity);
    const unitPrice = Number(unit_price);
    const vatAmount = Number(vat);

    // 수정할 품목과 거래처 ID 확인
    if (
        !Number.isSafeInteger(itemId) ||
        itemId <= 0 ||
        !Number.isSafeInteger(partnerId) ||
        partnerId <= 0 ||
        !["매입", "매출"].includes(trade_type)
    ) {
        return res.status(400).json({
            message: "품목 ID, 거래처, 거래 구분을 확인해 주세요."
        });
    }

    // 실제 존재하는 날짜인지 확인합니다.
    const parsedDate = new Date(`${trade_date}T00:00:00Z`);

    if (
        typeof trade_date !== "string" ||
        !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(trade_date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== trade_date
    ) {
        return res.status(400).json({
            message: "올바른 거래일을 입력해 주세요."
        });
    }

    if (
        !itemName ||
        itemName.length > 100 ||
        itemStandard.length > 50
    ) {
        return res.status(400).json({
            message: "품목명은 1~100자, 규격은 50자 이내로 입력해 주세요."
        });
    }

    // 수량, 단가, 부가세 확인
    if (
        quantity === "" ||
        quantity == null ||
        !Number.isSafeInteger(qty) ||
        qty <= 0 ||
        qty > 2147483647 ||
        [unit_price, vat].some((value) =>
            value === "" ||
            value == null ||
            !Number.isSafeInteger(Number(value)) ||
            Number(value) < 0
        )
    ) {
        return res.status(400).json({
            message: "수량은 1 이상의 정수, 단가와 부가세는 0 이상의 정수로 입력해 주세요."
        });
    }

    const supplyPrice = qty * unitPrice;

    if (
        !Number.isSafeInteger(supplyPrice) ||
        !Number.isSafeInteger(supplyPrice + vatAmount)
    ) {
        return res.status(400).json({
            message: "입력한 금액이 처리 가능한 범위를 초과했습니다."
        });
    }

    // 마감일을 비워두면 NULL로 저장합니다.
    const dueDate = due_date === "" || due_date == null
        ? null
        : due_date;

    // 입력한 마감일이 실제 존재하는 날짜인지 확인합니다.
    if (dueDate !== null) {
        const parsedDueDate = new Date(`${dueDate}T00:00:00Z`);

        if (
            typeof dueDate !== "string" ||
            !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dueDate) ||
            Number.isNaN(parsedDueDate.getTime()) ||
            parsedDueDate.toISOString().slice(0, 10) !== dueDate
        ) {
            return res.status(400).json({
                message: "올바른 정산 마감일을 입력해 주세요."
            });
        }
    }

    let connection;

    try {
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await connection.beginTransaction();

        // 품목과 연결된 거래 정보를 조회합니다.
        // 수정하는 동안 해당 행을 잠급니다.
        const [items] = await connection.execute(
            `SELECT
                i.transaction_id,
                t.partner_id,
                t.source_type,
                t.trade_type,
                DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date
             FROM trade_items i
             INNER JOIN trade_transactions t
                ON i.transaction_id = t.transaction_id
             WHERE i.item_id = ?
             FOR UPDATE`,
            [itemId]
        );

        if (items.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "수정할 품목을 찾을 수 없습니다."
            });
        }

        const currentItem = items[0];
        const transactionId = currentItem.transaction_id;
        if (currentItem.source_type) {
            const [totals] = await connection.execute(
                'SELECT SUM(supply_price + vat) AS approved_total FROM trade_items WHERE transaction_id = ?', [transactionId]);
            if (trade_type !== '매입' || supplyPrice + vatAmount !== Number(totals[0].approved_total)) {
                await connection.rollback();
                return res.status(409).json({ message: '승인 연결 거래는 매입 구분과 원본 승인 금액을 유지해야 합니다.' });
            }
        }


        // 입금·출금 기록이 있는 거래인지 확인합니다.
        const [payments] = await connection.execute(
            `SELECT payment_id
             FROM payments
             WHERE transaction_id = ?
             LIMIT 1`,
            [transactionId]
        );

        if (payments.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "입금·출금 기록이 있는 거래는 이 화면에서 수정할 수 없습니다."
            });
        }

        // 같은 거래에 속한 품목 수를 확인합니다.
        const [counts] = await connection.execute(
            `SELECT COUNT(*) AS item_count
             FROM trade_items
             WHERE transaction_id = ?`,
            [transactionId]
        );

        const tradeChanged =
            Number(currentItem.partner_id) !== partnerId ||
            currentItem.trade_type !== trade_type ||
            currentItem.trade_date !== trade_date ||
            currentItem.due_date !== dueDate;

        // 거래처, 거래 구분, 거래일은 같은 거래의 모든 품목이 공유합니다.
        if (Number(counts[0].item_count) > 1 && tradeChanged) {
            await connection.rollback();

            return res.status(409).json({
                message: "여러 품목이 연결된 거래는 거래처, 거래 구분, 거래일, 정산 마감일을 개별 품목 화면에서 변경할 수 없습니다."
            });
        }

        const [partners] = await connection.execute(
            "SELECT company_name FROM partners WHERE partner_id = ?",
            [partnerId]
        );

        if (partners.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "선택한 거래처를 찾을 수 없습니다."
            });
        }

        // 거래 공통 정보가 바뀐 경우에만 수정합니다.
        // 거래 공통 정보 또는 마감일이 변경되면 저장합니다.
        if (tradeChanged) {
            await connection.execute(
                `UPDATE trade_transactions
         SET partner_id = ?,
             company_name = ?,
             trade_type = ?,
             trade_date = ?,
             due_date = ?
         WHERE transaction_id = ?`,
                [
                    partnerId,
                    partners[0].company_name,
                    trade_type,
                    trade_date,
                    dueDate,
                    transactionId
                ]
            );
        }

        // 선택한 품목의 기존 행을 수정합니다.
        await connection.execute(
            `UPDATE trade_items
             SET item_name = ?,
                 standard = ?,
                 quantity = ?,
                 unit_price = ?,
                 supply_price = ?,
                 vat = ?
             WHERE item_id = ?`,
            [
                itemName,
                itemStandard || null,
                qty,
                unitPrice,
                supplyPrice,
                vatAmount,
                itemId
            ]
        );

        await connection.commit();

        return res.json({
            message: "거래 품목이 수정되었습니다.",
            item_id: itemId,
            transaction_id: transactionId
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("품목 수정 취소 오류:", rollbackError);
            }
        }

        console.error("거래 품목 수정 오류:", err);

        return res.status(500).json({
            message: "거래 품목 수정에 실패했습니다."
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (closeError) {
                console.error("DB 연결 종료 오류:", closeError);
            }
        }
    }



});

// 거래 품목 삭제
router.delete("/items/:itemId", async (req, res) => {
    const itemId = Number(req.params.itemId);

    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
        return res.status(400).json({
            message: "올바른 품목 ID가 아닙니다."
        });
    }

    let connection;

    try {
        // 삭제 작업 전용 DB 연결
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await connection.beginTransaction();

        // 삭제할 품목과 연결된 거래를 확인하고 잠급니다.
        // 수정할 품목과 기존 거래 정보를 조회
        const [items] = await connection.execute(
            `SELECT
        i.transaction_id,
        t.partner_id,
        t.trade_type,
        DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date,
        DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date
        FROM trade_items i
        INNER JOIN trade_transactions t
        ON i.transaction_id = t.transaction_id
        WHERE i.item_id = ?
        FOR UPDATE`,
            [itemId]
        );

        if (items.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "삭제할 품목을 찾을 수 없습니다."
            });
        }

        const transactionId = items[0].transaction_id;

        // 입금·출금 기록이 있으면 삭제를 막습니다.
        const [payments] = await connection.execute(
            `SELECT payment_id
             FROM payments
             WHERE transaction_id = ?
             LIMIT 1`,
            [transactionId]
        );

        if (payments.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "입금·출금 기록이 있는 거래의 품목은 삭제할 수 없습니다."
            });
        }

        // 선택한 품목만 삭제합니다.
        await connection.execute(
            "DELETE FROM trade_items WHERE item_id = ?",
            [itemId]
        );

        // 같은 거래에 남아 있는 품목 수를 확인합니다.
        const [counts] = await connection.execute(
            `SELECT COUNT(*) AS item_count
             FROM trade_items
             WHERE transaction_id = ?`,
            [transactionId]
        );

        const transactionDeleted =
            Number(counts[0].item_count) === 0;

        // 마지막 품목이었다면 빈 거래도 함께 삭제합니다.
        if (transactionDeleted) {
            await connection.execute("DELETE FROM finance_payment_classifications WHERE source_type = 'transaction' AND source_id = ?", [transactionId]);
            await connection.execute(
                `DELETE FROM trade_transactions
                 WHERE transaction_id = ?`,
                [transactionId]
            );
        }

        await connection.commit();

        return res.json({
            message: "거래 품목이 삭제되었습니다.",
            item_id: itemId,
            transaction_id: transactionId,
            transaction_deleted: transactionDeleted
        });
    } catch (err) {
        // 실패하면 품목과 거래 삭제를 모두 취소합니다.
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("품목 삭제 취소 오류:", rollbackError);
            }
        }

        console.error("거래 품목 삭제 오류:", err);

        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "다른 데이터에서 참조 중인 거래 또는 품목은 삭제할 수 없습니다."
            });
        }

        return res.status(500).json({
            message: "거래 품목 삭제에 실패했습니다."
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (closeError) {
                console.error("DB 연결 종료 오류:", closeError);
            }
        }
    }
});

// 거래 입금·출금 등록
router.post("/transactions/:transactionId/payments",
    async (req, res) => {
        const transactionId = Number(req.params.transactionId);

        const {
            payment_date,
            amount,
            payment_method,
            account_id,
            card_id
        } = req.body;

        const paymentAmount = Number(amount);

        // 거래 ID와 처리 금액 확인
        if (
            !Number.isSafeInteger(transactionId) ||
            transactionId <= 0 ||
            amount === "" ||
            amount == null ||
            !Number.isSafeInteger(paymentAmount) ||
            paymentAmount <= 0
        ) {
            return res.status(400).json({
                message: "거래 ID와 1원 이상의 정수 금액을 입력해 주세요."
            });
        }

        // 처리 날짜 확인
        const parsedDate = new Date(`${payment_date}T00:00:00Z`);

        if (
            typeof payment_date !== "string" ||
            !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(payment_date) ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== payment_date
        ) {
            return res.status(400).json({
                message: "올바른 처리 날짜를 입력해 주세요."
            });
        }

        // 매입 거래에는 법인카드 결제도 사용할 수 있습니다.
        if (!["계좌이체", "현금", "법인카드"].includes(payment_method)) {
            return res.status(400).json({
                message: "결제수단은 계좌이체, 현금 또는 법인카드를 선택해 주세요."
            });
        }

        // 결제수단에 해당하는 ID만 저장합니다.
        const accountId = payment_method === "계좌이체"
            ? Number(account_id)
            : null;

        if (
            payment_method === "계좌이체" &&
            (!Number.isSafeInteger(accountId) || accountId <= 0)
        ) {
            return res.status(400).json({
                message: "입금·출금에 사용할 회사계좌를 선택해 주세요."
            });
        }

        const cardId = payment_method === "법인카드"
            ? Number(card_id)
            : null;

        if (
            payment_method === "법인카드" &&
            (!Number.isSafeInteger(cardId) || cardId <= 0)
        ) {
            return res.status(400).json({
                message: "결제할 법인카드를 선택해 주세요."
            });
        }

        let connection;

        try {
            connection = await financeMysql.createConnection({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT || 3306),
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            await connection.beginTransaction();

            // 같은 거래의 정산 요청을 순서대로 처리하도록 잠급니다.
            const [transactions] = await connection.execute(
                `SELECT trade_type
                 FROM trade_transactions
                 WHERE transaction_id = ?
                 FOR UPDATE`,
                [transactionId]
            );

            if (transactions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    message: "정산할 거래를 찾을 수 없습니다."
                });
            }

            const tradeType = transactions[0].trade_type;

            if (!["매출", "매입"].includes(tradeType)) {
                await connection.rollback();

                return res.status(409).json({
                    message: "거래 구분을 확인해 주세요."
                });
            }

            const direction = tradeType === "매출" ? "입금" : "출금";

            // 법인카드는 매입 거래의 출금 처리에만 사용합니다.
            if (cardId !== null && tradeType !== "매입") {
                await connection.rollback();
                return res.status(400).json({
                    message: "법인카드는 매입 거래의 출금에만 사용할 수 있습니다."
                });
            }

            // 거래에 포함된 모든 품목의 금액을 합산합니다.
            const [totals] = await connection.execute(
                `SELECT
                    COUNT(*) AS item_count,
                    COALESCE(SUM(supply_price + vat), 0) AS total_amount
                 FROM trade_items
                 WHERE transaction_id = ?`,
                [transactionId]
            );

            // 완료된 입금 또는 출금 기록만 합산합니다.
            const [payments] = await connection.execute(
                `SELECT COALESCE(SUM(amount), 0) AS paid_amount
                 FROM payments
                 WHERE transaction_id = ?
                   AND payment_direction = ?
                   AND payment_status = '완료'`,
                [transactionId, direction]
            );

            const totalAmount = Number(totals[0].total_amount);
            const paidAmount = Number(payments[0].paid_amount);

            if (
                Number(totals[0].item_count) === 0 ||
                !Number.isSafeInteger(totalAmount) ||
                !Number.isSafeInteger(paidAmount) ||
                totalAmount < 0 ||
                paidAmount < 0
            ) {
                await connection.rollback();

                return res.status(409).json({
                    message: "거래 품목과 금액을 확인해 주세요."
                });
            }

            const remainingAmount = totalAmount - paidAmount;

            // 이미 정산했거나 입력 금액이 잔액보다 크면 저장하지 않습니다.
            if (remainingAmount <= 0 || paymentAmount > remainingAmount) {
                await connection.rollback();

                return res.status(409).json({
                    message:
                        remainingAmount <= 0
                            ? "추가로 정산할 금액이 없습니다."
                            : `남은 금액 ${remainingAmount.toLocaleString()}원을 초과할 수 없습니다.`
                });
            }

            // 계좌이체라면 선택한 회사계좌를 확인합니다.
            if (accountId !== null) {
                const [accounts] = await connection.execute(
                    `SELECT balance, currency, account_status
         FROM bank_accounts
         WHERE account_id = ?
         FOR UPDATE`,
                    [accountId]
                );

                if (accounts.length === 0) {
                    await connection.rollback();

                    return res.status(404).json({
                        message: "선택한 회사계좌를 찾을 수 없습니다."
                    });
                }

                const account = accounts[0];

                if (
                    account.currency !== "KRW" ||
                    !["사용", "ACTIVE"].includes(account.account_status)
                ) {
                    await connection.rollback();

                    return res.status(409).json({
                        message: "사용 가능한 원화 계좌를 선택해 주세요."
                    });
                }

                const currentBalance = Number(account.balance);

                if (
                    account.balance == null ||
                    !Number.isSafeInteger(currentBalance)
                ) {
                    await connection.rollback();

                    return res.status(409).json({
                        message: "회사계좌의 현재 잔액을 확인해 주세요."
                    });
                }

                // 출금은 계좌에 남은 금액까지만 가능합니다.
                if (direction === "출금" && paymentAmount > currentBalance) {
                    await connection.rollback();

                    return res.status(409).json({
                        message: "선택한 회사계좌의 잔액이 부족합니다."
                    });
                }

                const newBalance = direction === "입금"
                    ? currentBalance + paymentAmount
                    : currentBalance - paymentAmount;

                if (!Number.isSafeInteger(newBalance)) {
                    await connection.rollback();

                    return res.status(409).json({
                        message: "계좌 잔액이 처리 가능한 범위를 초과합니다."
                    });
                }

                // 과거 날짜의 내역을 등록해도 최근 거래일시는 뒤로 가지 않습니다.
                await connection.execute(
                    `UPDATE bank_accounts
         SET balance = ?,
             last_transaction = GREATEST(
                 COALESCE(last_transaction, ?),
                 ?
             )
         WHERE account_id = ?`,
                    [
                        newBalance,
                        `${payment_date} 00:00:00`,
                        `${payment_date} 00:00:00`,
                        accountId
                    ]
                );
            }

            // 같은 카드로 여러 거래를 동시에 결제해도 한도를 넘지 않도록 잠급니다.
            if (cardId !== null) {
                const [cards] = await connection.execute(
                    `SELECT monthly_usage, monthly_limit, remaining_limit, card_status
                     FROM corporate_cards
                     WHERE card_id = ?
                     FOR UPDATE`,
                    [cardId]
                );

                if (cards.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({
                        message: "선택한 법인카드를 찾을 수 없습니다."
                    });
                }

                const card = cards[0];
                if (!["사용", "ACTIVE"].includes(card.card_status)) {
                    await connection.rollback();
                    return res.status(409).json({
                        message: "사용 가능한 법인카드를 선택해 주세요."
                    });
                }

                const currentUsage = Number(card.monthly_usage);
                const monthlyLimit = Number(card.monthly_limit);
                const remainingLimit = Number(card.remaining_limit);

                // 금액이 잘못 저장되어 있으면 임의로 덮어쓰지 않습니다.
                if (
                    [card.monthly_usage, card.monthly_limit, card.remaining_limit]
                        .some((value) => value == null) ||
                    [currentUsage, monthlyLimit, remainingLimit]
                        .some((value) => !Number.isSafeInteger(value) || value < 0) ||
                    monthlyLimit - currentUsage !== remainingLimit
                ) {
                    await connection.rollback();
                    return res.status(409).json({
                        message: "법인카드 사용량과 잔여 한도를 확인해 주세요."
                    });
                }

                if (paymentAmount > remainingLimit) {
                    await connection.rollback();
                    return res.status(409).json({
                        message: `카드 잔여 한도 ${remainingLimit.toLocaleString()}원을 초과할 수 없습니다.`
                    });
                }

                // 결제 기록과 카드 금액 변경은 같은 트랜잭션으로 저장합니다.
                await connection.execute(
                    `UPDATE corporate_cards
                     SET monthly_usage = ?, remaining_limit = ?
                     WHERE card_id = ?`,
                    [currentUsage + paymentAmount, remainingLimit - paymentAmount, cardId]
                );
            }

            // 계좌이체는 account_id, 법인카드는 card_id, 현금은 둘 다 NULL입니다.
            const [result] = await connection.execute(
                `INSERT INTO payments
                (transaction_id, payment_date, amount,
                payment_method, payment_direction, payment_status,
                account_id, card_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transactionId,
                    payment_date,
                    paymentAmount,
                    payment_method,
                    direction,
                    "완료",
                    accountId,
                    cardId
                ]
            );

            const newRemainingAmount =
                remainingAmount - paymentAmount;

            const settlementStatus =
                newRemainingAmount === 0 ? "완료" : "미정산";

            // 남은 금액을 기준으로 거래의 정산 상태를 변경합니다.
            await connection.execute(
                `UPDATE trade_transactions
                 SET settlement_status = ?
                 WHERE transaction_id = ?`,
                [settlementStatus, transactionId]
            );

            await connection.commit();

            return res.status(201).json({
                message: `${direction} 내역이 등록되었습니다.`,
                payment_id: result.insertId,
                transaction_id: transactionId,
                payment_direction: direction,
                remaining_amount: newRemainingAmount,
                settlement_status: settlementStatus
            });
        } catch (err) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("입금·출금 저장 취소 오류:", rollbackError);
                }
            }

            console.error("입금·출금 등록 오류:", err);

            return res.status(500).json({
                message: "입금·출금 등록에 실패했습니다."
            });
        } finally {
            if (connection) {
                try {
                    await connection.end();
                } catch (closeError) {
                    console.error("DB 연결 종료 오류:", closeError);
                }
            }
        }
    }
);

// 거래별 입금·출금 이력과 남은 금액 조회
router.get("/transactions/:transactionId/payments",
    async (req, res) => {
        const transactionId = Number(req.params.transactionId);

        if (
            !Number.isSafeInteger(transactionId) ||
            transactionId <= 0
        ) {
            return res.status(400).json({
                message: "올바른 거래 ID가 아닙니다."
            });
        }

        let connection;

        try {
            connection = await financeMysql.createConnection({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT || 3306),
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            // 여러 조회 결과를 같은 시점 기준으로 읽습니다.
            await connection.query(
                "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"
            );
            await connection.beginTransaction();

            // 1. 거래 정보 조회
            const [transactions] = await connection.execute(
                `SELECT
                    transaction_id,
                    company_name,
                    trade_type,
                    settlement_status
                 FROM trade_transactions
                 WHERE transaction_id = ?`,
                [transactionId]
            );

            if (transactions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    message: "거래를 찾을 수 없습니다."
                });
            }

            const transaction = transactions[0];

            if (!["매출", "매입"].includes(transaction.trade_type)) {
                await connection.rollback();

                return res.status(409).json({
                    message: "거래 구분을 확인해 주세요."
                });
            }

            const direction =
                transaction.trade_type === "매출" ? "입금" : "출금";

            // 2. 거래에 속한 전체 품목의 합계 조회
            const [totals] = await connection.execute(
                `SELECT
                    COUNT(*) AS item_count,
                    COALESCE(SUM(supply_price + vat), 0) AS total_amount
                 FROM trade_items
                 WHERE transaction_id = ?`,
                [transactionId]
            );

            if (Number(totals[0].item_count) === 0) {
                await connection.rollback();

                return res.status(409).json({
                    message: "거래 품목이 없어 정산 금액을 계산할 수 없습니다."
                });
            }

            // 3. 입금·출금 이력 조회
            const [payments] = await connection.execute(
                `SELECT
                    payment_id,
                    DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
                    amount,
                    payment_method,
                    payment_direction,
                    payment_status,
                    account_id,
                    card_id
                 FROM payments
                 WHERE transaction_id = ?
                 ORDER BY payment_date DESC, payment_id DESC`,
                [transactionId]
            );

            const totalAmount = Number(totals[0].total_amount);

            // 거래 방향과 일치하는 완료 기록만 정산 금액에 반영합니다.
            const paidAmount = payments.reduce((sum, payment) => {
                if (
                    payment.payment_status === "완료" &&
                    payment.payment_direction === direction
                ) {
                    return sum + Number(payment.amount);
                }

                return sum;
            }, 0);

            if (
                !Number.isSafeInteger(totalAmount) ||
                !Number.isSafeInteger(paidAmount)
            ) {
                throw new Error("정산 금액이 처리 가능한 범위를 초과했습니다.");
            }

            const remainingAmount = totalAmount - paidAmount;

            await connection.commit();

            return res.json({
                transaction_id: transactionId,
                company_name: transaction.company_name,
                trade_type: transaction.trade_type,
                settlement_status: transaction.settlement_status,
                payment_direction: direction,
                total_amount: totalAmount,
                paid_amount: paidAmount,
                remaining_amount: remainingAmount,
                payments
            });
        } catch (err) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("정산 조회 종료 오류:", rollbackError);
                }
            }

            console.error("입금·출금 이력 조회 오류:", err);

            return res.status(500).json({
                message: "입금·출금 이력을 불러오지 못했습니다."
            });
        } finally {
            if (connection) {
                try {
                    await connection.end();
                } catch (closeError) {
                    console.error("DB 연결 종료 오류:", closeError);
                }
            }
        }
    }
);

// 회사계좌 목록 조회
router.get("/bank-accounts", (req, res) => {
    const query = `
        SELECT
            b.account_id,
            b.account_number,
            b.bank_name,
            b.account_name,
            b.account_type,
            b.balance,
            b.currency,
            b.employee_id,
            e.name AS manager_name,
            DATE_FORMAT(
                b.last_transaction,
                '%Y-%m-%d %H:%i'
            ) AS last_transaction,
            b.account_status
        FROM bank_accounts b
        LEFT JOIN employees e
            ON b.employee_id = e.employee_id
        ORDER BY b.account_id DESC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("회사계좌 목록 조회 오류:", err);

            return res.status(500).json({
                message: "회사계좌 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 회사계좌별 입금·출금 이력 조회
router.get("/bank-accounts/:accountId/payments", (req, res) => {
    const accountId = Number(req.params.accountId);

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    // 선택한 계좌가 존재하는지 확인합니다.
    db.query(
        "SELECT account_id FROM bank_accounts WHERE account_id = ?",
        [accountId],
        (err, accounts) => {
            if (err) {
                console.error("회사계좌 확인 오류:", err);

                return res.status(500).json({
                    message: "회사계좌 확인에 실패했습니다."
                });
            }

            if (accounts.length === 0) {
                return res.status(404).json({
                    message: "해당 회사계좌가 없습니다."
                });
            }

            // 품목 테이블을 연결하지 않아 지급 기록이 중복되지 않습니다.
            const query = `
                SELECT
                    p.payment_id,
                    p.transaction_id,
                    p.document_id,
                    DATE_FORMAT(
                        p.payment_date,
                        '%Y-%m-%d'
                    ) AS payment_date,
                    p.amount,
                    p.payment_method,
                    p.payment_direction,
                    p.payment_status,
                    t.company_name
                FROM payments p
                LEFT JOIN trade_transactions t
                    ON p.transaction_id = t.transaction_id
                WHERE p.account_id = ?
                ORDER BY p.payment_date DESC, p.payment_id DESC
            `;

            db.query(query, [accountId], (err, rows) => {
                if (err) {
                    console.error("계좌 거래내역 조회 오류:", err);

                    return res.status(500).json({
                        message: "계좌 거래내역을 불러오지 못했습니다."
                    });
                }

                res.json(rows);
            });
        }
    );
});

// 회사계좌 신규 등록
router.post("/bank-accounts", (req, res) => {
    const {
        account_number,
        bank_name,
        account_name,
        account_type,
        balance,
        currency,
        employee_id
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function cleanText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    const accountNumber = cleanText(account_number);
    const bankName = cleanText(bank_name);
    const accountName = cleanText(account_name);
    const accountType = cleanText(account_type);

    // 통화를 입력하지 않으면 원화로 등록합니다.
    const accountCurrency =
        cleanText(currency).toUpperCase() || "KRW";

    // 초기 잔액을 입력하지 않으면 0으로 등록합니다.
    const initialBalance =
        balance === "" || balance == null
            ? 0
            : Number(balance);

    // 관리 사원은 선택 항목입니다.
    const employeeId =
        employee_id === "" || employee_id == null
            ? null
            : Number(employee_id);

    // 필수 입력 및 문자열 길이 확인
    if (
        !accountNumber ||
        !bankName ||
        !accountName ||
        accountNumber.length > 50 ||
        bankName.length > 50 ||
        accountName.length > 100 ||
        accountType.length > 30
    ) {
        return res.status(400).json({
            message: "계좌번호와 은행명은 1~50자, 계좌명은 1~100자, 용도는 30자 이내로 입력해 주세요."
        });
    }

    // 이번 입력폼에서는 정수 금액을 사용합니다.
    if (
        !Number.isSafeInteger(initialBalance) ||
        initialBalance < 0
    ) {
        return res.status(400).json({
            message: "초기 잔액은 0 이상의 정수로 입력해 주세요."
        });
    }

    if (!["KRW", "USD", "JPY", "EUR"].includes(accountCurrency)) {
        return res.status(400).json({
            message: "통화는 KRW, USD, JPY, EUR 중에서 선택해 주세요."
        });
    }

    if (
        employeeId !== null &&
        (!Number.isSafeInteger(employeeId) || employeeId <= 0)
    ) {
        return res.status(400).json({
            message: "올바른 관리 사원 ID를 선택해 주세요."
        });
    }

    const query = `
        INSERT INTO bank_accounts (
            account_number,
            bank_name,
            account_name,
            account_type,
            balance,
            currency,
            employee_id,
            account_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        accountNumber,
        bankName,
        accountName,
        accountType || null,
        initialBalance,
        accountCurrency,
        employeeId,
        "사용"
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("회사계좌 등록 오류:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 계좌번호입니다."
                });
            }

            if (err.code === "ER_NO_REFERENCED_ROW_2") {
                return res.status(400).json({
                    message: "존재하지 않는 관리 사원입니다."
                });
            }

            return res.status(500).json({
                message: "회사계좌 등록에 실패했습니다."
            });
        }

        return res.status(201).json({
            message: "회사계좌가 등록되었습니다.",
            account_id: result.insertId
        });
    });
});

// 회사계좌 기본정보 수정
router.put("/bank-accounts/:accountId", (req, res) => {
    const accountId = Number(req.params.accountId);

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    const {
        account_number,
        bank_name,
        account_name,
        account_type,
        employee_id
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function cleanText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    const accountNumber = cleanText(account_number);
    const bankName = cleanText(bank_name);
    const accountName = cleanText(account_name);
    const accountType = cleanText(account_type);

    // 필수 입력 및 길이 확인
    if (
        !accountNumber ||
        !bankName ||
        !accountName ||
        accountNumber.length > 50 ||
        bankName.length > 50 ||
        accountName.length > 100 ||
        accountType.length > 30
    ) {
        return res.status(400).json({
            message: "계좌번호와 은행명은 1~50자, 계좌명은 1~100자, 용도는 30자 이내로 입력해 주세요."
        });
    }

    // 관리 사원을 선택하지 않으면 NULL로 저장합니다.
    const employeeId =
        employee_id === "" || employee_id == null
            ? null
            : Number(employee_id);

    if (
        employeeId !== null &&
        (!Number.isSafeInteger(employeeId) || employeeId <= 0)
    ) {
        return res.status(400).json({
            message: "올바른 관리 사원을 선택해 주세요."
        });
    }

    const query = `
    UPDATE bank_accounts
    SET account_number = ?,
        bank_name = ?,
        account_name = ?,
        account_type = ?,
        employee_id = ?
    WHERE account_id = ?
`;

    const values = [
        accountNumber,
        bankName,
        accountName,
        accountType || null,
        employeeId,
        accountId
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("회사계좌 수정 오류:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 계좌번호입니다."
                });
            }

            if (err.code === "ER_NO_REFERENCED_ROW_2") {
                return res.status(400).json({
                    message: "존재하지 않는 관리 사원입니다."
                });
            }

            return res.status(500).json({
                message: "회사계좌 수정에 실패했습니다."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "해당 회사계좌가 없습니다."
            });
        }

        return res.json({
            message: "회사계좌가 수정되었습니다.",
            account_id: accountId
        });
    });
});

// 계좌 관리 사원 선택용 목록 조회
router.get("/employees", (req, res) => {
    const query = `
        SELECT
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            d.department_name,
            EXISTS (
                SELECT 1 FROM employee_accounts ea
                WHERE ea.employee_id = e.employee_id
                  AND ea.account_status = 'ACTIVE'
                  AND (e.department_id = 1 OR ea.role = 'MASTER')
            ) AS can_approve
        FROM employees e
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        ORDER BY e.name, e.employee_id
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("재무 관리 사원 목록 조회 오류:", err);

            return res.status(500).json({
                message: "관리 사원 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 법인카드 목록 조회
router.get("/corporate-cards", (req, res) => {
    const query = `
        SELECT
            c.card_id,
            c.card_name,
            c.department_id,
            d.department_name,
            c.employee_id,
            e.name AS manager_name,
            c.monthly_usage,
            c.monthly_limit,
            c.remaining_limit,
            c.card_status
        FROM corporate_cards c
        LEFT JOIN departments d
            ON c.department_id = d.department_id
        LEFT JOIN employees e
            ON c.employee_id = e.employee_id
        ORDER BY c.card_id DESC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("법인카드 목록 조회 오류:", err);

            return res.status(500).json({
                message: "법인카드 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 법인카드 월 한도 변경
router.put("/corporate-cards/:cardId/limit", (req, res) => {
    const cardId = Number(req.params.cardId);
    const { monthly_limit } = req.body;
    const monthlyLimit = Number(monthly_limit);

    // 카드 ID 확인
    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 월 한도는 0 이상의 정수만 허용합니다.
    if (
        monthly_limit == null ||
        String(monthly_limit).trim() === "" ||
        !Number.isSafeInteger(monthlyLimit) ||
        monthlyLimit < 0
    ) {
        return res.status(400).json({
            message: "월 한도는 0 이상의 정수로 입력해 주세요."
        });
    }

    // 한도와 잔여 한도를 함께 변경합니다.
    // 이미 사용한 금액보다 낮은 한도로는 변경하지 않습니다.
    const query = `
      UPDATE corporate_cards
      SET
        monthly_limit = ?,
        remaining_limit = ? - COALESCE(monthly_usage, 0)
      WHERE card_id = ?
        AND COALESCE(monthly_usage, 0) BETWEEN 0 AND ?
    `;

    db.query(
        query,
        [monthlyLimit, monthlyLimit, cardId, monthlyLimit],
        (err, result) => {
            if (err) {
                console.error("법인카드 한도 변경 오류:", err);

                return res.status(500).json({
                    message: "법인카드 한도 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    message:
                        "카드가 없거나 사용량을 확인할 수 없습니다. 월 한도는 당월 사용량 이상이어야 합니다."
                });
            }

            res.json({
                message: "법인카드 한도가 변경되었습니다.",
                card_id: cardId,
                monthly_limit: monthlyLimit
            });
        }
    );
});

// 법인카드별 사용 이력 조회
router.get("/corporate-cards/:cardId/payments", (req, res) => {
    const cardId = Number(req.params.cardId);

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 해당 카드가 존재하는지 먼저 확인합니다.
    db.query(
        "SELECT card_id FROM corporate_cards WHERE card_id = ?",
        [cardId],
        (cardError, cards) => {
            if (cardError) {
                console.error("법인카드 확인 오류:", cardError);

                return res.status(500).json({
                    message: "법인카드 정보를 확인하지 못했습니다."
                });
            }

            if (cards.length === 0) {
                return res.status(404).json({
                    message: "해당 법인카드를 찾을 수 없습니다."
                });
            }

            // 카드 ID가 연결된 입금·출금 기록을 조회합니다.
            const query = `
          SELECT
            p.payment_id,
            p.transaction_id,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
            t.company_name,
            p.amount,
            p.payment_method,
            p.payment_direction,
            p.payment_status
          FROM payments p
          LEFT JOIN trade_transactions t
            ON p.transaction_id = t.transaction_id
          WHERE p.card_id = ?
          ORDER BY p.payment_date DESC, p.payment_id DESC
        `;

            db.query(query, [cardId], (err, rows) => {
                if (err) {
                    console.error("법인카드 사용 이력 조회 오류:", err);

                    return res.status(500).json({
                        message: "법인카드 사용 이력을 불러오지 못했습니다."
                    });
                }

                res.json(rows);
            });
        }
    );
});

// 법인카드 신규 등록
router.post("/corporate-cards", (req, res) => {
    const {
        card_name,
        department_id,
        employee_id,
        monthly_limit
    } = req.body;

    const cardName =
        typeof card_name === "string" ? card_name.trim() : "";

    // 부서와 관리자를 선택하지 않으면 NULL로 저장합니다.
    const departmentId =
        department_id == null || String(department_id).trim() === ""
            ? null
            : Number(department_id);

    const employeeId =
        employee_id == null || String(employee_id).trim() === ""
            ? null
            : Number(employee_id);

    const monthlyLimit = Number(monthly_limit);

    // 카드명 확인
    if (cardName === "" || cardName.length > 50) {
        return res.status(400).json({
            message: "법인카드명은 1~50자로 입력해 주세요."
        });
    }

    // 부서 ID와 관리자 ID 확인
    if (
        (departmentId !== null &&
            (!Number.isSafeInteger(departmentId) || departmentId <= 0)) ||
        (employeeId !== null &&
            (!Number.isSafeInteger(employeeId) || employeeId <= 0))
    ) {
        return res.status(400).json({
            message: "올바른 부서와 관리자를 선택해 주세요."
        });
    }

    // 월 한도 확인
    if (
        monthly_limit == null ||
        String(monthly_limit).trim() === "" ||
        !Number.isSafeInteger(monthlyLimit) ||
        monthlyLimit < 0
    ) {
        return res.status(400).json({
            message: "월 한도는 0 이상의 정수로 입력해 주세요."
        });
    }

    // 신규 카드는 사용량 0원, 잔여 한도는 월 한도와 같게 저장합니다.
    const query = `
      INSERT INTO corporate_cards (
        card_name,
        department_id,
        employee_id,
        monthly_usage,
        monthly_limit,
        remaining_limit,
        card_status
      )
      VALUES (?, ?, ?, 0, ?, ?, '사용')
    `;

    db.query(
        query,
        [
            cardName,
            departmentId,
            employeeId,
            monthlyLimit,
            monthlyLimit
        ],
        (err, result) => {
            if (err) {
                console.error("법인카드 등록 오류:", err);

                // 선택한 부서나 사원이 DB에 없는 경우
                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "선택한 부서 또는 관리자가 존재하지 않습니다."
                    });
                }

                return res.status(500).json({
                    message: "법인카드 등록에 실패했습니다."
                });
            }

            res.status(201).json({
                message: "법인카드가 등록되었습니다.",
                card_id: result.insertId
            });
        }
    );
});

// 신규 등록폼에서 선택할 전체 부서와 사원 목록 조회
router.get("/corporate-card-options", (req, res) => {
    db.query(
        `SELECT department_id, department_name
       FROM departments
       ORDER BY department_name, department_id`,
        (departmentError, departments) => {
            if (departmentError) {
                console.error("법인카드 등록용 부서 조회 오류:", departmentError);
                return res.status(500).json({
                    message: "부서 목록을 불러오지 못했습니다."
                });
            }

            db.query(
                `SELECT e.employee_id, e.employee_number, e.name, d.department_name
           FROM employees e
           LEFT JOIN departments d ON e.department_id = d.department_id
           ORDER BY e.name, e.employee_id`,
                (employeeError, employees) => {
                    if (employeeError) {
                        console.error("법인카드 등록용 관리자 조회 오류:", employeeError);
                        return res.status(500).json({
                            message: "관리자 목록을 불러오지 못했습니다."
                        });
                    }
                    res.json({ departments, employees });
                }
            );
        }
    );
});

// 법인카드 기본정보 수정
router.put("/corporate-cards/:cardId", (req, res) => {
    const cardId = Number(req.params.cardId);

    const {
        card_name,
        department_id,
        employee_id
    } = req.body;

    const cardName =
        typeof card_name === "string" ? card_name.trim() : "";

    // 부서와 관리자를 선택하지 않으면 NULL로 저장합니다.
    const departmentId =
        department_id == null || String(department_id).trim() === ""
            ? null
            : Number(department_id);

    const employeeId =
        employee_id == null || String(employee_id).trim() === ""
            ? null
            : Number(employee_id);

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    if (cardName === "" || cardName.length > 50) {
        return res.status(400).json({
            message: "법인카드명은 1~50자로 입력해 주세요."
        });
    }

    if (
        (departmentId !== null &&
            (!Number.isSafeInteger(departmentId) || departmentId <= 0)) ||
        (employeeId !== null &&
            (!Number.isSafeInteger(employeeId) || employeeId <= 0))
    ) {
        return res.status(400).json({
            message: "올바른 부서와 관리자를 선택해 주세요."
        });
    }

    // 기본정보만 수정하므로 사용량·한도·결제 이력은 유지됩니다.
    const query = `
      UPDATE corporate_cards
      SET
        card_name = ?,
        department_id = ?,
        employee_id = ?
      WHERE card_id = ?
    `;

    db.query(
        query,
        [cardName, departmentId, employeeId, cardId],
        (err, result) => {
            if (err) {
                console.error("법인카드 기본정보 수정 오류:", err);

                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "선택한 부서 또는 관리자가 존재하지 않습니다."
                    });
                }

                return res.status(500).json({
                    message: "법인카드 정보 수정에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "수정할 법인카드를 찾을 수 없습니다."
                });
            }

            res.json({
                message: "법인카드 정보가 수정되었습니다.",
                card_id: cardId
            });
        }
    );
});

// 법인카드 사용 중지·재개
router.put("/corporate-cards/:cardId/status", (req, res) => {
    const cardId = Number(req.params.cardId);
    const { card_status } = req.body;

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 사용: 결제 가능 / STOP: 새 결제 차단
    if (!["사용", "STOP"].includes(card_status)) {
        return res.status(400).json({
            message: "올바른 카드 상태를 선택해 주세요."
        });
    }

    db.query(
        `UPDATE corporate_cards
       SET card_status = ?
       WHERE card_id = ?`,
        [card_status, cardId],
        (err, result) => {
            if (err) {
                console.error("법인카드 상태 변경 오류:", err);

                return res.status(500).json({
                    message: "법인카드 상태 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "해당 법인카드를 찾을 수 없습니다."
                });
            }

            res.json({
                message:
                    card_status === "STOP"
                        ? "법인카드 사용이 중지되었습니다."
                        : "법인카드 사용이 재개되었습니다.",
                card_id: cardId,
                card_status
            });
        }
    );
});

// 회사계좌 사용 중지·재개
router.put("/bank-accounts/:accountId/status", (req, res) => {
    const accountId = Number(req.params.accountId);
    const { account_status } = req.body;

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    if (!["사용", "STOP"].includes(account_status)) {
        return res.status(400).json({
            message: "올바른 계좌 상태를 선택해 주세요."
        });
    }

    // 잔액과 거래 이력은 유지하고 상태만 변경합니다.
    db.query(
        `UPDATE bank_accounts
       SET account_status = ?
       WHERE account_id = ?`,
        [account_status, accountId],
        (err, result) => {
            if (err) {
                console.error("회사계좌 상태 변경 오류:", err);

                return res.status(500).json({
                    message: "회사계좌 상태 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "해당 회사계좌를 찾을 수 없습니다."
                });
            }

            res.json({
                message:
                    account_status === "STOP"
                        ? "회사계좌 사용이 중지되었습니다."
                        : "회사계좌 사용이 재개되었습니다.",
                account_id: accountId,
                account_status
            });
        }
    );
});

// 최종 승인된 기안서에 연결된 급여만 월별로 집계합니다. 지급 등록과는 별개입니다.
router.get('/payrolls/summary', (req, res) => {
    const query = `
        SELECT p.pay_month,
               'APPROVED' AS approval_status,
               COUNT(DISTINCT p.employee_id) AS employee_count,
               COUNT(*) AS payroll_count,
               SUM(p.base_salary) AS base_salary,
               SUM(p.allowance) AS allowance,
               SUM(p.bonus) AS bonus,
               SUM(p.gross_pay) AS gross_pay,
               SUM(p.deduction) AS deduction,
               SUM(p.net_pay) AS net_pay,
               SUM(CASE WHEN p.payment_status = '지급완료' THEN 1 ELSE 0 END) AS paid_count
        FROM payrolls p
        INNER JOIN my_draft d ON d.draft_id = p.draft_id
        WHERE d.status = 'APPROVED'
          AND p.pay_month REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'
          AND NOT EXISTS (
              SELECT 1 FROM trade_transactions linked_trade
              WHERE linked_trade.source_type = 'draft' AND linked_trade.source_id = d.draft_id
          )
        GROUP BY p.pay_month
        ORDER BY p.pay_month DESC
    `;
    db.query(query, (error, rows) => {
        if (error) {
            console.error('월 급여 조회 오류:', error);
            return res.status(500).json({ message: '월 급여 합계를 불러오지 못했습니다.' });
        }
        return res.json(rows.map(row => ({
            ...row,
            // 결재 상태가 아닌 payrolls의 지급 상태만 표시합니다.
            payment_status: Number(row.paid_count) === Number(row.payroll_count)
                ? '지급완료' : Number(row.paid_count) > 0 ? '일부 지급' : '지급대기'
        })));
    });
});

// 결재 문서 목록 조회
router.get("/approvals", (req, res) => {
    const query = `
      SELECT
        a.document_id,
        a.employee_id,
        e.name AS requester_name,
        d.department_name,
        a.title,
        a.content,
        a.amount,
        DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
        a.approval_status,
        a.document_type,
        DATE_FORMAT(
          a.created_at, '%Y-%m-%d %H:%i'
        ) AS created_at,
        p.payment_methods,
        source_link.transaction_id AS linked_transaction_id
      FROM approval_documents a
  
      LEFT JOIN employees e
        ON a.employee_id = e.employee_id
  
      LEFT JOIN departments d
        ON e.department_id = d.department_id
  
      LEFT JOIN (
        SELECT
          document_id,
          GROUP_CONCAT(
            DISTINCT payment_method
            ORDER BY payment_method
            SEPARATOR ', '
          ) AS payment_methods
        FROM payments
        WHERE payment_status = '완료'
        GROUP BY document_id
      ) p
        ON a.document_id = p.document_id
  
      LEFT JOIN trade_transactions source_link
        ON source_link.source_type = 'approval' AND source_link.source_id = a.document_id
      ORDER BY a.created_at DESC, a.document_id DESC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("결재 문서 목록 조회 오류:", err);

            return res.status(500).json({
                message: "결재 문서 목록을 불러오지 못했습니다."
            });
        }

        // 최종 승인된 내업무 기안서는 원본을 읽어 함께 표시합니다.
        // 문서 ID에 draft- 접두사를 붙여 기존 재무 문서 번호와 구분합니다.
        // detail_data는 아직 없는 DB도 있으므로 선택 목록에 직접 참조하지 않습니다.
        // 원본에 존재하면 변환 함수가 사용하고, 없으면 금액/마감일을 미등록으로 처리합니다.
        const draftQuery = `
          SELECT m.*,
                 DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i') AS created_at,
                 e.name AS requester_name, d.department_name, expense.expense_amount, source_link.transaction_id AS linked_transaction_id,
                 EXISTS (SELECT 1 FROM payrolls payroll WHERE payroll.draft_id = m.draft_id) AS is_payroll_draft
          FROM my_draft m
          LEFT JOIN employees e ON m.employee_id = e.employee_id
          LEFT JOIN departments d ON e.department_id = d.department_id
          LEFT JOIN (
            SELECT draft_id, SUM(amount) AS expense_amount
            FROM draft_expense
            GROUP BY draft_id
          ) expense ON expense.draft_id = m.draft_id
          LEFT JOIN trade_transactions source_link ON source_link.source_type = 'draft' AND source_link.source_id = m.draft_id
          WHERE m.status = 'APPROVED'
          ORDER BY m.created_at DESC, m.draft_id DESC
        `;
        db.query(draftQuery, (draftError, drafts) => {
            if (draftError) {
                console.error("승인 기안서 조회 오류:", draftError);
                // 기안서 연동 오류가 기존 재무 결재 목록까지 가리지 않도록 합니다.
                // 실제 오류 원인은 위 서버 로그로 확인합니다.
                return res.json(rows);
            }
            const combined = [...rows, ...toApprovedDraftView(drafts)];
            combined.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
            return res.json(combined);
        });
    });
});

// 문서별 결재자와 처리 이력 조회
router.get("/approvals/:documentId/steps", (req, res) => {
    const documentId = Number(req.params.documentId);

    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
            message: "올바른 문서 ID가 아닙니다."
        });
    }

    // 문서가 존재하는지 확인합니다.
    db.query(
        "SELECT document_id FROM approval_documents WHERE document_id = ?",
        [documentId],
        (documentError, documents) => {
            if (documentError) {
                console.error("결재 문서 확인 오류:", documentError);

                return res.status(500).json({
                    message: "결재 문서를 확인하지 못했습니다."
                });
            }

            if (documents.length === 0) {
                return res.status(404).json({
                    message: "해당 결재 문서를 찾을 수 없습니다."
                });
            }

            const query = `
          SELECT
            s.step_id,
            s.step_order,
            s.document_id,
            s.employee_id,
            e.name AS approver_name,
            d.department_name,
            s.step_status,
            DATE_FORMAT(
              s.action_at, '%Y-%m-%d %H:%i'
            ) AS action_at,
            s.opinion
          FROM approval_steps s
          LEFT JOIN employees e
            ON s.employee_id = e.employee_id
          LEFT JOIN departments d
            ON e.department_id = d.department_id
          WHERE s.document_id = ?
          ORDER BY s.step_order, s.step_id
        `;

            db.query(query, [documentId], (err, rows) => {
                if (err) {
                    console.error("결재 처리 이력 조회 오류:", err);

                    return res.status(500).json({
                        message: "결재 처리 이력을 불러오지 못했습니다."
                    });
                }

                res.json(rows);
            });
        }
    );
});

// 결재 기안 신규 등록
router.post("/approvals", async (req, res) => {
    const categoryCode = req.body.category_code;
    if (categoryCode && !category(categoryCode, '출금')) {
        return res.status(400).json({ message: '올바른 지출 세부 항목을 선택해 주세요.' });
    }

    const {
        employee_id, // 작성자 ID
        approver_id, // 결재자 ID
        title,
        content,
        amount,
        due_date,
        document_type
    } = req.body;

    const employeeId = Number(employee_id);
    const approverId = Number(approver_id);
    const documentAmount = Number(amount);
    const documentTitle =
        typeof title === "string" ? title.trim() : "";

    // 작성자와 결재자 확인
    if (
        !Number.isSafeInteger(employeeId) ||
        employeeId <= 0 ||
        !Number.isSafeInteger(approverId) ||
        approverId <= 0
    ) {
        return res.status(400).json({
            message: "작성자와 결재자를 선택해 주세요."
        });
    }

    // 제목 확인
    if (documentTitle === "" || documentTitle.length > 150) {
        return res.status(400).json({
            message: "제목은 1~150자로 입력해 주세요."
        });
    }

    // 신청 금액 확인
    if (
        amount == null ||
        String(amount).trim() === "" ||
        !Number.isSafeInteger(documentAmount) ||
        documentAmount <= 0
    ) {
        return res.status(400).json({
            message: "신청 금액은 1원 이상의 정수로 입력해 주세요."
        });
    }

    // 문서 유형 확인
    if (!["일반", "비용", "구매", "급여"].includes(document_type)) {
        return res.status(400).json({
            message: "문서 유형을 선택해 주세요."
        });
    }

    // 기한을 비워두면 NULL로 저장합니다.
    const dueDate =
        due_date === "" || due_date == null ? null : due_date;

    if (dueDate !== null) {
        const parsedDate = new Date(`${dueDate}T00:00:00Z`);

        if (
            typeof dueDate !== "string" ||
            !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dueDate) ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== dueDate
        ) {
            return res.status(400).json({
                message: "올바른 처리 마감일을 입력해 주세요."
            });
        }
    }

    if (content != null && typeof content !== "string") {
        return res.status(400).json({
            message: "내용은 문자로 입력해 주세요."
        });
    }

    let connection;

    try {
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // 문서와 결재자 정보가 모두 저장돼야 등록을 완료합니다.
        await connection.beginTransaction();

        // 프런트의 선택 목록과 별도로 DB의 현재 부서·계정 권한을 검증합니다.
        const [eligibleApprovers] = await connection.execute(
            `SELECT e.employee_id
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.account_status = 'ACTIVE'
               AND (e.department_id = 1 OR ea.role = 'MASTER')
             FOR UPDATE`,
            [approverId]
        );
        if (eligibleApprovers.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                message: "결재자는 재무부 소속의 활성 계정 또는 활성 MASTER 계정만 선택할 수 있습니다."
            });
        }

        const [documentResult] = await connection.execute(
            `INSERT INTO approval_documents (
          employee_id,
          title,
          content,
          amount,
          due_date,
          approval_status,
          document_type
        )
        VALUES (?, ?, ?, ?, ?, '대기', ?)`,
            [
                employeeId,
                documentTitle,
                content?.trim() || "",
                documentAmount,
                dueDate,
                document_type
            ]
        );

        const documentId = documentResult.insertId;
        if (categoryCode) {
            await connection.execute(
                "INSERT INTO finance_payment_classifications (source_type, source_id, category_code) VALUES ('approval', ?, ?)",
                [documentId, categoryCode]
            );
        }


        // 결재자는 1명이며 첫 번째 결재 단계로 저장합니다.
        await connection.execute(
            `INSERT INTO approval_steps (
          step_order,
          document_id,
          employee_id,
          step_status
        )
        VALUES (1, ?, ?, '대기')`,
            [documentId, approverId]
        );

        await connection.commit();

        return res.status(201).json({
            message: "결재 기안이 등록되었습니다.",
            document_id: documentId,
            approval_status: "대기"
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("기안 등록 취소 오류:", rollbackError);
            }
        }

        console.error("결재 기안 등록 오류:", err);

        if (err.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                message: "선택한 작성자 또는 결재자가 존재하지 않습니다."
            });
        }

        return res.status(500).json({
            message: "결재 기안 등록에 실패했습니다."
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (closeError) {
                console.error("DB 연결 종료 오류:", closeError);
            }
        }
    }
});

// 결재 승인·반려 처리
router.patch('/approvals/:documentId/decision', async (req, res) => {
    const documentId = Number(req.params.documentId);
    const payload = req.body || {};
    const employeeId = Number(payload.employee_id);
    const { decision, password, opinion = '' } = payload;

    if (!Number.isSafeInteger(documentId) || documentId <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: '올바른 문서와 로그인 사원 정보가 필요합니다.' });
    }
    if (!['승인', '반려'].includes(decision)) {
        return res.status(400).json({ message: '승인 또는 반려를 선택해 주세요.' });
    }
    if (typeof password !== 'string' || password === '') {
        return res.status(400).json({ message: '결재를 처리하려면 비밀번호를 입력해 주세요.' });
    }
    if (typeof opinion !== 'string' || opinion.trim().length > 500 ||
        (decision === '반려' && opinion.trim() === '')) {
        return res.status(400).json({ message: '의견은 500자 이내로 입력하고, 반려 시에는 사유를 작성해 주세요.' });
    }

    let connection;
    let transactionOpen = false;
    try {
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        // 제공된 기존 로그인 API와 같은 계정 확인 방식입니다.
        // 클라이언트가 보낸 사원 ID나 MASTER 표시만으로 승인하지 않습니다.
        const [accounts] = await connection.execute(
            `SELECT employee_id FROM employee_accounts
             WHERE employee_id = ? AND password_hash = ? AND account_status = 'ACTIVE'`,
            [employeeId, password]
        );
        if (accounts.length === 0) {
            return res.status(401).json({ message: '비밀번호 또는 계정 상태를 확인해 주세요.' });
        }

        await connection.beginTransaction();
        transactionOpen = true;
        // 지정 후 부서 이동 또는 권한 변경이 있어도 현재 권한으로 처리합니다.
        const [eligibleApprovers] = await connection.execute(
            `SELECT e.employee_id
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.account_status = 'ACTIVE'
               AND (e.department_id = 1 OR ea.role = 'MASTER')
             FOR UPDATE`,
            [employeeId]
        );
        if (eligibleApprovers.length === 0) {
            await connection.rollback();
            transactionOpen = false;
            return res.status(403).json({
                message: '결재는 재무부 소속의 활성 계정 또는 활성 MASTER 계정만 처리할 수 있습니다.'
            });
        }
        // 문서부터 잠가서 같은 문서에 대한 중복·동시 결재를 순서대로 처리합니다.
        const [documents] = await connection.execute(
            'SELECT document_id, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE',
            [documentId]
        );
        function fail(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        }
        if (documents.length === 0) fail(404, '해당 결재 문서를 찾을 수 없습니다.');
        if (documents[0].approval_status !== '대기') fail(409, '이미 처리된 문서입니다. 최신 상태를 확인해 주세요.');

        const [steps] = await connection.execute(
            `SELECT step_id, step_order, employee_id, step_status FROM approval_steps
             WHERE document_id = ? ORDER BY step_order, step_id FOR UPDATE`,
            [documentId]
        );
        if (steps.length === 0) fail(409, '등록된 결재 단계가 없습니다.');
        if (steps.some((step) => !['대기', '승인'].includes(step.step_status))) {
            fail(409, '문서와 결재 단계의 상태를 확인해 주세요.');
        }
        // 여러 결재 단계가 있으면 앞선 단계가 모두 승인된 뒤 다음 단계로 넘어갑니다.
        const currentStep = steps.find((step) => step.step_status === '대기');
        if (!currentStep) fail(409, '처리할 결재 단계가 없습니다.');
        if (Number(currentStep.employee_id) !== employeeId) fail(403, '현재 순서의 지정 결재자만 처리할 수 있습니다.');

        const [updated] = await connection.execute(
            `UPDATE approval_steps SET step_status = ?, opinion = ?, action_at = NOW()
             WHERE step_id = ? AND step_status = '대기'`,
            [decision, opinion.trim() || null, currentStep.step_id]
        );
        if (updated.affectedRows !== 1) fail(409, '이미 처리된 결재 단계입니다.');
        const remaining = steps.some((step) => step.step_id !== currentStep.step_id && step.step_status === '대기');
        const documentStatus = decision === '반려' ? '반려' : remaining ? '대기' : '승인';
        await connection.execute(
            'UPDATE approval_documents SET approval_status = ? WHERE document_id = ?',
            [documentStatus, documentId]
        );
        await connection.commit();
        transactionOpen = false;
        return res.json({
            message: decision === '반려' ? '결재 문서가 반려되었습니다.' :
                remaining ? '승인되었습니다. 다음 결재자의 처리를 기다립니다.' : '최종 승인되었습니다.',
            document_id: documentId,
            approval_status: documentStatus,
            step_id: currentStep.step_id,
            step_status: decision
        });
    } catch (error) {
        if (transactionOpen) {
            try { await connection.rollback(); } catch { console.error('결재 처리 롤백 실패'); }
        }
        if (!error.status) console.error('결재 승인·반려 처리 실패:', error.code || error.name);
        return res.status(error.status || 500).json({
            message: error.status ? error.message : '결재를 처리하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.'
        });
    } finally {
        if (connection) {
            try { await connection.end(); } catch { console.error('결재 DB 연결 종료 실패'); }
        }
    }
});

// 결재 문서별 지급 현황 및 지급 내역 조회
router.get("/approvals/:documentId/payments", (req, res) => {
    const documentId = Number(req.params.documentId);

    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
            message: "올바른 문서 ID가 아닙니다."
        });
    }

    // 완료된 출금만 지급액에 포함합니다.
    const summaryQuery = `
        SELECT
            a.document_id,
            a.approval_status,
            a.amount AS document_amount,
            COALESCE(SUM(p.amount), 0) AS paid_amount,
            a.amount - COALESCE(SUM(p.amount), 0) AS remaining_amount
        FROM approval_documents a
        LEFT JOIN payments p
            ON a.document_id = p.document_id
            AND p.payment_direction = '출금'
            AND p.payment_status = '완료'
        WHERE a.document_id = ?
        GROUP BY
            a.document_id,
            a.approval_status,
            a.amount
    `;

    db.query(summaryQuery, [documentId], (summaryError, rows) => {
        if (summaryError) {
            console.error("지급 현황 조회 실패:", summaryError.code);

            return res.status(500).json({
                message: "지급 현황을 불러오지 못했습니다."
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: "해당 결재 문서를 찾을 수 없습니다."
            });
        }

        const historyQuery = `
            SELECT
                payment_id,
                document_id,
                transaction_id,
                DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
                amount,
                payment_method,
                account_id,
                card_id,
                payment_direction,
                payment_status
            FROM payments
            WHERE document_id = ?
            ORDER BY payment_date DESC, payment_id DESC
        `;

        db.query(historyQuery, [documentId], (historyError, payments) => {
            if (historyError) {
                console.error("지급 내역 조회 실패:", historyError.code);

                return res.status(500).json({
                    message: "지급 내역을 불러오지 못했습니다."
                });
            }

            return res.json({
                summary: rows[0],
                payments
            });
        });
    });
});

// 승인된 결재 문서의 지급 등록
router.post('/approvals/:documentId/payments', async (req, res) => {
    const documentId = Number(req.params.documentId);
    const body = req.body || {};
    const { payment_date, amount, payment_method, password } = body;
    const employeeId = Number(body.employee_id);
    const paymentAmount = Number(amount);
    const accountId = payment_method === '계좌이체' ? Number(body.account_id) : null;
    const cardId = payment_method === '법인카드' ? Number(body.card_id) : null;
    const validId = (value) => Number.isSafeInteger(value) && value > 0;

    if (!validId(documentId) || !validId(employeeId) ||
        !['string', 'number'].includes(typeof amount) ||
        !Number.isSafeInteger(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ message: '문서 ID, 로그인 사원 정보와 1원 이상의 정수 금액이 필요합니다.' });
    }
    if (typeof password !== 'string' || !password) {
        return res.status(400).json({ message: '지급 등록자의 로그인 비밀번호를 입력해 주세요.' });
    }
    const date = new Date(`${payment_date}T00:00:00Z`);
    if (typeof payment_date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(payment_date) ||
        Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== payment_date) {
        return res.status(400).json({ message: '올바른 지급일을 입력해 주세요.' });
    }
    if (!['계좌이체', '법인카드', '현금'].includes(payment_method)) {
        return res.status(400).json({ message: '결제수단은 계좌이체, 법인카드 또는 현금을 선택해 주세요.' });
    }
    if ((accountId !== null && !validId(accountId)) ||
        (cardId !== null && !validId(cardId))) {
        return res.status(400).json({ message: '결제수단에 맞는 회사계좌 또는 법인카드를 선택해 주세요.' });
    }
    // monthly_usage와 remaining_limit을 갱신하므로 카드 지급은 현재 월만 받습니다.
    if (cardId !== null) {
        const parts = new Intl.DateTimeFormat('en', {
            timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit'
        }).formatToParts(new Date());
        const month = `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
        if (!payment_date.startsWith(`${month}-`)) {
            return res.status(400).json({ message: '법인카드 지급일은 현재 월로 입력해 주세요.' });
        }
    }

    let connection;
    let transactionOpen = false;
    function fail(status, message) {
        const error = new Error(message);
        error.status = status;
        throw error;
    }
    function money(value, label) {
        const number = Number(value);
        if (value == null || !Number.isSafeInteger(number) || number < 0) {
            fail(409, `${label} 금액을 확인해 주세요.`);
        }
        return number;
    }

    try {
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        // 기존 로그인과 같은 방식으로 계정을 확인하며, 지급은 재무부 또는 MASTER가 등록합니다.
        const [accounts] = await connection.execute(
            `SELECT e.employee_id, e.department_id, ea.role
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`,
            [employeeId, password]
        );
        if (accounts.length === 0) fail(401, '비밀번호 또는 계정 상태를 확인해 주세요.');
        if (Number(accounts[0].department_id) !== 1 && accounts[0].role !== 'MASTER') {
            fail(403, '재무부 또는 MASTER 계정만 지급을 등록할 수 있습니다.');
        }

        await connection.beginTransaction();
        transactionOpen = true;
        // 반드시 문서를 먼저 잠급니다. 같은 문서의 동시 지급 요청은 순서대로 처리됩니다.
        const [documents] = await connection.execute(
            'SELECT document_id, amount, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE',
            [documentId]
        );
        if (documents.length === 0) fail(404, '해당 결재 문서를 찾을 수 없습니다.');
        if (documents[0].approval_status !== '승인') fail(409, '승인된 문서에만 지급을 등록할 수 있습니다.');
        const [tradeLinks] = await connection.execute(
            "SELECT transaction_id FROM trade_transactions WHERE source_type = 'approval' AND source_id = ? FOR UPDATE", [documentId]);
        if (tradeLinks.length) fail(409, '거래로 연결된 문서입니다. 품목관리의 거래 전표에서 지급해주세요.');
        const documentAmount = money(documents[0].amount, '결재 문서');
        if (documentAmount === 0) fail(409, '지급할 문서 금액이 없습니다.');

        // 잠금 읽기로 직전에 완료된 다른 요청의 지급 내역까지 확인합니다.
        const [payments] = await connection.execute(
            `SELECT payment_id, amount FROM payments
             WHERE document_id = ? AND payment_direction = '출금' AND payment_status = '완료'
             FOR UPDATE`,
            [documentId]
        );
        let paidAmount = 0;
        for (const payment of payments) {
            paidAmount += money(payment.amount, '기존 지급');
            if (!Number.isSafeInteger(paidAmount)) fail(409, '기존 지급 합계가 처리 가능한 범위를 초과합니다.');
        }
        const remainingAmount = documentAmount - paidAmount;
        if (remainingAmount <= 0) fail(409, '추가로 지급할 금액이 없습니다.');
        if (paymentAmount > remainingAmount) {
            fail(409, `남은 지급액 ${remainingAmount.toLocaleString('ko-KR')}원을 초과할 수 없습니다.`);
        }

        if (accountId !== null) {
            const [bankAccounts] = await connection.execute(
                'SELECT balance, currency, account_status FROM bank_accounts WHERE account_id = ? FOR UPDATE',
                [accountId]
            );
            if (bankAccounts.length === 0) fail(404, '선택한 회사계좌를 찾을 수 없습니다.');
            const bank = bankAccounts[0];
            if (bank.currency !== 'KRW' || !['사용', 'ACTIVE'].includes(bank.account_status)) {
                fail(409, '사용 가능한 원화 계좌를 선택해 주세요.');
            }
            const balance = money(bank.balance, '회사계좌 잔액');
            if (paymentAmount > balance) fail(409, '회사계좌의 잔액이 부족합니다.');
            await connection.execute(
                `UPDATE bank_accounts SET balance = ?,
                 last_transaction = GREATEST(COALESCE(last_transaction, ?), ?)
                 WHERE account_id = ?`,
                [balance - paymentAmount, `${payment_date} 00:00:00`, `${payment_date} 00:00:00`, accountId]
            );
        }
        if (cardId !== null) {
            const [cards] = await connection.execute(
                `SELECT monthly_usage, monthly_limit, remaining_limit, card_status
                 FROM corporate_cards WHERE card_id = ? FOR UPDATE`,
                [cardId]
            );
            if (cards.length === 0) fail(404, '선택한 법인카드를 찾을 수 없습니다.');
            const card = cards[0];
            if (!['사용', 'ACTIVE'].includes(card.card_status)) fail(409, '사용 가능한 법인카드를 선택해 주세요.');
            const usage = money(card.monthly_usage, '카드 사용량');
            const limit = money(card.monthly_limit, '카드 한도');
            const remainingLimit = money(card.remaining_limit, '카드 잔여 한도');
            if (limit - usage !== remainingLimit) fail(409, '법인카드 사용량과 잔여 한도가 일치하지 않습니다.');
            if (paymentAmount > remainingLimit) fail(409, '법인카드 잔여 한도를 초과할 수 없습니다.');
            await connection.execute(
                'UPDATE corporate_cards SET monthly_usage = ?, remaining_limit = ? WHERE card_id = ?',
                [usage + paymentAmount, remainingLimit - paymentAmount, cardId]
            );
        }

        // 문서에 직접 연결합니다. 거래 API와 별개로 transaction_id는 NULL입니다.
        const [result] = await connection.execute(
            `INSERT INTO payments
             (document_id, transaction_id, payment_date, amount, payment_method,
              account_id, card_id, payment_direction, payment_status)
             VALUES (?, NULL, ?, ?, ?, ?, ?, '출금', '완료')`,
            [documentId, payment_date, paymentAmount, payment_method, accountId, cardId]
        );
        await connection.commit();
        transactionOpen = false;
        return res.status(201).json({
            message: '지급 내역이 등록되었습니다.',
            payment_id: result.insertId,
            document_id: documentId,
            document_amount: documentAmount,
            paid_amount: paidAmount + paymentAmount,
            remaining_amount: remainingAmount - paymentAmount
        });
    } catch (error) {
        if (transactionOpen) {
            try { await connection.rollback(); } catch { console.error('문서 지급 롤백 실패'); }
        }
        if (!error.status) console.error('문서 지급 등록 실패:', error.code || error.name);
        return res.status(error.status || 500).json({
            message: error.status ? error.message :
                '지급 결과를 확인하지 못했습니다. 지급 내역을 다시 조회한 뒤 확인해 주세요.'
        });
    } finally {
        if (connection) {
            try { await connection.end(); } catch { console.error('문서 지급 DB 연결 종료 실패'); }
        }
    }
});


// 재무 대시보드: 기존 공통 라우터/등록 API는 그대로 유지합니다.
router.get('/dashboard', async (req, res) => {
    const query = (sql, params = []) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    // DB 서버의 시간대와 관계없이 한국 날짜를 기준으로 조회합니다.
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = (type) => parts.find((value) => value.type === type).value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const base = new Date(`${today}T00:00:00Z`);
    const dateText = (date) => date.toISOString().slice(0, 10);
    const addDays = (date, days) => { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; };
    const monday = addDays(base, -((base.getUTCDay() + 6) % 7));
    const year = base.getUTCFullYear();
    const month = base.getUTCMonth();
    const spans = {
        day: [base, addDays(base, 1)],
        week: [monday, addDays(monday, 7)],
        month: [new Date(Date.UTC(year, month, 1)), new Date(Date.UTC(year, month + 1, 1))],
        year: [new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1))]
    };
    const keys = Object.keys(spans);
    const ranges = {};
    const params = [];
    keys.forEach((key) => {
        const [start, end] = spans[key];
        ranges[key] = { start: dateText(start), last: dateText(addDays(end, -1)) };
        params.push(dateText(start), dateText(end));
    });
    // 컬럼/별칭은 고정된 내부 값만 사용하고 날짜는 바인딩합니다.
    const sums = (dateColumn, amountColumn) => keys.map((key) =>
        `COALESCE(SUM(CASE WHEN ${dateColumn} >= ? AND ${dateColumn} < ? THEN ${amountColumn} ELSE 0 END), 0) AS ${key}_amount`
    ).join(', ');
    const remainingJoin = `
        FROM approval_documents a
        LEFT JOIN (
            SELECT document_id, SUM(amount) AS paid
            FROM (${approvalPaidRowsSql}) source_payments
            GROUP BY document_id
        ) paid ON paid.document_id = a.document_id`;
    const remaining = 'GREATEST(a.amount - COALESCE(paid.paid, 0), 0)';
    try {
        const counts = await query(`SELECT
            (SELECT COUNT(*) FROM corporate_cards) AS cards,
            (SELECT COUNT(*) FROM bank_accounts) AS accounts,
            (SELECT COUNT(*) FROM approval_documents WHERE approval_status = '대기') AS approvals,
            (SELECT COUNT(*) FROM partners) AS partners,
            (SELECT COUNT(*) FROM trade_items) AS items`);
        const completedRows = await query(`SELECT ${sums('payment_date', 'amount')}
            FROM payments WHERE payment_status = '완료' AND payment_direction = '출금'`, params);
        const plannedRows = await query(`SELECT ${sums('a.due_date', remaining)}
            ${remainingJoin} WHERE a.approval_status = '승인'`, params);
        const scheduledRows = await query(`SELECT a.document_id, a.title,
            DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
            ${remaining} AS remaining_amount
            ${remainingJoin}
            WHERE a.approval_status = '승인' AND a.due_date IS NOT NULL
                AND ${remaining} > 0
            ORDER BY a.due_date, a.document_id`);
        const amounts = (rows) => Object.fromEntries(keys.map((key) => [key, Number(rows[0][`${key}_amount`])]));
        res.json({
            counts: Object.fromEntries(Object.entries(counts[0]).map(([key, value]) => [key, Number(value)])),
            ranges,
            completed: amounts(completedRows),
            planned: amounts(plannedRows),
            schedules: scheduledRows.map((row) => ({
                id: row.document_id, title: row.title,
                start: row.due_date, end: row.due_date, typeId: 1,
                description: `지급예정: ${Number(row.remaining_amount).toLocaleString('ko-KR')}원`
            }))
        });
    } catch (err) {
        console.error('재무 대시보드 조회 오류:', err);
        res.status(500).json({ message: '재무 대시보드를 불러오지 못했습니다.' });
    }
});

// 대시보드 지급 일정 상세조회
router.get('/dashboard/schedules/:documentId', (req, res) => {
    const documentId = Number(req.params.documentId);

    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
            message: '올바른 문서 ID가 필요합니다.'
        });
    }

    const sql = `
        SELECT
            a.document_id,
            a.title,
            a.content,
            a.document_type,
            a.approval_status,
            a.amount,
            DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
            e.name AS requester_name,
            d.department_name,
            COALESCE(p.paid_amount, 0) AS paid_amount,
            GREATEST(
                a.amount - COALESCE(p.paid_amount, 0),
                0
            ) AS remaining_amount
        FROM approval_documents a
        LEFT JOIN employees e
            ON a.employee_id = e.employee_id
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        LEFT JOIN (
            SELECT document_id, SUM(amount) AS paid_amount
            FROM (${approvalPaidRowsSql}) source_payments
            GROUP BY document_id
        ) p ON a.document_id = p.document_id
        WHERE a.document_id = ?
          AND a.approval_status = '승인'
          AND a.due_date IS NOT NULL
    `;

    db.query(sql, [documentId], (err, rows) => {
        if (err) {
            console.error('지급 일정 상세조회 오류:', err);

            return res.status(500).json({
                message: '지급 일정 상세정보를 불러오지 못했습니다.'
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: '조회할 지급 문서를 찾을 수 없습니다.'
            });
        }

        res.json(rows[0]);
    });
});

// 영수증·청구서·견적서 보관: 실제 거래/결재/지급과 별도로 저장합니다.
const financeDocumentTypes = { receipt: 'REC', invoice: 'INV', estimate: 'EST' };
const financeDocumentCurrencies = { KRW: 0, USD: 2, EUR: 2, JPY: 0 };
const financeDocumentSelect = `SELECT CAST(f.doc_id AS CHAR) AS doc_id,
    f.document_number, f.document_type, f.employee_id, f.partner_id,
    DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date,
    DATE_FORMAT(f.due_date, '%Y-%m-%d') AS due_date,
    f.currency, CAST(f.total_amount AS CHAR) AS total_amount, f.snapshot_json,
    DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM finance_documents f`;

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

function financeDocumentPayload(body) {
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
        const quantity = financeDocumentScaled(item.quantity, 3, '수량', 1000000, false);
        const price = financeDocumentScaled(item.unitPrice, digits, '단가', 1000000000);
        const rate = financeDocumentScaled(item.taxRate, 2, '세율', 100);
        const supply = (quantity * price + 500n) / 1000n;
        const tax = (supply * rate + 5000n) / 10000n;
        supplyMinor += supply;
        taxMinor += tax;
        return {
            id: index + 1,
            name: financeDocumentText(item.name, '품목명', 150, true),
            description: financeDocumentText(item.description, '품목 설명', 300),
            quantity: financeDocumentDecimal(quantity, 3),
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
            business: financeDocumentParty(raw.business, '사업자 정보'), customer: financeDocumentParty(raw.customer, '고객 정보'),
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
        if (type) { where.push('f.document_type = ?'); params.push(type); }
        if (search) {
            where.push(`(INSTR(f.document_number, ?) > 0 OR INSTR(JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.data.customer.name')), ?) > 0 OR INSTR(JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.author.name')), ?) > 0)`);
            params.push(search, search, search);
        }
        const filter = where.length ? ` WHERE ${where.join(' AND ')}` : '';
        const query = (sql, values) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
        const counts = await query(`SELECT COUNT(*) AS total FROM finance_documents f${filter}`, params);
        const rows = await query(`SELECT CAST(f.doc_id AS CHAR) AS doc_id, f.document_number, f.document_type,
            DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date, f.currency, CAST(f.total_amount AS CHAR) AS total_amount,
            JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.data.customer.name')) AS customer_name,
            JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.author.name')) AS employee_name,
            DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
            FROM finance_documents f${filter} ORDER BY f.doc_id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        return res.json({ items: rows, total: Number(counts[0].total), page, limit });
    } catch (error) { return financeDocumentError(res, error); }
});

router.get('/documents/:docId', (req, res) => {
    let id;
    try { id = financeDocumentId(req.params.docId, '문서 ID'); }
    catch (error) { return financeDocumentError(res, error); }
    db.query(`${financeDocumentSelect} WHERE f.doc_id = ?`, [id], (error, rows) => {
        if (error) return financeDocumentError(res, error);
        if (!rows.length) return res.status(404).json({ message: '저장 문서를 찾을 수 없습니다.' });
        try { return res.json(financeDocumentDecode(rows[0])); }
        catch (decodeError) { return financeDocumentError(res, decodeError); }
    });
});

router.post('/documents', async (req, res) => {
    let connection;
    try {
        const payload = financeDocumentPayload(req.body);
        // 제공된 기존 API와 동일한 사원 ID 전달 방식입니다.
        // 서버 인증 미들웨어가 있다면 인증된 req.user.employee_id를 우선 사용합니다.
        const employeeId = financeDocumentId(req.user?.employee_id ?? req.body.employee_id, '작성 사원 ID');
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
            supportBigNumbers: true, bigNumberStrings: true
        });
        await connection.beginTransaction();
        const [employees] = await connection.execute('SELECT employee_id, name FROM employees WHERE employee_id = ?', [employeeId]);
        if (!employees.length) financeDocumentFail(400, '작성 사원을 찾을 수 없습니다. 다시 로그인해주세요.');
        if (payload.partnerId !== null) {
            const [partners] = await connection.execute('SELECT partner_id FROM partners WHERE partner_id = ?', [payload.partnerId]);
            if (!partners.length) financeDocumentFail(400, '선택한 거래처가 없습니다. 거래처 목록을 다시 불러오거나 직접 입력으로 변경해주세요.');
        }
        const createdDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const snapshot = {
            version: 1, type: payload.type, data: payload.data, totals: payload.totals,
            author: { employee_id: employeeId, name: employees[0].name }, createdDate
        };
        // NOT NULL + UNIQUE를 유지하면서, 확정 번호를 같은 트랜잭션 안에서 발급합니다.
        const temporaryNumber = 'TMP-' + require('crypto').randomBytes(12).toString('hex');
        const [insert] = await connection.execute(`INSERT INTO finance_documents
            (document_number, document_type, employee_id, partner_id, issue_date, due_date, currency, total_amount, snapshot_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [temporaryNumber, payload.type, employeeId, payload.partnerId, payload.data.date, payload.data.extraDate || null,
                payload.data.currency, payload.totals.total, JSON.stringify(snapshot)]);
        const id = String(insert.insertId);
        financeDocumentId(id, '생성 문서 ID');
        const documentNumber = `${financeDocumentTypes[payload.type]}-${id.padStart(6, '0')}`;
        snapshot.data.number = documentNumber;
        snapshot.data.partnerId = payload.partnerId || '';
        await connection.execute('UPDATE finance_documents SET document_number = ?, snapshot_json = ? WHERE doc_id = ?',
            [documentNumber, JSON.stringify(snapshot), id]);
        const [rows] = await connection.execute(`${financeDocumentSelect} WHERE f.doc_id = ?`, [id]);
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


// 결제 관리: 완료된 입출금과 미정산 잔액을 서로 분리해 조회합니다.
router.get('/payment-management', async (req, res) => {
    let connection;
    try {
        const direction = req.query.direction || '출금';
        if (!['출금', '입금'].includes(direction)) return res.status(400).json({ message: '입출금 구분을 확인해 주세요.' });
        const range = period(req.query.month);
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction();
        // 품목과 직접 조인하지 않아, 품목 수에 따라 지급 금액이 중복 합산되지 않습니다.
        const [rows] = await connection.execute(`SELECT p.payment_id, p.document_id, p.transaction_id,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
            p.amount, p.payment_method, p.payment_status,
            COALESCE(a.title, t.company_name, '연결 문서 없는 입출금') AS title,
            CASE WHEN p.document_id IS NOT NULL THEN 'approval'
                 WHEN p.transaction_id IS NOT NULL THEN 'transaction' ELSE 'payment' END AS source_type,
            COALESCE(p.document_id, p.transaction_id, p.payment_id) AS source_id,
            c.category_code
            FROM payments p
            LEFT JOIN approval_documents a ON a.document_id = p.document_id
            LEFT JOIN trade_transactions t ON t.transaction_id = p.transaction_id
            LEFT JOIN finance_payment_classifications c ON c.source_type =
                CASE WHEN p.document_id IS NOT NULL THEN 'approval'
                     WHEN p.transaction_id IS NOT NULL THEN 'transaction' ELSE 'payment' END
                AND c.source_id = COALESCE(p.document_id, p.transaction_id, p.payment_id)
            WHERE p.payment_direction = ? AND p.payment_status = '완료'
              AND p.payment_date >= ? AND p.payment_date < ?
            ORDER BY p.payment_date DESC, p.payment_id DESC`,
            [direction, range.previousStart, range.endExclusive]);
        const decorate = row => {
            const item = category(row.category_code, direction) || category('unclassified', direction);
            return {
                ...row, amount: Number(row.amount), category_code: item.code,
                category_label: item.label, group_id: item.group_id, group_label: item.group_label
            };
        };
        const entries = rows.filter(row => row.payment_date >= range.start).map(decorate);
        const previousEntries = rows.filter(row => row.payment_date >= range.previousStart && row.payment_date < range.previousEndExclusive);
        let scheduled = [];
        if (direction === '출금') {
            const [documents] = await connection.execute(`SELECT a.document_id AS source_id, 'approval' AS source_type,
                a.title, DATE_FORMAT(COALESCE(a.due_date, a.created_at), '%Y-%m-%d') AS payment_date,
                GREATEST(a.amount - COALESCE(p.paid, 0), 0) AS amount, c.category_code
                FROM approval_documents a
                LEFT JOIN (SELECT document_id, SUM(amount) AS paid FROM payments
                    WHERE payment_status = '완료' AND payment_direction = '출금' GROUP BY document_id) p
                    ON p.document_id = a.document_id
                LEFT JOIN finance_payment_classifications c ON c.source_type = 'approval' AND c.source_id = a.document_id
                WHERE a.approval_status = '승인' AND NOT EXISTS (SELECT 1 FROM trade_transactions link WHERE link.source_type = 'approval' AND link.source_id = a.document_id) AND COALESCE(a.due_date, a.created_at) >= ?
                    AND COALESCE(a.due_date, a.created_at) < ?
                HAVING amount > 0`, [range.start, range.monthEndExclusive]);
            scheduled.push(...documents);
        }
        const [trades] = await connection.execute(`SELECT t.transaction_id AS source_id, 'transaction' AS source_type,
            t.company_name AS title, DATE_FORMAT(COALESCE(t.due_date, t.trade_date), '%Y-%m-%d') AS payment_date,
            GREATEST(i.total - COALESCE(p.paid, 0), 0) AS amount, c.category_code
            FROM trade_transactions t
            INNER JOIN (SELECT transaction_id, SUM(supply_price + vat) AS total FROM trade_items GROUP BY transaction_id) i
                ON i.transaction_id = t.transaction_id
            LEFT JOIN (SELECT transaction_id, SUM(amount) AS paid FROM payments
                WHERE payment_status = '완료' AND payment_direction = ? GROUP BY transaction_id) p
                ON p.transaction_id = t.transaction_id
            LEFT JOIN finance_payment_classifications c ON c.source_type = 'transaction' AND c.source_id = t.transaction_id
            WHERE t.trade_type = ? AND COALESCE(t.due_date, t.trade_date) >= ?
                AND COALESCE(t.due_date, t.trade_date) < ? HAVING amount > 0`,
            [direction, direction === '출금' ? '매입' : '매출', range.start, range.monthEndExclusive]);
        scheduled.push(...trades);
        scheduled = scheduled.map(decorate);
        const totals = summary(entries, previousEntries, scheduled);
        await connection.commit();
        return res.json({ range, groups: groups(direction), entries, scheduled, summary: totals });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError.code); } }
        console.error('결제 관리 조회 실패:', error.code || error.message);
        return res.status(error.status || 500).json({
            message: error.status ? error.message :
                '결제 관리 조회에 실패했습니다. 분류 테이블 SQL 적용 여부와 DB 연결을 확인해 주세요.'
        });
    } finally {
        if (connection) { try { await connection.end(); } catch (error) { console.error(error.code); } }
    }
});

// 기존 문서/거래를 분류합니다. 계좌 잔액, 카드 한도, 지급 금액은 변경하지 않습니다.
router.put('/payment-management/classification', async (req, res) => {
    const { source_type: type, source_id: rawId, category_code: code, password } = req.body || {};
    const employeeId = Number(req.user?.employee_id ?? req.body?.employee_id);
    const id = Number(rawId);
    if (!['approval', 'transaction', 'payment'].includes(type) || !Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0 || typeof password !== 'string' || !password) {
        return res.status(400).json({ message: '분류할 거래와 로그인 비밀번호를 확인해 주세요.' });
    }
    let connection;
    const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
    try {
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
            password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });
        const [users] = await connection.execute(`SELECT e.department_id, ea.role FROM employees e
            INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
            WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`, [employeeId, password]);
        if (!users.length) fail(401, '비밀번호 또는 계정 상태를 확인해 주세요.');
        if (Number(users[0].department_id) !== 1 && users[0].role !== 'MASTER') fail(403, '재무부 또는 MASTER만 분류를 변경할 수 있습니다.');
        await connection.beginTransaction();
        let rows;
        if (type === 'approval') {
            [rows] = await connection.execute("SELECT '출금' AS direction FROM approval_documents WHERE document_id = ? FOR UPDATE", [id]);
        } else if (type === 'transaction') {
            [rows] = await connection.execute("SELECT CASE WHEN trade_type = '매출' THEN '입금' ELSE '출금' END AS direction FROM trade_transactions WHERE transaction_id = ? FOR UPDATE", [id]);
        } else {
            [rows] = await connection.execute('SELECT payment_direction AS direction FROM payments WHERE payment_id = ? AND document_id IS NULL AND transaction_id IS NULL FOR UPDATE', [id]);
        }
        if (!rows.length) fail(404, '분류할 문서 또는 거래가 없습니다.');
        if (!category(code, rows[0].direction)) fail(400, '해당 입출금 구분에 맞는 분류를 선택해 주세요.');
        await connection.execute(`INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE category_code = VALUES(category_code)`, [type, id, code]);
        await connection.commit();
        return res.json({ message: '분류를 저장했습니다.' });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError.code); } }
        return res.status(error.status || 500).json({ message: error.status ? error.message : '분류를 저장하지 못했습니다. DB 연결과 분류 테이블을 확인해 주세요.' });
    } finally {
        if (connection) { try { await connection.end(); } catch (error) { console.error(error.code); } }
    }
});

module.exports = router;
