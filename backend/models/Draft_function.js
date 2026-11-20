const db = require('../db');
const promiseDb = db.promise();
const {
    validateAdditionalPayroll
} = require('../services/additionalPayroll');

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

// 휴가 상세는 my_draft.detail_data JSON에만 보관합니다.
function validateLeaveDetail(documentType, detailData) {
    if (documentType !== '휴가') return;
    const days = leaveDays(detailData?.startDate, detailData?.endDate);
    if (!days) {
        throw new Error('휴가 시작일과 종료일이 올바르지 않습니다.');
    }
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
                 WHERE d.approver_id = ? AND d.status IN ('APPROVED', '승인', '승인완료', '완료')
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

    static decide(draftId, employeeId, decision) {
        return new Promise((resolve, reject) => {
            db.beginTransaction(err => {
                if (err) return reject(err);
                const sql = `
                    SELECT step_order FROM draft_approval_steps
                    WHERE draft_id = ? AND employee_id = ? AND step_status = 'PENDING'
                    FOR UPDATE
                `;
                db.query(sql, [draftId, employeeId], (err, rows) => {
                    if (err) return db.rollback(() => reject(err));
                    if (rows.length !== 1) return db.rollback(() => resolve(false));
                    const order = rows[0].step_order;
                    db.query(
                        "UPDATE draft_approval_steps SET step_status = ? WHERE draft_id = ? AND employee_id = ? AND step_status = 'PENDING'",
                        [decision === 'approve' ? 'APPROVED' : 'REJECTED', draftId, employeeId],
                        (err, result) => {
                            if (err) return db.rollback(() => reject(err));
                            if (result.affectedRows !== 1) return db.rollback(() => resolve(false));
                            if (decision === 'reject') {
                                return db.query(
                                    "UPDATE my_draft SET status = 'REJECTED' WHERE draft_id = ? AND status = 'PENDING'",
                                    [draftId], err => err ? db.rollback(() => reject(err)) :
                                        db.commit(err => err ? db.rollback(() => reject(err)) : resolve(true))
                                );
                            }
                            db.query(
                                "UPDATE draft_approval_steps SET step_status = 'PENDING' WHERE draft_id = ? AND step_order = ? AND step_status = 'WAITING'",
                                [draftId, order + 1],
                                (err, nextResult) => {
                                    if (err) return db.rollback(() => reject(err));
                                    if (nextResult.affectedRows === 1) {
                                        return db.commit(err => err ? db.rollback(() => reject(err)) : resolve(true));
                                    }
                                    db.query(
                                        `SELECT document_type, detail_data
                                         FROM my_draft
                                         WHERE draft_id = ? AND status = 'PENDING'
                                         FOR UPDATE`,
                                        [draftId],
                                        (err, rows) => {
                                            if (err) {
                                                return db.rollback(() => reject(err));
                                            }

                                            if (rows.length !== 1) {
                                                return db.rollback(() => resolve(false));
                                            }

                                            const approveDraft = () => {
                                                db.query(
                                                    "UPDATE my_draft SET status = 'APPROVED' WHERE draft_id = ? AND status = 'PENDING'",
                                                    [draftId],
                                                    (err, result) => {
                                                        if (err) return db.rollback(() => reject(err));
                                                        if (result.affectedRows !== 1) {
                                                            return db.rollback(() => resolve(false));
                                                        }

                                                        db.commit(err =>
                                                            err ? db.rollback(() => reject(err)) : resolve(true)
                                                        );
                                                    }
                                                );
                                            };

                                            const draft = rows[0];

                                            if (draft.document_type !== '비용') {
                                                return approveDraft();
                                            }

                                            const detailData = typeof draft.detail_data === "string" ? JSON.parse(draft.detail_data) : draft.detail_data;

                                            const expenseRows = (detailData?.expenseItems || []).map(item => [
                                                draftId,
                                                item.useDate,
                                                item.merchant,
                                                Number(item.amount),
                                                item.memo || null
                                            ])

                                            if (!expenseRows.length) {
                                                return db.rollback(() => reject(new Error("비용 내역 없음")));
                                            }

                                            db.query(
                                                `INSERT INTO expense_items
                                                (draft_id, use_date, merchant, amount, memo)
                                                VALUES ?`,
                                                [expenseRows],
                                                err => {
                                                    if (err) return db.rollback(() => reject(err));
                                                    approveDraft();
                                                }
                                            )

                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        });
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
            validateLeaveDetail(
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
        if (!Array.isArray(approverIds) || approverIds.length === 0) {
            throw new Error('결재자를 선택해주세요.');
        }
        const hasSteps = await hasDraftApprovalStepsTable();
        if (!hasSteps && approverIds.length !== 1) {
            throw new Error('현재 DB에는 단일 결재자만 저장할 수 있습니다. 결재자를 1명 선택해주세요.');
        }

        // 병합 수정: 상신과 순차 결재 등록을 하나의 트랜잭션으로 처리합니다.
        await promiseDb.beginTransaction();
        try {
            const [result] = await promiseDb.query(
                `INSERT INTO my_draft (
                    employee_id, approver_id, title, document_type,
                    content, detail_data, status
                 ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
                [employeeId, approverIds[0], title, documentType,
                    content, JSON.stringify(detailData)]
            );
            const draftId = result.insertId;

            if (hasSteps) {
                const steps = approverIds.map((id, index) => [
                    draftId, id, index + 1, index === 0 ? 'PENDING' : 'WAITING'
                ]);
                await promiseDb.query(
                    `INSERT INTO draft_approval_steps
                        (draft_id, employee_id, step_order, step_status) VALUES ?`,
                    [steps]
                );
            }

            // 휴가 기간을 검증합니다. 상세정보는 이미 my_draft.detail_data에 저장됩니다.
            validateLeaveDetail(documentType, detailData);
            await promiseDb.commit();
            return draftId;
        } catch (error) {
            await promiseDb.rollback();
            throw error;
        }
    }

    static getUsedLeaveDays(employeeId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    DATE_FORMAT(e.hire_date, '%Y-%m-%d') AS hireDate,
                    JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.startDate')) AS startDate,
                    JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.endDate')) AS endDate
                FROM employees e
                LEFT JOIN my_draft d
                    ON e.employee_id = d.employee_id
                    AND d.document_type = '휴가'
                    AND d.status = 'APPROVED'
                WHERE e.employee_id = ?
            `;

            db.query(query, [employeeId], (err, rows) => {
                if (err) return reject(err);

                if (rows.length === 0 || !rows[0].hireDate) {
                    return reject(new Error("직원 또는 입사일 정보가 없습니다."));
                }

                const hireDate = rows[0].hireDate;

                let usedLeaveDays = 0;

                rows.forEach(row => {
                    if (!row.startDate || !row.endDate) return;

                    const startDate = row.startDate.slice(0, 10); // 날짜만 추출
                    const endDate = row.endDate.slice(0, 10);

                    // 입사일 이전과 오늘 이후 날짜는 제외
                    const start = startDate < hireDate ? hireDate : startDate;
                    const end = endDate;

                    if (start <= end) {
                        usedLeaveDays += calculateLeaveDays(start, end);
                    }
                });

                resolve(usedLeaveDays);
            });
        });
    }


    // 승인된 휴가를 조회 / 사용한 연차를 계산

    static getEarnedLeaveDays(employeeId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    GREATEST(
                        0,
                        TIMESTAMPDIFF(MONTH, hire_date, CURDATE())
                    ) AS earnedLeaveDays
                FROM employees
                WHERE employee_id = ?
            `;

            db.query(query, [employeeId], (err, rows) => {
                if (err) {
                    return reject(err);
                }

                if (rows.length === 0 || rows[0].earnedLeaveDays === null) {
                    return reject(new Error("직원 또는 입사일 정보가 없습니다."));
                }

                resolve(Number(rows[0].earnedLeaveDays));
            });
        });
    }
    // 고용일로부터 현재 날짜까지 월마다 1일의 연차를 부과하는 로직

}
module.exports = Draft;

function calculateLeaveDays(startDate, endDate) {
    let count = 0;

    const current = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");

    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    while (current <= end) {
        const day = current.getUTCDay();

        if (day !== 0 && day !== 6) { // 토요일 또는 일요일이 아니라면
            count++;
        }

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
}
// 날짜간의 계산해서 토요일과 일요일을 제외하는 로직
