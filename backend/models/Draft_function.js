const db = require('../db');
const promiseDb = db.promise();
const {
    applyApprovedDraftToPayroll
} = require('../services/hrPayrollApplication');

async function hasDraftApprovalStepsTable() {
    const [rows] = await promiseDb.query(
        `SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'draft_approval_steps'
         LIMIT 1`
    );

    return rows.length > 0;
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

function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
        ? null
        : date;
}

function leaveDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end || start > end) return null;
    return ((end.getTime() - start.getTime()) / 86400000) + 1;
}

async function ensureLeaveDetail(draftId, documentType, detailData) {
    if (documentType !== '휴가') return;

    const days = leaveDays(detailData.startDate, detailData.endDate);
    if (!days) {
        throw new Error('휴가 시작일과 종료일이 올바르지 않습니다.');
    }

    const [existingRows] = await promiseDb.query(
        `SELECT leave_id
         FROM draft_leave
         WHERE draft_id = ?
         LIMIT 1
         FOR UPDATE`,
        [draftId]
    );

    if (existingRows.length > 0) return;

    await promiseDb.query(
        `INSERT INTO draft_leave (
            draft_id,
            start_date,
            end_date,
            leave_days
         ) VALUES (?, ?, ?, ?)`,
        [draftId, detailData.startDate, detailData.endDate, days]
    );
}

async function persistExpenseDetail(draftId, documentType, detailData) {
    if (documentType !== '비용') return;

    const items = Array.isArray(detailData.expenseItems)
        ? detailData.expenseItems
        : [];
    const validItems = items.filter((item) =>
        parseDate(item?.useDate) &&
        Number.isSafeInteger(Number(item?.amount)) &&
        Number(item.amount) > 0
    );

    if (validItems.length === 0) {
        throw new Error('비용 내역이 없습니다.');
    }

    const [existingRows] = await promiseDb.query(
        `SELECT expense_id
         FROM draft_expense
         WHERE draft_id = ?
         LIMIT 1
         FOR UPDATE`,
        [draftId]
    );

    if (existingRows.length > 0) return;

    await promiseDb.query(
        `INSERT INTO draft_expense (draft_id, expense_date, amount)
         VALUES ?`,
        [validItems.map((item) => [draftId, item.useDate, Number(item.amount)])]
    );
}

async function applyLeaveAttendance(draftId, employeeId, detailData) {
    const start = parseDate(detailData.startDate);
    const end = parseDate(detailData.endDate);

    if (!start || !end || start > end) {
        throw new Error('휴가 기간이 올바르지 않습니다.');
    }

    const memo = `휴가 기안 ${draftId}`;
    const cursor = new Date(start);

    while (cursor <= end) {
        const workDate = cursor.toISOString().slice(0, 10);
        const [rows] = await promiseDb.query(
            `SELECT attendance_status AS attendanceStatus, memo
             FROM attendance
             WHERE employee_id = ? AND work_date = ?
             FOR UPDATE`,
            [employeeId, workDate]
        );

        if (rows.length > 0) {
            const sameLeave = rows.some(
                (row) => row.attendanceStatus === '휴가' && row.memo === memo
            );

            if (!sameLeave) {
                throw new Error(`${workDate} 근태 기록과 휴가 기간이 충돌합니다.`);
            }
        } else {
            await promiseDb.query(
                `INSERT INTO attendance (
                    employee_id,
                    work_date,
                    attendance_status,
                    memo
                 ) VALUES (?, ?, '휴가', ?)`,
                [employeeId, workDate, memo]
            );
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
}

class Draft {
    static getLeaveDrafts() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    d.draft_id AS draftId,
                    d.draft_id AS leaveId,
                    d.employee_id AS employeeId,
                    e.employee_number AS employeeNumber,
                    e.name AS employeeName,
                    e.department_id AS departmentId,
                    dep.department_name AS departmentName,
                    e.position,
                    d.document_type AS leaveType,
                    d.title,
                    d.content AS reason,
                    JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.startDate')) AS startDate,
                    JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.endDate')) AS endDate,
                    DATEDIFF(
                        JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.endDate')),
                        JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.startDate'))
                    ) + 1 AS leaveDays,
                    CASE
                        WHEN d.status = 'APPROVED' THEN '승인완료'
                        WHEN d.status = 'REJECTED' THEN '반려'
                        WHEN d.status = 'PENDING' THEN '승인대기'
                        ELSE d.status
                    END AS applicationStatus,
                    d.status AS sourceStatus,
                    DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i') AS applicationDate,
                    s.employee_id AS approverId,
                    approver.name AS approverName,
                    NULL AS approvalDate
                FROM my_draft d
                INNER JOIN employees e
                    ON d.employee_id = e.employee_id
                LEFT JOIN departments dep
                    ON e.department_id = dep.department_id
                LEFT JOIN draft_approval_steps s
                    ON s.draft_id = d.draft_id
                    AND s.step_order = (
                        SELECT COALESCE(
                            MIN(CASE WHEN d.status = 'PENDING' AND step.step_status = 'PENDING'
                                THEN step.step_order END),
                            MAX(CASE WHEN d.status = 'REJECTED' AND step.step_status = 'REJECTED'
                                THEN step.step_order END),
                            MAX(CASE WHEN d.status = 'APPROVED' AND step.step_status = 'APPROVED'
                                THEN step.step_order END),
                            MAX(step.step_order)
                        )
                        FROM draft_approval_steps step
                        WHERE step.draft_id = d.draft_id
                    )
                LEFT JOIN employees approver
                    ON s.employee_id = approver.employee_id
                WHERE d.document_type = '휴가'
                  AND d.status IN ('PENDING', 'APPROVED', 'REJECTED')
                ORDER BY d.created_at DESC, d.draft_id DESC
            `;

            db.query(sql, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static getById(draftId) {
        return new Promise((resolve, reject) => {

            const sql = `
                SELECT
                    d.draft_id,
                    d.title,
                    d.document_type,
                    d.content,
                    d.detail_data,
                    d.status AS draft_status,
                    s.step_order,
                    e.name AS approver_name,
                    e.position,
                    s.step_status
                FROM my_draft d
                LEFT JOIN draft_approval_steps s
                    ON d.draft_id = s.draft_id
                LEFT JOIN employees e
                    ON s.employee_id = e.employee_id
                WHERE d.draft_id = ?
                ORDER BY s.step_order ASC
            `;

            db.query(sql, [draftId], (err, rows) => {
                if (err) {
                    return reject(err);
                }

                resolve(rows);
            })
            // resolve(rows) : 조회성공 / reject(err) : 오류

        })
    }

    static getByEmployeeId(employeeId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT draft_id, employee_id, title, document_type, content, detail_data, status, created_at
                FROM my_draft
                WHERE employee_id = ?
                ORDER BY created_at DESC, draft_id DESC
            `;
            db.query(sql, [employeeId], (err, rows) => err ? reject(err) : resolve(rows));
        });
    }

    static async getReceivedByEmployeeId(employeeId) {
        const hasSteps = await hasDraftApprovalStepsTable();
        const sql = hasSteps
            ? `SELECT d.draft_id, d.employee_id, d.title, d.document_type,
                      d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                 FROM my_draft d
                 INNER JOIN draft_approval_steps s ON s.draft_id = d.draft_id
                 LEFT JOIN employees e ON e.employee_id = d.employee_id
                 WHERE s.employee_id = ? AND s.step_status = 'PENDING' AND d.status = 'PENDING'
                 ORDER BY d.created_at DESC, d.draft_id DESC`
            : `SELECT d.draft_id, d.employee_id, d.title, d.document_type,
                      d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                 FROM my_draft d
                 LEFT JOIN employees e ON e.employee_id = d.employee_id
                 WHERE d.approver_id = ? AND d.status = 'PENDING'
                 ORDER BY d.created_at DESC, d.draft_id DESC`;
        const [rows] = await promiseDb.query(sql, [employeeId]);
        return rows;
    }

    static async getApprovedByEmployeeId(employeeId) {
        const hasSteps = await hasDraftApprovalStepsTable();
        const sql = hasSteps
            ? `SELECT DISTINCT d.draft_id, d.employee_id, d.title, d.document_type,
                      d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                 FROM my_draft d
                 INNER JOIN draft_approval_steps s ON s.draft_id = d.draft_id
                 LEFT JOIN employees e ON e.employee_id = d.employee_id
                 WHERE s.employee_id = ? AND s.step_status = 'APPROVED'
                 ORDER BY d.created_at DESC, d.draft_id DESC`
            : `SELECT d.draft_id, d.employee_id, d.title, d.document_type,
                      d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                 FROM my_draft d
                 LEFT JOIN employees e ON e.employee_id = d.employee_id
                 WHERE d.approver_id = ? AND d.status = 'APPROVED'
                 ORDER BY d.created_at DESC, d.draft_id DESC`;
        const [rows] = await promiseDb.query(sql, [employeeId]);
        return rows;
    }

    static async updateDraft(draftId, employeeId, title, documentType, content, detailData = {}) {
        const [result] = await promiseDb.query(
            `UPDATE my_draft
             SET title = ?, document_type = ?, content = ?, detail_data = ?
             WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'`,
            [title, documentType, content, JSON.stringify(detailData), draftId, employeeId]
        );
        return result.affectedRows;
    }

    static async deleteDraft(draftId, employeeId) {
        const [result] = await promiseDb.query(
            `DELETE FROM my_draft
             WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'`,
            [draftId, employeeId]
        );
        return result.affectedRows;
    }

    static async create(employeeId, title, documentType, content, detailData = {}) {
        const [result] = await promiseDb.query(
            `INSERT INTO my_draft (
                employee_id, title, document_type, content, detail_data, status
             ) VALUES (?, ?, ?, ?, ?, 'DRAFT')`,
            [employeeId, title, documentType, content, JSON.stringify(detailData)]
        );
        return result.insertId;
    }

    static async createApprovalStep(draftId, employeeId, stepOrder, stepStatus) {
        if (!(await hasDraftApprovalStepsTable())) {
            const [result] = await promiseDb.query(
                `UPDATE my_draft SET approver_id = ? WHERE draft_id = ?`,
                [employeeId, draftId]
            );
            return result.affectedRows ? draftId : null;
        }

        const [result] = await promiseDb.query(
            `INSERT INTO draft_approval_steps (
                draft_id, employee_id, step_order, step_status
             ) VALUES (?, ?, ?, ?)`,
            [draftId, employeeId, stepOrder, stepStatus]
        );
        return result.insertId;
    }

    static async submitExisting(draftId, employeeId, approverIds) {
        const hasSteps = await hasDraftApprovalStepsTable();
        if (!hasSteps && approverIds.length !== 1) {
            throw new Error('현재 DB에는 단일 결재자만 저장할 수 있습니다. 결재자를 1명 선택해주세요.');
        }

        await promiseDb.beginTransaction();
        try {
            const [updated] = await promiseDb.query(
                `UPDATE my_draft
                 SET status = 'PENDING', approver_id = ?
                 WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'`,
                [approverIds[0], draftId, employeeId]
            );
            if (updated.affectedRows !== 1) {
                await promiseDb.rollback();
                return false;
            }

            if (hasSteps) {
                const values = approverIds.map((id, index) => [
                    draftId,
                    id,
                    index + 1,
                    index === 0 ? 'PENDING' : 'WAITING'
                ]);
                await promiseDb.query(
                    `INSERT INTO draft_approval_steps
                        (draft_id, employee_id, step_order, step_status)
                     VALUES ?`,
                    [values]
                );
            }

            const [draftRows] = await promiseDb.query(
                `SELECT document_type, detail_data
                 FROM my_draft
                 WHERE draft_id = ?
                 FOR UPDATE`,
                [draftId]
            );
            const draft = draftRows[0];
            await ensureLeaveDetail(
                draftId,
                draft?.document_type,
                parseDetailData(draft?.detail_data)
            );

            await promiseDb.commit();
            return true;
        } catch (error) {
            await promiseDb.rollback();
            throw error;
        }
    }

    static async submit(employeeId, title, documentType, content, approverIds, detailData = {}) {
        const hasSteps = await hasDraftApprovalStepsTable();
        if (!hasSteps && approverIds.length !== 1) {
            throw new Error('현재 DB에는 단일 결재자만 저장할 수 있습니다. 결재자를 1명 선택해주세요.');
        }

        await promiseDb.beginTransaction();
        try {
            const [result] = await promiseDb.query(
                `INSERT INTO my_draft (
                    employee_id, approver_id, title, document_type,
                    content, detail_data, status
                 ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
                [
                    employeeId,
                    approverIds[0],
                    title,
                    documentType,
                    content,
                    JSON.stringify(detailData)
                ]
            );
            const draftId = result.insertId;

            if (hasSteps) {
                const values = approverIds.map((id, index) => [
                    draftId,
                    id,
                    index + 1,
                    index === 0 ? 'PENDING' : 'WAITING'
                ]);
                await promiseDb.query(
                    `INSERT INTO draft_approval_steps
                        (draft_id, employee_id, step_order, step_status)
                     VALUES ?`,
                    [values]
                );
            }

            await ensureLeaveDetail(draftId, documentType, detailData);
            await promiseDb.commit();
            return draftId;
        } catch (error) {
            await promiseDb.rollback();
            throw error;
        }
    }

    static async decide(draftId, employeeId, decision) {
        const hasSteps = await hasDraftApprovalStepsTable();
        await promiseDb.beginTransaction();

        try {
            if (!hasSteps) {
                const [draftRows] = await promiseDb.query(
                    `SELECT employee_id AS writerEmployeeId,
                            document_type AS documentType,
                            detail_data AS detailData
                     FROM my_draft
                     WHERE draft_id = ? AND approver_id = ? AND status = 'PENDING'
                     FOR UPDATE`,
                    [draftId, employeeId]
                );
                if (draftRows.length !== 1) {
                    await promiseDb.rollback();
                    return false;
                }

                const draft = draftRows[0];
                if (decision === 'approve') {
                    const detailData = parseDetailData(draft.detailData);
                    if (draft.documentType === '휴가') {
                        await applyLeaveAttendance(draftId, draft.writerEmployeeId, detailData);
                    } else if (draft.documentType === '비용') {
                        await persistExpenseDetail(draftId, draft.documentType, detailData);
                    } else if (['수당', '상여금', '추가급여'].includes(draft.documentType)) {
                        await applyApprovedDraftToPayroll({
                            connection: promiseDb,
                            draft: {
                                draftId,
                                employeeId: draft.writerEmployeeId,
                                documentType: draft.documentType,
                                detailData
                            },
                            approvedBy: employeeId,
                            approvedAt: new Date().toISOString(),
                            payMonth: detailData.payMonth,
                            strict: true
                        });
                    }
                }

                await promiseDb.query(
                    `UPDATE my_draft
                     SET status = ?, processed_at = CURRENT_TIMESTAMP
                     WHERE draft_id = ? AND status = 'PENDING'`,
                    [decision === 'approve' ? 'APPROVED' : 'REJECTED', draftId]
                );
                await promiseDb.commit();
                return true;
            }

            const [stepRows] = await promiseDb.query(
                `SELECT step_order
                 FROM draft_approval_steps
                 WHERE draft_id = ? AND employee_id = ? AND step_status = 'PENDING'
                 FOR UPDATE`,
                [draftId, employeeId]
            );
            if (stepRows.length !== 1) {
                await promiseDb.rollback();
                return false;
            }

            const order = stepRows[0].step_order;
            await promiseDb.query(
                `UPDATE draft_approval_steps
                 SET step_status = ?
                 WHERE draft_id = ? AND employee_id = ? AND step_status = 'PENDING'`,
                [decision === 'approve' ? 'APPROVED' : 'REJECTED', draftId, employeeId]
            );

            if (decision === 'reject') {
                await promiseDb.query(
                    `UPDATE my_draft
                     SET status = 'REJECTED', processed_at = CURRENT_TIMESTAMP
                     WHERE draft_id = ? AND status = 'PENDING'`,
                    [draftId]
                );
                await promiseDb.commit();
                return true;
            }

            const [nextRows] = await promiseDb.query(
                `SELECT employee_id AS employeeId
                 FROM draft_approval_steps
                 WHERE draft_id = ? AND step_order = ? AND step_status = 'WAITING'
                 LIMIT 1
                 FOR UPDATE`,
                [draftId, order + 1]
            );

            if (nextRows.length === 1) {
                await promiseDb.query(
                    `UPDATE draft_approval_steps
                     SET step_status = 'PENDING'
                     WHERE draft_id = ? AND step_order = ? AND step_status = 'WAITING'`,
                    [draftId, order + 1]
                );
                await promiseDb.query(
                    `UPDATE my_draft SET approver_id = ? WHERE draft_id = ?`,
                    [nextRows[0].employeeId, draftId]
                );
                await promiseDb.commit();
                return true;
            }

            const [draftRows] = await promiseDb.query(
                `SELECT employee_id AS writerEmployeeId,
                        document_type AS documentType,
                        detail_data AS detailData
                 FROM my_draft
                 WHERE draft_id = ? AND status = 'PENDING'
                 FOR UPDATE`,
                [draftId]
            );
            if (draftRows.length !== 1) {
                await promiseDb.rollback();
                return false;
            }

            const draft = draftRows[0];
            const detailData = parseDetailData(draft.detailData);
            if (draft.documentType === '휴가') {
                await applyLeaveAttendance(draftId, draft.writerEmployeeId, detailData);
            } else if (draft.documentType === '비용') {
                await persistExpenseDetail(draftId, draft.documentType, detailData);
            } else if (['수당', '상여금', '추가급여'].includes(draft.documentType)) {
                await applyApprovedDraftToPayroll({
                    connection: promiseDb,
                    draft: {
                        draftId,
                        employeeId: draft.writerEmployeeId,
                        documentType: draft.documentType,
                        detailData
                    },
                    approvedBy: employeeId,
                    approvedAt: new Date().toISOString(),
                    payMonth: detailData.payMonth,
                    strict: true
                });
            }

            await promiseDb.query(
                `UPDATE my_draft
                 SET status = 'APPROVED', approver_id = ?, processed_at = CURRENT_TIMESTAMP
                 WHERE draft_id = ? AND status = 'PENDING'`,
                [employeeId, draftId]
            );
            await promiseDb.commit();
            return true;
        } catch (error) {
            await promiseDb.rollback();
            throw error;
        }
    }
}

module.exports = Draft;
