const db = require('../db');

class Draft {
    static getById(draftId) {
        return new Promise((resolve, reject) => {

            const sql = `
                SELECT
                    d.draft_id,
                    d.title,
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

    static create(employeeId, title, documentType, content) {
        return new Promise((resolve, reject) => {
            const sql = `
            INSERT INTO my_draft (
                employee_id,
                title,
                document_type,
                content,
                status
            )
            VALUES(?, ?, ?, ?, 'DRAFT')
        `;

            const values = [
                employeeId,
                title,
                documentType,
                content,
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

                resolve(result.inserId);
            })
        })
    }

    static submit(employeeId, title, documentType, content, approverIds) {
        return new Promise((resolve, reject) => {
    
            db.beginTransaction((err) => {
                if (err) return reject(err);
    
                const sql = `
                    INSERT INTO my_draft (
                        employee_id,
                        title,
                        document_type,
                        content,
                        status
                    )
                    VALUES (?, ?, ?, ?, 'PENDING')
                `;
    
                const values = [
                    employeeId,
                    title,
                    documentType,
                    content
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

