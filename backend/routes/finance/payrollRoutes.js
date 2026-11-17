const queries = require("../../queries/finance/payrollQueries");
const express = require("express");
const db = require("../../db");
const financeMysql = require("mysql2/promise");
const { payrollPaymentRowsSql, readDetailData, readDueDate, seoulToday, amount, sum, summary } = require("./financeShared");

const router = express.Router();

// 최종 승인된 기안서에 연결된 급여만 월별로 집계합니다. 지급 등록과는 별개입니다.
router.get('/payrolls/summary', (req, res) => {
    const query = queries.selectPayrolls(payrollPaymentRowsSql);
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

// 승인된 월 급여의 직원별 상세 (조회 전용)
router.get('/payrolls/:month/details', (req, res) => {
    const { month } = req.params;
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({ message: '급여월을 확인해 주세요.' });
    }
    db.query(queries.selectPayrolls2(payrollPaymentRowsSql), [month], (error, rows) => {
        if (error) {
            console.error('급여 상세 조회 오류:', error);
            return res.status(500).json({ message: '급여 상세를 불러오지 못했습니다.' });
        }
        return res.json(rows);
    });
});

// 승인된 월 급여의 미지급 직원 전원을 지급 등록합니다. 실제 은행 송금은 실행하지 않습니다.
router.post('/payrolls/:month/payments', async (req, res) => {
    const { month } = req.params;
    const { account_id, payment_date, expected_amount, expected_payroll_ids, password } = req.body || {};
    const employeeId = Number(req.user?.employee_id ?? req.body?.employee_id);
    const accountId = Number(account_id);
    const expected = Number(expected_amount);
    const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
    let connection;
    let transactionOpen = false;
    const integer = (value, label) => {
        const number = Number(value);
        if (value == null || !Number.isSafeInteger(number) || number < 0) fail(409, `${label}을 확인해 주세요.`);
        return number;
    };
    try {
        if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) ||
            !Number.isSafeInteger(employeeId) || employeeId <= 0 ||
            !Number.isSafeInteger(accountId) || accountId <= 0 ||
            !Number.isSafeInteger(expected) || expected <= 0 ||
            typeof password !== 'string' || !password) fail(400, '로그인 정보, 회사계좌, 지급 금액과 비밀번호를 확인해 주세요.');
        if (!Array.isArray(expected_payroll_ids) || expected_payroll_ids.length === 0 ||
            expected_payroll_ids.some(id => !Number.isSafeInteger(id) || id <= 0) ||
            new Set(expected_payroll_ids).size !== expected_payroll_ids.length) fail(400, '지급 대상 급여를 다시 조회해 주세요.');
        if (!readDueDate(payment_date) || payment_date > seoulToday()) fail(400, '지급일은 오늘 또는 이전 날짜로 입력해 주세요.');
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });
        // 기존 로그인/분류 변경과 동일한 계정 확인 방식입니다.
        const [users] = await connection.execute(queries.selectEmployees, [employeeId, password]);
        if (!users.length) fail(401, '비밀번호 또는 계정 상태를 확인해 주세요.');
        if (Number(users[0].department_id) !== 1 && users[0].role !== 'MASTER') fail(403, '재무부 또는 MASTER만 급여를 지급 등록할 수 있습니다.');
        await connection.beginTransaction();
        transactionOpen = true;
        const [rows] = await connection.execute(queries.selectPayrolls3, [month]);
        const unpaid = rows.filter(row => row.payment_status !== '지급완료');
        if (!unpaid.length) fail(409, '지급할 승인 급여가 없거나 이미 모두 지급 등록되었습니다. 새로고침해 주세요.');
        const currentIds = unpaid.map(row => Number(row.payroll_id)).sort((a, b) => a - b);
        const expectedIds = [...expected_payroll_ids].sort((a, b) => a - b);
        if (JSON.stringify(currentIds) !== JSON.stringify(expectedIds)) fail(409, '지급 대상 직원이 변경되었습니다. 새로고침 후 다시 확인해 주세요.');
        const seenEmployees = new Set();
        let netTotal = 0;
        let deductionTotal = 0;
        for (const row of rows) {
            if (seenEmployees.has(Number(row.employee_id))) fail(409, '같은 직원의 월 급여가 중복되어 있습니다. 급여 데이터를 먼저 확인해 주세요.');
            seenEmployees.add(Number(row.employee_id));
        }
        for (const row of unpaid) {
            if (row.payment_status !== '지급대기') fail(409, '지급대기 상태의 급여만 일괄 지급할 수 있습니다.');
            const base = integer(row.base_salary, '기본급');
            const allowance = integer(row.allowance, '수당');
            const bonus = integer(row.bonus, '상여금');
            const gross = integer(row.gross_pay, '세전 급여');
            const deduction = integer(row.deduction, '공제액');
            const net = integer(row.net_pay, '실지급액');
            if (base + allowance + bonus !== gross || gross - deduction !== net || net <= 0) fail(409, '급여 계산이 일치하지 않거나 실지급액이 0원입니다. 급여를 확인해 주세요.');
            netTotal += net;
            deductionTotal += deduction;
            if (!Number.isSafeInteger(netTotal) || !Number.isSafeInteger(deductionTotal)) fail(409, '급여 합계가 처리 범위를 초과했습니다.');
            const [links] = await connection.execute(queries.selectPayments, [row.payroll_id]);
            if (links.length) fail(409, '이미 지급 이력이 있는 급여입니다. 다시 지급할 수 없습니다.');
            const [trades] = await connection.execute(queries.selectTradeTransactions, [row.draft_id]);
            if (trades.length) fail(409, '이미 일반 거래로 연결된 기안서입니다. 기존 거래의 지급 이력을 확인해 주세요.');
        }
        if (netTotal !== expected) fail(409, '조회 후 급여 금액이나 지급 상태가 변경되었습니다. 새로고침 후 다시 확인해 주세요.');
        const [accounts] = await connection.execute(queries.selectBankAccounts, [accountId]);
        if (!accounts.length) fail(404, '회사계좌를 찾을 수 없습니다.');
        const account = accounts[0];
        if (account.currency !== 'KRW' || !['사용', 'ACTIVE'].includes(account.account_status)) fail(409, '사용 가능한 원화 회사계좌를 선택해 주세요.');
        const balance = integer(account.balance, '계좌 잔액');
        if (balance < netTotal) fail(409, '회사계좌 잔액이 부족합니다.');
        await connection.execute(queries.updateBankAccounts,
            [balance - netTotal, payment_date, payment_date, accountId]);
        for (const row of unpaid) {
            const snapshot = {
                pay_month: month, employee_id: Number(row.employee_id), draft_id: Number(row.draft_id),
                base_amount: Number(row.base_salary), allowance_amount: Number(row.allowance), bonus_amount: Number(row.bonus),
                gross_amount: Number(row.gross_pay), deduction_amount: Number(row.deduction), net_amount: Number(row.net_pay),
                deduction_status: '납부대기', registered_by: employeeId
            };
            await connection.execute(queries.insertPayments,
                [payment_date, Number(row.net_pay), accountId, row.payroll_id, JSON.stringify(snapshot)]);
            const [updated] = await connection.execute(queries.updatePayrolls, [payment_date, row.payroll_id]);
            if (updated.affectedRows !== 1) fail(409, '급여 상태가 변경되었습니다. 다시 확인해 주세요.');
        }
        await connection.commit();
        transactionOpen = false;
        return res.status(201).json({
            message: `${unpaid.length}명의 급여 지급 내역이 등록되었습니다.`,
            employee_count: unpaid.length, amount: netTotal, deduction_pending: deductionTotal,
            account_balance: balance - netTotal, payment_date
        });
    } catch (error) {
        if (transactionOpen) { try { await connection.rollback(); } catch { console.error('급여 지급 롤백 실패'); } }
        if (!error.status) console.error('급여 지급 등록 실패:', error.code || error.message);
        return res.status(error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({
            message: error.status ? error.message : error.code === 'ER_DUP_ENTRY'
                ? '이미 지급 등록된 급여입니다. 새로고침해 주세요.'
                : '급여 지급 등록에 실패했습니다. 지급 이력 테이블 SQL과 서버 로그를 확인해 주세요.'
        });
    } finally {
        if (connection) { try { await connection.end(); } catch { console.error('급여 지급 DB 연결 종료 실패'); } }
    }
});

// 공제액은 이미 지급한 급여의 스냅샷을 기준으로 처리합니다.
function payrollDeductionSource(row) {
    const snapshot = readDetailData(row.payroll_snapshot);
    const gross = Number(snapshot.gross_amount);
    const net = Number(snapshot.net_amount);
    const deduction = Number(snapshot.deduction_amount);
    if (![gross, net, deduction].every(value => Number.isSafeInteger(value) && value >= 0) ||
        snapshot.gross_amount == null || snapshot.net_amount == null || snapshot.deduction_amount == null ||
        gross - net !== deduction || Number(row.amount) !== net ||
        !['납부대기', '납부완료'].includes(snapshot.deduction_status)) {
        const error = new Error('급여 지급 당시 공제액 정보를 확인해 주세요.'); error.status = 409; throw error;
    }
    return {
        salary_payment_id: Number(row.payment_id), payroll_id: Number(row.payroll_id),
        employee_id: Number(snapshot.employee_id), name: row.employee_name || `사원 #${snapshot.employee_id}`,
        amount: deduction, status: snapshot.deduction_status,
        deduction_payment_id: snapshot.deduction_payment_id == null ? null : Number(snapshot.deduction_payment_id),
        source_payment_date: row.source_payment_date,
        deduction_payment_date: row.deduction_payment_date || null,
        deduction_payment_amount: row.deduction_payment_amount == null ? null : Number(row.deduction_payment_amount),
        bank_name: row.bank_name || '', account_name: row.account_name || ''
    };
}

router.get('/payroll-deductions/:month', (req, res) => {
    const { month } = req.params;
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ message: '급여월을 확인해 주세요.' });
    db.query(queries.selectPayments2, [month], (error, rows) => {
        if (error) {
            console.error('급여 공제액 조회 실패:', error.code || error.message);
            return res.status(500).json({ message: '급여 공제액을 불러오지 못했습니다.' });
        }
        try {
            const items = rows.map(payrollDeductionSource).filter(row => row.amount > 0);
            const pending = items.filter(row => row.status === '납부대기');
            const paid = items.filter(row => row.status === '납부완료');
            const history = [...new Map(paid.filter(row => row.deduction_payment_id).map(row => [row.deduction_payment_id, {
                payment_id: row.deduction_payment_id, payment_date: row.deduction_payment_date,
                amount: row.deduction_payment_amount, bank_name: row.bank_name, account_name: row.account_name
            }])).values()];
            return res.json({ pay_month: month, items, pending_total: sum(pending), paid_total: sum(paid), history });
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.message });
        }
    });
});

// 월 공제액 미납분을 전액 등록합니다. 외부 은행 송금이나 기관 납부는 실행하지 않습니다.
router.post('/payroll-deductions/:month/payments', async (req, res) => {
    const { month } = req.params;
    const { account_id, payment_date, expected_amount, expected_salary_payment_ids, password } = req.body || {};
    const employeeId = Number(req.user?.employee_id ?? req.body?.employee_id);
    const accountId = Number(account_id);
    const expected = Number(expected_amount);
    const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
    let connection;
    let transactionOpen = false;
    try {
        if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) ||
            !Number.isSafeInteger(employeeId) || employeeId <= 0 ||
            !Number.isSafeInteger(accountId) || accountId <= 0 ||
            !Number.isSafeInteger(expected) || expected <= 0 || typeof password !== 'string' || !password) fail(400, '로그인 정보, 계좌, 공제액과 비밀번호를 확인해 주세요.');
        if (!readDueDate(payment_date) || payment_date > seoulToday()) fail(400, '납부일은 오늘 또는 이전 날짜로 입력해 주세요.');
        if (!Array.isArray(expected_salary_payment_ids) || expected_salary_payment_ids.length === 0 ||
            expected_salary_payment_ids.some(id => !Number.isSafeInteger(id) || id <= 0) ||
            new Set(expected_salary_payment_ids).size !== expected_salary_payment_ids.length) fail(400, '납부 대상 급여를 다시 조회해 주세요.');
        connection = await financeMysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });
        const [users] = await connection.execute(queries.selectEmployees2, [employeeId, password]);
        if (!users.length) fail(401, '비밀번호 또는 계정 상태를 확인해 주세요.');
        if (Number(users[0].department_id) !== 1 && users[0].role !== 'MASTER') fail(403, '재무부 또는 MASTER만 공제액 납부를 등록할 수 있습니다.');
        await connection.beginTransaction();
        transactionOpen = true;
        const [sources] = await connection.execute(queries.selectPayments3, [month]);
        const pending = sources.map(payrollDeductionSource).filter(row => row.amount > 0 && row.status === '납부대기');
        if (!pending.length) fail(409, '납부할 공제액이 없거나 이미 납부 등록되었습니다. 새로고침해 주세요.');
        const ids = pending.map(row => row.salary_payment_id).sort((a, b) => a - b);
        const expectedIds = [...expected_salary_payment_ids].sort((a, b) => a - b);
        if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) fail(409, '납부 대상이 변경되었습니다. 새로고침 후 확인해 주세요.');
        if (pending.some(row => row.source_payment_date > payment_date)) fail(400, '납부일은 대상 급여의 지급일 이후로 입력해 주세요.');
        const total = pending.reduce((value, row) => value + row.amount, 0);
        if (!Number.isSafeInteger(total) || total !== expected) fail(409, '공제액이 변경되었습니다. 새로고침 후 확인해 주세요.');
        const [accounts] = await connection.execute(queries.selectBankAccounts2, [accountId]);
        if (!accounts.length) fail(404, '회사계좌를 찾을 수 없습니다.');
        const account = accounts[0];
        const balance = Number(account.balance);
        if (account.currency !== 'KRW' || !['사용', 'ACTIVE'].includes(account.account_status)) fail(409, '사용 가능한 원화 회사계좌를 선택해 주세요.');
        if (account.balance == null || !Number.isSafeInteger(balance) || balance < 0) fail(409, '계좌 잔액을 확인해 주세요.');
        if (balance < total) fail(409, '회사계좌 잔액이 부족합니다.');
        const snapshot = { entry_type: 'payroll_deduction', pay_month: month, source_payment_ids: ids, paid_amount: total, registered_by: employeeId };
        const [receipt] = await connection.execute(queries.insertPayments2,
            [payment_date, total, accountId, JSON.stringify(snapshot)]);
        await connection.execute(queries.updateBankAccounts2,
            [balance - total, payment_date, payment_date, accountId]);
        for (const row of pending) {
            const [updated] = await connection.execute(queries.updatePayments,
                [receipt.insertId, payment_date, employeeId, row.salary_payment_id]);
            if (updated.affectedRows !== 1) fail(409, '공제액 납부 상태가 변경되었습니다. 다시 확인해 주세요.');
        }
        await connection.commit();
        transactionOpen = false;
        return res.status(201).json({ message: '공제액 납부 내역이 등록되었습니다.', payment_id: receipt.insertId,
            amount: total, account_balance: balance - total, payment_date });
    } catch (error) {
        if (transactionOpen) { try { await connection.rollback(); } catch { console.error('공제액 납부 롤백 실패'); } }
        if (!error.status) console.error('공제액 납부 실패:', error.code || error.message);
        return res.status(error.status || 500).json({ message: error.status ? error.message : '공제액 납부 등록에 실패했습니다. 서버 로그를 확인해 주세요.' });
    } finally {
        if (connection) { try { await connection.end(); } catch { console.error('공제액 납부 DB 연결 종료 실패'); } }
    }
});


module.exports = router;
