// HR 휴가관리 라우터
// 역할: 기존 기안서 휴가 데이터를 조회하고 주말 제외 사용일수·간단한 연차 요약을 제공합니다.

const express = require('express');
const { promiseDb } = require('../services/hrCommon');

const hrLeaveRouter = express.Router();

function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
        ? null
        : date;
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

// 날짜 범위를 순회하되 토요일·일요일은 제외합니다.
// 공휴일과 반차는 이번 단순화 범위에서 처리하지 않습니다.
function forEachWeekday(startValue, endValue, visitor) {
    const start = parseDate(startValue);
    const end = parseDate(endValue);

    if (!start || !end || start > end) {
        return 0;
    }

    let count = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
        const day = cursor.getUTCDay();

        if (day !== 0 && day !== 6) {
            count += 1;
            visitor?.(formatDate(cursor));
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return count;
}

function countWeekdays(startDate, endDate) {
    return forEachWeekday(startDate, endDate, () => {});
}

function applicationStatusFor(sourceStatus) {
    const status = String(sourceStatus || '').trim().toUpperCase();

    if (status === 'DRAFT' || status === '임시저장') {
        return '임시저장';
    }

    if (['APPROVED', '승인', '승인완료', '완료'].includes(status)) {
        return '승인완료';
    }

    if (['REJECTED', '반려', '거절'].includes(status)) {
        return '반려';
    }

    return '승인대기';
}

function completedMonthsBetween(hireDateValue, asOfDateValue) {
    const hireDate = parseDate(hireDateValue);
    const asOfDate = parseDate(asOfDateValue);

    if (!hireDate || !asOfDate || asOfDate < hireDate) {
        return 0;
    }

    let months =
        (asOfDate.getUTCFullYear() - hireDate.getUTCFullYear()) * 12 +
        (asOfDate.getUTCMonth() - hireDate.getUTCMonth());

    const lastDayOfAsOfMonth = new Date(Date.UTC(
        asOfDate.getUTCFullYear(),
        asOfDate.getUTCMonth() + 1,
        0
    )).getUTCDate();
    const anniversaryDay = Math.min(
        hireDate.getUTCDate(),
        lastDayOfAsOfMonth
    );

    if (asOfDate.getUTCDate() < anniversaryDay) {
        months -= 1;
    }

    return Math.max(0, months);
}

function addApprovedWeekdaysToSet(rows, hireDate, asOfDate, daySet) {
    const hire = parseDate(hireDate);
    const asOf = parseDate(asOfDate);

    if (!hire || !asOf) {
        return;
    }

    rows.forEach((row) => {
        const start = parseDate(row.startDate);
        const end = parseDate(row.endDate);

        if (!start || !end || start > end) {
            return;
        }

        const clippedStart = start < hire ? hire : start;
        const clippedEnd = end > asOf ? asOf : end;

        if (clippedStart > clippedEnd) {
            return;
        }

        forEachWeekday(
            formatDate(clippedStart),
            formatDate(clippedEnd),
            (date) => daySet.add(date)
        );
    });
}

// 휴가 신청 정보는 별도 draft_leave 테이블 없이 my_draft.detail_data JSON에서 조회합니다.
const leaveQuery = `
    SELECT
        md.draft_id AS leaveId,
        md.draft_id AS draftId,
        md.employee_id AS employeeId,
        e.employee_number AS employeeNumber,
        e.name AS employeeName,
        e.department_id AS departmentId,
        d.department_name AS departmentName,
        e.position,
        md.document_type AS leaveType,
        md.title,
        md.content AS reason,
        JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.startDate')) AS startDate,
        JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.endDate')) AS endDate,
        md.status AS sourceStatus,
        DATE_FORMAT(md.created_at, '%Y-%m-%d %H:%i') AS applicationDate,
        md.approver_id AS approverId,
        approver.name AS approverName,
        DATE_FORMAT(md.processed_at, '%Y-%m-%d %H:%i') AS approvalDate
    FROM my_draft md
    INNER JOIN employees e ON e.employee_id = md.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    LEFT JOIN employees approver ON approver.employee_id = md.approver_id
    WHERE md.document_type = '휴가'
      AND md.status IN ('PENDING', 'APPROVED', 'REJECTED', '승인', '승인완료', '완료', '반려')
      AND (? IS NULL OR (
        JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.startDate')) < ?
        AND JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.endDate')) >= ?
      ))
      AND (? IS NULL OR (
        JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.startDate')) < ?
        AND JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.endDate')) >= ?
      ))
    ORDER BY md.created_at DESC, md.draft_id DESC
`;

function nextMonthStart(month) {
    if (!month) {
        return null;
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber, 1));

    return formatDate(date);
}

function toLeaveResponse(row) {
    return {
        ...row,
        leaveDays: countWeekdays(row.startDate, row.endDate),
        applicationStatus: applicationStatusFor(row.sourceStatus)
    };
}

// 기존 휴가 조회 API를 유지하면서 실제 상태값과 평일 사용일수를 반환합니다.
hrLeaveRouter.get('/leaves', async (req, res) => {
    const month = String(req.query.month || '').trim();
    const year = String(req.query.year || '').trim();

    if (month && !/^(\d{4})-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회 월 형식은 YYYY-MM이어야 합니다.'
        });
    }

    if (year && !/^\d{4}$/.test(year)) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회 연도 형식은 YYYY여야 합니다.'
        });
    }

    if (month && year) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회는 월 또는 연도 중 하나만 지정해 주세요.'
        });
    }

    try {
        const monthStart = month ? `${month}-01` : null;
        const monthEnd = nextMonthStart(month);
        const yearStart = year ? `${year}-01-01` : null;
        const yearEnd = year ? `${Number(year) + 1}-01-01` : null;
        const [rows] = await promiseDb.query(leaveQuery, [
            monthStart ? monthEnd : null,
            monthEnd,
            monthStart,
            yearStart ? yearEnd : null,
            yearEnd,
            yearStart
        ]);

        return res.json({
            success: true,
            data: rows.map(toLeaveResponse)
        });
    } catch (error) {
        console.error('휴가 신청 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '휴가 신청 정보를 불러오지 못했습니다.'
        });
    }
});

// 입사일 기준 완료 개월 수와 최종 승인 휴가의 실제 사용 평일을 요약합니다.
hrLeaveRouter.get('/leaves/summary', async (req, res) => {
    const employeeId = Number(req.query.employeeId);
    const asOfValue = String(req.query.asOf || '').trim();
    const asOfDate = asOfValue
        ? parseDate(asOfValue)
        : parseDate(new Date().toISOString().slice(0, 10));

    if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 직원 ID를 입력해 주세요.'
        });
    }

    if (!asOfDate) {
        return res.status(400).json({
            success: false,
            message: '조회 기준일은 YYYY-MM-DD 형식이어야 합니다.'
        });
    }

    const asOf = formatDate(asOfDate);

    try {
        const [employeeRows] = await promiseDb.query(
            `SELECT employee_id AS employeeId,
                    DATE_FORMAT(hire_date, '%Y-%m-%d') AS hireDate
             FROM employees
             WHERE employee_id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const employee = employeeRows[0];
        const [leaveRows] = await promiseDb.query(
            `SELECT
                JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.startDate')) AS startDate,
                JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.endDate')) AS endDate
             FROM my_draft md
             WHERE md.employee_id = ?
               AND md.document_type = '휴가'
               AND md.status IN ('APPROVED', '승인', '승인완료', '완료')
               AND JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.endDate')) >= ?
               AND JSON_UNQUOTE(JSON_EXTRACT(md.detail_data, '$.startDate')) <= ?`,
            [employeeId, employee.hireDate, asOf]
        );

        const usedDaySet = new Set();
        addApprovedWeekdaysToSet(
            leaveRows,
            employee.hireDate,
            asOf,
            usedDaySet
        );

        const entitledDays = completedMonthsBetween(employee.hireDate, asOf);
        const usedDays = usedDaySet.size;

        return res.json({
            success: true,
            data: {
                employeeId,
                entitledDays,
                usedDays,
                remainingDays: entitledDays - usedDays
            }
        });
    } catch (error) {
        console.error('연차 요약 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '연차 요약을 조회하지 못했습니다.'
        });
    }
});

module.exports = hrLeaveRouter;
