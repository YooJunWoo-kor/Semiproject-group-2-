// HR 기본 라우터
// 역할: 직원·부서·근태 등 인사관리의 기본 조회와 변경 API를 제공합니다.

const express = require('express');
const db = require('../db');
const { attendanceStatus } = require('../models/Attendance');
const {
    promiseDb,
    attendanceStatuses,
    payrollFinalStatuses,
    isDateString,
    isTimeString,
    isEmailString,
    currentPayMonth,
    normalizeDepartmentName,
    parseNonNegativeInteger,
    propagateAnnualSalaryToFutureRecords,
    ensurePayrollForMonth,
    calculateFreelancerPayroll
} = require('../services/hrCommon');

const hrRouter = express.Router();

// 근태관리: 출퇴근 기록 등록·조회·수정·삭제와 부서별 현황을 처리합니다.
hrRouter.post('/attendance', async (req, res) => {
    const employeeId = Number(req.body.employeeId);
    const workDate = String(req.body.workDate || '').trim();
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    let status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    const allowedStatuses = ['정상', '근무중', '지각', '조퇴', '야근', '지각·조퇴', '지각·야근', '결근', '휴가', '출장', '휴직', '미출근'];

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !isDateString(workDate) ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkOut !== null && checkIn === null) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !attendanceStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '직원, 근무일, 출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    status = attendanceStatus(checkIn, checkOut, status);

    try {
        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1',
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '등록할 직원을 찾을 수 없습니다.'
            });
        }

        const [existingRows] = await promiseDb.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ? AND work_date = ?
             LIMIT 1`,
            [employeeId, workDate]
        );

        if (existingRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 날짜 근태 기록이 이미 존재합니다.'
            });
        }

        const [result] = await promiseDb.query(
            `INSERT INTO attendance
                (employee_id, work_date, check_in_at, check_out_at, attendance_status, memo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                workDate,
                checkIn ? `${workDate} ${checkIn}:00` : null,
                checkOut ? `${workDate} ${checkOut}:00` : null,
                status,
                memo
            ]
        );

        return res.status(201).json({
            success: true,
            data: {
                attendanceId: result.insertId,
                employeeId,
                attendanceDate: workDate,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 기록이 등록되었습니다.'
        });
    } catch (error) {
        console.error('신규 근태 등록 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 등록하지 못했습니다.'
        });
    }
});


// 달력용 근태 기록 조회
// 날짜·부서 조건은 선택적으로 적용하고 출근·퇴근 시각은 조회 전용으로 반환합니다.
hrRouter.get('/attendance', async (req, res) => {
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


hrRouter.put('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    let status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    const allowedStatuses = ['정상', '근무중', '지각', '조퇴', '야근', '지각·조퇴', '지각·야근', '결근', '휴가', '출장', '휴직', '미출근'];

    if (
        !Number.isInteger(attendanceId) ||
        attendanceId < 1 ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkOut !== null && checkIn === null) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !attendanceStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    status = attendanceStatus(checkIn, checkOut, status);

    try {
        const [existingRows] = await promiseDb.query(
            'SELECT attendance_id FROM attendance WHERE attendance_id = ? LIMIT 1',
            [attendanceId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '근태 기록을 찾을 수 없습니다.'
            });
        }

        await promiseDb.query(
            `UPDATE attendance
             SET check_in_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 check_out_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 attendance_status = ?,
                 memo = ?
             WHERE attendance_id = ?`,
            [
                checkIn,
                checkIn,
                checkOut,
                checkOut,
                status,
                memo,
                attendanceId
            ]
        );

        return res.json({
            success: true,
            data: {
                attendanceId,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 정보가 수정되었습니다.'
        });
    } catch (error) {
        console.error('근태 정보 수정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 정보를 수정하지 못했습니다.'
        });
    }
});


// 관리자가 선택한 근태 기록 한 건을 삭제합니다.
hrRouter.delete('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);

    if (!Number.isInteger(attendanceId) || attendanceId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 근태 기록 ID를 입력해 주세요.'
        });
    }

    try {
        const [result] = await promiseDb.query(
            'DELETE FROM attendance WHERE attendance_id = ?',
            [attendanceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '삭제할 근태 기록을 찾을 수 없습니다.'
            });
        }

        return res.json({
            success: true,
            data: { attendanceId },
            message: '근태 기록이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('근태 기록 삭제 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 삭제하지 못했습니다.'
        });
    }
});


// 부서 직원 전체와 해당 날짜의 근태 조회
hrRouter.get('/attendance/department', async (req, res) => {
    const date = req.query.date;
    const departmentId = Number(req.query.departmentId);

    if (!date || !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    const query = `
        SELECT
            e.employee_id AS employeeId,
            a.attendance_id AS attendanceId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            COALESCE(a.attendance_status, '미출근') AS status,
            a.memo
        FROM employees e
        INNER JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN attendance a
            ON a.employee_id = e.employee_id
            AND a.work_date = ?
        WHERE e.department_id = ?
          AND e.employment_status = '재직'
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query, [date, departmentId]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 근태현황 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 근태현황을 불러오지 못했습니다.'
        });
    }
});


// 조직관리: 직원 목록과 부서 목록을 조회합니다.
hrRouter.get('/employees', async (req, res) => {
    const query = `
        SELECT
            e.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            e.email,
            e.phone,
            DATE_FORMAT(e.hire_date, '%Y-%m-%d') AS hireDate,
            e.initial_annual_salary AS initialAnnualSalary,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignationDate,
            e.employment_status AS employmentStatus,
            ea.role,
            ea.account_status AS accountStatus
        FROM employees e
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN employee_accounts ea
            ON ea.employee_id = e.employee_id
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('직원 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '직원 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 목록 조회
// 부서장 이름과 설명을 함께 조회해 직원·부서 통합 화면에서 사용합니다.
hrRouter.get('/departments', async (req, res) => {
    const query = `
        SELECT
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            d.manager_id AS managerId,
            m.name AS managerName,
            d.description
        FROM departments d
        LEFT JOIN employees m
            ON m.employee_id = d.manager_id
        ORDER BY d.department_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 등록
// 선택한 직원은 부서장으로 연결하고 부서명 중복을 먼저 확인합니다.
hrRouter.post('/departments', async (req, res) => {
    const departmentName = normalizeDepartmentName(req.body.departmentName);
    const description = String(req.body.description || '').trim();
    const managerIdValue = req.body.managerId;
    const managerId =
        managerIdValue === '' || managerIdValue === null || managerIdValue === undefined
            ? null
            : Number(managerIdValue);

    if (
        !departmentName ||
        departmentName.length > 50 ||
        description.length > 255 ||
        (managerId !== null && (!Number.isInteger(managerId) || managerId < 1))
    ) {
        return res.status(400).json({
            success: false,
            message: '부서 등록 정보를 올바르게 입력해 주세요.'
        });
    }

    // 부서 생성과 부서장 직원의 소속 이동을 한 번에 처리합니다.
    let transactionStarted = false;

    try {
        const [duplicateRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_name = ?',
            [departmentName]
        );

        if (duplicateRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        if (managerId !== null) {
            const [managerRows] = await promiseDb.query(
                `SELECT employee_id
                 FROM employees
                 WHERE employee_id = ? AND employment_status <> '퇴사'`,
                [managerId]
            );

            if (managerRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '부서장으로 지정할 수 있는 직원을 찾을 수 없습니다.'
                });
            }
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [result] = await promiseDb.query(
            `INSERT INTO departments (
                department_name,
                manager_id,
                description
             )
             VALUES (?, ?, ?)`,
            [departmentName, managerId, description || null]
        );

        if (managerId !== null) {
            await promiseDb.query(
                `UPDATE departments
                 SET manager_id = NULL
                 WHERE manager_id = ?
                   AND department_id <> ?`,
                [managerId, result.insertId]
            );

            await promiseDb.query(
                `UPDATE employees
                 SET department_id = ?
                 WHERE employee_id = ?`,
                [result.insertId, managerId]
            );
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                departmentId: result.insertId,
                departmentName,
                managerId,
                description: description || null
            },
            message: '부서가 등록되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('부서 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 등록하지 못했습니다.'
        });
    }
});


// 소속 직원이 없는 부서만 삭제합니다.
hrRouter.delete('/departments/:departmentId', async (req, res) => {
    const departmentId = Number(req.params.departmentId);
    let transactionStarted = false;

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [departmentRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_id = ? FOR UPDATE',
            [departmentId]
        );

        if (departmentRows.length === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '삭제할 부서를 찾을 수 없습니다.'
            });
        }

        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE department_id = ? LIMIT 1',
            [departmentId]
        );

        if (employeeRows.length > 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: '소속 직원이 있는 부서는 삭제할 수 없습니다.'
            });
        }

        await promiseDb.query(
            'DELETE FROM departments WHERE department_id = ?',
            [departmentId]
        );
        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: '부서가 삭제되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('부서 삭제 오류:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: '연결된 자료가 있는 부서는 삭제할 수 없습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 삭제하지 못했습니다.'
        });
    }
});


// 직원관리: 직원·계정 정보를 함께 등록하고 수정·퇴사 처리합니다.
hrRouter.post('/employees', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const initialAnnualSalary = parseNonNegativeInteger(
        req.body.initialAnnualSalary
    );
    let transactionStarted = false;

    if (
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !password ||
        initialAnnualSalary === null
    ) {
        return res.status(400).json({
            success: false,
            message: '이름, 부서, 직급, 이메일, 초기 비밀번호, 최초 연봉은 필수입니다.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    try {
        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeNumberRows] = await promiseDb.query(
            `SELECT employee_number AS employeeNumber
             FROM employees
             WHERE employee_number REGEXP '^EMP-[0-9]{4}$'
             ORDER BY CAST(SUBSTRING(employee_number, 5) AS UNSIGNED) DESC
             LIMIT 1
             FOR UPDATE`
        );
        const lastEmployeeNumber = employeeNumberRows[0]?.employeeNumber || 'EMP-0000';
        const nextEmployeeSequence = Number(lastEmployeeNumber.slice(4)) + 1;
        const employeeNumber = 'EMP-' + String(nextEmployeeSequence).padStart(4, '0');

        const employeeQuery = `
            INSERT INTO employees (
                employee_number,
                name,
                department_id,
                position,
                email,
                phone,
                initial_annual_salary,
                hire_date,
                employment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, '재직')
        `;
        const [employeeResult] = await promiseDb.query(employeeQuery, [
            employeeNumber,
            name,
            departmentId,
            position,
            email,
            phone || null,
            initialAnnualSalary
        ]);

        await promiseDb.query(
            `INSERT INTO employee_salary_history (
                employee_id,
                annual_salary,
                effective_month
             )
             VALUES (?, ?, DATE_FORMAT(CURRENT_DATE, '%Y-%m'))`,
            [employeeResult.insertId, initialAnnualSalary]
        );

        const accountQuery = `
            INSERT INTO employee_accounts (
                employee_id,
                password_hash,
                role,
                account_status
            )
            VALUES (?, ?, 'USER', 'ACTIVE')
        `;
        await promiseDb.query(accountQuery, [employeeResult.insertId, password]);

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                employeeId: employeeResult.insertId,
                employeeNumber
            },
            message: '직원 등록이 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '자동 생성된 사번 또는 이메일이 이미 등록되어 있습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원을 등록하지 못했습니다.'
        });
    }
});


// 직원 정보 수정
// 퇴사 처리는 별도 API로 제한하고 일반 직원 정보만 수정합니다.
hrRouter.put('/employees/:employeeId', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const hireDate = String(req.body.hireDate || '').trim();
    const employmentStatus = String(req.body.employmentStatus || '').trim();
    const initialAnnualSalary = parseNonNegativeInteger(
        req.body.initialAnnualSalary
    );
    const allowedStatuses = ['재직', '휴직', '퇴사'];

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !hireDate ||
        !allowedStatuses.includes(employmentStatus) ||
        initialAnnualSalary === null
    ) {
        return res.status(400).json({
            success: false,
            message: '직원 수정 정보를 올바르게 입력해 주세요.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    if (!isDateString(hireDate)) {
        return res.status(400).json({
            success: false,
            message: '입사일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    let transactionStarted = false;

    try {
        const [existingEmployees] = await promiseDb.query(
            `SELECT
                employment_status AS employmentStatus,
                initial_annual_salary AS initialAnnualSalary
             FROM employees
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (existingEmployees.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const previousAnnualSalary = parseNonNegativeInteger(
            existingEmployees[0].initialAnnualSalary
        );

        // 직원 정보에서 연봉이 변경된 경우 현재 월 급여가 없으면 준비하고,
        // 있으면 기본급과 3.3% 계산액만 갱신합니다.
        if (
            employmentStatus === '퇴사' &&
            existingEmployees[0].employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리는 전용 퇴사 처리 기능을 이용해 주세요.'
            });
        }

        if (
            existingEmployees[0].employmentStatus === '퇴사' &&
            employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리된 직원의 상태는 수정할 수 없습니다.'
            });
        }

        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const query = `
            UPDATE employees
            SET name = ?,
                department_id = ?,
                position = ?,
                email = ?,
                phone = ?,
                initial_annual_salary = ?,
                hire_date = ?,
                employment_status = ?
            WHERE employee_id = ?
        `;
        const [result] = await promiseDb.query(query, [
            name,
            departmentId,
            position,
            email,
            phone || null,
            initialAnnualSalary,
            hireDate,
            employmentStatus,
            employeeId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        if (
            previousAnnualSalary !== initialAnnualSalary
        ) {
            await promiseDb.query(
                `INSERT INTO employee_salary_history (
                    employee_id,
                    annual_salary,
                    effective_month
                 )
                 VALUES (?, ?, DATE_FORMAT(CURRENT_DATE, '%Y-%m'))
                 ON DUPLICATE KEY UPDATE
                    annual_salary = VALUES(annual_salary)`,
                [employeeId, initialAnnualSalary]
            );

            await ensurePayrollForMonth(currentPayMonth(), employeeId);
            await propagateAnnualSalaryToFutureRecords(
                employeeId,
                currentPayMonth(),
                initialAnnualSalary
            );

            const [currentPayrollRows] = await promiseDb.query(
                `SELECT
                    payroll_id AS payrollId,
                    allowance,
                    bonus,
                    other_payment AS otherPayment,
                    payment_status AS paymentStatus
                 FROM payrolls
                 WHERE employee_id = ?
                   AND pay_month = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
                 LIMIT 1`,
                [employeeId]
            );

            if (
                currentPayrollRows.length > 0 &&
                !payrollFinalStatuses.includes(
                    currentPayrollRows[0].paymentStatus
                )
            ) {
                const calculation = calculateFreelancerPayroll({
                    baseSalary: Math.floor(initialAnnualSalary / 12),
                    allowance: parseNonNegativeInteger(
                        currentPayrollRows[0].allowance
                    ) ?? 0,
                    bonus: parseNonNegativeInteger(
                        currentPayrollRows[0].bonus
                    ) ?? 0,
                    otherPayment: parseNonNegativeInteger(
                        currentPayrollRows[0].otherPayment
                    ) ?? 0
                });

                await promiseDb.query(
                    `UPDATE payrolls
                     SET base_salary = ?,
                         income_tax = ?,
                         local_income_tax = ?,
                         deduction = ?,
                         gross_pay = ?,
                         net_pay = ?
                     WHERE payroll_id = ?`,
                    [
                        Math.floor(initialAnnualSalary / 12),
                        calculation.incomeTax,
                        calculation.localIncomeTax,
                        calculation.totalDeduction,
                        calculation.grossPay,
                        calculation.netPay,
                        currentPayrollRows[0].payrollId
                    ]
                );
            }
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                employeeId
            },
            message: '직원 정보가 수정되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 정보 수정 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 이메일입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원 정보를 수정하지 못했습니다.'
        });
    }
});


// 직원 퇴사 처리
// 직원 상태와 계정 상태를 함께 변경하고 실패하면 트랜잭션을 롤백합니다.
hrRouter.patch('/employees/:employeeId/status', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    let transactionStarted = false;

    if (!Number.isInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 직원 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeResult] = await promiseDb.query(
            `UPDATE employees
             SET employment_status = '퇴사',
                 resignation_date = CURRENT_DATE
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (employeeResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const [accountResult] = await promiseDb.query(
            `UPDATE employee_accounts
             SET account_status = 'SUSPENDED'
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (accountResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원 계정을 찾을 수 없습니다.'
            });
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                employeeId,
                employmentStatus: '퇴사',
                accountStatus: 'SUSPENDED'
            },
            message: '퇴사 처리가 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 퇴사 처리 오류:', error);

        return res.status(500).json({
            success: false,
            message: '퇴사 처리에 실패했습니다.'
        });
    }
});

module.exports = hrRouter;
