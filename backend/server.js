// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 4000;

const Attendance = require('./models/Attendance'); //출결관련 함수 클레스
const financeMysql = require("mysql2/promise"); // 재무 거래 저장용 Promise DB 연결

app.use(cors());
app.use(express.json());

// 2. [사원 등록 API] RegisterPage 폼 전송 수신
app.post('/api/register', async (req, res) => {
    const { employeeId, name, email, password, department, position, phone } = req.body;

    if (!employeeId || !name || !email || !password) {
        return res.status(400).json({ error: '사원번호, 이름, 이메일, 비밀번호는 필수입니다.' });
    }

    try {
        const query = `
            INSERT INTO users (employee_id, name, email, password, department, position, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [
            employeeId,
            name,
            email,
            password,
            department,
            position,
            phone
        ]);

        console.log(`✅ 사원 등록 완료: [${employeeId}] ${name}`);
        res.status(201).json({ message: '사원 등록 성공', insertedId: result.insertId });
    } catch (error) {
        console.error('회원가입 에러:', error);
        if (error.errno === 1062) {
            return res.status(409).json({ error: '이미 사용 중인 사원번호 또는 이메일입니다.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// 3. [사원 목록 조회 API]
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, employee_id, name, email, department, position, phone, created_at FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error('사원 목록 조회 에러:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { empNumber } = req.params;
        const records = await Attendance.getData(empNumber);

        res.json({
            result: 'success',
            data: records
        });
    }
    catch (err) {
        return res.json({ result: 'fail' })
    }
}
)

app.post('/api/login', (req, res) => {
    const query = `
        SELECT 
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            e.position,
            e.email,
            ea.role,
            ea.account_status
        FROM employees e
        INNER JOIN employee_accounts ea ON e.employee_id = ea.employee_id
        WHERE e.email = ? AND ea.password_hash = ?`;

    const value = [
        req.body.email,
        req.body.password
    ];

    db.query(query, value, (err, data) => {
        if (err) {
            console.error('DB 에러:', err);
            return res.status(500).json({ message: '데이터베이스 조회 오류' });
        }

        if (data && data.length > 0) {
            const user = data[0];

            // 휴직/비활성 계정 체크
            if (user.account_status !== 'ACTIVE') {
                return res.status(403).json(
                    { message: '현재 휴직 또는 비활성화된 계정입니다.' }
                );
            }

            // 로그인 성공
            return res.json({
                result: 'success',
                user: {
                    employee_id: user.employee_id,
                    employee_number: user.employee_number,
                    name: user.name,
                    department_id: user.department_id,
                    position: user.position,
                    role: user.role
                }
            });
        } else {
            return res.status(401).json(
                { message: '이메일 또는 비밀번호가 일치하지 않습니다.' }
            );
        }
    });
});

//<여기서부터는 전부 재무관리 전용 API 입니다>
// [재무관리] 거래처 목록 조회
app.get("/api/finance/partners", (req, res) => {
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
app.post("/api/finance/partners", (req, res) => {
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

    const query = `
INSERT INTO partners (
company_name, tax_id, representative_name, company_phone,
company_address, memo, trade_role, company_type,
closing_day, bank_name, account_number, account_holder
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        optionalText(account_holder)
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
app.put("/api/finance/partners/:id", (req, res) => {
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
closing_day=?, bank_name=?, account_number=?, account_holder=?
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
app.delete("/api/finance/partners/:id", (req, res) => {
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
app.get("/api/finance/items", (req, res) => {
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
p.closing_day
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
app.post("/api/finance/items", async (req, res) => {
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
         trade_date, due_date, settlement_status)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                partnerId,
                partners[0].company_name,
                trade_type,
                trade_date,
                dueDate,
                "미정산"
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

        // 두 테이블 저장이 모두 성공하면 확정합니다.
        await connection.commit();

        return res.status(201).json({
            message: "거래 품목이 등록되었습니다.",
            transaction_id: transactionId,
            item_id: itemResult.insertId
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

        return res.status(500).json({
            message: "거래 품목 등록에 실패했습니다."
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
app.put("/api/finance/items/:itemId", async (req, res) => {
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
app.delete("/api/finance/items/:itemId", async (req, res) => {
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
app.post(
    "/api/finance/transactions/:transactionId/payments",
    async (req, res) => {
        const transactionId = Number(req.params.transactionId);

        const {
            payment_date,
            amount,
            payment_method
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

        // 이번 단계에서는 계좌이체와 현금만 사용합니다.
        if (!["계좌이체", "현금"].includes(payment_method)) {
            return res.status(400).json({
                message: "결제수단은 계좌이체 또는 현금을 선택해 주세요."
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

            // 실제 처리한 금액을 기록합니다.
            const [result] = await connection.execute(
                `INSERT INTO payments
                    (transaction_id, payment_date, amount,
                     payment_method, payment_direction, payment_status)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    transactionId,
                    payment_date,
                    paymentAmount,
                    payment_method,
                    direction,
                    "완료"
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
app.get(
    "/api/finance/transactions/:transactionId/payments",
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

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});