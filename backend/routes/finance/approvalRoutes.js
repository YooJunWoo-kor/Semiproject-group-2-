const queries = require("../../queries/finance/approvalQueries");
const express = require("express");
const db = require("../../db");
const financeMysql = require("mysql2/promise");
const { toApprovedDraftView, category, amount, summary } = require("./financeShared");

const router = express.Router();

// 결재 문서 목록 조회
router.get("/approvals", (req, res) => {
    const query = queries.selectApprovalDocuments;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("결재 문서 목록 조회 오류:", err);

            return res.status(500).json({
                message: "결재 문서 목록을 불러오지 못했습니다."
            });
        }

        const draftQuery = queries.selectPayrolls;
        db.query(draftQuery, (draftError, drafts) => {
            if (draftError) {
                console.error("승인 기안서 조회 오류:", draftError);
                // 일부 자료만 정상 목록처럼 반환하면 미승인을 누락한 사실을 알 수 없습니다.
                return res.status(500).json({ message: '구매·비용·급여 기안서를 불러오지 못했습니다. 서버 로그를 확인해주세요.' });
            }
            const combined = [...rows, ...toApprovedDraftView(drafts, true)];
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
        queries.selectApprovalDocuments2,
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

            const query = queries.selectApprovalSteps;

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
            queries.selectEmployees,
            [approverId]
        );
        if (eligibleApprovers.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                message: "결재자는 재무부 소속의 활성 계정 또는 활성 MASTER 계정만 선택할 수 있습니다."
            });
        }

        const [documentResult] = await connection.execute(
            queries.insertApprovalDocuments,
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
                queries.insertFinancePaymentClassifications,
                [documentId, categoryCode]
            );
        }


        // 결재자는 1명이며 첫 번째 결재 단계로 저장합니다.
        await connection.execute(
            queries.insertApprovalSteps,
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

        const [accounts] = await connection.execute(
            queries.selectEmployeeAccounts,
            [employeeId, password]
        );
        if (accounts.length === 0) {
            return res.status(401).json({ message: '비밀번호 또는 계정 상태를 확인해 주세요.' });
        }

        await connection.beginTransaction();
        transactionOpen = true;
        // 지정 후 부서 이동 또는 권한 변경이 있어도 현재 권한으로 처리합니다.
        const [eligibleApprovers] = await connection.execute(
            queries.selectEmployees2,
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
            queries.selectApprovalDocuments3,
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
            queries.selectApprovalSteps2,
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
            queries.updateApprovalSteps,
            [decision, opinion.trim() || null, currentStep.step_id]
        );
        if (updated.affectedRows !== 1) fail(409, '이미 처리된 결재 단계입니다.');
        const remaining = steps.some((step) => step.step_id !== currentStep.step_id && step.step_status === '대기');
        const documentStatus = decision === '반려' ? '반려' : remaining ? '대기' : '승인';
        await connection.execute(
            queries.updateApprovalDocuments,
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
    const summaryQuery = queries.selectApprovalDocuments4;

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

        const historyQuery = queries.selectPayments;

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
            queries.selectEmployees3,
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
            queries.selectApprovalDocuments5,
            [documentId]
        );
        if (documents.length === 0) fail(404, '해당 결재 문서를 찾을 수 없습니다.');
        if (documents[0].approval_status !== '승인') fail(409, '승인된 문서에만 지급을 등록할 수 있습니다.');
        const [tradeLinks] = await connection.execute(
            queries.selectTradeTransactions, [documentId]);
        if (tradeLinks.length) fail(409, '거래로 연결된 문서입니다. 품목관리의 거래 전표에서 지급해주세요.');
        const documentAmount = money(documents[0].amount, '결재 문서');
        if (documentAmount === 0) fail(409, '지급할 문서 금액이 없습니다.');

        // 잠금 읽기로 직전에 완료된 다른 요청의 지급 내역까지 확인합니다.
        const [payments] = await connection.execute(
            queries.selectPayments2,
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
                queries.selectBankAccounts,
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
                queries.updateBankAccounts,
                [balance - paymentAmount, `${payment_date} 00:00:00`, `${payment_date} 00:00:00`, accountId]
            );
        }
        if (cardId !== null) {
            const [cards] = await connection.execute(
                queries.selectCorporateCards,
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
                queries.updateCorporateCards,
                [usage + paymentAmount, remainingLimit - paymentAmount, cardId]
            );
        }

        // 문서에 직접 연결합니다. 거래 API와 별개로 transaction_id는 NULL입니다.
        const [result] = await connection.execute(
            queries.insertPayments,
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
