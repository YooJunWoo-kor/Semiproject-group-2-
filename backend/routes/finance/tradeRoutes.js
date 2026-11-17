const queries = require("../../queries/finance/tradeQueries");
const express = require("express");
const db = require("../../db");
const financeMysql = require("mysql2/promise");
const { readAmount, category, amount, sum } = require("./financeShared");

const router = express.Router();

// [재무관리] 매입·매출 거래 품목 목록 조회
router.get("/items", (req, res) => {
    const query = queries.selectTradeItems;
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
    const categoryCode = req.body.category_code;
    if (categoryCode != null && categoryCode !== "" && !category(categoryCode, trade_type === "매출" ? "입금" : "출금")) {
        return res.status(400).json({ message: "거래 구분에 맞는 분류를 선택해 주세요." });
    }

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
                    queries.selectApprovalDocuments, [sourceId]);
                if (!documents.length) failSource(404, '원본 결재 문서를 찾을 수 없습니다.');
                if (documents[0].approval_status !== '승인') failSource(409, '최종 승인된 문서만 거래로 등록할 수 있습니다.');
                approvedAmount = readAmount(documents[0].amount);
                const [paid] = await connection.execute(
                    queries.selectPayments, [sourceId]);
                if (paid.length) failSource(409, '지급 이력이 있는 문서는 거래로 전환할 수 없습니다. 기존 지급 내역을 확인해주세요.');
            } else {
                const [drafts] = await connection.execute(
                    queries.selectMyDraft, [sourceId]);
                if (!drafts.length) failSource(404, '원본 기안서를 찾을 수 없습니다.');
                if (drafts[0].status !== 'APPROVED') failSource(409, '최종 승인된 기안서만 거래로 등록할 수 있습니다.');
                const [payrollRows] = await connection.execute(
                    queries.selectPayrolls, [sourceId]);
                if (payrollRows.length) failSource(409, '급여 기안서는 인건비 목록에 자동 표시됩니다. 일반 품목 거래로 중복 등록할 수 없습니다.');
                const [expenses] = await connection.execute(queries.selectDraftExpense, [sourceId]);
                if (expenses.length && expenses.every(row => readAmount(row.amount) !== null)) {
                    approvedAmount = expenses.reduce((total, row) => total + Number(row.amount), 0);
                }
            }
            if (!Number.isSafeInteger(approvedAmount) || approvedAmount <= 0) failSource(409, '원본의 승인 금액이 미등록입니다. 먼저 원본 금액을 확인해주세요.');
            const [links] = await connection.execute(
                queries.selectTradeTransactions, [sourceType, sourceId]);
            if (links.length) failSource(409, '이미 거래로 등록한 문서입니다. 목록을 새로고침해주세요.');
            if (totalAmount !== approvedAmount) failSource(400, '품목 합계(수량 × 단가 + 부가세)가 원본 승인 금액과 같아야 합니다.');
        }

        // 선택한 거래처가 실제로 존재하는지 확인합니다.
        const [partners] = await connection.execute(
            queries.selectPartners,
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
            queries.insertTradeTransactions,
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
            queries.insertTradeItems,
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
                queries.insertFinancePaymentClassifications, [transactionId, sourceId]);
        }

        if (categoryCode) {
            await connection.execute(
                queries.insertFinancePaymentClassifications2,
                [transactionId, categoryCode]);
        }

        const [savedCategories] = await connection.execute(
            queries.selectFinancePaymentClassifications,
            [transactionId]);
        const storedCategoryCode = savedCategories[0]?.category_code;
        const savedCategoryCode = storedCategoryCode === 'expense_other_1' ? 'unclassified' : (storedCategoryCode || 'unclassified');

        // 거래·품목·원본 연결이 모두 저장돼야 확정합니다.
        await connection.commit();

        return res.status(201).json({
            message: "거래 품목이 등록되었습니다.",
            transaction_id: transactionId,
            item_id: itemResult.insertId,
            category_code: savedCategoryCode,
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

    const categoryCode = req.body.category_code;
    if (categoryCode != null && categoryCode !== "" && !category(categoryCode, trade_type === "매출" ? "입금" : "출금")) {
        return res.status(400).json({ message: "거래 구분에 맞는 분류를 선택해 주세요." });
    }

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
            queries.selectTradeItems2,
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
                queries.selectTradeItems3, [transactionId]);
            if (trade_type !== '매입' || supplyPrice + vatAmount !== Number(totals[0].approved_total)) {
                await connection.rollback();
                return res.status(409).json({ message: '승인 연결 거래는 매입 구분과 원본 승인 금액을 유지해야 합니다.' });
            }
        }


        // 입금·출금 기록이 있는 거래인지 확인합니다.
        const [payments] = await connection.execute(
            queries.selectPayments2,
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
            queries.selectTradeItems4,
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
            queries.selectPartners2,
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
                queries.updateTradeTransactions,
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
            queries.updateTradeItems,
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

        if (categoryCode != null) {
            await connection.execute(
                queries.insertFinancePaymentClassifications3,
                [transactionId, categoryCode || 'unclassified']);
        }

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
            queries.selectTradeItems5,
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
            queries.selectPayments3,
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
            queries.deleteTradeItems,
            [itemId]
        );

        // 같은 거래에 남아 있는 품목 수를 확인합니다.
        const [counts] = await connection.execute(
            queries.selectTradeItems6,
            [transactionId]
        );

        const transactionDeleted =
            Number(counts[0].item_count) === 0;

        // 마지막 품목이었다면 빈 거래도 함께 삭제합니다.
        if (transactionDeleted) {
            await connection.execute(queries.deleteFinancePaymentClassifications, [transactionId]);
            await connection.execute(
                queries.deleteTradeTransactions,
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
                queries.selectTradeTransactions2,
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
                queries.selectTradeItems7,
                [transactionId]
            );

            // 완료된 입금 또는 출금 기록만 합산합니다.
            const [payments] = await connection.execute(
                queries.selectPayments4,
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
                    queries.selectBankAccounts,
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
                    queries.updateBankAccounts,
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
                    queries.selectCorporateCards,
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
                    queries.updateCorporateCards,
                    [currentUsage + paymentAmount, remainingLimit - paymentAmount, cardId]
                );
            }

            // 계좌이체는 account_id, 법인카드는 card_id, 현금은 둘 다 NULL입니다.
            const [result] = await connection.execute(
                queries.insertPayments,
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
                queries.updateTradeTransactions2,
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
                queries.setSummary
            );
            await connection.beginTransaction();

            // 1. 거래 정보 조회
            const [transactions] = await connection.execute(
                queries.selectTradeTransactions3,
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
                queries.selectTradeItems8,
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
                queries.selectPayments5,
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


module.exports = router;
