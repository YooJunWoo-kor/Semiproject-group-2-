const queries = require("../../queries/finance/dashboardQueries");
const express = require("express");
const db = require("../../db");
const { approvalPaidRowsSql, amount } = require("./financeShared");

const router = express.Router();

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
        queries.coalesceSummary(dateColumn, dateColumn, amountColumn, key)
    ).join(', ');
    const remainingJoin = queries.fromApprovalDocuments(approvalPaidRowsSql);
    const remaining = queries.greatestSummary;
    try {
        const counts = await query(queries.selectCorporateCards);
        const completedRows = await query(queries.selectPayments(sums('payment_date', 'amount')), params);
        const plannedRows = await query(queries.selectSummary(sums('a.due_date', remaining), remainingJoin), params);
        const scheduledRows = await query(queries.selectSummary2(remaining, remainingJoin, remaining));
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

    const sql = queries.selectApprovalDocuments(approvalPaidRowsSql);

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


module.exports = router;
