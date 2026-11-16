const express = require('express');
const db = require('../db');
const {
    applyApprovedDraftToPayroll,
    calculateFreelancerPayroll,
    recordPayrollChange
} = require('../services/hrPayrollApplication');

const hrRouter = express.Router();
const promiseDb = db.promise();
const attendanceStatuses = ['정상', '지각', '결근', '휴가', '출장', '휴직', '미출근'];
// 급여는 작성중 단계에서만 금액을 바꿀 수 있고, 확정 이후에는 이력을 보존합니다.
const payrollDraftStatuses = ['작성중'];
const payrollFinalStatuses = ['확정', '지급대기', '지급완료'];
const payrollEditableStatus = '작성중';

// HR API에서 공통으로 사용하는 날짜·이메일·급여월·금액 입력 검증 함수입니다.
function isDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(value + 'T00:00:00Z');

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function isTimeString(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isEmailString(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPayMonthString(value) {
    return typeof value === 'string' && /^(\d{4})-(0[1-9]|1[0-2])$/.test(value);
}

function currentPayMonth() {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function nextPayMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeDepartmentName(value) {
    const name = String(value || '').trim();

    if (!name) {
        return '';
    }

    if (name.endsWith('부서')) {
        return name;
    }

    return name.endsWith('팀')
        ? `${name.slice(0, -1)}부서`
        : `${name}부서`;
}

function parseNonNegativeInteger(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const numberValue = Number(value);

    return Number.isSafeInteger(numberValue) && numberValue >= 0
        ? numberValue
        : null;
}

function normalizePositiveIds(values) {
    if (values === undefined) {
        return null;
    }

    if (!Array.isArray(values) || values.length === 0) {
        return undefined;
    }

    const ids = values.map((value) => Number(value));

    return ids.some((value) => !Number.isSafeInteger(value) || value < 1) ||
        new Set(ids).size !== ids.length
        ? undefined
        : ids;
}

// 프리랜서 급여 공통 계산식입니다.
// 총지급액 → 소득세 3% → 지방소득세(소득세의 10%) → 실지급액 순서로 계산합니다.
function normalizePayrollIds(rawPayrollIds) {
    if (!Array.isArray(rawPayrollIds) || rawPayrollIds.length === 0) {
        return null;
    }

    const payrollIds = rawPayrollIds.map((value) => Number(value));

    return payrollIds.some(
        (value) => !Number.isSafeInteger(value) || value < 1
    ) || new Set(payrollIds).size !== payrollIds.length
        ? null
        : payrollIds;
}

async function hasActiveMasterAccount(employeeId) {
    const [rows] = await promiseDb.query(
        `SELECT employee_id
         FROM employee_accounts
         WHERE employee_id = ?
           AND role = 'MASTER'
           AND account_status = 'ACTIVE'`,
        [employeeId]
    );

    return rows.length > 0;
}

function validatePayrollAmounts(row) {
    const amounts = [
        row.baseSalary,
        row.allowance,
        row.bonus,
        row.otherPayment,
        row.incomeTax,
        row.localIncomeTax,
        row.deduction,
        row.grossPay,
        row.netPay
    ].map(parseNonNegativeInteger);
    const [
        baseSalary,
        allowance,
        bonus,
        otherPayment,
        incomeTax,
        localIncomeTax,
        deduction,
        grossPay,
        netPay
    ] = amounts;
    const expectedGrossPay =
        baseSalary === null ||
        allowance === null ||
        bonus === null ||
        otherPayment === null
            ? null
            : baseSalary + allowance + bonus + otherPayment;
    const expectedDeduction =
        incomeTax === null || localIncomeTax === null
            ? null
            : incomeTax + localIncomeTax;

    return {
        valid: amounts.every((value) => value !== null) &&
            grossPay === expectedGrossPay &&
            deduction === expectedDeduction &&
            netPay === grossPay - deduction,
        grossPay,
        deduction,
        netPay
    };
}

async function propagateAnnualSalaryToFutureRecords(
    employeeId,
    effectiveMonth,
    annualSalary
) {
    // 연봉 변경월 이후의 연봉 이력도 새 기준으로 맞춰야
    // 아직 생성되지 않은 다음 달 급여가 새 기본급을 사용합니다.
    const baseSalary = Math.floor(annualSalary / 12);

    await promiseDb.query(
        `UPDATE employee_salary_history
         SET annual_salary = ?
         WHERE employee_id = ?
           AND effective_month > ?`,
        [annualSalary, employeeId, effectiveMonth]
    );

    const [rows] = await promiseDb.query(
        `SELECT
            payroll_id AS payrollId,
            allowance,
            bonus,
            other_payment AS otherPayment
         FROM payrolls
         WHERE employee_id = ?
           AND pay_month > ?
           AND (
                payment_status IS NULL
                OR payment_status = ?
           )
         ORDER BY pay_month ASC, payroll_id ASC`,
        [employeeId, effectiveMonth, payrollDraftStatuses[0]]
    );

    // 이미 생성된 미래 급여 중 미확정 행만 기본급을 갱신합니다.
    // 월별 수당·상여금·기타 지급액은 각 월 담당자 입력값을 그대로 보존합니다.
    for (const row of rows) {
        const calculation = calculateFreelancerPayroll({
            baseSalary,
            allowance: parseNonNegativeInteger(row.allowance) ?? 0,
            bonus: parseNonNegativeInteger(row.bonus) ?? 0,
            otherPayment: parseNonNegativeInteger(row.otherPayment) ?? 0
        });

        await promiseDb.query(
            `UPDATE payrolls
             SET base_salary = ?,
                 income_tax = ?,
                 local_income_tax = ?,
                 deduction = ?,
                 gross_pay = ?,
                 net_pay = ?
             WHERE payroll_id = ?`,
            [
                baseSalary,
                calculation.incomeTax,
                calculation.localIncomeTax,
                calculation.totalDeduction,
                calculation.grossPay,
                calculation.netPay,
                row.payrollId
            ]
        );
    }
}

async function departmentExists(departmentId) {
    // 직원 등록·수정 전에 참조할 부서가 실제로 존재하는지 확인합니다.
    const [rows] = await promiseDb.query(
        'SELECT department_id FROM departments WHERE department_id = ?',
        [departmentId]
    );

    return rows.length > 0;
}

// 급여 기준월에 적용할 연봉을 이력에서 찾습니다.
// 이력 데이터가 없는 오래된 직원은 현재 직원 정보의 연봉을 fallback으로 사용합니다.
async function getAnnualSalaryForMonth(employeeId, payMonth) {
    // 급여 기준월 이전에 적용된 가장 최근 연봉 이력을 사용합니다.
    const [historyRows] = await promiseDb.query(
        `SELECT annual_salary AS annualSalary
         FROM employee_salary_history
         WHERE employee_id = ?
           AND effective_month <= ?
         ORDER BY effective_month DESC, salary_history_id DESC
         LIMIT 1`,
        [employeeId, payMonth]
    );

    if (historyRows.length > 0) {
        return parseNonNegativeInteger(historyRows[0].annualSalary);
    }

    const [employeeRows] = await promiseDb.query(
        `SELECT initial_annual_salary AS initialAnnualSalary
         FROM employees
         WHERE employee_id = ?`,
        [employeeId]
    );

    return employeeRows.length > 0
        ? parseNonNegativeInteger(employeeRows[0].initialAnnualSalary)
        : null;
}

// 직원별 월 급여가 아직 없으면 기준월의 연봉으로 자동 생성합니다.
// 이미 저장된 급여는 절대 갱신하지 않아 과거 급여 이력을 보존합니다.
async function ensurePayrollForMonth(payMonth, employeeId = null) {
    // 퇴사자는 퇴사월까지만 대상이며, 퇴사 이후 월은 생성하지 않습니다.
    let employeeQuery = `
        SELECT
            e.employee_id AS employeeId,
            e.name AS employeeName
        FROM employees e
        WHERE DATE_FORMAT(e.hire_date, '%Y-%m') <= ?
          AND (
                e.employment_status IN ('재직', '휴직')
                OR (
                    e.employment_status = '퇴사'
                    AND e.resignation_date IS NOT NULL
                    AND DATE_FORMAT(e.resignation_date, '%Y-%m') >= ?
                )
          )
    `;
    const employeeValues = [payMonth, payMonth];

    if (employeeId !== null) {
        employeeQuery += ' AND e.employee_id = ?';
        employeeValues.push(employeeId);
    }

    const [employees] = await promiseDb.query(employeeQuery, employeeValues);
    const result = {
        payMonth,
        generated: [],
        existing: [],
        skipped: []
    };

    for (const employee of employees) {
        const [existingRows] = await promiseDb.query(
            `SELECT payroll_id AS payrollId
             FROM payrolls
             WHERE employee_id = ?
               AND pay_month = ?
             LIMIT 1`,
            [employee.employeeId, payMonth]
        );

        if (existingRows.length > 0) {
            result.existing.push({
                employeeId: employee.employeeId,
                employeeName: employee.employeeName,
                payrollId: existingRows[0].payrollId,
                reason: '해당 월 급여가 이미 등록되어 있습니다.'
            });
            continue;
        }

        const annualSalary = await getAnnualSalaryForMonth(
            employee.employeeId,
            payMonth
        );

        if (annualSalary === null) {
            result.skipped.push({
                employeeId: employee.employeeId,
                employeeName: employee.employeeName,
                reason: '적용월 기준 급여 이력과 초기 연봉이 모두 없습니다.'
            });
            continue;
        }

        const baseSalary = Math.floor(annualSalary / 12);
        const calculation = calculateFreelancerPayroll({
            baseSalary,
            allowance: 0,
            bonus: 0,
            otherPayment: 0
        });

        const [insertResult] = await promiseDb.query(
            `INSERT IGNORE INTO payrolls (
                employee_id,
                pay_month,
                base_salary,
                allowance,
                deduction,
                bonus,
                other_payment,
                income_tax,
                local_income_tax,
                gross_pay,
                net_pay,
                payment_date,
                payment_status
             )
             VALUES (?, ?, ?, 0, ?, 0, 0, ?, ?, ?, ?, NULL, '작성중')`,
            [
                employee.employeeId,
                payMonth,
                baseSalary,
                calculation.totalDeduction,
                calculation.incomeTax,
                calculation.localIncomeTax,
                calculation.grossPay,
                calculation.netPay
            ]
        );

        if (insertResult.affectedRows === 1) {
            result.generated.push({
                employeeId: employee.employeeId,
                employeeName: employee.employeeName,
                baseSalary
            });
        } else {
            result.existing.push({
                employeeId: employee.employeeId,
                employeeName: employee.employeeName,
                reason: '동시에 등록된 기존 급여가 있어 새로 생성하지 않았습니다.'
            });
        }
    }

    return result;
}

// 인사 담당자가 다음 달 급여를 미리 준비합니다.
// 급여 생성만 수행하며 확정·재무 승인·지급 처리는 실행하지 않습니다.
hrRouter.post('/payrolls/prepare-selected', async (req, res) => {
    const payMonth = String(req.body.payMonth || '').trim();
    const rawEmployeeIds = req.body.employeeIds;
    const actorEmployeeId = Number(req.body.actorEmployeeId);

    if (
        !isPayMonthString(payMonth) ||
        !Array.isArray(rawEmployeeIds) ||
        rawEmployeeIds.length === 0 ||
        !Number.isSafeInteger(actorEmployeeId) ||
        actorEmployeeId < 1
    ) {
        return res.status(400).json({
            success: false,
            message: '급여월, 직원 ID, 요청자 정보가 올바르지 않습니다.'
        });
    }

    const employeeIds = rawEmployeeIds.map((value) => Number(value));

    if (
        employeeIds.some((value) => !Number.isSafeInteger(value) || value < 1) ||
        new Set(employeeIds).size !== employeeIds.length
    ) {
        return res.status(400).json({
            success: false,
            message: '직원 ID 목록에 중복되거나 올바르지 않은 값이 있습니다.'
        });
    }

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 급여를 준비할 수 있습니다.'
            });
        }

        const result = {
            payMonth,
            prepared: [],
            skipped: []
        };

        for (const employeeId of employeeIds) {
            const ensured = await ensurePayrollForMonth(payMonth, employeeId);

            if (ensured.generated.length > 0) {
                result.prepared.push({
                    ...ensured.generated[0],
                    status: '\uC791\uC131\uC911'
                });
                continue;
            }

            if (ensured.skipped.length > 0) {
                result.skipped.push(ensured.skipped[0]);
                continue;
            }

            const [rows] = await promiseDb.query(
                `SELECT
                    p.payroll_id AS payrollId,
                    p.employee_id AS employeeId,
                    p.payment_status AS paymentStatus,
                    e.name AS employeeName
                 FROM payrolls p
                 INNER JOIN employees e
                    ON e.employee_id = p.employee_id
                 WHERE p.employee_id = ?
                   AND p.pay_month = ?
                 LIMIT 1`,
                [employeeId, payMonth]
            );

            if (rows.length === 0) {
                result.skipped.push({
                    employeeId,
                    reason: '선택한 직원을 찾을 수 없습니다.'
                });
                continue;
            }

            const row = rows[0];

            if (row.paymentStatus === '\uC791\uC131\uC911') {
                result.prepared.push({
                    employeeId: row.employeeId,
                    employeeName: row.employeeName,
                    payrollId: row.payrollId,
                    status: row.paymentStatus,
                    reason: '기존 작성중 급여를 유지했습니다.'
                });
            } else {
                result.skipped.push({
                    employeeId: row.employeeId,
                    employeeName: row.employeeName,
                    payrollId: row.payrollId,
                    reason: '확정 또는 지급 절차에 들어간 급여는 변경하지 않습니다.'
                });
            }
        }

        return res.json({
            success: true,
            data: result,
            message: `${result.prepared.length}명의 급여를 준비했습니다.`
        });
    } catch (error) {
        console.error('선택 직원 급여 준비 오류:', error);

        return res.status(500).json({
            success: false,
            message: '선택 직원 급여를 준비하지 못했습니다.'
        });
    }
});

hrRouter.post('/payrolls/generate-next-month', async (req, res) => {
    const actorEmployeeId = Number(req.body.actorEmployeeId);

    if (!Number.isSafeInteger(actorEmployeeId) || actorEmployeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '급여 생성 요청자 정보가 올바르지 않습니다.'
        });
    }

    let transactionStarted = false;

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 다음 달 급여를 생성할 수 있습니다.'
            });
        }

        const payMonth = nextPayMonth();
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const result = await ensurePayrollForMonth(payMonth);

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: result,
            message: `${payMonth} 급여 ${result.generated.length}건을 생성했습니다.`
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('다음 달 급여 생성 오류:', error);

        return res.status(500).json({
            success: false,
            message: '다음 달 급여를 생성하지 못했습니다.'
        });
    }
});

// 최종 승인된 비용·수당·상여금 기안을 선택한 급여월에 반영합니다.
// 별도 연결 컬럼을 추가하지 않고 기존 my_draft.detail_data에 반영 이력을 남깁니다.
async function applyApprovedDraftsHandler(
    req,
    res,
    { manageTransaction = true, returnResult = false, dryRun = false } = {}
) {
    const actorEmployeeId = Number(req.body.actorEmployeeId);
    const payMonth = String(req.body.payMonth || '').trim();
    const draftIds = normalizePositiveIds(req.body.draftIds);
    const employeeIds = req.body.employeeIds === undefined
        ? null
        : normalizePositiveIds(req.body.employeeIds);
    const hasPayrollIds = req.body.payrollIds !== undefined;
    const payrollIds = hasPayrollIds
        ? normalizePayrollIds(req.body.payrollIds)
        : null;

    if (
        !Number.isSafeInteger(actorEmployeeId) ||
        actorEmployeeId < 1 ||
        !isPayMonthString(payMonth) ||
        draftIds === undefined ||
        employeeIds === undefined ||
        (hasPayrollIds && payrollIds === null)
    ) {
        return res.status(400).json({
            success: false,
            message: '급여월, 실행 사용자 또는 기안서 목록이 올바르지 않습니다.'
        });
    }

    let transactionStarted = false;

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 승인 기안을 급여에 반영할 수 있습니다.'
            });
        }

        const queryValues = [];
        let draftQuery = `
            SELECT
                d.draft_id AS draftId,
                d.employee_id AS employeeId,
                e.name AS employeeName,
                d.document_type AS documentType,
                d.detail_data AS detailData
            FROM my_draft d
            LEFT JOIN employees e ON e.employee_id = d.employee_id
            WHERE d.status = 'APPROVED'
              AND d.document_type IN ('비용', '수당', '상여금', '추가급여')
        `;

        if (draftIds !== null) {
            draftQuery += ` AND d.draft_id IN (${draftIds.map(() => '?').join(', ')})`;
            queryValues.push(...draftIds);
        }

        draftQuery += ' ORDER BY d.draft_id ASC FOR UPDATE';

        if (manageTransaction) {
            await promiseDb.beginTransaction();
            transactionStarted = true;
        }

        const [draftRows] = await promiseDb.query(draftQuery, queryValues);
        const applied = [];
        const skipped = [];

        for (const draft of draftRows) {
            const application = await applyApprovedDraftToPayroll({
                connection: promiseDb,
                draft,
                approvedBy: actorEmployeeId,
                payMonth,
                employeeIds,
                payrollIds,
                dryRun,
                strict: false
            });

            if (application.applied) {
                applied.push(application.applied);
            }
            if (application.skipped) {
                skipped.push(application.skipped);
            }
            continue;

        }

        if (manageTransaction) {
            await promiseDb.commit();
            transactionStarted = false;
        }

        const response = {
            success: true,
            data: {
                payMonth,
                applied,
                skipped,
                selectedCount: draftRows.length
            },
            message: `${applied.length}건의 승인 기안을 급여에 반영했습니다.`
        };

        return returnResult ? response : res.json(response);
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('승인 기안 급여 반영 오류:', error);

        const response = {
            success: false,
            message: '승인 기안을 급여에 반영하지 못했습니다.'
        };

        return returnResult ? response : res.status(500).json(response);
    }
}

hrRouter.post('/payrolls/apply-approved-drafts', (req, res) =>
    applyApprovedDraftsHandler(req, res)
);

// 직원 급여 이력 화면에서도 입사월부터 현재월까지 월별 급여를 자동 준비합니다.
async function ensurePayrollHistory(employeeId) {
    const [employeeRows] = await promiseDb.query(
        `SELECT
            DATE_FORMAT(hire_date, '%Y-%m') AS hireMonth,
            DATE_FORMAT(CURRENT_DATE, '%Y-%m') AS currentMonth
         FROM employees
         WHERE employee_id = ?`,
        [employeeId]
    );

    if (employeeRows.length === 0) {
        return;
    }

    const { hireMonth, currentMonth } = employeeRows[0];
    let cursor = hireMonth;

    while (cursor <= currentMonth) {
        await ensurePayrollForMonth(cursor, employeeId);

        const [year, month] = cursor.split('-').map(Number);
        const nextMonth = new Date(Date.UTC(year, month, 1));
        cursor = `${nextMonth.getUTCFullYear()}-${String(
            nextMonth.getUTCMonth() + 1
        ).padStart(2, '0')}`;
    }
}


// 관리자가 선택한 직원의 신규 근태 기록을 등록합니다.
// 저장 요청이 있을 때만 한 건을 생성하며, 동일 직원·날짜 중복은 허용하지 않습니다.
hrRouter.post('/attendance', async (req, res) => {
    const employeeId = Number(req.body.employeeId);
    const workDate = String(req.body.workDate || '').trim();
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    const status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !isDateString(workDate) ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !attendanceStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '직원, 근무일, 출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    try {
        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1',
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '등록할 직원을 찾을 수 없습니다.'
            });
        }

        const [existingRows] = await promiseDb.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ? AND work_date = ?
             LIMIT 1`,
            [employeeId, workDate]
        );

        if (existingRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 날짜 근태 기록이 이미 존재합니다.'
            });
        }

        const [result] = await promiseDb.query(
            `INSERT INTO attendance
                (employee_id, work_date, check_in_at, check_out_at, attendance_status, memo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                workDate,
                checkIn ? `${workDate} ${checkIn}:00` : null,
                checkOut ? `${workDate} ${checkOut}:00` : null,
                status,
                memo
            ]
        );

        return res.status(201).json({
            success: true,
            data: {
                attendanceId: result.insertId,
                employeeId,
                attendanceDate: workDate,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 기록이 등록되었습니다.'
        });
    } catch (error) {
        console.error('신규 근태 등록 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 등록하지 못했습니다.'
        });
    }
});


// 달력용 근태 기록 조회
// 날짜·부서 조건은 선택적으로 적용하고 출근·퇴근 시각은 조회 전용으로 반환합니다.
hrRouter.get('/attendance', async (req, res) => {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const date = req.query.date || null;
    const departmentIdValue = req.query.departmentId;
    let departmentId = null;

    if (startDate && !isDateString(startDate)) {
        return res.status(400).json({
            success: false,
            message: '시작일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (endDate && !isDateString(endDate)) {
        return res.status(400).json({
            success: false,
            message: '종료일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (date && !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (departmentIdValue !== undefined) {
        departmentId = Number(departmentIdValue);

        if (!Number.isInteger(departmentId) || departmentId < 1) {
            return res.status(400).json({
                success: false,
                message: '올바른 부서 ID를 입력해 주세요.'
            });
        }
    }

    const query = `
        SELECT
            a.attendance_id AS attendanceId,
            a.employee_id AS employeeId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            a.attendance_status AS status,
            a.memo
        FROM attendance a
        INNER JOIN employees e
            ON e.employee_id = a.employee_id
        INNER JOIN departments d
            ON d.department_id = e.department_id
        WHERE (? IS NULL OR a.work_date >= ?)
          AND (? IS NULL OR a.work_date <= ?)
          AND (? IS NULL OR a.work_date = ?)
          AND (? IS NULL OR d.department_id = ?)
        ORDER BY a.work_date DESC, a.attendance_id DESC
    `;

    const values = [
        startDate, startDate,
        endDate, endDate,
        date, date,
        departmentId, departmentId
    ];

    try {
        const [rows] = await promiseDb.query(query, values);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('HR 근태정보 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 정보를 불러오지 못했습니다.'
        });
    }
});


// 기존 결재 초안과 휴가 기간을 조합한 휴가 신청 조회
// 휴가 신청·승인 저장 API가 없어 현재 라우트는 읽기 전용입니다.
hrRouter.get('/leaves', async (req, res) => {
    const month = String(req.query.month || '').trim();
    const year = String(req.query.year || '').trim();

    if (month && !isPayMonthString(month)) {
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

    const query = `
        SELECT
            dl.leave_id AS leaveId,
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
            DATE_FORMAT(dl.start_date, '%Y-%m-%d') AS startDate,
            DATE_FORMAT(dl.end_date, '%Y-%m-%d') AS endDate,
            dl.leave_days AS leaveDays,
            CASE
                WHEN md.status IN ('승인', '승인완료', '완료') THEN '승인완료'
                WHEN md.status IN ('반려', '거절') THEN '반려'
                ELSE '승인대기'
            END AS applicationStatus,
            md.status AS sourceStatus,
            DATE_FORMAT(md.created_at, '%Y-%m-%d %H:%i') AS applicationDate,
            md.approver_id AS approverId,
            approver.name AS approverName,
            DATE_FORMAT(md.processed_at, '%Y-%m-%d %H:%i') AS approvalDate
        FROM draft_leave dl
        INNER JOIN my_draft md
            ON md.draft_id = dl.draft_id
        INNER JOIN employees e
            ON e.employee_id = md.employee_id
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN employees approver
            ON approver.employee_id = md.approver_id
        WHERE (? = '' OR DATE_FORMAT(dl.start_date, '%Y-%m') = ?)
          AND (? = '' OR DATE_FORMAT(dl.start_date, '%Y') = ?)
        ORDER BY dl.start_date DESC, dl.leave_id DESC
    `;

    try {
        const [rows] = await promiseDb.query(query, [
            month,
            month,
            year,
            year
        ]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('휴가 신청 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '휴가 신청 정보를 불러오지 못했습니다.'
        });
    }
});


// 근태 시간·상태·수정 사유를 수정합니다.
hrRouter.put('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    const status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    if (
        !Number.isInteger(attendanceId) ||
        attendanceId < 1 ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !attendanceStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    try {
        const [existingRows] = await promiseDb.query(
            'SELECT attendance_id FROM attendance WHERE attendance_id = ? LIMIT 1',
            [attendanceId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '근태 기록을 찾을 수 없습니다.'
            });
        }

        await promiseDb.query(
            `UPDATE attendance
             SET check_in_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 check_out_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 attendance_status = ?,
                 memo = ?
             WHERE attendance_id = ?`,
            [
                checkIn,
                checkIn,
                checkOut,
                checkOut,
                status,
                memo,
                attendanceId
            ]
        );

        return res.json({
            success: true,
            data: {
                attendanceId,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 정보가 수정되었습니다.'
        });
    } catch (error) {
        console.error('근태 정보 수정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 정보를 수정하지 못했습니다.'
        });
    }
});


// 관리자가 선택한 근태 기록 한 건을 삭제합니다.
hrRouter.delete('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);

    if (!Number.isInteger(attendanceId) || attendanceId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 근태 기록 ID를 입력해 주세요.'
        });
    }

    try {
        const [result] = await promiseDb.query(
            'DELETE FROM attendance WHERE attendance_id = ?',
            [attendanceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '삭제할 근태 기록을 찾을 수 없습니다.'
            });
        }

        return res.json({
            success: true,
            data: { attendanceId },
            message: '근태 기록이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('근태 기록 삭제 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 삭제하지 못했습니다.'
        });
    }
});


// 부서 직원 전체와 해당 날짜의 근태 조회
hrRouter.get('/attendance/department', async (req, res) => {
    const date = req.query.date;
    const departmentId = Number(req.query.departmentId);

    if (!date || !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    const query = `
        SELECT
            e.employee_id AS employeeId,
            a.attendance_id AS attendanceId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            COALESCE(a.attendance_status, '미출근') AS status,
            a.memo
        FROM employees e
        INNER JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN attendance a
            ON a.employee_id = e.employee_id
            AND a.work_date = ?
        WHERE e.department_id = ?
          AND e.employment_status = '재직'
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query, [date, departmentId]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 근태현황 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 근태현황을 불러오지 못했습니다.'
        });
    }
});


// 직원 목록 조회
// 직원 기본정보와 부서·계정 정보를 조합해 직원관리 화면에 전달합니다.
hrRouter.get('/employees', async (req, res) => {
    const query = `
        SELECT
            e.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            e.email,
            e.phone,
            DATE_FORMAT(e.hire_date, '%Y-%m-%d') AS hireDate,
            e.initial_annual_salary AS initialAnnualSalary,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignationDate,
            e.employment_status AS employmentStatus,
            ea.role,
            ea.account_status AS accountStatus
        FROM employees e
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN employee_accounts ea
            ON ea.employee_id = e.employee_id
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('직원 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '직원 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 목록 조회
// 부서장 이름과 설명을 함께 조회해 직원·부서 통합 화면에서 사용합니다.
hrRouter.get('/departments', async (req, res) => {
    const query = `
        SELECT
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            d.manager_id AS managerId,
            m.name AS managerName,
            d.description
        FROM departments d
        LEFT JOIN employees m
            ON m.employee_id = d.manager_id
        ORDER BY d.department_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 등록
// 선택한 직원은 부서장으로 연결하고 부서명 중복을 먼저 확인합니다.
hrRouter.post('/departments', async (req, res) => {
    const departmentName = normalizeDepartmentName(req.body.departmentName);
    const description = String(req.body.description || '').trim();
    const managerIdValue = req.body.managerId;
    const managerId =
        managerIdValue === '' || managerIdValue === null || managerIdValue === undefined
            ? null
            : Number(managerIdValue);

    if (
        !departmentName ||
        departmentName.length > 50 ||
        description.length > 255 ||
        (managerId !== null && (!Number.isInteger(managerId) || managerId < 1))
    ) {
        return res.status(400).json({
            success: false,
            message: '부서 등록 정보를 올바르게 입력해 주세요.'
        });
    }

    // 부서 생성과 부서장 직원의 소속 이동을 한 번에 처리합니다.
    let transactionStarted = false;

    try {
        const [duplicateRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_name = ?',
            [departmentName]
        );

        if (duplicateRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        if (managerId !== null) {
            const [managerRows] = await promiseDb.query(
                `SELECT employee_id
                 FROM employees
                 WHERE employee_id = ? AND employment_status <> '퇴사'`,
                [managerId]
            );

            if (managerRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '부서장으로 지정할 수 있는 직원을 찾을 수 없습니다.'
                });
            }
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [result] = await promiseDb.query(
            `INSERT INTO departments (
                department_name,
                manager_id,
                description
             )
             VALUES (?, ?, ?)`,
            [departmentName, managerId, description || null]
        );

        if (managerId !== null) {
            await promiseDb.query(
                `UPDATE departments
                 SET manager_id = NULL
                 WHERE manager_id = ?
                   AND department_id <> ?`,
                [managerId, result.insertId]
            );

            await promiseDb.query(
                `UPDATE employees
                 SET department_id = ?
                 WHERE employee_id = ?`,
                [result.insertId, managerId]
            );
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                departmentId: result.insertId,
                departmentName,
                managerId,
                description: description || null
            },
            message: '부서가 등록되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('부서 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 등록하지 못했습니다.'
        });
    }
});


// 소속 직원이 없는 부서만 삭제합니다.
hrRouter.delete('/departments/:departmentId', async (req, res) => {
    const departmentId = Number(req.params.departmentId);
    let transactionStarted = false;

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [departmentRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_id = ? FOR UPDATE',
            [departmentId]
        );

        if (departmentRows.length === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '삭제할 부서를 찾을 수 없습니다.'
            });
        }

        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE department_id = ? LIMIT 1',
            [departmentId]
        );

        if (employeeRows.length > 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: '소속 직원이 있는 부서는 삭제할 수 없습니다.'
            });
        }

        await promiseDb.query(
            'DELETE FROM departments WHERE department_id = ?',
            [departmentId]
        );
        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: '부서가 삭제되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('부서 삭제 오류:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: '연결된 자료가 있는 부서는 삭제할 수 없습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 삭제하지 못했습니다.'
        });
    }
});


// 급여월별 직원 급여 목록 조회
// 조회 시 해당 월의 급여가 없으면 연봉 이력 기준으로 자동 생성합니다.
hrRouter.get('/payrolls', async (req, res) => {
    const payMonth = String(req.query.payMonth || '').trim();

    if (!isPayMonthString(payMonth)) {
        return res.status(400).json({
            success: false,
            message: '급여월 형식은 YYYY-MM이어야 합니다.'
        });
    }

    const query = `
        SELECT
            p.payroll_id AS payrollId,
            e.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name AS employeeName,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            e.initial_annual_salary AS initialAnnualSalary,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignationDate,
            e.employment_status AS employmentStatus,
            financeDraft.draft_id AS financeDraftId,
            financeDraft.status AS financeDraftStatus,
            p.pay_month AS payMonth,
            p.base_salary AS baseSalary,
            p.allowance,
            p.deduction,
            p.bonus,
            p.other_payment AS otherPayment,
            p.income_tax AS incomeTax,
            p.local_income_tax AS localIncomeTax,
            p.deduction AS totalDeduction,
            p.gross_pay AS grossPay,
            p.net_pay AS netPay,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paymentDate,
            CASE
                WHEN p.payroll_id IS NULL THEN '급여 미등록'
                ELSE COALESCE(p.payment_status, '지급대기')
            END AS paymentStatus
        FROM employees e
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN payrolls p
            ON p.employee_id = e.employee_id
            AND p.pay_month = ?
        LEFT JOIN my_draft financeDraft
            ON financeDraft.document_type = '급여'
            AND JSON_UNQUOTE(JSON_EXTRACT(financeDraft.detail_data, '$.source')) = 'HR_PAYROLL'
            AND JSON_UNQUOTE(JSON_EXTRACT(financeDraft.detail_data, '$.payMonth')) = p.pay_month
            AND JSON_CONTAINS(
                JSON_EXTRACT(financeDraft.detail_data, '$.payrollIds'),
                JSON_ARRAY(p.payroll_id)
            )
        WHERE e.employment_status IN ('재직', '휴직')
        ORDER BY d.department_id, e.employee_id
    `;

    // 선택한 월의 급여가 없으면 화면 조회 시점에 준비하되, 최종 상태는 변경하지 않습니다.
    try {
        if (payMonth <= currentPayMonth()) {
            await ensurePayrollForMonth(payMonth);
        }
        const [rows] = await promiseDb.query(query, [payMonth]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('급여 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 정보를 불러오지 못했습니다.'
        });
    }
});


// 선택한 직원의 월별 급여 이력 조회
// 입사월부터 현재월까지 누락된 월 급여를 자동 생성한 뒤 반환합니다.
hrRouter.get('/payrolls/employee/:employeeId/history', async (req, res) => {
    const employeeId = Number(req.params.employeeId);

    if (!Number.isInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '직원 식별자가 올바르지 않습니다.'
        });
    }

    const query = `
        SELECT
            p.payroll_id AS payrollId,
            p.employee_id AS employeeId,
            p.pay_month AS payMonth,
            p.base_salary AS baseSalary,
            p.allowance,
            p.bonus,
            p.deduction,
            p.other_payment AS otherPayment,
            p.income_tax AS incomeTax,
            p.local_income_tax AS localIncomeTax,
            p.deduction AS totalDeduction,
            p.gross_pay AS grossPay,
            p.net_pay AS netPay,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paymentDate,
            COALESCE(p.payment_status, '지급대기') AS paymentStatus
        FROM payrolls p
        WHERE p.employee_id = ?
        ORDER BY p.pay_month DESC, p.payroll_id DESC
    `;

    try {
        await ensurePayrollHistory(employeeId);
        const [rows] = await promiseDb.query(query, [employeeId]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('직원 급여 이력 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 이력을 불러오지 못했습니다.'
        });
    }
});


// 급여 등록
// 등록 요청의 금액을 검증하고 gross/net 금액은 서버에서 계산합니다.
hrRouter.post('/payrolls', async (req, res) => {
    const employeeId = Number(req.body.employeeId);
    const payMonth = String(req.body.payMonth || '').trim();
    const annualSalaryInput = parseNonNegativeInteger(
        req.body.annualSalary
    );
    const allowance = parseNonNegativeInteger(req.body.allowance);
    const bonus = parseNonNegativeInteger(req.body.bonus);
    const otherPayment = parseNonNegativeInteger(req.body.otherPayment);

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !isPayMonthString(payMonth) ||
        allowance === null ||
        bonus === null ||
        otherPayment === null
    ) {
        return res.status(400).json({
            success: false,
            message: '급여 등록 정보를 올바르게 입력해 주세요.'
        });
    }

    // 연봉을 함께 입력한 경우 직원 기본정보·연봉 이력·급여를 하나로 저장합니다.
    let transactionStarted = false;

    try {
        const [employeeRows] = await promiseDb.query(
            `SELECT
                employee_id,
                initial_annual_salary AS initialAnnualSalary,
                employment_status AS employmentStatus
             FROM employees
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const employee = employeeRows[0];
        const annualSalary = annualSalaryInput === null
            ? await getAnnualSalaryForMonth(employeeId, payMonth)
            : annualSalaryInput;

        if (annualSalary === null) {
            return res.status(400).json({
                success: false,
                message: '직원의 최초 연봉이 등록되지 않았습니다.'
            });
        }

        if (employee.employmentStatus === '퇴사') {
            return res.status(400).json({
                success: false,
                message: '퇴사 직원은 신규 급여를 등록할 수 없습니다.'
            });
        }

        const baseSalary = Math.floor(annualSalary / 12);
        const calculation = calculateFreelancerPayroll({
            baseSalary,
            allowance,
            bonus,
            otherPayment
        });

        if (!calculation) {
            return res.status(400).json({
                success: false,
                message: '급여 금액을 올바르게 계산할 수 없습니다.'
            });
        }

        const [existingRows] = await promiseDb.query(
            `SELECT payroll_id
             FROM payrolls
             WHERE employee_id = ? AND pay_month = ?`,
            [employeeId, payMonth]
        );

        if (existingRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 월 급여가 이미 등록되어 있습니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        if (annualSalaryInput !== null) {
            await promiseDb.query(
                `UPDATE employees
                 SET initial_annual_salary = ?
                 WHERE employee_id = ?`,
                [annualSalary, employeeId]
            );

            await promiseDb.query(
                `INSERT INTO employee_salary_history (
                    employee_id,
                    annual_salary,
                    effective_month
                 )
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    annual_salary = VALUES(annual_salary)`,
                [employeeId, annualSalary, payMonth]
            );

            await propagateAnnualSalaryToFutureRecords(
                employeeId,
                payMonth,
                annualSalary
            );
        }

        const query = `
            INSERT INTO payrolls (
                employee_id,
                pay_month,
                base_salary,
                allowance,
                deduction,
                bonus,
                other_payment,
                income_tax,
                local_income_tax,
                gross_pay,
                net_pay,
                payment_date,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await promiseDb.query(query, [
            employeeId,
            payMonth,
            baseSalary,
            allowance,
            calculation.totalDeduction,
            bonus,
            otherPayment,
            calculation.incomeTax,
            calculation.localIncomeTax,
            calculation.grossPay,
            calculation.netPay,
            null,
            '작성중'
        ]);

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                payrollId: result.insertId,
                ...calculation
            },
            message: '급여가 등록되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('급여 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 월 급여가 이미 등록되어 있습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '급여를 등록하지 못했습니다.'
        });
    }
});


// 급여 수정
// 기존 급여 기록의 금액을 다시 계산해 저장하고 지급 정보는 보존합니다.
hrRouter.put('/payrolls/:payrollId', async (req, res) => {
    const payrollId = Number(req.params.payrollId);
    const annualSalary = parseNonNegativeInteger(req.body.annualSalary);
    const allowance = parseNonNegativeInteger(req.body.allowance);
    const bonus = parseNonNegativeInteger(req.body.bonus);
    const otherPayment = parseNonNegativeInteger(req.body.otherPayment);

    if (
        !Number.isInteger(payrollId) ||
        payrollId < 1 ||
        annualSalary === null ||
        allowance === null ||
        bonus === null ||
        otherPayment === null
    ) {
        return res.status(400).json({
            success: false,
            message: '급여 수정 정보를 올바르게 입력해 주세요.'
        });
    }

    // 현재 월 급여를 수정하고 연봉 변경분은 이후 미확정 월에만 전파합니다.
    let transactionStarted = false;

    try {
        const [existingRows] = await promiseDb.query(
            `SELECT
                payroll_id AS payrollId,
                employee_id AS employeeId,
                pay_month AS payMonth,
                payment_status AS paymentStatus
             FROM payrolls
             WHERE payroll_id = ?`,
            [payrollId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '급여 기록을 찾을 수 없습니다.'
            });
        }

        if (payrollFinalStatuses.includes(existingRows[0].paymentStatus)) {
            return res.status(409).json({
                success: false,
                message: '확정 또는 지급완료 급여는 수정할 수 없습니다.'
            });
        }

        const baseSalary = Math.floor(annualSalary / 12);
        const calculation = calculateFreelancerPayroll({
            baseSalary,
            allowance,
            bonus,
            otherPayment
        });

        if (!calculation) {
            return res.status(400).json({
                success: false,
                message: '급여 금액을 올바르게 계산할 수 없습니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        await promiseDb.query(
            `UPDATE employees
             SET initial_annual_salary = ?
             WHERE employee_id = ?`,
            [annualSalary, existingRows[0].employeeId]
        );

        await promiseDb.query(
            `INSERT INTO employee_salary_history (
                employee_id,
                annual_salary,
                effective_month
             )
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                annual_salary = VALUES(annual_salary)`,
            [
                existingRows[0].employeeId,
                annualSalary,
                existingRows[0].payMonth
            ]
        );

        // 미래 월의 기본급만 갱신하고 해당 월의 변동 지급항목은 유지합니다.
        await propagateAnnualSalaryToFutureRecords(
            existingRows[0].employeeId,
            existingRows[0].payMonth,
            annualSalary
        );

        const query = `
            UPDATE payrolls
            SET base_salary = ?,
                allowance = ?,
                bonus = ?,
                other_payment = ?,
                income_tax = ?,
                local_income_tax = ?,
                deduction = ?,
                gross_pay = ?,
                net_pay = ?
            WHERE payroll_id = ?
        `;
        await promiseDb.query(query, [
            baseSalary,
            allowance,
            bonus,
            otherPayment,
            calculation.incomeTax,
            calculation.localIncomeTax,
            calculation.totalDeduction,
            calculation.grossPay,
            calculation.netPay,
            payrollId
        ]);

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                payrollId,
                ...calculation
            },
            message: '급여 정보가 수정되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('급여 수정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 정보를 수정하지 못했습니다.'
        });
    }
});


// HR에서 작성중 급여를 확정합니다.
// 지급대기·지급완료 전환은 재무 지급 흐름에서만 처리합니다.
hrRouter.patch('/payrolls/:payrollId/status', async (req, res) => {
    const payrollId = Number(req.params.payrollId);
    const status = String(req.body.status || '').trim();
    const actorEmployeeId = parseNonNegativeInteger(req.body.actorEmployeeId);
    const reason = String(req.body.reason || '').trim().slice(0, 255);

    if (
        !Number.isInteger(payrollId) ||
        payrollId < 1 ||
        !['확정'].includes(status) ||
        actorEmployeeId === null ||
        actorEmployeeId < 1
    ) {
        return res.status(403).json({
            success: false,
            message: '급여 상태 변경 권한이 없거나 요청 정보가 올바르지 않습니다.'
        });
    }

    let transactionStarted = false;

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 급여 상태를 변경할 수 있습니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [rows] = await promiseDb.query(
            `SELECT
                payroll_id AS payrollId,
                employee_id AS employeeId,
                payment_status AS paymentStatus
             FROM payrolls
             WHERE payroll_id = ?
             FOR UPDATE`,
            [payrollId]
        );

        if (rows.length === 0) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(404).json({
                success: false,
                message: '급여 기록을 찾을 수 없습니다.'
            });
        }

        const previousStatus = rows[0].paymentStatus;
        const allowed = payrollDraftStatuses;

        if (!allowed.includes(previousStatus)) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                message: '작성중 급여만 확정할 수 있습니다.'
            });
        }

        await promiseDb.query(
            `UPDATE payrolls
             SET payment_status = '확정'
             WHERE payroll_id = ?`,
            [payrollId]
        );

        await recordPayrollChange({
            payrollId,
            employeeId: rows[0].employeeId,
            actionType: 'STATUS_CHANGE',
            previousStatus,
            newStatus: status,
            reason,
            changedBy: actorEmployeeId
        });

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                payrollId,
                paymentStatus: status
            },
            message: '급여가 확정되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('급여 상태 변경 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 상태를 변경하지 못했습니다.'
        });
    }
});


// 선택한 급여를 한 번에 확정합니다.
// 실제 DB의 급여 금액과 상태를 잠근 뒤 모두 검증하고, 하나라도 실패하면 전체를 롤백합니다.
hrRouter.post('/payrolls/bulk-confirm', async (req, res) => {
    const payMonth = String(req.body.payMonth || '').trim();
    const rawPayrollIds = req.body.payrollIds;
    const actorEmployeeId = parseNonNegativeInteger(req.body.actorEmployeeId);
    const preview = req.body.preview === true;

    if (
        !isPayMonthString(payMonth) ||
        !Array.isArray(rawPayrollIds) ||
        rawPayrollIds.length === 0 ||
        actorEmployeeId === null ||
        actorEmployeeId < 1
    ) {
        return res.status(400).json({
            success: false,
            message: '급여월, 급여 ID 목록 또는 승인자 정보가 올바르지 않습니다.'
        });
    }

    const payrollIds = normalizePayrollIds(rawPayrollIds);

    if (payrollIds === null) {
        return res.status(400).json({
            success: false,
            message: '급여 ID 목록에 중복되거나 올바르지 않은 값이 있습니다.'
        });
    }

    let transactionStarted = false;

    try {
        // 클라이언트가 전달한 role은 사용하지 않고 실제 계정 권한을 확인합니다.
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 급여를 일괄 확정할 수 있습니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        let [rows] = await promiseDb.query(
            `SELECT
                payroll_id AS payrollId,
                employee_id AS employeeId,
                pay_month AS payMonth,
                payment_status AS paymentStatus,
                base_salary AS baseSalary,
                allowance,
                bonus,
                other_payment AS otherPayment,
                income_tax AS incomeTax,
                local_income_tax AS localIncomeTax,
                deduction,
                gross_pay AS grossPay,
                net_pay AS netPay
             FROM payrolls
             WHERE payroll_id IN (?)
             FOR UPDATE`,
            [payrollIds]
        );

        const rowsById = new Map(
            rows.map((row) => [Number(row.payrollId), row])
        );

        if (rows.length !== payrollIds.length) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(404).json({
                success: false,
                message: '요청한 급여 기록 중 존재하지 않는 항목이 있습니다.'
            });
        }

        const invalidRows = [];

        for (const payrollId of payrollIds) {
            const row = rowsById.get(payrollId);
            const previousStatus = row.paymentStatus;
            const payrollAmounts = validatePayrollAmounts(row);

            if (
                row.payMonth !== payMonth ||
                !payrollDraftStatuses.includes(previousStatus) ||
                !payrollAmounts.valid
            ) {
                invalidRows.push({
                    payrollId,
                    payMonth: row.payMonth,
                    paymentStatus: previousStatus
                });
            }
        }

        if (invalidRows.length > 0) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                message: '급여월, 상태 또는 금액이 일괄 확정 조건과 맞지 않습니다.',
                data: { invalidPayrolls: invalidRows }
            });
        }

        const internalResponse = {
            status() {
                return this;
            },
            json(payload) {
                return payload;
            }
        };
        const draftResult = await applyApprovedDraftsHandler(
            {
                body: {
                    payMonth,
                    payrollIds,
                    employeeIds: rows.map((row) => Number(row.employeeId)),
                    actorEmployeeId
                }
            },
            internalResponse,
            {
                manageTransaction: false,
                returnResult: true,
                dryRun: preview
            }
        );

        if (!draftResult.success) {
            throw new Error(draftResult.message);
        }

        if (preview) {
            const previewRows = rows.map((row) => ({ ...row }));

            for (const appliedDraft of draftResult.data.applied) {
                const row = previewRows.find(
                    (item) => Number(item.payrollId) === Number(appliedDraft.payrollId)
                );
                const amountField = {
                    allowance: 'allowance',
                    bonus: 'bonus',
                    other_payment: 'otherPayment'
                }[appliedDraft.payrollField];

                if (!row || !amountField) {
                    continue;
                }

                row[amountField] = Number(row[amountField] || 0) + Number(appliedDraft.amount);
                const calculation = calculateFreelancerPayroll({
                    baseSalary: Number(row.baseSalary || 0),
                    allowance: Number(row.allowance || 0),
                    bonus: Number(row.bonus || 0),
                    otherPayment: Number(row.otherPayment || 0)
                });
                row.grossPay = calculation.grossPay;
                row.deduction = calculation.totalDeduction;
                row.netPay = calculation.netPay;
            }

            await promiseDb.rollback();
            transactionStarted = false;

            const summary = previewRows.reduce(
                (result, row) => ({
                    grossPay: result.grossPay + Number(row.grossPay || 0),
                    totalDeduction: result.totalDeduction + Number(row.deduction || 0),
                    netPay: result.netPay + Number(row.netPay || 0)
                }),
                { grossPay: 0, totalDeduction: 0, netPay: 0 }
            );

            return res.json({
                success: true,
                data: {
                    payMonth,
                    payrollIds,
                    targetCount: rows.length,
                    autoAppliedCount: draftResult.data.applied.length,
                    ...summary
                },
                message: '급여 확정 전 검증이 완료되었습니다.'
            });
        }

        [rows] = await promiseDb.query(
            `SELECT
                payroll_id AS payrollId,
                employee_id AS employeeId,
                pay_month AS payMonth,
                payment_status AS paymentStatus,
                base_salary AS baseSalary,
                allowance,
                bonus,
                other_payment AS otherPayment,
                income_tax AS incomeTax,
                local_income_tax AS localIncomeTax,
                deduction,
                gross_pay AS grossPay,
                net_pay AS netPay
             FROM payrolls
             WHERE payroll_id IN (?)
             FOR UPDATE`,
            [payrollIds]
        );

        const invalidRowsAfterDraftApply = rows.filter((row) => {
            const payrollAmounts = validatePayrollAmounts(row);

            return (
                row.payMonth !== payMonth ||
                !payrollDraftStatuses.includes(row.paymentStatus) ||
                !payrollAmounts.valid
            );
        });

        if (invalidRowsAfterDraftApply.length > 0) {
            throw new Error('승인 기안 반영 후 급여 금액 검증에 실패했습니다.');
        }

        for (const row of rows) {
            await promiseDb.query(
                `UPDATE payrolls
                 SET payment_status = '확정'
                 WHERE payroll_id = ?`,
                [row.payrollId]
            );

            await recordPayrollChange({
                payrollId: row.payrollId,
                employeeId: row.employeeId,
                actionType: 'STATUS_CHANGE',
                previousStatus: row.paymentStatus,
                newStatus: '확정',
                reason: '일괄 급여 확정',
                changedBy: actorEmployeeId
            });
        }

        await promiseDb.commit();
        transactionStarted = false;

        const summary = rows.reduce(
            (result, row) => ({
                grossPay: result.grossPay + Number(row.grossPay || 0),
                totalDeduction: result.totalDeduction + Number(row.deduction || 0),
                netPay: result.netPay + Number(row.netPay || 0)
            }),
            { grossPay: 0, totalDeduction: 0, netPay: 0 }
        );

        return res.json({
            success: true,
            data: {
                payMonth,
                payrollIds,
                confirmedCount: rows.length,
                autoAppliedCount: draftResult.data.applied.length,
                skippedDraftCount: draftResult.data.skipped.length,
                ...summary
            },
            message: `${rows.length}건의 급여가 확정되었습니다.`
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('급여 일괄 확정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여를 일괄 확정하지 못했습니다.'
        });
    }
});


// HR에서 확정한 급여를 재무 지급 목록에 연결합니다.
// 급여 행에는 연결 컬럼을 추가하지 않고 my_draft.detail_data에 원본 급여를 보관합니다.
// 현재 운영 흐름에서는 HR 마스터 확정을 재무 전달 승인으로 기록합니다.
hrRouter.post('/payrolls/submit-to-finance', async (req, res) => {
    const payMonth = String(req.body.payMonth || '').trim();
    const rawPayrollIds = req.body.payrollIds;
    const actorEmployeeId = parseNonNegativeInteger(req.body.actorEmployeeId);

    if (
        !isPayMonthString(payMonth) ||
        !Array.isArray(rawPayrollIds) ||
        rawPayrollIds.length === 0 ||
        actorEmployeeId === null ||
        actorEmployeeId < 1
    ) {
        return res.status(400).json({
            success: false,
            message: '급여월, 급여 ID 목록 또는 전달자 정보가 올바르지 않습니다.'
        });
    }

    const payrollIds = normalizePayrollIds(rawPayrollIds);

    if (payrollIds === null) {
        return res.status(400).json({
            success: false,
            message: '급여 ID 목록에 중복되거나 올바르지 않은 값이 있습니다.'
        });
    }

    let transactionStarted = false;

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 급여를 재무로 전달할 수 있습니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [rows] = await promiseDb.query(
            `SELECT
                payroll_id AS payrollId,
                employee_id AS employeeId,
                pay_month AS payMonth,
                payment_status AS paymentStatus,
                base_salary AS baseSalary,
                allowance,
                bonus,
                other_payment AS otherPayment,
                income_tax AS incomeTax,
                local_income_tax AS localIncomeTax,
                deduction,
                gross_pay AS grossPay,
                net_pay AS netPay
             FROM payrolls
             WHERE pay_month = ?
               AND payroll_id IN (?)
             FOR UPDATE`,
            [payMonth, payrollIds]
        );

        if (rows.length !== payrollIds.length) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(404).json({
                success: false,
                message: '요청한 급여 기록 중 존재하지 않는 항목이 있습니다.'
            });
        }

        const invalidRows = rows.filter((row) => {
            const payrollAmounts = validatePayrollAmounts(row);

            return (
                row.payMonth !== payMonth ||
                row.paymentStatus !== '확정' ||
                !payrollAmounts.valid
            );
        });

        if (invalidRows.length > 0) {
            await promiseDb.rollback();
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                message: '확정 상태가 아니거나 이미 재무로 전달된 급여가 포함되어 있습니다.',
                data: {
                    invalidPayrollIds: invalidRows.map((row) => row.payrollId)
                }
            });
        }

        const totalGrossPay = rows.reduce(
            (total, row) => total + Number(row.grossPay),
            0
        );
        const totalDeduction = rows.reduce(
            (total, row) => total + Number(row.deduction),
            0
        );
        const totalNetPay = rows.reduce(
            (total, row) => total + Number(row.netPay),
            0
        );
        const detailData = JSON.stringify({
            source: 'HR_PAYROLL',
            payMonth,
            payrollIds,
            employeeCount: rows.length,
            totalGrossPay,
            totalDeduction,
            totalNetPay,
            payrolls: rows.map((row) => ({
                payrollId: row.payrollId,
                employeeId: row.employeeId,
                payMonth: row.payMonth,
                baseSalary: Number(row.baseSalary),
                allowance: Number(row.allowance),
                bonus: Number(row.bonus),
                otherPayment: Number(row.otherPayment),
                incomeTax: Number(row.incomeTax),
                localIncomeTax: Number(row.localIncomeTax),
                deduction: Number(row.deduction),
                grossPay: Number(row.grossPay),
                netPay: Number(row.netPay)
            })),
            handedOffAt: new Date().toISOString()
        });

        const [draftResult] = await promiseDb.query(
            `INSERT INTO my_draft (
                employee_id,
                title,
                document_type,
                content,
                detail_data,
                status
             )
             VALUES (?, ?, '급여', ?, ?, 'APPROVED')`,
            [
                actorEmployeeId,
                `${payMonth} 급여 재무 전달`,
                `${payMonth} 급여 ${rows.length}건을 재무 지급 대상으로 전달합니다.`,
                detailData
            ]
        );
        const draftId = draftResult.insertId;

        const [updated] = await promiseDb.query(
            `UPDATE payrolls
             SET payment_status = '지급대기'
             WHERE pay_month = ?
               AND payroll_id IN (?)
               AND payment_status = '확정'`,
            [payMonth, payrollIds]
        );

        if (updated.affectedRows !== payrollIds.length) {
            throw new Error('재무 전달 직전에 급여 상태가 변경되었습니다. 다시 조회해 주세요.');
        }

        for (const row of rows) {
            await recordPayrollChange({
                payrollId: row.payrollId,
                employeeId: row.employeeId,
                actionType: 'FINANCE_HANDOFF',
                previousStatus: '확정',
                newStatus: '지급대기',
                reason: `${payMonth} 급여 재무 전달`,
                changedBy: actorEmployeeId
            });
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                draftId,
                payMonth,
                payrollIds,
                employeeCount: rows.length,
                totalGrossPay,
                totalDeduction,
                totalNetPay
            },
            message: `${rows.length}건의 급여가 재무 지급 목록으로 전달되었습니다.`
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('급여 재무 전달 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여를 재무로 전달하지 못했습니다.'
        });
    }
});


// 직원 등록
// 직원과 계정을 하나의 트랜잭션으로 등록해 부분 저장을 방지합니다.
hrRouter.post('/employees', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const initialAnnualSalary = parseNonNegativeInteger(
        req.body.initialAnnualSalary
    );
    let transactionStarted = false;

    if (
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !password ||
        initialAnnualSalary === null
    ) {
        return res.status(400).json({
            success: false,
            message: '이름, 부서, 직급, 이메일, 초기 비밀번호, 최초 연봉은 필수입니다.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    try {
        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeNumberRows] = await promiseDb.query(
            `SELECT employee_number AS employeeNumber
             FROM employees
             WHERE employee_number REGEXP '^EMP-[0-9]{4}$'
             ORDER BY CAST(SUBSTRING(employee_number, 5) AS UNSIGNED) DESC
             LIMIT 1
             FOR UPDATE`
        );
        const lastEmployeeNumber = employeeNumberRows[0]?.employeeNumber || 'EMP-0000';
        const nextEmployeeSequence = Number(lastEmployeeNumber.slice(4)) + 1;
        const employeeNumber = 'EMP-' + String(nextEmployeeSequence).padStart(4, '0');

        const employeeQuery = `
            INSERT INTO employees (
                employee_number,
                name,
                department_id,
                position,
                email,
                phone,
                initial_annual_salary,
                hire_date,
                employment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, '재직')
        `;
        const [employeeResult] = await promiseDb.query(employeeQuery, [
            employeeNumber,
            name,
            departmentId,
            position,
            email,
            phone || null,
            initialAnnualSalary
        ]);

        await promiseDb.query(
            `INSERT INTO employee_salary_history (
                employee_id,
                annual_salary,
                effective_month
             )
             VALUES (?, ?, DATE_FORMAT(CURRENT_DATE, '%Y-%m'))`,
            [employeeResult.insertId, initialAnnualSalary]
        );

        const accountQuery = `
            INSERT INTO employee_accounts (
                employee_id,
                password_hash,
                role,
                account_status
            )
            VALUES (?, ?, 'USER', 'ACTIVE')
        `;
        await promiseDb.query(accountQuery, [employeeResult.insertId, password]);

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                employeeId: employeeResult.insertId,
                employeeNumber
            },
            message: '직원 등록이 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '자동 생성된 사번 또는 이메일이 이미 등록되어 있습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원을 등록하지 못했습니다.'
        });
    }
});


// 직원 정보 수정
// 퇴사 처리는 별도 API로 제한하고 일반 직원 정보만 수정합니다.
hrRouter.put('/employees/:employeeId', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const hireDate = String(req.body.hireDate || '').trim();
    const employmentStatus = String(req.body.employmentStatus || '').trim();
    const initialAnnualSalary = parseNonNegativeInteger(
        req.body.initialAnnualSalary
    );
    const allowedStatuses = ['재직', '휴직', '퇴사'];

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !hireDate ||
        !allowedStatuses.includes(employmentStatus) ||
        initialAnnualSalary === null
    ) {
        return res.status(400).json({
            success: false,
            message: '직원 수정 정보를 올바르게 입력해 주세요.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    if (!isDateString(hireDate)) {
        return res.status(400).json({
            success: false,
            message: '입사일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    let transactionStarted = false;

    try {
        const [existingEmployees] = await promiseDb.query(
            `SELECT
                employment_status AS employmentStatus,
                initial_annual_salary AS initialAnnualSalary
             FROM employees
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (existingEmployees.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const previousAnnualSalary = parseNonNegativeInteger(
            existingEmployees[0].initialAnnualSalary
        );

        // 직원 정보에서 연봉이 변경된 경우 현재 월 급여가 없으면 준비하고,
        // 있으면 기본급과 3.3% 계산액만 갱신합니다.
        if (
            employmentStatus === '퇴사' &&
            existingEmployees[0].employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리는 전용 퇴사 처리 기능을 이용해 주세요.'
            });
        }

        if (
            existingEmployees[0].employmentStatus === '퇴사' &&
            employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리된 직원의 상태는 수정할 수 없습니다.'
            });
        }

        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const query = `
            UPDATE employees
            SET name = ?,
                department_id = ?,
                position = ?,
                email = ?,
                phone = ?,
                initial_annual_salary = ?,
                hire_date = ?,
                employment_status = ?
            WHERE employee_id = ?
        `;
        const [result] = await promiseDb.query(query, [
            name,
            departmentId,
            position,
            email,
            phone || null,
            initialAnnualSalary,
            hireDate,
            employmentStatus,
            employeeId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        if (
            previousAnnualSalary !== initialAnnualSalary
        ) {
            await promiseDb.query(
                `INSERT INTO employee_salary_history (
                    employee_id,
                    annual_salary,
                    effective_month
                 )
                 VALUES (?, ?, DATE_FORMAT(CURRENT_DATE, '%Y-%m'))
                 ON DUPLICATE KEY UPDATE
                    annual_salary = VALUES(annual_salary)`,
                [employeeId, initialAnnualSalary]
            );

            await ensurePayrollForMonth(currentPayMonth(), employeeId);
            await propagateAnnualSalaryToFutureRecords(
                employeeId,
                currentPayMonth(),
                initialAnnualSalary
            );

            const [currentPayrollRows] = await promiseDb.query(
                `SELECT
                    payroll_id AS payrollId,
                    allowance,
                    bonus,
                    other_payment AS otherPayment,
                    payment_status AS paymentStatus
                 FROM payrolls
                 WHERE employee_id = ?
                   AND pay_month = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
                 LIMIT 1`,
                [employeeId]
            );

            if (
                currentPayrollRows.length > 0 &&
                !payrollFinalStatuses.includes(
                    currentPayrollRows[0].paymentStatus
                )
            ) {
                const calculation = calculateFreelancerPayroll({
                    baseSalary: Math.floor(initialAnnualSalary / 12),
                    allowance: parseNonNegativeInteger(
                        currentPayrollRows[0].allowance
                    ) ?? 0,
                    bonus: parseNonNegativeInteger(
                        currentPayrollRows[0].bonus
                    ) ?? 0,
                    otherPayment: parseNonNegativeInteger(
                        currentPayrollRows[0].otherPayment
                    ) ?? 0
                });

                await promiseDb.query(
                    `UPDATE payrolls
                     SET base_salary = ?,
                         income_tax = ?,
                         local_income_tax = ?,
                         deduction = ?,
                         gross_pay = ?,
                         net_pay = ?
                     WHERE payroll_id = ?`,
                    [
                        Math.floor(initialAnnualSalary / 12),
                        calculation.incomeTax,
                        calculation.localIncomeTax,
                        calculation.totalDeduction,
                        calculation.grossPay,
                        calculation.netPay,
                        currentPayrollRows[0].payrollId
                    ]
                );
            }
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                employeeId
            },
            message: '직원 정보가 수정되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 정보 수정 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 이메일입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원 정보를 수정하지 못했습니다.'
        });
    }
});


// 직원 퇴사 처리
// 직원 상태와 계정 상태를 함께 변경하고 실패하면 트랜잭션을 롤백합니다.
hrRouter.patch('/employees/:employeeId/status', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    let transactionStarted = false;

    if (!Number.isInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 직원 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeResult] = await promiseDb.query(
            `UPDATE employees
             SET employment_status = '퇴사',
                 resignation_date = CURRENT_DATE
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (employeeResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const [accountResult] = await promiseDb.query(
            `UPDATE employee_accounts
             SET account_status = 'SUSPENDED'
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (accountResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원 계정을 찾을 수 없습니다.'
            });
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                employeeId,
                employmentStatus: '퇴사',
                accountStatus: 'SUSPENDED'
            },
            message: '퇴사 처리가 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 퇴사 처리 오류:', error);

        return res.status(500).json({
            success: false,
            message: '퇴사 처리에 실패했습니다.'
        });
    }
});


module.exports = hrRouter;
