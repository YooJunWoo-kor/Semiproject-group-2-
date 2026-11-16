const db = require('../db');

const defaultConnection = db.promise();
const payrollEditableStatus = '작성중';
const finalizedPayrollStatuses = ['확정', '지급대기', '지급완료'];
const additionalPaymentDocumentTypes = new Set(['수당', '상여금', '추가급여']);

class PayrollApplicationError extends Error {
    constructor(message, status = 409) {
        super(message);
        this.name = 'PayrollApplicationError';
        this.status = status;
    }
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

function positiveInteger(value) {
    const parsed = parseNonNegativeInteger(value);

    return parsed !== null && parsed > 0 ? parsed : null;
}

function parseDetailData(value) {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string') return {};

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch (error) {
        return {};
    }
}

function isPayMonthString(value) {
    return typeof value === 'string' && /^(\d{4})-(0[1-9]|1[0-2])$/.test(value);
}

function sumDetailAmounts(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }

    const amounts = items.map((item) => positiveInteger(item?.amount));

    return amounts.some((amount) => amount === null)
        ? null
        : amounts.reduce((total, amount) => total + amount, 0);
}

function paymentTypeForDraft(documentType, detailData = {}) {
    if (documentType !== '추가급여') {
        return documentType;
    }

    if (detailData.paymentType === '수당') {
        return '수당';
    }

    if (detailData.paymentType === '상여' || detailData.paymentType === '상여금') {
        return '상여금';
    }

    return null;
}

function isValidPaymentTypeForDraft(documentType, detailData = {}) {
    if (documentType === '추가급여') {
        return paymentTypeForDraft(documentType, detailData) !== null;
    }

    if (!['수당', '상여금'].includes(documentType)) {
        return true;
    }

    const detailPaymentType = detailData.paymentType === '상여'
        ? '상여금'
        : detailData.paymentType;

    return detailPaymentType === documentType;
}

function payrollFieldForDraftType(documentType, detailData = {}) {
    const paymentType = paymentTypeForDraft(documentType, detailData);

    return {
        비용: 'other_payment',
        수당: 'allowance',
        상여금: 'bonus'
    }[paymentType] || null;
}

function payrollAmountKeyForField(payrollField) {
    return {
        allowance: 'allowance',
        bonus: 'bonus',
        other_payment: 'otherPayment'
    }[payrollField] || null;
}

function readDraftPayrollAmount(documentType, detailData) {
    if (documentType === '비용') {
        const itemTotal = sumDetailAmounts(detailData.expenseItems);

        if (itemTotal !== null) {
            return itemTotal;
        }
    }

    const paymentType = paymentTypeForDraft(documentType, detailData);
    if (!paymentType) return null;

    const amountKeys = paymentType === '수당'
        ? ['allowance', 'allowanceAmount', 'amount', 'totalAmount', 'paymentAmount']
        : paymentType === '상여금'
            ? ['bonus', 'bonusAmount', 'amount', 'totalAmount', 'paymentAmount']
            : ['amount', 'totalAmount', 'paymentAmount'];

    for (const key of amountKeys) {
        const amount = positiveInteger(detailData[key]);
        if (amount !== null) return amount;
    }

    return null;
}

function isEmployeePaymentDraft(detailData) {
    return detailData.employeePayment === true ||
        detailData.isEmployeePayment === true ||
        detailData.payrollEligible === true ||
        (Number.isSafeInteger(Number(detailData.recipientEmployeeId)) &&
            Number(detailData.recipientEmployeeId) > 0) ||
        (Number.isSafeInteger(Number(detailData.targetEmployeeId)) &&
            Number(detailData.targetEmployeeId) > 0);
}

function payrollEmployeeIdForDraft(draft, detailData) {
    const hasValue = (key) => (
        Object.prototype.hasOwnProperty.call(detailData, key) &&
        detailData[key] !== null &&
        detailData[key] !== ''
    );
    const hasRecipient = hasValue('recipientEmployeeId');
    const hasTarget = hasValue('targetEmployeeId');
    const recipientEmployeeId = hasRecipient ? Number(detailData.recipientEmployeeId) : null;
    const targetEmployeeId = hasTarget ? Number(detailData.targetEmployeeId) : null;

    if (
        (hasRecipient && (!Number.isSafeInteger(recipientEmployeeId) || recipientEmployeeId < 1)) ||
        (hasTarget && (!Number.isSafeInteger(targetEmployeeId) || targetEmployeeId < 1)) ||
        (hasRecipient && hasTarget && recipientEmployeeId !== targetEmployeeId)
    ) {
        return null;
    }

    return recipientEmployeeId || targetEmployeeId || Number(draft.employeeId);
}

function calculateFreelancerPayroll({ baseSalary, allowance, bonus, otherPayment }) {
    const amounts = [baseSalary, allowance, bonus, otherPayment];

    if (amounts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
        return null;
    }

    const grossPay = baseSalary + allowance + bonus + otherPayment;
    const incomeTax = Math.floor(grossPay * 3 / 100);
    const localIncomeTax = Math.floor(incomeTax * 10 / 100);
    const totalDeduction = incomeTax + localIncomeTax;

    return {
        grossPay,
        incomeTax,
        localIncomeTax,
        totalDeduction,
        netPay: grossPay - totalDeduction
    };
}

async function recordPayrollChange({
    connection = defaultConnection,
    payrollId,
    employeeId,
    actionType,
    previousStatus,
    newStatus,
    reason,
    changedBy
}) {
    await connection.query(
        `INSERT INTO payroll_change_history (
            payroll_id,
            employee_id,
            action_type,
            previous_status,
            new_status,
            reason,
            changed_by
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            payrollId,
            employeeId,
            actionType,
            previousStatus || null,
            newStatus || null,
            reason || null,
            changedBy
        ]
    );
}

async function getAnnualSalaryForMonth(connection, employeeId, payMonth) {
    const [historyRows] = await connection.query(
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

    const [employeeRows] = await connection.query(
        `SELECT initial_annual_salary AS initialAnnualSalary
         FROM employees
         WHERE employee_id = ?`,
        [employeeId]
    );

    return employeeRows.length > 0
        ? parseNonNegativeInteger(employeeRows[0].initialAnnualSalary)
        : null;
}

async function ensurePayrollForMonth(connection, payMonth, employeeId) {
    const [employeeRows] = await connection.query(
        `SELECT
            e.employee_id AS employeeId,
            e.name AS employeeName
         FROM employees e
         WHERE e.employee_id = ?
           AND DATE_FORMAT(e.hire_date, '%Y-%m') <= ?
           AND (
                e.employment_status IN ('재직', '휴직')
                OR (
                    e.employment_status = '퇴사'
                    AND e.resignation_date IS NOT NULL
                    AND DATE_FORMAT(e.resignation_date, '%Y-%m') >= ?
                )
           )`,
        [employeeId, payMonth, payMonth]
    );

    if (employeeRows.length === 0) {
        return {
            generated: [],
            skipped: [{
                employeeId,
                reason: '급여 대상 직원을 찾을 수 없습니다.'
            }]
        };
    }

    const employee = employeeRows[0];
    const [existingRows] = await connection.query(
        `SELECT payroll_id AS payrollId
         FROM payrolls
         WHERE employee_id = ? AND pay_month = ?
         LIMIT 1
         FOR UPDATE`,
        [employeeId, payMonth]
    );

    if (existingRows.length > 0) {
        return { generated: [], skipped: [] };
    }

    const annualSalary = await getAnnualSalaryForMonth(connection, employeeId, payMonth);
    if (annualSalary === null) {
        return {
            generated: [],
            skipped: [{
                employeeId,
                employeeName: employee.employeeName,
                reason: '적용할 연봉 이력과 초기 연봉이 모두 없습니다.'
            }]
        };
    }

    const calculation = calculateFreelancerPayroll({
        baseSalary: Math.floor(annualSalary / 12),
        allowance: 0,
        bonus: 0,
        otherPayment: 0
    });

    const [insertResult] = await connection.query(
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
            employeeId,
            payMonth,
            Math.floor(annualSalary / 12),
            calculation.totalDeduction,
            calculation.incomeTax,
            calculation.localIncomeTax,
            calculation.grossPay,
            calculation.netPay
        ]
    );

    return insertResult.affectedRows === 1
        ? { generated: [{ employeeId, employeeName: employee.employeeName }], skipped: [] }
        : { generated: [], skipped: [] };
}

function applicationSkipped(draft, employeeId, reason) {
    return {
        draftId: draft.draftId,
        employeeId,
        employeeName: draft.employeeName || `사원 ${employeeId || draft.employeeId}`,
        documentType: draft.documentType,
        reason
    };
}

function throwApprovalError(message) {
    throw new PayrollApplicationError(message, 409);
}

async function applyApprovedDraftToPayroll({
    connection = defaultConnection,
    draft,
    approvedBy,
    approvedAt,
    payMonth: requestedPayMonth,
    payrollIds = null,
    employeeIds = null,
    dryRun = false,
    strict = false
}) {
    const detailData = parseDetailData(draft.detailData);
    const employeeName = draft.employeeName || `사원 ${draft.employeeId}`;
    const payrollField = payrollFieldForDraftType(draft.documentType, detailData);
    const targetAmountKey = payrollAmountKeyForField(payrollField);
    const payrollEmployeeId = payrollEmployeeIdForDraft(draft, detailData);
    const isAdditionalPayment = additionalPaymentDocumentTypes.has(draft.documentType);
    const hasPayMonthValue = Object.prototype.hasOwnProperty.call(detailData, 'payMonth') &&
        detailData.payMonth !== null && detailData.payMonth !== '';
    const hasDetailPayMonth = isPayMonthString(detailData.payMonth);
    const draftPayMonth = hasDetailPayMonth ? detailData.payMonth : requestedPayMonth;

    const skipOrThrow = (reason) => {
        if (strict) throwApprovalError(reason);
        return { applied: null, skipped: applicationSkipped(draft, payrollEmployeeId, reason) };
    };

    if (payrollEmployeeId === null) {
        return skipOrThrow('지급 대상 직원 ID가 없거나 recipientEmployeeId와 targetEmployeeId가 일치하지 않습니다.');
    }

    if (employeeIds !== null && !employeeIds.includes(Number(payrollEmployeeId))) {
        return { applied: null, skipped: null };
    }

    if (hasPayMonthValue && !hasDetailPayMonth) {
        return skipOrThrow('detail_data.payMonth 형식이 YYYY-MM이 아닙니다.');
    }

    if (isAdditionalPayment && (!isValidPaymentTypeForDraft(draft.documentType, detailData) || !payrollField)) {
        return skipOrThrow('수당 또는 상여금 지급 유형이 올바르지 않습니다.');
    }

    if (isAdditionalPayment && !hasDetailPayMonth) {
        return skipOrThrow('수당·상여금 기안의 detail_data.payMonth가 없습니다.');
    }

    if (!isPayMonthString(draftPayMonth)) {
        return skipOrThrow('급여월이 YYYY-MM 형식이 아닙니다.');
    }

    if ((isAdditionalPayment || hasPayMonthValue) && detailData.payMonth !== requestedPayMonth && requestedPayMonth) {
        return skipOrThrow('기안서의 급여월과 처리 대상 급여월이 다릅니다.');
    }

    if (draft.documentType === '비용' && !isEmployeePaymentDraft(detailData)) {
        return skipOrThrow('직원 지급 대상 비용임을 확인할 수 없습니다.');
    }

    if (detailData.hrPayrollApplication) {
        return {
            applied: null,
            skipped: applicationSkipped(draft, payrollEmployeeId, '이미 급여에 반영된 기안입니다.')
        };
    }

    let amount = readDraftPayrollAmount(draft.documentType, detailData);

    if (amount === null && draft.documentType === '비용') {
        try {
            const [expenseRows] = await connection.query(
                `SELECT amount FROM draft_expense WHERE draft_id = ? FOR UPDATE`,
                [draft.draftId]
            );
            const expenseTotal = expenseRows.reduce(
                (total, row) => total + (positiveInteger(row.amount) || 0),
                0
            );
            amount = expenseTotal > 0 ? expenseTotal : null;
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
    }

    if (amount === null) {
        return skipOrThrow('detail_data에서 유효한 지급 금액을 확인할 수 없습니다.');
    }

    const ensured = dryRun
        ? { skipped: [] }
        : await ensurePayrollForMonth(connection, draftPayMonth, payrollEmployeeId);
    const [payrollRows] = await connection.query(
        `SELECT
            payroll_id AS payrollId,
            employee_id AS employeeId,
            payment_status AS paymentStatus,
            base_salary AS baseSalary,
            allowance,
            bonus,
            other_payment AS otherPayment
         FROM payrolls
         WHERE employee_id = ? AND pay_month = ?
         LIMIT 1
         FOR UPDATE`,
        [payrollEmployeeId, draftPayMonth]
    );

    if (payrollRows.length === 0) {
        const reason = ensured.skipped?.[0]?.reason || '해당 급여월의 급여를 생성할 수 없습니다.';
        return skipOrThrow(reason);
    }

    const payroll = payrollRows[0];
    if (payrollIds !== null && !payrollIds.includes(Number(payroll.payrollId))) {
        return { applied: null, skipped: null };
    }

    if (payroll.paymentStatus !== payrollEditableStatus) {
        if (strict || finalizedPayrollStatuses.includes(payroll.paymentStatus)) {
            throwApprovalError(
                `해당 직원의 ${draftPayMonth} 급여가 이미 ${payroll.paymentStatus || '확정'}되어 ` +
                '추가급여를 자동 반영할 수 없습니다. 급여 담당자에게 급여월 조정을 요청하세요.'
            );
        }
        return skipOrThrow(`급여 상태가 ${payroll.paymentStatus || '미설정'}라 작성중 급여만 반영할 수 없습니다.`);
    }

    const currentAmounts = {
        baseSalary: parseNonNegativeInteger(payroll.baseSalary),
        allowance: parseNonNegativeInteger(payroll.allowance),
        bonus: parseNonNegativeInteger(payroll.bonus),
        otherPayment: parseNonNegativeInteger(payroll.otherPayment)
    };
    if (!targetAmountKey || Object.values(currentAmounts).some((value) => value === null)) {
        return skipOrThrow('기존 급여 금액이 올바르지 않습니다.');
    }

    const nextAmounts = {
        ...currentAmounts,
        [targetAmountKey]: currentAmounts[targetAmountKey] + amount
    };
    const calculation = calculateFreelancerPayroll(nextAmounts);
    if (!calculation) {
        return skipOrThrow('급여 금액을 다시 계산할 수 없습니다.');
    }

    if (!dryRun) {
        await connection.query(
            `UPDATE payrolls
             SET allowance = ?,
                 bonus = ?,
                 other_payment = ?,
                 income_tax = ?,
                 local_income_tax = ?,
                 deduction = ?,
                 gross_pay = ?,
                 net_pay = ?
             WHERE payroll_id = ? AND payment_status = '작성중'`,
            [
                nextAmounts.allowance,
                nextAmounts.bonus,
                nextAmounts.otherPayment,
                calculation.incomeTax,
                calculation.localIncomeTax,
                calculation.totalDeduction,
                calculation.grossPay,
                calculation.netPay,
                payroll.payrollId
            ]
        );

        const nextDetailData = {
            ...detailData,
            hrPayrollApplication: {
                payMonth: draftPayMonth,
                payrollId: payroll.payrollId,
                payrollField,
                amount,
                appliedAt: approvedAt || new Date().toISOString(),
                approvedBy: approvedBy || null
            }
        };
        const [draftUpdate] = await connection.query(
            `UPDATE my_draft
             SET detail_data = ?
             WHERE draft_id = ? AND status IN ('PENDING', 'APPROVED')`,
            [JSON.stringify(nextDetailData), draft.draftId]
        );

        if (draftUpdate.affectedRows !== 1) {
            throw new Error(`기안 ${draft.draftId}의 급여 반영 이력을 저장하지 못했습니다.`);
        }

        await recordPayrollChange({
            connection,
            payrollId: payroll.payrollId,
            employeeId: payroll.employeeId,
            actionType: 'DRAFT_PAYROLL_APPLY',
            previousStatus: payroll.paymentStatus,
            newStatus: payroll.paymentStatus,
            reason: `${draft.documentType} 기안 ${draft.draftId} 반영 (${amount}원)`,
            changedBy: approvedBy
        });
    }

    return {
        applied: {
            draftId: draft.draftId,
            employeeId: payroll.employeeId,
            employeeName,
            documentType: draft.documentType,
            payrollId: payroll.payrollId,
            payMonth: draftPayMonth,
            payrollField,
            amount,
            calculation
        },
        skipped: null
    };
}

module.exports = {
    PayrollApplicationError,
    applyApprovedDraftToPayroll,
    calculateFreelancerPayroll,
    ensurePayrollForMonth,
    getAnnualSalaryForMonth,
    parseNonNegativeInteger,
    parseDetailData,
    recordPayrollChange,
    finalizedPayrollStatuses
};
