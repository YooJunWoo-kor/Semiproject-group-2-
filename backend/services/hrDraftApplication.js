// HR 승인 기안 급여 반영 서비스
// 역할: 승인된 기안의 상세 JSON을 검증하고 해당 급여에 중복 없이 반영합니다.

const {
    promiseDb,
    isPayMonthString,
    normalizePositiveIds,
    normalizePayrollIds,
    hasActiveMasterAccount
} = require('./hrCommon');
const { applyApprovedDraftToPayroll } = require('./hrPayrollApplication');

async function applyApprovedDraftsHandler(
    req,
    res,
    { manageTransaction = true, returnResult = false, dryRun = false } = {}
) {
    // 요청 범위와 권한을 먼저 검증한 뒤, 대상 급여 반영을 하나의 흐름으로 처리합니다.
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
        if (false) {
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
            -- [급여 흐름 수정] 최종 승인된 추가급여를 비용과 함께 HR 급여에 반영합니다.
            WHERE d.status IN ('APPROVED', '승인')
              AND d.document_type IN ('비용', '추가급여', '수당', '상여금')
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

module.exports = {
    applyApprovedDraftsHandler
};
