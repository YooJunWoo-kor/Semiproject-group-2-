const db = require('../db');

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

    static getReceivedByEmployeeId(employeeId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT d.draft_id, d.employee_id, d.title, d.document_type,
                       d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                FROM my_draft d
                INNER JOIN draft_approval_steps s ON s.draft_id = d.draft_id
                LEFT JOIN employees e ON e.employee_id = d.employee_id
                WHERE s.employee_id = ? AND s.step_status = 'PENDING' AND d.status = 'PENDING'
                ORDER BY d.created_at DESC, d.draft_id DESC
            `;
            db.query(sql, [employeeId], (err, rows) => err ? reject(err) : resolve(rows));
        });
    }

    static getApprovedByEmployeeId(employeeId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT d.draft_id, d.employee_id, d.title, d.document_type,
                       d.content, d.detail_data, d.status, d.created_at, e.name AS writer_name
                FROM my_draft d
                INNER JOIN draft_approval_steps s ON s.draft_id = d.draft_id
                LEFT JOIN employees e ON e.employee_id = d.employee_id
                WHERE s.employee_id = ? AND s.step_status = 'APPROVED'
                ORDER BY d.created_at DESC, d.draft_id DESC
            `;
            db.query(sql, [employeeId], (err, rows) => err ? reject(err) : resolve(rows));
        });
    }

    static updateDraft(draftId, employeeId, title, documentType, content, detailData = {}) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE my_draft
                SET title = ?, document_type = ?, content = ?, detail_data = ?
                WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'
            `;
            db.query(sql, [title, documentType, content, JSON.stringify(detailData), draftId, employeeId],
                (err, result) => err ? reject(err) : resolve(result.affectedRows));
        });
    }

    static deleteDraft(draftId, employeeId) {
        return new Promise((resolve, reject) => {
            db.query(
                "DELETE FROM my_draft WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'",
                [draftId, employeeId],
                (err, result) => err ? reject(err) : resolve(result.affectedRows)
            );
        });
    }

    static submitExisting(draftId, employeeId, approverIds) {
        return new Promise((resolve, reject) => {
            db.beginTransaction(err => {
                if (err) return reject(err);
                db.query(
                    "UPDATE my_draft SET status = 'PENDING' WHERE draft_id = ? AND employee_id = ? AND status = 'DRAFT'",
                    [draftId, employeeId],
                    (err, result) => {
                        if (err || result.affectedRows !== 1) {
                            return db.rollback(() => err ? reject(err) : resolve(false));
                        }
                        const values = approverIds.map((id, index) =>
                            [draftId, id, index + 1, index === 0 ? 'PENDING' : 'WAITING']
                        );
                        db.query(
                            "INSERT INTO draft_approval_steps (draft_id, employee_id, step_order, step_status) VALUES ?",
                            [values],
                            err => {
                                if (err) return db.rollback(() => reject(err));
                                db.commit(err => err
                                    ? db.rollback(() => reject(err))
                                    : resolve(true));
                            }
                        );
                    }
                );
            });
        });
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
                                            
                                            if(draft.document_type !== '비용'){
                                                return approveDraft();
                                            }

                                            const detailData = typeof draft.detail_data === "string"? JSON.parse(draft.detail_data) : draft.detail_data;

                                            const expenseRows = (detailData?.expenseItems || []).map(item => [
                                                draftId,
                                                item.useDate,
                                                item.merchant,
                                                Number(item.amount),
                                                item.memo || null
                                            ])

                                            if(!expenseRows.length) {
                                                return db.rollback(() => reject(new Error("비용 내역 없음")));
                                            }

                                            db.query(
                                                `INSERT INTO expense_items
                                                (draft_id, use_date, merchant, amount, memo)
                                                VALUES ?`,
                                                [expenseRows],
                                                err => {
                                                    if(err) return db.rollback(() => reject(err));
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

    

    static create(employeeId, title, documentType, content, detailData = {}) {
        return new Promise((resolve, reject) => {
            const sql = `
            INSERT INTO my_draft (
                employee_id,
                title,
                document_type,
                content,
                detail_data,
                status
            )
            VALUES(?, ?, ?, ?, ?, 'DRAFT')
        `;

            const values = [
                employeeId,
                title,
                documentType,
                content,
                JSON.stringify(detailData)
            ];

            db.query(sql, values, (err, result) => {
                if (err) {
                    return reject(err);
                }

                resolve(result.insertId)
            });
        });
    }

    static createApprovalStep(draftId, employeeId, stepOrder, stepStatus) {
        return new Promise((resolve, reject) => {

            const sql = `
                INSERT INTO draft_approval_steps (
                    draft_id,
                    employee_id,
                    step_order,
                    step_status
                )
                VALUES (?, ?, ?, ?)
            `;

            const values = [
                draftId,
                employeeId,
                stepOrder,
                stepStatus
            ];

            db.query(sql, values, (err, result) => {
                if(err){
                    return reject(err)
                }

                resolve(result.insertId);
            })
        })
    }

    static submit(employeeId, title, documentType, content, approverIds, detailData = {}) {
        return new Promise((resolve, reject) => {
    
            db.beginTransaction((err) => {
                if (err) return reject(err);
    
                const sql = `
                    INSERT INTO my_draft (
                        employee_id,
                        title,
                        document_type,
                        content,
                        detail_data,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, 'PENDING')
                `;
    
                const values = [
                    employeeId,
                    title,
                    documentType,
                    content,
                    JSON.stringify(detailData)
                ];
    
                db.query(sql, values, (err, result) => {
                    if (err) {
                        return db.rollback(() => reject(err));
                    }
    
                    const draftId = result.insertId;
    
                    const steps = approverIds.map((id, index) => [
                        draftId,
                        id,
                        index + 1,
                        index === 0 ? 'PENDING' : 'WAITING'
                    ]);
    
                    const stepSql = `
                        INSERT INTO draft_approval_steps (
                            draft_id,
                            employee_id,
                            step_order,
                            step_status
                        )
                        VALUES ?
                    `;
    
                    db.query(stepSql, [steps], (err) => {
                        if (err) {
                            return db.rollback(() => reject(err));
                        }
    
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => reject(err));
                            }
    
                            resolve(draftId);
                        });
                    });
                });
            });
        });
    }
    // 모든 결재자가 추가되면 이 결재자들을 table에 올리는 transaction 아니면 올리지 않는 rollback 로직
}
module.exports = Draft;

