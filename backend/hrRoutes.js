const express = require('express');
const db = require('./db');

const router = express.Router();
const promiseDb = db.promise();

function isDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(value + 'T00:00:00Z');

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

router.get('/attendance', async (req, res) => {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const date = req.query.date || null;
    const departmentIdValue = req.query.departmentId;
    let departmentId = null;

    if (startDate && !isDateString(startDate)) {
        return res.status(400).json({
            success: false,
            message: '시작일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (endDate && !isDateString(endDate)) {
        return res.status(400).json({
            success: false,
            message: '종료일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (date && !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (departmentIdValue !== undefined) {
        departmentId = Number(departmentIdValue);

        if (!Number.isInteger(departmentId) || departmentId < 1) {
            return res.status(400).json({
                success: false,
                message: '올바른 부서 ID를 입력해 주세요.'
            });
        }
    }

    const query = `
        SELECT
            a.attendance_id AS attendanceId,
            a.employee_id AS employeeId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            a.attendance_status AS status,
            a.memo
        FROM attendance a
        INNER JOIN employees e
            ON e.employee_id = a.employee_id
        INNER JOIN departments d
            ON d.department_id = e.department_id
        WHERE (? IS NULL OR a.work_date >= ?)
          AND (? IS NULL OR a.work_date <= ?)
          AND (? IS NULL OR a.work_date = ?)
          AND (? IS NULL OR d.department_id = ?)
        ORDER BY a.work_date DESC, a.attendance_id DESC
    `;

    const values = [
        startDate, startDate,
        endDate, endDate,
        date, date,
        departmentId, departmentId
    ];

    try {
        const [rows] = await promiseDb.query(query, values);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('HR 근태정보 조회 오류:', error);
        return res.status(500).json({
            success: false,
            message: '근태 정보를 불러오지 못했습니다.'
        });
    }
});

module.exports = router;
