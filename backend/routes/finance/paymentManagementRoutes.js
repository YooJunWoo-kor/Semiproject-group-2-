const queries = require("../../queries/finance/paymentManagementQueries");
const express = require("express");
const financeMysql = require("mysql2/promise");
const { payrollPaymentRowsSql, groups, category, period, amount, summary } = require("./financeShared");

const router = express.Router();

// 등록창과 요약 화면이 같은 분류 정의를 사용합니다.
router.get("/item-categories", (req, res) => {
    res.json({ purchase: groups("출금"), sales: groups("입금") });
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
        await connection.query(queries.setSummary);
        await connection.beginTransaction();
        // 품목과 직접 조인하지 않아, 품목 수에 따라 지급 금액이 중복 합산되지 않습니다.
        const [rows] = await connection.execute(queries.selectPayments(payrollPaymentRowsSql),
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
            const [documents] = await connection.execute(queries.selectApprovalDocuments, [range.start, range.monthEndExclusive]);
            scheduled.push(...documents);
        }
        const [trades] = await connection.execute(queries.selectTradeTransactions,
            [direction, direction === '출금' ? '매입' : '매출', range.start, range.monthEndExclusive]);
        scheduled.push(...trades);
        // 최종 승인된 미지급 급여는 일반 관리 및 인건비 > 급여로 집계합니다.
        if (direction === '출금') {
            const [payrolls] = await connection.execute(queries.selectPayrolls, [range.start.slice(0, 7)]);
            scheduled.push(...payrolls);
        }
        // 지급한 급여의 공제액은 별도 납부대기로 남깁니다. 아직 납부 등록은 지원하지 않습니다.
        if (direction === '출금') {
            const [deductions] = await connection.execute(queries.selectSummary(payrollPaymentRowsSql), [range.start.slice(0, 7)]);
            scheduled.push(...deductions);
        }
        // [급여 흐름 수정] 추가급여 기안은 직접 지급대기로 만들지 않고 HR 급여에 합산합니다.
        scheduled = scheduled.map(decorate);
        const totals = summary(entries, previousEntries, scheduled);
        await connection.commit();
        return res.json({ range, groups: groups(direction), entries, scheduled, summary: totals });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError.code); } }
        console.error('결제 관리 조회 실패:', error);
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
        const [users] = await connection.execute(queries.selectEmployees, [employeeId, password]);
        if (!users.length) fail(401, '비밀번호 또는 계정 상태를 확인해 주세요.');
        if (Number(users[0].department_id) !== 1 && users[0].role !== 'MASTER') fail(403, '재무부 또는 MASTER만 분류를 변경할 수 있습니다.');
        await connection.beginTransaction();
        let rows;
        if (type === 'approval') {
            [rows] = await connection.execute(queries.selectApprovalDocuments2, [id]);
        } else if (type === 'transaction') {
            [rows] = await connection.execute(queries.selectTradeTransactions2, [id]);
        } else {
            [rows] = await connection.execute(queries.selectPayments2, [id]);
        }
        if (!rows.length) fail(404, '분류할 문서 또는 거래가 없습니다.');
        if (!category(code, rows[0].direction)) fail(400, '해당 입출금 구분에 맞는 분류를 선택해 주세요.');
        await connection.execute(queries.insertFinancePaymentClassifications, [type, id, code]);
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
