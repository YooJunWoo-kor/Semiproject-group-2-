const express = require('express');
const db = require('../db');
const router = express.Router();

// 3. [사원 목록 조회 API]
router.get('/users', (req, res) => {

    const query = `
        SELECT
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            d.department_name,
            e.position,
            e.email,
            ea.role,
            ea.account_status
        FROM employees e
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        INNER JOIN employee_accounts ea
            ON e.employee_id = ea.employee_id
        WHERE ea.account_status = 'ACTIVE'
        ORDER BY e.employee_id
    `;

    db.query(query, (err, data) => {

        if (err) {
            console.error('직원 목록 조회 에러:', err);

            return res.status(500).json({
                message: '직원 목록 조회 실패'
            });
        }

        res.json(data);
    });
});

// 직원이 소속되어 있는지와 관계없이 DB 부서 전체 조회
router.get('/departments', (req, res) => {
    const sql = 'SELECT department_id, department_name FROM departments ORDER BY department_id';

    db.query(sql, (err, rows) => {
        if (err) {
            console.error('부서 목록 조회 오류:', err);
            return res.status(500).json({ message: '부서 목록 조회 실패' });
        }
        res.json(rows);
    });
});

module.exports = router;
