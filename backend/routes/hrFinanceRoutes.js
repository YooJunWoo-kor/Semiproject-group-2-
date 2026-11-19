// HR-재무 연동 라우터
// 역할: 확정된 HR 급여를 재무 지급 흐름으로 전달하고 상태를 관리합니다.

const express = require('express');
const mysql = require('mysql2/promise');
const {
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
    let connection;

    try {
        if (!(await hasActiveMasterAccount(actorEmployeeId))) {
            return res.status(403).json({
                success: false,
                message: '마스터 권한이 있는 사용자만 급여를 재무로 전달할 수 있습니다.'
            });
        }

        // [재무 연동 수정] 요청별 연결에서 급여 잠금·연결 기안·이력을 함께 저장합니다.
        connection = await mysql.createConnection({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        await connection.beginTransaction();
        transactionStarted = true;

        const [rows] = await connection.query(
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
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({
                success: false,
                message: '요청한 급여 기록 중 존재하지 않는 항목이 있습니다.'
            });
        }

        // [재무 연동 수정] 급여 행 잠금 후 연결 여부를 조회해 동시 재전달도 차단합니다.
        const [linkedRows] = await connection.query(
            `SELECT DISTINCT p.payroll_id AS payrollId
             FROM payrolls p
             INNER JOIN my_draft d
                 ON d.document_type = '급여'
                AND d.status IN ('APPROVED', '승인')
                AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.source')) = 'HR_PAYROLL'
                AND JSON_CONTAINS(JSON_EXTRACT(d.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
             WHERE p.payroll_id IN (?)`,
            [payrollIds]
        );
        const linkedIds = new Set(linkedRows.map((row) => Number(row.payrollId)));

        // [수정] 상태 오류와 금액 오류를 구분해 전달 거부 사유를 표시합니다.
        // 기존 전달 허용 조건과 금액 검증은 유지합니다.
        const invalidRows = rows.map((row) => {
            const payrollAmounts = validatePayrollAmounts(row);
            const hasFinanceHandoff = linkedIds.has(Number(row.payrollId));
            const recoverableOrphan =
                row.paymentStatus === '지급대기' && !hasFinanceHandoff;
            const reasons = [];

            if (row.payMonth !== payMonth) reasons.push('조회 월과 급여월이 다릅니다');
            if (row.paymentStatus !== '확정' && !recoverableOrphan) {
                reasons.push(`전달할 수 없는 상태입니다 (${row.paymentStatus || '미설정'})`);
            }
            if (hasFinanceHandoff) reasons.push('이미 승인된 재무 연결 기안서가 있습니다');
            if (!payrollAmounts.valid) {
                reasons.push('금액 검증 실패: 기본급·수당·상여·기타지급 합계, 소득세·지방소득세 합계 또는 실지급액을 확인해주세요');
            }

            return { payrollId: row.payrollId, reasons };
        }).filter((row) => row.reasons.length > 0);

        if (invalidRows.length > 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                message: invalidRows.map((row) =>
                    `급여 #${row.payrollId}: ${row.reasons.join(' / ')}`
                ).join(' · '),
                data: {
                    invalidPayrollIds: invalidRows.map((row) => row.payrollId),
                    invalidPayrolls: invalidRows
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
        // [재무 연동 수정] HR 확정·전달을 완료한 급여의 승인 연결 문서를 생성합니다.
        // 개인 추가급여 기안의 승인 절차와는 별개이며, 재무의 기존 조회 조건을 사용합니다.
        const detailData = {
            source: 'HR_PAYROLL', payMonth, payrollIds,
            employeeCount: rows.length, totalGrossPay, totalDeduction, totalNetPay,
            handedOffBy: actorEmployeeId
        };
        const [draft] = await connection.query(
            `INSERT INTO my_draft
                (employee_id, title, document_type, content, detail_data, status)
             VALUES (?, ?, '급여', ?, ?, 'APPROVED')`,
            [actorEmployeeId, `${payMonth} 급여 재무 전달`,
                `HR 급여 확정 및 재무 전달 확인 (${rows.length}명)`, JSON.stringify(detailData)]
        );
        const draftId = draft.insertId;

        const confirmedRows = rows.filter(
            (row) => row.paymentStatus === '확정'
        );

        if (confirmedRows.length > 0) {
            const confirmedPayrollIds = confirmedRows.map(
                (row) => row.payrollId
            );
            const [updated] = await connection.query(
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
                connection,
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

        await connection.commit();
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
            try { await connection.rollback(); } catch { console.error('급여 재무 전달 롤백 실패'); }
        }

        console.error('급여 재무 전달 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여를 재무로 전달하지 못했습니다.'
        });
    } finally {
        if (connection) {
            try { await connection.end(); } catch { console.error('급여 재무 전달 DB 연결 종료 실패'); }
        }
    }
});


module.exports = hrFinanceRouter;
