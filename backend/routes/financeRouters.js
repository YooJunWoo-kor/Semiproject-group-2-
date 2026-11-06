// backend/routers/financeRouters.js
const express = require("express");
const db = require("../db");
const financeMysql = require("mysql2/promise");
//multer
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const router = express.Router();

// 증빙파일 저장 폴더: backend/uploads/approvals
const approvalUploadDir = path.join(
    __dirname,
    "..",
    "uploads",
    "approvals"
);

// 폴더가 없으면 자동으로 생성합니다.
fs.mkdirSync(approvalUploadDir, { recursive: true });

// 파일을 저장할 위치와 저장 파일명을 설정합니다.
const approvalStorage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, approvalUploadDir);
    },

    filename(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();

        // 같은 이름의 파일이 올라와도 겹치지 않도록 저장합니다.
        callback(null, `${randomUUID()}${extension}`);
    }
});

// 결재 증빙파일 업로드 설정
const approvalUpload = multer({
    storage: approvalStorage,
    defParamCharset: "utf8",

    limits: {
        fileSize: 10 * 1024 * 1024, // 최대 10MB
        files: 1                  // 한 번에 파일 1개
    },

    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];

        if (!allowedExtensions.includes(extension)) {
            return callback(
                new Error("PDF, JPG, JPEG, PNG 파일만 첨부할 수 있습니다.")
            );
        }

        callback(null, true);
    }
});

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
            d.department_name
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
        COALESCE(f.attachment_count, 0) AS attachment_count,
        p.payment_methods
      FROM approval_documents a
  
      LEFT JOIN employees e
        ON a.employee_id = e.employee_id
  
      LEFT JOIN departments d
        ON e.department_id = d.department_id
  
      LEFT JOIN (
        SELECT
          document_id,
          COUNT(*) AS attachment_count
        FROM approval_attachments
        GROUP BY document_id
      ) f
        ON a.document_id = f.document_id
  
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
  
      ORDER BY a.created_at DESC, a.document_id DESC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("결재 문서 목록 조회 오류:", err);

            return res.status(500).json({
                message: "결재 문서 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
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

// 결재 문서에 증빙파일 첨부
router.post("/approvals/:documentId/attachments", (req, res) => {
    const documentId = Number(req.params.documentId);

    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
            message: "올바른 문서 ID가 아닙니다."
        });
    }

    // 프론트에서 'file'이라는 이름으로 보낸 파일 1개를 받습니다.
    approvalUpload.single("file")(req, res, (uploadError) => {
        if (uploadError) {
            return res.status(400).json({
                message: uploadError.code === "LIMIT_FILE_SIZE"
                    ? "파일은 최대 10MB까지 첨부할 수 있습니다."
                    : uploadError.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "첨부할 파일을 선택해 주세요."
            });
        }

        // DB 저장에 실패하면 이미 업로드된 파일도 삭제합니다.
        function removeFileAndReply(status, message) {
            fs.unlink(req.file.path, (deleteError) => {
                if (deleteError && deleteError.code !== "ENOENT") {
                    console.error("증빙파일 정리 실패:", deleteError.code);
                }

                res.status(status).json({ message });
            });
        }

        const employeeId = Number(req.body.employee_id);
        const password = req.body.password;

        if (
            !Number.isSafeInteger(employeeId) ||
            employeeId <= 0 ||
            typeof password !== "string" ||
            password === ""
        ) {
            return removeFileAndReply(
                400,
                "로그인 사원 정보와 비밀번호를 확인해 주세요."
            );
        }

        if (Array.from(req.file.originalname).length > 255) {
            return removeFileAndReply(
                400,
                "원본 파일명은 255자 이내로 작성해 주세요."
            );
        }

        const filePath = `/uploads/approvals/${req.file.filename}`;

        // 작성자 계정과 비밀번호, 문서 상태가 맞을 때만 등록합니다.
        const query = `
            INSERT INTO approval_attachments (
                document_id,
                original_name,
                file_path,
                file_size
            )
            SELECT
                a.document_id, ?, ?, ?
            FROM approval_documents a
            INNER JOIN employee_accounts ea
                ON a.employee_id = ea.employee_id
            WHERE a.document_id = ?
              AND a.employee_id = ?
              AND a.approval_status = '대기'
              AND ea.password_hash = ?
              AND ea.account_status = 'ACTIVE'
        `;

        const values = [
            req.file.originalname,
            filePath,
            req.file.size,
            documentId,
            employeeId,
            password
        ];

        db.query(query, values, (dbError, result) => {
            if (dbError) {
                console.error("증빙파일 DB 등록 실패:", dbError.code);

                return removeFileAndReply(
                    500,
                    "첨부파일 정보를 저장하지 못했습니다."
                );
            }

            if (result.affectedRows !== 1) {
                return removeFileAndReply(
                    403,
                    "작성자 계정·비밀번호와 문서의 대기 상태를 확인해 주세요."
                );
            }

            return res.status(201).json({
                message: "증빙파일이 첨부되었습니다.",
                file_id: result.insertId,
                document_id: documentId,
                original_name: req.file.originalname,
                file_size: req.file.size
            });
        });
    });
});

// 결재 문서의 첨부파일 목록 조회
router.get("/approvals/:documentId/attachments", (req, res) => {
    const documentId = Number(req.params.documentId);

    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
            message: "올바른 문서 ID가 아닙니다."
        });
    }

    const query = `
        SELECT
            file_id,
            document_id,
            original_name,
            file_size,
            DATE_FORMAT(
                created_at, '%Y-%m-%d %H:%i'
            ) AS created_at
        FROM approval_attachments
        WHERE document_id = ?
        ORDER BY created_at DESC, file_id DESC
    `;

    db.query(query, [documentId], (error, rows) => {
        if (error) {
            console.error("첨부파일 목록 조회 실패:", error.code);

            return res.status(500).json({
                message: "첨부파일 목록을 불러오지 못했습니다."
            });
        }

        // 첨부파일이 없으면 빈 배열을 반환합니다.
        return res.json(rows);
    });
});

// 결재 문서의 첨부파일 다운로드
router.get(
    "/approvals/:documentId/attachments/:fileId/download",
    (req, res, next) => {
        const documentId = Number(req.params.documentId);
        const fileId = Number(req.params.fileId);

        if (
            !Number.isSafeInteger(documentId) || documentId <= 0 ||
            !Number.isSafeInteger(fileId) || fileId <= 0
        ) {
            return res.status(400).json({
                message: "올바른 문서 ID와 파일 ID가 필요합니다."
            });
        }

        // 해당 문서에 속한 파일인지 함께 확인합니다.
        const query = `
            SELECT original_name, file_path
            FROM approval_attachments
            WHERE document_id = ? AND file_id = ?
        `;

        db.query(query, [documentId, fileId], (error, rows) => {
            if (error) {
                console.error("첨부파일 조회 실패:", error.code);

                return res.status(500).json({
                    message: "첨부파일 정보를 확인하지 못했습니다."
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "해당 문서의 첨부파일을 찾을 수 없습니다."
                });
            }

            const attachment = rows[0];
            const prefix = "/uploads/approvals/";

            if (!attachment.file_path?.startsWith(prefix)) {
                return res.status(404).json({
                    message: "첨부파일 저장 경로를 확인할 수 없습니다."
                });
            }

            const storedPath = attachment.file_path.slice(prefix.length);
            const fullPath = path.resolve(approvalUploadDir, storedPath);
            const relativePath = path.relative(approvalUploadDir, fullPath);

            // 업로드 폴더 밖의 파일은 다운로드하지 않습니다.
            if (
                !relativePath ||
                relativePath === ".." ||
                relativePath.startsWith(`..${path.sep}`) ||
                path.isAbsolute(relativePath)
            ) {
                return res.status(400).json({
                    message: "허용되지 않는 파일 경로입니다."
                });
            }

            res.download(
                relativePath,
                attachment.original_name,
                {
                    root: approvalUploadDir,
                    dotfiles: "deny",
                    headers: {
                        "Cache-Control": "private, no-store",
                        "X-Content-Type-Options": "nosniff"
                    }
                },
                (downloadError) => {
                    if (!downloadError) return;

                    // 전송이 시작된 후에는 JSON 응답을 다시 보내지 않습니다.
                    if (res.headersSent) {
                        return next(downloadError);
                    }

                    const notFound =
                        downloadError.code === "ENOENT" ||
                        downloadError.status === 404;

                    return res.status(notFound ? 404 : 500).json({
                        message: notFound
                            ? "서버에 실제 파일이 없습니다."
                            : "파일을 다운로드하지 못했습니다."
                    });
                }
            );
        });
    }
);

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


module.exports = router;
