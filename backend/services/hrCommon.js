// HR 공통 서비스
// 역할: 여러 HR 라우터가 공유하는 검증, 급여 계산 보조, 연봉·급여 생성 로직을 제공합니다.

const db = require('../db');
const { calculateFreelancerPayroll } = require('./hrPayrollApplication');

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

// 급여 금액 검증: 세전 금액·공제액·실지급액의 계산 결과가 일치하는지 확인합니다.
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

// 연봉 이력 조회: 기준월 이전 가장 최근 이력을 사용하고, 없으면 직원 기본 연봉으로 대체합니다.
async function getAnnualSalaryForMonth(employeeId, payMonth) {
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

// 급여 이력 화면에 필요한 입사월부터 현재월까지의 누락 급여를 준비합니다.
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

module.exports = {
    promiseDb,
    attendanceStatuses,
    payrollDraftStatuses,
    payrollFinalStatuses,
    payrollEditableStatus,
    isDateString,
    isTimeString,
    isEmailString,
    isPayMonthString,
    currentPayMonth,
    nextPayMonth,
    normalizeDepartmentName,
    parseNonNegativeInteger,
    normalizePositiveIds,
    normalizePayrollIds,
    hasActiveMasterAccount,
    validatePayrollAmounts,
    propagateAnnualSalaryToFutureRecords,
    getAnnualSalaryForMonth,
    ensurePayrollForMonth,
    ensurePayrollHistory,
    calculateFreelancerPayroll
};
