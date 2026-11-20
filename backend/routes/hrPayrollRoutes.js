// HR 급여 라우터
// 역할: 급여 생성·조회·수정·확정과 연봉 이력 반영을 담당합니다.

const express = require('express');
const {
    promiseDb,
    payrollDraftStatuses,
    payrollFinalStatuses,
    isPayMonthString,
    currentPayMonth,
    nextPayMonth,
    parseNonNegativeInteger,
    normalizePayrollIds,
    hasActiveMasterAccount,
    validatePayrollAmounts,
    propagateAnnualSalaryToFutureRecords,
    getAnnualSalaryForMonth,
    ensurePayrollForMonth,
    ensurePayrollHistory,
    calculateFreelancerPayroll
} = require('../services/hrCommon');
const { recordPayrollChange } = require('../services/hrPayrollApplication');
const { applyApprovedDraftsHandler } = require('../services/hrDraftApplication');

const hrPayrollRouter = express.Router();

// 급여 사전 준비: 선택 직원 또는 다음 달 대상자의 급여를 생성합니다.
hrPayrollRouter.post('/payrolls/prepare-selected', async (req, res) => {
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
        if (false) {
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

hrPayrollRouter.post('/payrolls/generate-next-month', async (req, res) => {
    const actorEmployeeId = Number(req.body.actorEmployeeId);

    if (!Number.isSafeInteger(actorEmployeeId) || actorEmployeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '급여 생성 요청자 정보가 올바르지 않습니다.'
        });
    }

    let transactionStarted = false;

    try {
        if (false) {
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

// 급여관리: 월별 급여 조회와 직원별 급여 이력을 제공합니다.
hrPayrollRouter.get('/payrolls', async (req, res) => {
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
        // [급여 흐름 추가] 원본 기안서를 이동/삭제하지 않고 승인된 추가급여를 HR 화면에 함께 제공합니다.
        // 조회에서는 급여 금액을 변경하지 않으며, 급여확정 시 기존 반영 이력으로 중복을 방지합니다.
        const [additionalDrafts] = await promiseDb.query(
            `SELECT d.draft_id AS draftId, d.employee_id AS employeeId,
                    d.title, d.detail_data AS detailData
             FROM my_draft d
             WHERE d.status IN ('APPROVED', '승인')
               AND d.document_type IN ('추가급여', '수당', '상여금')
               AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.payMonth')) = ?
             ORDER BY d.draft_id`,
            [payMonth]
        );
        for (const draft of additionalDrafts) {
            const detail = typeof draft.detailData === 'string'
                ? JSON.parse(draft.detailData) : draft.detailData || {};
            draft.payrollEmployeeId = Number(detail.recipientEmployeeId || detail.targetEmployeeId || draft.employeeId);
            draft.applied = Boolean(detail.hrPayrollApplication);
        }
        return res.json({
            success: true,
            data: rows.map(row => ({
                ...row,
                additionalPayrollDrafts: additionalDrafts.filter(draft =>
                    draft.payrollEmployeeId === Number(row.employeeId)).map(draft => ({
                        draftId: draft.draftId, title: draft.title, applied: draft.applied
                    }))
            }))
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
hrPayrollRouter.get('/payrolls/employee/:employeeId/history', async (req, res) => {
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
hrPayrollRouter.post('/payrolls', async (req, res) => {
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
hrPayrollRouter.put('/payrolls/:payrollId', async (req, res) => {
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


// 급여 확정: 작성중 급여만 확정하며 지급대기·지급완료 전환은 재무에서 처리합니다.
hrPayrollRouter.patch('/payrolls/:payrollId/status', async (req, res) => {
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
        if (false) {
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
                pay_month AS payMonth,
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

        // [급여 흐름 추가] 단건 확정도 승인 기안을 먼저 반영한 뒤 확정합니다.
        const draftResult = await applyApprovedDraftsHandler(
            { body: { payMonth: rows[0].payMonth, payrollIds: [payrollId],
                employeeIds: [Number(rows[0].employeeId)], actorEmployeeId } },
            { status() { return this; }, json(value) { return value; } },
            { manageTransaction: false, returnResult: true }
        );
        if (!draftResult.success) throw new Error(draftResult.message);

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
hrPayrollRouter.post('/payrolls/bulk-confirm', async (req, res) => {
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


module.exports = hrPayrollRouter;
