// HR-재무 연동 라우터
// 역할: 확정된 HR 급여를 재무 지급 흐름으로 전달하고 상태를 관리합니다.

const express = require('express');
const {
    promiseDb,
    isPayMonthString,
    parseNonNegativeInteger,
    normalizePayrollIds,
    hasActiveMasterAccount,
    validatePayrollAmounts
} = require('../services/hrCommon');
const { recordPayrollChange } = require('../services/hrPayrollApplication');

const hrFinanceRouter = express.Router();

// 확정 급여를 재무 전달용 기안으로 연결합니다.
hrFinanceRouter.post('/payrolls/submit-to-finance', async (req, res) => {
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
                net_pay AS netPay,
                EXISTS (
                    SELECT 1
                    FROM my_draft financeDraft
                    WHERE financeDraft.document_type = '급여'
                      AND financeDraft.status = 'APPROVED'
                      AND JSON_UNQUOTE(
                          JSON_EXTRACT(financeDraft.detail_data, '$.source')
                      ) = 'HR_PAYROLL'
                      AND JSON_CONTAINS(
                          JSON_EXTRACT(financeDraft.detail_data, '$.payrollIds'),
                          JSON_ARRAY(payrolls.payroll_id)
                      )
                ) AS financeHandoffExists
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
            const hasFinanceHandoff = Number(row.financeHandoffExists) === 1;
            const recoverableOrphan =
                row.paymentStatus === '지급대기' && !hasFinanceHandoff;

            return (
                row.payMonth !== payMonth ||
                (row.paymentStatus !== '확정' && !recoverableOrphan) ||
                hasFinanceHandoff ||
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
        const draftId = null;

        const confirmedRows = rows.filter(
            (row) => row.paymentStatus === '확정'
        );

        if (confirmedRows.length > 0) {
            const confirmedPayrollIds = confirmedRows.map(
                (row) => row.payrollId
            );
            const [updated] = await promiseDb.query(
                `UPDATE payrolls
                 SET payment_status = '지급대기'
                 WHERE pay_month = ?
                   AND payroll_id IN (?)
                   AND payment_status = '확정'`,
                [payMonth, confirmedPayrollIds]
            );

            if (updated.affectedRows !== confirmedRows.length) {
                throw new Error('재무 전달 직전에 급여 상태가 변경되었습니다. 다시 조회해 주세요.');
            }
        }

        for (const row of rows) {
            const recoveringOrphan = row.paymentStatus === '지급대기';
            await recordPayrollChange({
                payrollId: row.payrollId,
                employeeId: row.employeeId,
                actionType: recoveringOrphan
                    ? 'FINANCE_HANDOFF_RECOVERY'
                    : 'FINANCE_HANDOFF',
                previousStatus: row.paymentStatus,
                newStatus: '지급대기',
                reason: recoveringOrphan
                    ? `${payMonth} 급여 재무 연결 누락 복구`
                    : `${payMonth} 급여 재무 전달`,
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


module.exports = hrFinanceRouter;
