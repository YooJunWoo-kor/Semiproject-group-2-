const express = require('express');
const mysql = require('mysql2/promise');
const db = require('../../db');
const queries = require('../../queries/finance/payrollQueries');
const { readDueDate, seoulToday, isFinanceDepartmentName } = require('./financeShared');
const { validateAdditionalPayroll, selectAdditionalPayrolls, toAdditionalRow, fail } = require('../../services/additionalPayroll');
const router = express.Router();
router.get('/additional-payrolls', async (req, res) => {
    try {
        const [rows] = await db.promise().query(selectAdditionalPayrolls + ' ORDER BY d.draft_id DESC');
        res.json(rows.map(toAdditionalRow));
    } catch (error) {
        console.error('추가급여 조회 실패:', error.code || error.message);
        res.status(500).json({ message: '추가급여를 불러오지 못했습니다.' });
    }
});
// 은행 송금이 아닌 ERP 지급 등록입니다. 기안서 잠금으로 중복 등록을 차단합니다.
router.post('/additional-payrolls/:draftId/payments', async (req, res) => {
    const id = Number(req.params.draftId);
    const { account_id, payment_date, expected_amount, password } = req.body || {};
    const actor = Number(req.user?.employee_id ?? req.body?.employee_id);
    const accountId = Number(account_id);
    let connection;
    try {
        if (![id, actor, accountId].every(n => Number.isSafeInteger(n) && n > 0) || !readDueDate(payment_date) ||
            payment_date > seoulToday() || typeof password !== 'string' || !password) fail('지급 정보와 로그인 비밀번호를 확인해주세요.', 400);
        connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
        const [users] = await connection.execute(queries.selectEmployees, [actor, password]);
        if (!users.length) fail('로그인 비밀번호를 확인해주세요.', 401);
        if (!isFinanceDepartmentName(users[0].department_name) && String(users[0].role || '').trim().toUpperCase() !== 'MASTER') fail('재무부 또는 MASTER만 지급할 수 있습니다.', 403);
        await connection.beginTransaction();
        const [drafts] = await connection.execute('SELECT * FROM my_draft WHERE draft_id = ? FOR UPDATE', [id]);
        const draft = drafts[0];
        if (!draft || !['APPROVED', '승인'].includes(draft.status)) fail('최종 승인된 기안서만 지급할 수 있습니다.');
        const { amount, detail } = validateAdditionalPayroll({ draft: { documentType: draft.document_type, employeeId: draft.employee_id, detailData: draft.detail_data } });
        if (amount !== Number(expected_amount)) fail('승인 금액이 변경되었습니다. 다시 조회해주세요.');
        const [paid] = await connection.execute(`SELECT payment_id FROM payments WHERE payment_status = '완료'
            AND JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.entry_type')) = 'additional_payroll'
            AND JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.additional_draft_id')) = ? FOR UPDATE`, [String(id)]);
        if (paid.length) fail('이미 지급 등록한 추가급여입니다.');
        const [trades] = await connection.execute(queries.selectTradeTransactions, [id]);
        if (trades.length) fail('이미 일반 거래로 연결된 기안입니다. 기존 지급 내역을 확인해주세요.');
        const [accounts] = await connection.execute(queries.selectBankAccounts, [accountId]);
        const account = accounts[0];
        if (!account || account.currency !== 'KRW' || !['ACTIVE', '사용'].includes(account.account_status)) fail('사용 가능한 원화 회사계좌를 선택해주세요.');
        const balance = Number(account.balance);
        if (!Number.isSafeInteger(balance) || balance < amount) fail('회사계좌 잔액이 부족하거나 올바르지 않습니다.');
        await connection.execute(queries.updateBankAccounts, [balance - amount, payment_date, payment_date, accountId]);
        const snapshot = JSON.stringify({ entry_type: 'additional_payroll', additional_draft_id: id,
            employee_id: draft.employee_id, pay_month: detail.payMonth, approved_amount: amount,
            payment_detail: detail.paymentDetail || '', registered_by: actor });
        const [result] = await connection.execute(`INSERT INTO payments
            (document_id, transaction_id, payment_date, amount, payment_method, payment_direction, payment_status,
             account_id, card_id, payroll_id, payroll_snapshot)
            VALUES (NULL, NULL, ?, ?, '계좌이체', '출금', '완료', ?, NULL, NULL, ?)`, [payment_date, amount, accountId, snapshot]);
        await connection.commit();
        res.status(201).json({ message: '추가급여 지급 내역이 등록되었습니다.', payment_id: result.insertId, amount });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch {} }
        if (!error.status) console.error('추가급여 지급 실패:', error.code || error.message);
        res.status(error.status || 500).json({ message: error.status ? error.message : '추가급여 지급 등록에 실패했습니다.' });
    } finally { if (connection) { try { await connection.end(); } catch (error) { console.error('추가급여 DB 연결 종료 실패:', error.code); } } }
});
module.exports = router;
